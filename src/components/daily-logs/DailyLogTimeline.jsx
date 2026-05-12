import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format, addDays, subDays } from "date-fns";
import {
  ChevronLeft, ChevronRight, Filter, Plus, MoreVertical,
  X, Sun, Moon, BookOpen, Utensils, Users, Activity, ClipboardList,
  MessageSquare, Pill, AlertTriangle, FileText, Edit, Trash2,
  Eye, CheckSquare, ArrowUp, ArrowDown, Calendar
} from "lucide-react";
import DailyLogModal from "./DailyLogModal";
import { toast } from "sonner";

// ── Log type config — icon + colours matching reference ───────────────────────
const TYPE_CFG = {
  "Morning Log":        { icon: Sun,           bg: "bg-blue-100",    text: "text-blue-600",    dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700",    label: "Wellbeing" },
  "Evening Log":        { icon: Moon,          bg: "bg-indigo-100",  text: "text-indigo-600",  dot: "bg-indigo-500",  badge: "bg-indigo-100 text-indigo-700", label: "Wellbeing" },
  "Night Check":        { icon: Moon,          bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-500",   label: "General" },
  "Wellbeing":          { icon: Sun,           bg: "bg-blue-100",    text: "text-blue-600",    dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700",    label: "Wellbeing" },
  "Education":          { icon: BookOpen,      bg: "bg-green-100",   text: "text-green-600",   dot: "bg-green-500",   badge: "bg-green-100 text-green-700",   label: "Education" },
  "Nutrition":          { icon: Utensils,      bg: "bg-orange-100",  text: "text-orange-500",  dot: "bg-orange-400",  badge: "bg-orange-100 text-orange-700", label: "Nutrition" },
  "Activity":           { icon: Activity,      bg: "bg-red-100",     text: "text-red-500",     dot: "bg-red-500",     badge: "bg-red-100 text-red-700",       label: "Activity" },
  "Key Work Session":   { icon: Users,         bg: "bg-purple-100",  text: "text-purple-600",  dot: "bg-purple-500",  badge: "bg-purple-100 text-purple-700", label: "Key Work" },
  "Family Contact":     { icon: Users,         bg: "bg-pink-100",    text: "text-pink-600",    dot: "bg-pink-500",    badge: "bg-pink-100 text-pink-700",     label: "Family" },
  "Behaviour":          { icon: AlertTriangle, bg: "bg-red-100",     text: "text-red-600",     dot: "bg-red-600",     badge: "bg-red-100 text-red-700",       label: "Behaviour" },
  "Health":             { icon: Activity,      bg: "bg-teal-100",    text: "text-teal-600",    dot: "bg-teal-500",    badge: "bg-teal-100 text-teal-700",     label: "Health" },
  "Medication":         { icon: Pill,          bg: "bg-cyan-100",    text: "text-cyan-600",    dot: "bg-cyan-500",    badge: "bg-cyan-100 text-cyan-700",     label: "Medication" },
  "Incident":           { icon: AlertTriangle, bg: "bg-red-200",     text: "text-red-700",     dot: "bg-red-600",     badge: "bg-red-200 text-red-800",       label: "Incident" },
  "Visit Report":       { icon: FileText,      bg: "bg-blue-100",    text: "text-blue-600",    dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700",     label: "Visit" },
  "Reflection":         { icon: MessageSquare, bg: "bg-violet-100",  text: "text-violet-600",  dot: "bg-violet-500",  badge: "bg-violet-100 text-violet-700", label: "Reflection" },
  "Professional Contact":{ icon: ClipboardList,bg: "bg-slate-100",   text: "text-slate-500",   dot: "bg-slate-400",   badge: "bg-slate-100 text-slate-600",   label: "Professional" },
  "General Note":       { icon: ClipboardList, bg: "bg-slate-100",   text: "text-slate-400",   dot: "bg-slate-300",   badge: "bg-slate-100 text-slate-500",   label: "General" },
};

function getCfg(type) {
  return TYPE_CFG[type] || TYPE_CFG["General Note"];
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, role }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="flex items-center gap-2 shrink-0">
      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
        {initials}
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold text-slate-700 whitespace-nowrap">{name || "—"}</p>
        <p className="text-[11px] text-slate-400">{role || "Staff"}</p>
      </div>
    </div>
  );
}

// ── Timeline Row ──────────────────────────────────────────────────────────────
function TimelineRow({ log, isSelected, onClick, isLast, onMenuAction }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cfg = getCfg(log.log_type);
  const Icon = cfg.icon;

  return (
    <div className="flex gap-0">
      {/* Time + dot + line */}
      <div className="flex flex-col items-center w-16 shrink-0 pt-4">
        <span className="text-xs font-semibold text-slate-500 tabular-nums">{log.log_time || "—"}</span>
        <div className={`w-3 h-3 rounded-full mt-2 ring-2 ring-white shrink-0 ${cfg.dot}`} />
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1 min-h-[40px]" />}
      </div>

      {/* Card */}
      <div className="flex-1 pb-3 pl-3 pr-1 pt-1">
        <div
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            isSelected
              ? "border-primary/30 bg-primary/5 shadow-sm"
              : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
          }`}
          onClick={() => onClick(log)}
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
              <Icon className={`w-5 h-5 ${cfg.text}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800">{log.title || log.log_type}</span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label || log.log_type}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">{log.summary || log.details || "—"}</p>
            </div>

            {/* Avatar */}
            <Avatar name={log.worker_name} role={log.recorded_by_role} />

            {/* Menu */}
            <div className="relative shrink-0 ml-1" onClick={e => e.stopPropagation()}>
              <button
                className="p-1 rounded text-slate-300 hover:text-slate-600 transition-colors"
                onClick={() => setMenuOpen(v => !v)}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-7 z-30 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1" onMouseLeave={() => setMenuOpen(false)}>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50" onClick={() => { onMenuAction("edit", log); setMenuOpen(false); }}>
                    <Edit className="w-3.5 h-3.5" /> Edit Entry
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50" onClick={() => { onMenuAction("delete", log); setMenuOpen(false); }}>
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel — matches reference exactly ──────────────────────────────────
function DetailPanel({ log, logs, onClose, onEdit, onDelete }) {
  const cfg = getCfg(log.log_type);
  const Icon = cfg.icon;

  // Find prev/next in sorted list
  const sortedIdx = logs.findIndex(l => l.id === log.id);
  const prev = sortedIdx > 0 ? logs[sortedIdx - 1] : null;
  const next = sortedIdx < logs.length - 1 ? logs[sortedIdx + 1] : null;

  return (
    <div className="w-80 xl:w-96 shrink-0 bg-white border border-slate-200 rounded-xl shadow-lg flex flex-col" style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bg}`}>
            <Icon className={`w-5 h-5 ${cfg.text}`} />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">{log.title || log.log_type}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{log.log_time || "—"}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-300 hover:text-slate-600 p-1 rounded transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-5 flex-1">
        {/* Badge */}
        <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${cfg.badge}`}>{cfg.label || log.log_type}</span>

        {/* Details */}
        <div>
          <p className="text-xs font-semibold text-slate-800 mb-2">Details</p>
          <p className="text-sm text-slate-600 leading-relaxed">{log.details || log.summary || "No details recorded."}</p>
        </div>

        {/* Meta rows */}
        <div className="space-y-3 border-t border-slate-100 pt-4">
          {/* Logged by */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Logged by</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                {(log.worker_name || "?").charAt(0)}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-700">{log.worker_name || "—"}</p>
                <p className="text-[10px] text-slate-400">{log.recorded_by_role || "Staff"}</p>
              </div>
            </div>
          </div>

          {/* Logged on */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Logged on</span>
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{log.date ? format(new Date(log.date), "d MMM yyyy") : "—"} · {log.log_time || "—"}</span>
            </div>
          </div>

          {/* Related to */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Related To</span>
            <span className="text-xs font-semibold text-slate-700">{log.resident_name || "—"}</span>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Visibility</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                {log.visibility || "Home Staff"}
              </span>
              <button className="text-[10px] text-primary border border-primary/30 px-2 py-0.5 rounded-md hover:bg-primary/5">Edit</button>
            </div>
          </div>
        </div>

        {/* Tags */}
        {log.tags?.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-800 mb-2">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {log.tags.map((t, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-800 mb-2">Actions</p>
          <button onClick={() => onEdit(log)} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors">
            <Edit className="w-3.5 h-3.5 text-primary" /> Edit Entry
          </button>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors">
            <CheckSquare className="w-3.5 h-3.5 text-primary" /> Add Follow-up Task
          </button>
          <button onClick={() => onDelete(log)} className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold border border-red-200 rounded-xl hover:bg-red-50 text-red-600 transition-colors">
            <Trash2 className="w-3.5 h-3.5" /> Delete Entry
          </button>
        </div>

        {/* Timeline Context */}
        {(prev || next) && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-800 mb-3">Timeline Context</p>
            {prev && (
              <div className="flex items-center gap-2 text-xs py-2">
                <ArrowUp className="w-4 h-4 text-teal-500 shrink-0" />
                <span className="text-slate-400">Previous Entry</span>
                <span className="font-semibold text-slate-700 ml-auto">{prev.log_time} · {prev.title || prev.log_type}</span>
              </div>
            )}
            {next && (
              <div className="flex items-center gap-2 text-xs py-2 border-t border-slate-50">
                <ArrowDown className="w-4 h-4 text-red-400 shrink-0" />
                <span className="text-slate-400">Next Entry</span>
                <span className="font-semibold text-slate-700 ml-auto">{next.log_time} · {next.title || next.log_type}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DailyLogTimeline({ resident, staffProfile, user }) {
  const qc = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: allLogs = [], isLoading } = useQuery({
    queryKey: ["daily-logs-timeline", resident?.id],
    queryFn: () => secureGateway.filter("DailyLog", {}, "-date", 500),
    select: d => d.filter(l => l.resident_id === resident?.id),
    enabled: !!resident?.id,
    staleTime: 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyLog.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily-logs-timeline"] });
      setSelectedLog(null);
      toast.success("Entry deleted");
    },
  });

  const timelineLogs = useMemo(() => {
    return allLogs
      .filter(l => l.date === dateStr)
      .filter(l => filterType === "all" || l.log_type === filterType)
      .sort((a, b) => (a.log_time || "00:00").localeCompare(b.log_time || "00:00"));
  }, [allLogs, dateStr, filterType]);

  const logTypes = useMemo(() => [...new Set(allLogs.filter(l => l.date === dateStr).map(l => l.log_type).filter(Boolean))], [allLogs, dateStr]);

  const home = resident?.home_name || "—";

  function handleMenuAction(action, log) {
    if (action === "edit") { setEditLog(log); setShowModal(true); }
    if (action === "delete") { if (window.confirm("Delete this entry?")) deleteMutation.mutate(log.id); }
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Daily Log – Timeline</h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Young Person: <span className="font-medium text-slate-600">{resident?.display_name || "—"}</span>
              {home !== "—" && <> · Home: <span className="font-medium text-slate-600">{home}</span></>}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date navigator */}
            <div className="flex items-center border border-slate-200 rounded-lg bg-white overflow-hidden">
              <button onClick={() => setSelectedDate(d => subDays(d, 1))} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1.5 text-sm font-semibold text-slate-700 border-x border-slate-200 whitespace-nowrap">
                {format(selectedDate, "d MMM yyyy")}
              </span>
              <button onClick={() => setSelectedDate(d => addDays(d, 1))} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Filters */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${showFilters ? "bg-slate-100 border-slate-300 text-slate-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>

            {/* Add Entry */}
            <button
              onClick={() => { setEditLog(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Entry
            </button>
          </div>
        </div>

        {/* Filter bar */}
        {showFilters && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 font-medium">Filter:</span>
            <button onClick={() => setFilterType("all")} className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterType === "all" ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>All</button>
            {logTypes.map(t => (
              <button key={t} onClick={() => setFilterType(t)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${filterType === t ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Timeline panel */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-800">Timeline</h2>
                <span className="text-xs text-slate-400">{timelineLogs.length} entries</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Group by:</span>
                <select className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary">
                  <option>None</option>
                  <option>Type</option>
                  <option>Staff</option>
                </select>
              </div>
            </div>

            {/* Entries */}
            {isLoading ? (
              <div className="py-16 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : timelineLogs.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">No log entries for {format(selectedDate, "d MMMM yyyy")}</p>
                <button onClick={() => { setEditLog(null); setShowModal(true); }} className="mt-3 text-xs text-primary font-semibold hover:underline">
                  + Add first entry
                </button>
              </div>
            ) : (
              <div>
                {timelineLogs.map((log, i) => (
                  <TimelineRow
                    key={log.id}
                    log={log}
                    isSelected={selectedLog?.id === log.id}
                    isLast={i === timelineLogs.length - 1}
                    onClick={setSelectedLog}
                    onMenuAction={handleMenuAction}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selectedLog && (
          <div className="p-4 shrink-0 border-l border-slate-200 bg-slate-50 overflow-y-auto" style={{ width: "360px" }}>
            <DetailPanel
              log={selectedLog}
              logs={timelineLogs}
              onClose={() => setSelectedLog(null)}
              onEdit={l => { setEditLog(l); setShowModal(true); }}
              onDelete={l => { if (window.confirm("Delete this entry?")) { deleteMutation.mutate(l.id); } }}
            />
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <DailyLogModal
          resident={resident}
          staffProfile={staffProfile}
          initialLog={editLog}
          defaultDate={dateStr}
          onClose={() => { setShowModal(false); setEditLog(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["daily-logs-timeline"] });
            setShowModal(false);
            setEditLog(null);
          }}
        />
      )}
    </div>
  );
}