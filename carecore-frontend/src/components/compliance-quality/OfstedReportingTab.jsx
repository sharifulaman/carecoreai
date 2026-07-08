import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ChevronRight, Search, Grid3X3, List, AlertTriangle, Calendar, CheckCircle2, Clock, AlertCircle, FileText, LayoutList } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OfstedOverviewPanel from "./OfstedOverviewPanel";
import ComplianceQuickActions from "./ComplianceQuickActions";

// ─── Module definitions ─────────────────────────────────────────────────────
// status: completed | in_progress | overdue | attention | planned
// reportKey maps to the existing activeReport keys in ComplianceHub
export const ALL_MODULES = [
  // A — Leadership & Management
  { key: "reg4",       num: "Re 4",      title: "Leadership and Management Standard",  category: "Leadership & Management", status: "Working_Progress",     dueDate: null,         version: null },
  { key: "reg5",       num: "Reg 5",      title: "Protection Standard",                 category: "Leadership & Management", status: "Working_Progress",     dueDate: null,         version: null },
  { key: "reg6",       num: "Reg 6",      title: "The Accommodation Standard",          category: "Leadership & Management", status: "Working_Progress", dueDate: null,         version: null },
  { key: "reg32",      num: "Reg 32",     title: "Quality of Support Intelligence Hub",  category: "Leadership & Management", status: "in_progress", dueDate: "2026-06-22", version: "v2.1" },
  { key: "reg35",      num: "Reg 35",     title: "Financial Position",                  category: "Leadership & Management", status: "Working_Progress",     dueDate: null,         version: null },

  // B — Children's Safety & Wellbeing
  { key: "reg11_12",   num: "Reg 11 & 12", title: "Fitness of Registered Persons",       category: "Children's Safety & Wellbeing", status: "Working_Progress",     dueDate: null,         version: null },
  { key: "reg17_18",   num: "Reg 17 & 18", title: "Fitness and Employment of Staff",     category: "Children's Safety & Wellbeing", status: "Working_Progress", dueDate: "2026-06-12", version: null },
  { key: "safeguarding_policy", num: "Reg 20", title: "Safeguarding Policy",             category: "Children's Safety & Wellbeing", status: "completed",   dueDate: "2026-05-28", version: "v1.2" },
  { key: "missing_child_policy", num: "Reg 21", title: "Missing Child Policy",           category: "Children's Safety & Wellbeing", status: "overdue",     dueDate: "2026-06-01", version: null },
  { key: "reg22",      num: "Reg 22",     title: "Behaviour Management Policy & Records",category: "Children's Safety & Wellbeing", status: "completed",   dueDate: "2026-05-30", version: "v1.3" },
  { key: "contingency_plan", num: "Reg 23", title: "Contingency Plan Policy",            category: "Children's Safety & Wellbeing", status: "completed",   dueDate: null,         version: "v1.0" },
  { key: "reg27",      num: "Reg 27",     title: "Notification of a Serious Event",     category: "Children's Safety & Wellbeing", status: "in_progress", dueDate: null,         version: null },
  { key: "reg29",      num: "Reg 29",     title: "Notification of Offences",            category: "Children's Safety & Wellbeing", status: "Working_Progress",     dueDate: null,         version: null },
  { key: "rsm_absence", num: "Reg 33",    title: "Absence of Registered Service Manager",category: "Children's Safety & Wellbeing", status: "in_progress",    dueDate: null,         version: null },
  { key: "reg34",      num: "Reg 34",     title: "Notice of Changes",                   category: "Children's Safety & Wellbeing", status: "Working_Progress", dueDate: null,         version: null },

  // C — Care, Support & Records
  { key: "childrens_guide", num: "Reg 7", title: "Support Standard / Children's Guide", category: "Care, Support & Records", status: "Working_Progress",     dueDate: null,         version: null },
  { key: "sop",        num: "Reg 9",      title: "Statement of Purpose",                category: "Care, Support & Records", status: "completed",   dueDate: null,         version: "v3.0" },
  { key: "workforce",  num: "Reg 10",     title: "Workforce Plan",                      category: "Care, Support & Records", status: "Working_Progress", dueDate: "2026-06-15", version: null },
  { key: "reg24_25",   num: "Reg 24 & 25","title": "Case Records and Retention",         category: "Care, Support & Records", status: "Working_Progress", dueDate: "2026-06-25", version: null },
  { key: "reg26",      num: "Reg 26",     title: "Storage of Records",                  category: "Care, Support & Records", status: "Working_Progress",   dueDate: null,         version: null },
  { key: "reg28",      num: "Reg 28",     title: "Admission & Discharge",               category: "Care, Support & Records", status: "Working_Progress",   dueDate: null,         version: null },
  { key: "complaints", num: "Reg 31",     title: "Complaints and Representations",      category: "Care, Support & Records", status: "Working_Progress", dueDate: null,         version: null },

  // D — Inspection & Evidence
  { key: "annex_a",    num: "Annex A",    title: "Inspection Report",                   category: "Inspection & Evidence", status: "in_progress", dueDate: null,         version: null },
  { key: "outcome_evidence", num: "Outcomes", title: "Outcome & Impact Evidence",        category: "Inspection & Evidence", status: "Working_Progress", dueDate: null,         version: null },
  { key: "location_assessments", num: "Reg 6 LA", title: "Location Assessments",        category: "Inspection & Evidence", status: "Working_Progress", dueDate: null,         version: null },
];

const CATEGORIES = ["All Reports", "Leadership & Management", "Children's Safety & Wellbeing", "Care, Support & Records", "Inspection & Evidence"];
const STATUS_OPTS = ["All Status", "completed", "in_progress", "overdue", "attention", "Working_Progress"];

const SORT_OPTS = [
  { value: "default",   label: "Most Relevant" },
  { value: "status",    label: "Status" },
  { value: "title",     label: "Regulation Number" },
];

const STATUS_CONFIG = {
  completed:        { label: "Completed",         bg: "bg-green-100",  text: "text-green-700",  dot: "bg-green-500"  },
  in_progress:      { label: "In Progress",       bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-400"  },
  overdue:          { label: "Overdue",           bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
  attention:        { label: "Attention Required",bg: "bg-red-50",     text: "text-red-600",    dot: "bg-red-400"    },
  Working_Progress: { label: "Working Progress",  bg: "bg-[#168ED9]/10", text: "text-[#168ED9]", dot: "bg-[#168ED9]" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Working_Progress;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ModuleRow({ mod, onOpen }) {
  const isPlanned = mod.status === "Working_Progress";
  const isOverdue = mod.status === "overdue" || mod.status === "attention";

  return (
    <button
      onClick={() => !isPlanned && onOpen(mod.key)}
      disabled={isPlanned}
      className={`w-full flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0 text-left transition-colors
        ${isPlanned ? "cursor-not-allowed opacity-60" : "hover:bg-blue-50/50 cursor-pointer"}`}
    >
      {/* Number */}
      <span className="w-20 text-xs font-mono text-muted-foreground shrink-0">{mod.num}</span>

      {/* Title */}
      <span className="flex-1 text-sm font-medium text-foreground min-w-0 truncate">{mod.title}</span>

      {/* Status */}
      <div className="shrink-0 w-40 flex justify-start">
        <StatusBadge status={mod.status} />
      </div>



      {/* Flag */}
      <div className="shrink-0 w-6 flex justify-center">
        {isOverdue && <AlertTriangle className="w-4 h-4 text-red-500" />}
      </div>

      {/* Arrow */}
      <div className="shrink-0 w-4 flex justify-end">
        {!isPlanned && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>
    </button>
  );
}

function CategorySection({ title, number, modules, onOpen, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const completedCount = modules.filter(m => m.status === "completed").length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-blue-50/60 hover:bg-blue-50 transition-colors border-b border-border"
      >
        <span className="text-sm font-semibold text-blue-800">{number}. {title}</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{completedCount}/{modules.length} complete</span>
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div>
          {modules.map(mod => <ModuleRow key={mod.key} mod={mod} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  );
}

export default function OfstedReportingTab({ modules, onOpenReport, onExportPack, complaints, ofstedNotifications, safeguardingRecords, mfhRecords }) {
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatus] = useState("All Status");
  const [catFilter, setCat]       = useState("All Reports");
  const [sort, setSort]           = useState("default");
  const [viewMode, setViewMode]   = useState("list");
  const [showAll, setShowAll]     = useState(false);

  // KPI counts
  const total       = modules.length;
  const completed   = modules.filter(m => m.status === "completed").length;
  const inProgress  = modules.filter(m => m.status === "in_progress").length;
  const attention   = modules.filter(m => ["overdue","attention"].includes(m.status)).length;
  const nextDue     = modules
    .filter(m => m.dueDate && m.status !== "completed")
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];

  // Filtering
  const filtered = useMemo(() => {
    let list = [...modules];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m => m.title.toLowerCase().includes(q) || m.num.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    }
    if (statusFilter !== "All Status") list = list.filter(m => m.status === statusFilter);
    if (catFilter !== "All Reports")   list = list.filter(m => m.category === catFilter);
    if (sort === "due")    list.sort((a, b) => (a.dueDate || "z").localeCompare(b.dueDate || "z"));
    if (sort === "status") list.sort((a, b) => a.status.localeCompare(b.status));
    if (sort === "title")  list.sort((a, b) => a.num.localeCompare(b.num));
    return list;
  }, [modules, search, statusFilter, catFilter, sort]);

  // Group by category for grouped view
  const CATEGORY_ORDER = ["Leadership & Management", "Children's Safety & Wellbeing", "Care, Support & Records", "Inspection & Evidence"];
  const grouped = CATEGORY_ORDER.map((cat, i) => ({
    title: cat,
    number: i + 1,
    modules: filtered.filter(m => m.category === cat),
  })).filter(g => g.modules.length > 0);

  const isFiltering = search || statusFilter !== "All Status" || catFilter !== "All Reports";
  const displayList = showAll || isFiltering ? filtered : filtered.slice(0, 15);

  return (
    <div className="space-y-5">
      {/* KPI Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: FileText,     label: "Total Reports",     value: total,      sub: "Ofsted reporting modules", color: "text-blue-600",  bg: "bg-blue-50",   border: "border-blue-100" },
          { icon: CheckCircle2, label: "Completed",         value: completed,  sub: "This period",              color: "text-green-600", bg: "bg-green-50",  border: "border-green-100" },
          { icon: Clock,        label: "In Progress",       value: inProgress, sub: "Ongoing work",             color: "text-amber-600", bg: "bg-amber-50",  border: "border-amber-100" },
          { icon: AlertCircle,  label: "Attention Required",value: attention,  sub: "Overdue or due soon",      color: "text-red-600",   bg: "bg-red-50",    border: "border-red-100" },
        ].map(({ icon: Icon, label, value, sub, color, bg, border }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-4 flex items-start gap-3`}>
            <div className={`w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm`}>
              <Icon className={`w-4.5 h-4.5 ${color}`} />
            </div>
            <div className="min-w-0">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs font-semibold text-foreground leading-tight">{label}</div>
              <div className="text-xs text-muted-foreground truncate">{sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main content: left modules list + right sidebar */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-5">
        {/* Left: modules list */}
        <div className="space-y-4 min-w-0">
          {/* Toolbar */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">Ofsted Reporting Modules</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Structured to align with OFSTED inspection framework.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMode("list")} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${viewMode === "list" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  <LayoutList className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("grid")} className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatus}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTS.map(s => <SelectItem key={s} value={s}>{s === "All Status" ? s : STATUS_CONFIG[s]?.label || s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={catFilter} onValueChange={setCat}>
                  <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SORT_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  placeholder="Search module..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Module list */}
          {isFiltering || viewMode === "grid" ? (
            // Flat list when filtering or grid view
            viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayList.map(mod => (
                  <button
                    key={mod.key}
                    onClick={() => mod.status !== "Working_Progress" && onOpenReport(mod.key)}
                    disabled={mod.status === "Working_Progress"}
                    className={`bg-card border border-border rounded-xl p-4 text-left transition-colors ${mod.status === "Working_Progress" ? "opacity-60 cursor-not-allowed" : "hover:border-primary/40 hover:shadow-sm cursor-pointer"}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">{mod.num}</span>
                      <StatusBadge status={mod.status} />
                    </div>
                    <p className="text-sm font-semibold text-foreground mb-1">{mod.title}</p>
                    <p className="text-xs text-muted-foreground">{mod.category}</p>

                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-muted/20 border-b border-border grid grid-cols-[80px_1fr_160px_24px_16px] gap-4">
                  <span className="text-xs font-semibold text-muted-foreground">Ref</span>
                  <span className="text-xs font-semibold text-muted-foreground">Title</span>
                  <span className="text-xs font-semibold text-muted-foreground">Status</span>
                  <span />
                  <span />
                </div>
                {displayList.map(mod => <ModuleRow key={mod.key} mod={mod} onOpen={onOpenReport} />)}
                {displayList.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">No modules match your filters.</div>
                )}
              </div>
            )
          ) : (
            // Grouped accordion
            <div className="space-y-3">
              {grouped.map(g => (
                <CategorySection key={g.title} title={g.title} number={g.number} modules={g.modules} onOpen={onOpenReport} />
              ))}
            </div>
          )}

          {/* View all / collapse */}
          {!isFiltering && viewMode === "list" && filtered.length > 15 && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted/30 transition-colors"
            >
              {showAll ? <><ChevronUp className="w-4 h-4" /> Hide modules</> : <><ChevronDown className="w-4 h-4" /> View all modules</>}
            </button>
          )}
        </div>

        {/* Right side panel */}
        <div className="space-y-4">
          <OfstedOverviewPanel modules={modules} onModuleClick={onOpenReport} />
          <ComplianceQuickActions onExportPack={onExportPack} onOpenReport={onOpenReport} />
        </div>
      </div>
    </div>
  );
}