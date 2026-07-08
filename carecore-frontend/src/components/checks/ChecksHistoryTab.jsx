import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { FileText, Loader2, ChevronDown, ChevronRight, CheckCircle2, XCircle, MinusCircle, AlertTriangle, X, Calendar } from "lucide-react";

const PRESETS = [
  { label: "Last 7 days",  days: 7 },
  { label: "Last 14 days", days: 14 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "Custom",       days: null },
];

const STATUS_CFG = {
  draft:                { cls: "bg-slate-100 text-slate-500",    label: "Draft" },
  submitted_for_review: { cls: "bg-blue-100 text-blue-700",      label: "Submitted" },
  approved_as_recorded: { cls: "bg-green-100 text-green-700",    label: "Approved" },
  changes_requested:    { cls: "bg-orange-100 text-orange-700",  label: "Changes Requested" },
  escalated:            { cls: "bg-red-100 text-red-700",        label: "Escalated" },
  closed:               { cls: "bg-slate-100 text-slate-500",    label: "Closed" },
};

const RESP_ICON = {
  pass: <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />,
  fail: <XCircle className="w-4 h-4 text-red-500 shrink-0" />,
  na:   <MinusCircle className="w-4 h-4 text-slate-400 shrink-0" />,
};

// Modal showing full day report: all completions + their item responses
function DayReportModal({ date, completions, instances, onClose }) {
  const completionIds = completions.map(c => c.id);

  const { data: allResponses = [], isLoading } = useQuery({
    queryKey: ["check-item-responses-day", date, completionIds.join(",")],
    queryFn: async () => {
      const results = await Promise.all(
        completions.map(c =>
          base44.entities.HomeCheckItemResponse.filter({ completion_id: c.id })
        )
      );
      return results.flat();
    },
    enabled: completions.length > 0,
  });

  const failCount = allResponses.filter(r => r.response_status === "fail").length;
  const passCount = allResponses.filter(r => r.response_status === "pass").length;
  const naCount   = allResponses.filter(r => r.response_status === "na").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Property Check Report
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {format(new Date(date), "EEEE, dd MMMM yyyy")} · {completions.length} check{completions.length !== 1 ? "s" : ""} completed
            </p>
            <div className="flex gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />{passCount} passed</span>
              <span className="flex items-center gap-1 text-xs text-red-600 font-medium"><XCircle className="w-3.5 h-3.5" />{failCount} failed</span>
              <span className="flex items-center gap-1 text-xs text-slate-400 font-medium"><MinusCircle className="w-3.5 h-3.5" />{naCount} N/A</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : completions.map(c => {
            const inst = instances.find(i => i.id === c.instance_id);
            const responses = allResponses.filter(r => r.completion_id === c.id);
            const cfg = STATUS_CFG[c.overall_status] || STATUS_CFG.draft;

            return (
              <div key={c.id} className="border border-slate-200 rounded-xl overflow-hidden">
                {/* Check header */}
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{inst?.template_title || c.template_id}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {inst?.template_area || "General"} · by {c.submitted_by_name || "—"} at {c.submitted_at ? format(new Date(c.submitted_at), "HH:mm") : "—"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                </div>

                {/* Item responses */}
                {responses.length === 0 ? (
                  <p className="text-xs text-slate-400 px-4 py-3">No item responses recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {responses.map(r => (
                      <div key={r.id} className="flex items-start gap-3 px-4 py-2.5">
                        {RESP_ICON[r.response_status] || RESP_ICON.na}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700">{r.item_title}</p>
                          {r.note && <p className="text-[11px] text-slate-500 mt-0.5">{r.note}</p>}
                          {r.response_status === "fail" && r.issue_details && (
                            <div className="mt-1 flex items-start gap-1 text-[11px] text-red-600">
                              <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                              <span>{r.issue_details}</span>
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold capitalize px-2 py-0.5 rounded-full shrink-0 ${
                          r.response_status === "pass" ? "bg-green-100 text-green-700" :
                          r.response_status === "fail" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>{r.response_status || "—"}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* General note */}
                {c.general_note && (
                  <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100">
                    <p className="text-[11px] text-amber-700"><span className="font-semibold">Note: </span>{c.general_note}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Grouped row for a single date
function DayRow({ date, completions, instances }) {
  const [expanded, setExpanded] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const failCount = completions.reduce((n, c) => n + (c.overall_status === "escalated" || c.overall_status === "changes_requested" ? 1 : 0), 0);
  const areas = [...new Set(completions.map(c => {
    const inst = instances.find(i => i.id === c.instance_id);
    return inst?.template_area || "General";
  }))];

  return (
    <>
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        {/* Date row */}
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
          <button onClick={() => setExpanded(e => !e)} className="flex items-center gap-2 flex-1 min-w-0">
            {expanded ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
            <span className="text-sm font-semibold text-slate-800">{format(new Date(date), "EEEE, dd MMMM yyyy")}</span>
            <span className="text-xs text-slate-500">{completions.length} check{completions.length !== 1 ? "s" : ""}</span>
            {failCount > 0 && (
              <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full">{failCount} issues</span>
            )}
            <div className="hidden sm:flex gap-1 ml-2">
              {areas.slice(0, 4).map(a => (
                <span key={a} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">{a}</span>
              ))}
            </div>
          </button>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-teal-200 text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors shrink-0"
          >
            <FileText className="w-3.5 h-3.5" /> View Full Report
          </button>
        </div>

        {/* Expanded: individual completions */}
        {expanded && (
          <div className="divide-y divide-slate-100">
            {completions.map(c => {
              const inst = instances.find(i => i.id === c.instance_id);
              const cfg = STATUS_CFG[c.overall_status] || STATUS_CFG.draft;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700">{inst?.template_title || "—"}</p>
                    <p className="text-[11px] text-slate-400">{inst?.template_area || "General"} · {c.submitted_by_name || "—"} · {c.submitted_at ? format(new Date(c.submitted_at), "HH:mm") : "—"}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showReport && (
        <DayReportModal
          date={date}
          completions={completions}
          instances={instances}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}

export default function ChecksHistoryTab({ homeId, instances }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [preset, setPreset] = useState(7); // days, null = custom
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const today = new Date();
  const fromDate = preset !== null
    ? subDays(today, preset)
    : customFrom ? new Date(customFrom) : null;
  const toDate = preset !== null
    ? today
    : customTo ? new Date(customTo) : null;

  const { data: completions = [], isLoading } = useQuery({
    queryKey: ["check-completions-history", homeId],
    queryFn: () => base44.entities.HomeCheckCompletion.filter({ home_id: homeId }, "-submitted_at", 500),
    enabled: !!homeId,
  });

  const areas = [...new Set((instances || []).map(i => i.template_area || "General"))].sort();

  const filtered = completions.filter(c => {
    if (statusFilter !== "all" && c.overall_status !== statusFilter) return false;
    if (areaFilter !== "all") {
      const inst = (instances || []).find(i => i.id === c.instance_id);
      if ((inst?.template_area || "General") !== areaFilter) return false;
    }
    // Date range filter
    const dateStr = c.completion_date || c.submitted_at?.slice(0, 10);
    if (dateStr && fromDate) {
      const d = new Date(dateStr);
      if (d < startOfDay(fromDate)) return false;
    }
    if (dateStr && toDate) {
      const d = new Date(dateStr);
      if (d > endOfDay(toDate)) return false;
    }
    return true;
  });

  // Group by completion_date
  const grouped = filtered.reduce((acc, c) => {
    const d = c.completion_date || c.submitted_at?.slice(0, 10) || "Unknown";
    if (!acc[d]) acc[d] = [];
    acc[d].push(c);
    return acc;
  }, {});
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="submitted_for_review">Submitted</option>
          <option value="approved_as_recorded">Approved</option>
          <option value="changes_requested">Changes Requested</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={areaFilter}
          onChange={e => setAreaFilter(e.target.value)}
          className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none cursor-pointer"
        >
          <option value="all">All Areas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        {/* Date range preset pills */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-xl bg-white px-2 py-1">
          <Calendar className="w-3.5 h-3.5 text-slate-400 mr-1" />
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setPreset(p.days)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                preset === p.days
                  ? "bg-teal-600 text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {preset === null && (
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>
        )}

        <span className="text-xs text-slate-400 ml-auto">{sortedDates.length} day{sortedDates.length !== 1 ? "s" : ""} · {filtered.length} checks</span>
      </div>

      {/* Grouped by date */}
      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 py-16 text-center">
          <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No history records found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(date => (
            <DayRow
              key={date}
              date={date}
              completions={grouped[date]}
              instances={instances || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}