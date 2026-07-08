import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format, subDays, startOfWeek } from "date-fns";
import {
  ClipboardList, AlertTriangle, CheckSquare, CalendarDays,
  Plus, Search, Filter, ChevronDown, X, Edit, Trash2,
  Sun, Moon, BookOpen, Utensils, Users, Activity,
  MessageSquare, Pill, FileText, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useModuleActions } from "@/lib/PermissionContext";
import DailyLogTimeline from "@/components/daily-logs/DailyLogTimeline";
import DailyLogModal from "@/components/daily-logs/DailyLogModal";

// ── Type config (mirrors DailyLogTimeline) ────────────────────────────────────
const TYPE_CFG = {
  "Morning Log":         { icon: Sun,            badge: "bg-blue-100 text-blue-700" },
  "Evening Log":         { icon: Moon,           badge: "bg-indigo-100 text-indigo-700" },
  "Night Check":         { icon: Moon,           badge: "bg-slate-100 text-slate-500" },
  "Wellbeing":           { icon: Sun,            badge: "bg-blue-100 text-blue-700" },
  "Education":           { icon: BookOpen,       badge: "bg-green-100 text-green-700" },
  "Nutrition":           { icon: Utensils,       badge: "bg-orange-100 text-orange-700" },
  "Activity":            { icon: Activity,       badge: "bg-red-100 text-red-700" },
  "Key Work Session":    { icon: Users,          badge: "bg-purple-100 text-purple-700" },
  "Family Contact":      { icon: Users,          badge: "bg-pink-100 text-pink-700" },
  "Behaviour":           { icon: AlertTriangle,  badge: "bg-red-100 text-red-700" },
  "Health":              { icon: Activity,       badge: "bg-teal-100 text-teal-700" },
  "Medication":          { icon: Pill,           badge: "bg-cyan-100 text-cyan-700" },
  "Incident":            { icon: AlertTriangle,  badge: "bg-red-200 text-red-800" },
  "Visit Report":        { icon: FileText,       badge: "bg-blue-100 text-blue-700" },
  "Reflection":          { icon: MessageSquare,  badge: "bg-violet-100 text-violet-700" },
  "Professional Contact":{ icon: ClipboardList,  badge: "bg-slate-100 text-slate-600" },
  "General Note":        { icon: ClipboardList,  badge: "bg-slate-100 text-slate-500" },
};

const RISK_COLORS = {
  None:     "bg-slate-100 text-slate-500",
  Low:      "bg-green-100 text-green-700",
  Medium:   "bg-amber-100 text-amber-700",
  High:     "bg-orange-100 text-orange-700",
  Critical: "bg-red-100 text-red-700",
};

const LOG_TYPES = Object.keys(TYPE_CFG);

// Merges content jsonb fields to top-level for uniform display access
function resolveLog(log) {
  const c = log?.content || {};
  return {
    ...log,
    title: c.title || log.title,
    summary: c.summary || log.summary,
    details: c.details || log.details,
    log_time: c.log_time || log.log_time,
    mood: c.mood || log.mood,
    risk_level: c.risk_level || log.risk_level,
    visibility: c.visibility || log.visibility,
    recorded_by_role: c.recorded_by_role || log.recorded_by_role,
    tags: c.tags || log.tags,
    follow_up_required: c.follow_up_required ?? log.follow_up_required,
    follow_up_due_date: c.follow_up_due_date || log.follow_up_due_date,
    requires_manager_review: c.requires_manager_review ?? log.requires_manager_review,
    review_status: c.review_status || log.review_status,
  };
}

function getCfg(type) {
  return TYPE_CFG[type] || TYPE_CFG["General Note"];
}

function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon: Icon, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-card border border-border rounded-xl p-4 text-left hover:shadow-sm transition-shadow ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color || "text-foreground"}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        {Icon && (
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color ? color.replace("text-", "bg-").replace("-600", "-100").replace("-700", "-100") : "bg-muted"}`}>
            <Icon className={`w-4 h-4 ${color || "text-muted-foreground"}`} />
          </div>
        )}
      </div>
    </button>
  );
}

// ── All-Residents Log Row ─────────────────────────────────────────────────────
function LogRow({ log, onEdit, onDelete, onClick, isSelected }) {
  const cfg = getCfg(log.log_type);
  const Icon = cfg.icon;
  return (
    <tr
      onClick={() => onClick(log)}
      className={`border-b border-border/50 last:border-0 cursor-pointer transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground leading-tight">{log.title || log.log_type}</p>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{log.summary || "—"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{log.log_type}</span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground font-medium">{log.resident_name || "—"}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {log.date ? format(new Date(log.date), "d MMM yyyy") : "—"}
        {log.log_time && <span className="ml-1 text-slate-400">· {log.log_time}</span>}
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${RISK_COLORS[log.risk_level] || RISK_COLORS.None}`}>
          {log.risk_level || "None"}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{log.worker_name || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(log)} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(log)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Detail Side Panel (all-residents view) ────────────────────────────────────
function LogDetailPanel({ log, onClose, onEdit, onDelete }) {
  const cfg = getCfg(log.log_type);
  const Icon = cfg.icon;
  return (
    <div className="w-80 shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden" style={{ maxHeight: "calc(100vh - 200px)" }}>
      <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">{log.title || log.log_type}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{log.log_time || ""}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto flex-1 text-sm">
        <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>{log.log_type}</span>

        {(log.details || log.summary) && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">Details</p>
            <p className="text-sm text-foreground leading-relaxed">{log.details || log.summary}</p>
          </div>
        )}

        <div className="space-y-2.5 border-t border-border pt-3">
          {[
            ["Resident", log.resident_name],
            ["Date", log.date ? format(new Date(log.date), "d MMM yyyy") : "—"],
            ["Time", log.log_time || "—"],
            ["Logged by", log.worker_name || "—"],
            ["Role", log.recorded_by_role || "Staff"],
            ["Risk", log.risk_level || "None"],
            ["Visibility", log.visibility || "Home Staff"],
          ].map(([label, val]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-xs font-medium text-foreground">{val}</span>
            </div>
          ))}
        </div>

        {log.tags?.length > 0 && (
          <div className="border-t border-border pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {log.tags.map((t, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        )}

        {log.requires_manager_review && (
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs text-amber-700 font-medium">
                Manager review {log.review_status === "Pending" ? "pending" : "complete"}
              </span>
            </div>
          </div>
        )}

        {log.follow_up_required && (
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="text-xs text-blue-700 font-medium">
                Follow-up due {log.follow_up_due_date ? fmt(log.follow_up_due_date) : "—"}
              </span>
            </div>
          </div>
        )}

        <div className="border-t border-border pt-3 space-y-2">
          <button onClick={() => onEdit(log)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold border border-border rounded-lg hover:bg-muted text-foreground transition-colors">
            <Edit className="w-3.5 h-3.5 text-primary" /> Edit Entry
          </button>
          <button onClick={() => onDelete(log)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold border border-red-200 rounded-lg hover:bg-red-50 text-red-600 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete Entry
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DailyLogsTab({ residents = [], staffProfile, user }) {
  const qc = useQueryClient();
  const { canAdd } = useModuleActions("residents");

  const [selectedResidentId, setSelectedResidentId] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [modalResident, setModalResident] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  // Filters (all-residents view)
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");

  const residentIds = useMemo(() => new Set(residents.map(r => r.id)), [residents]);
  const residentMap = useMemo(() => Object.fromEntries(residents.map(r => [r.id, r])), [residents]);

  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ["daily-logs-tab-all"],
    queryFn: () => secureGateway.filter("DailyLog", {}, "-date", 500),
    select: d => (Array.isArray(d) ? d : []).filter(l => residentIds.has(l.resident_id)).map(resolveLog),
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyLog.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-logs-tab-all"] });
      qc.invalidateQueries({ queryKey: ["daily-logs-timeline"] });
      setSelectedLog(null);
      toast.success("Entry deleted");
    },
  });

  // ── KPI computations ────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const thisWeek = allLogs.filter(l => l.date >= weekStart);
    const todayLogs = allLogs.filter(l => l.date === today);
    const pendingReview = allLogs.filter(l => l.requires_manager_review && l.review_status === "Pending");
    const followUpsDue = allLogs.filter(l => l.follow_up_required && l.follow_up_due_date && l.follow_up_due_date <= today);
    return { thisWeek: thisWeek.length, today: todayLogs.length, pendingReview: pendingReview.length, followUpsDue: followUpsDue.length };
  }, [allLogs, today, weekStart]);

  // ── Filtered logs for all-residents view ───────────────────────────────────
  const filteredLogs = useMemo(() => {
    let result = [...allLogs];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(l =>
        (l.title || "").toLowerCase().includes(q) ||
        (l.summary || "").toLowerCase().includes(q) ||
        (l.resident_name || "").toLowerCase().includes(q) ||
        (l.worker_name || "").toLowerCase().includes(q)
      );
    }
    if (filterType !== "all") result = result.filter(l => l.log_type === filterType);
    if (filterRisk !== "all") result = result.filter(l => l.risk_level === filterRisk);
    if (filterFrom) result = result.filter(l => l.date >= filterFrom);
    if (filterTo) result = result.filter(l => l.date <= filterTo);
    return result.sort((a, b) => (b.date + (b.log_time || "")).localeCompare(a.date + (a.log_time || "")));
  }, [allLogs, search, filterType, filterRisk, filterFrom, filterTo]);

  const selectedResident = selectedResidentId !== "all" ? residentMap[selectedResidentId] : null;

  function handleEdit(log) {
    setEditLog(log);
    setModalResident(residentMap[log.resident_id] || selectedResident);
    setShowModal(true);
  }

  function handleDelete(log) {
    if (!window.confirm("Delete this log entry?")) return;
    deleteMutation.mutate(log.id);
  }

  function handleAdd() {
    setEditLog(null);
    setModalResident(selectedResident || residents[0] || null);
    setShowModal(true);
  }

  const activeFiltersCount = [
    filterType !== "all",
    filterRisk !== "all",
    !!filterFrom,
    !!filterTo,
  ].filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="This Week"
          value={kpis.thisWeek}
          sub="log entries"
          icon={CalendarDays}
          color="text-teal-600"
        />
        <KpiCard
          label="Today"
          value={kpis.today}
          sub="entries recorded"
          icon={ClipboardList}
          color="text-blue-600"
        />
        <KpiCard
          label="Pending Review"
          value={kpis.pendingReview}
          sub="awaiting manager"
          icon={Eye}
          color={kpis.pendingReview > 0 ? "text-amber-600" : "text-muted-foreground"}
        />
        <KpiCard
          label="Follow-ups Due"
          value={kpis.followUpsDue}
          sub="action required"
          icon={CheckSquare}
          color={kpis.followUpsDue > 0 ? "text-red-600" : "text-muted-foreground"}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Resident selector */}
        <div className="relative">
          <select
            className="appearance-none border border-border rounded-lg pl-3 pr-8 py-2 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedResidentId}
            onChange={e => { setSelectedResidentId(e.target.value); setSelectedLog(null); }}
          >
            <option value="all">All Residents ({residents.length})</option>
            {residents.map(r => (
              <option key={r.id} value={r.id}>{r.display_name}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>

        {/* Search — only for all-residents view */}
        {selectedResidentId === "all" && (
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex-1" />

        {/* Filter toggle — all-residents only */}
        {selectedResidentId === "all" && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs relative"
            onClick={() => setShowFilters(v => !v)}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        )}

        {canAdd && (
          <Button
            size="sm"
            className="gap-1.5 text-xs bg-teal-600 hover:bg-teal-700 text-white"
            onClick={handleAdd}
          >
            <Plus className="w-3.5 h-3.5" /> Add Log Entry
          </Button>
        )}
      </div>

      {/* ── Filter bar (all-residents view) ── */}
      {selectedResidentId === "all" && showFilters && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Log Type</p>
            <select
              className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All types</option>
              {LOG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Risk Level</p>
            <select
              className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              value={filterRisk}
              onChange={e => setFilterRisk(e.target.value)}
            >
              <option value="all">All levels</option>
              {["None", "Low", "Medium", "High", "Critical"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">From</p>
            <input type="date" className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">To</p>
            <input type="date" className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
          </div>
          {activeFiltersCount > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground underline self-end pb-1.5"
              onClick={() => { setFilterType("all"); setFilterRisk("all"); setFilterFrom(""); setFilterTo(""); }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── No residents guard ── */}
      {residents.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
          No young people found for the selected filters.
        </div>
      )}

      {/* ── Single-resident: delegate to full timeline ── */}
      {residents.length > 0 && selectedResidentId !== "all" && (
        <DailyLogTimeline
          resident={selectedResident}
          staffProfile={staffProfile}
          user={user}
        />
      )}

      {/* ── All-residents: filterable table + detail panel ── */}
      {residents.length > 0 && selectedResidentId === "all" && (
        <div className="flex gap-4 items-start">
          {/* Table */}
          <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden min-w-0">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-sm font-semibold">
                All Entries
                <span className="ml-2 text-xs font-normal text-muted-foreground">{filteredLogs.length} result{filteredLogs.length !== 1 ? "s" : ""}</span>
              </p>
            </div>
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-14 text-center">
                <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No log entries found.</p>
                <button onClick={handleAdd} className="mt-2 text-xs text-primary hover:underline font-medium">+ Add first entry</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/10">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Entry</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Resident</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date & Time</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Risk</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Staff</th>
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map(log => (
                      <LogRow
                        key={log.id}
                        log={log}
                        isSelected={selectedLog?.id === log.id}
                        onClick={setSelectedLog}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel */}
          {selectedLog && (
            <LogDetailPanel
              log={selectedLog}
              onClose={() => setSelectedLog(null)}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <DailyLogModal
          resident={modalResident}
          staffProfile={staffProfile}
          initialLog={editLog}
          defaultDate={today}
          onClose={() => { setShowModal(false); setEditLog(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["daily-logs-tab-all"] });
            qc.invalidateQueries({ queryKey: ["daily-logs-timeline"] });
            setShowModal(false);
            setEditLog(null);
          }}
        />
      )}
    </div>
  );
}
