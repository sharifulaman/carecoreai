import { useState, useMemo } from "react";
import { Filter, SlidersHorizontal, CheckSquare, Info, ExternalLink } from "lucide-react";
import CheckAreaSection from "./CheckAreaSection";
import { getDisplayStatus } from "./CheckStatusBadge";

export default function ChecksTodayTab({ instances, templateItems, completions, selectedDate, onStart, onViewDetails }) {
  const [areaFilter, setAreaFilter] = useState("all");
  const [sortBy, setSortBy] = useState("due_time");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const areas = useMemo(() => {
    const unique = [...new Set(instances.map(i => i.template_area || "General"))].sort();
    return unique;
  }, [instances]);

  const grouped = useMemo(() => {
    let filtered = instances;
    if (areaFilter !== "all") {
      filtered = instances.filter(i => (i.template_area || "General") === areaFilter);
    }

    if (hideCompleted) {
      const now = new Date();
      filtered = filtered.filter(i => {
        const displayStatus = getDisplayStatus(i, now);
        const isComplete = displayStatus === "completed" || displayStatus === "submitted_for_review";
        return !isComplete;
      });
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "due_time") return (a.due_at || "").localeCompare(b.due_at || "");
      if (sortBy === "status") return (a.status || "").localeCompare(b.status || "");
      if (sortBy === "area") return (a.template_area || "").localeCompare(b.template_area || "");
      if (sortBy === "frequency") return (a.template_frequency || "").localeCompare(b.template_frequency || "");
      return 0;
    });

    // Group by area
    const groups = {};
    sorted.forEach(inst => {
      const area = inst.template_area || "General";
      if (!groups[area]) groups[area] = [];
      groups[area].push(inst);
    });
    return groups;
  }, [instances, areaFilter, sortBy, hideCompleted]);

  const hasAny = Object.keys(grouped).length > 0;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {showFilters && (
            <div className="relative animate-in fade-in slide-in-from-left-2 duration-200">
              <select
                value={areaFilter}
                onChange={e => setAreaFilter(e.target.value)}
                className="appearance-none pl-8 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
              >
                <option value="all">All Areas</option>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
            >
              <option value="due_time">Sort by: Due Time</option>
              <option value="status">Sort by: Status</option>
              <option value="area">Sort by: Area</option>
              <option value="frequency">Sort by: Frequency</option>
            </select>
          </div>
          <button 
            onClick={() => setShowFilters(v => !v)}
            title={showFilters ? "Hide Area Filter" : "Show Area Filter"}
            className={`p-2 border rounded-xl transition-colors cursor-pointer ${
              showFilters 
                ? "bg-teal-50 border-teal-200 text-teal-600 hover:bg-teal-100" 
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setHideCompleted(v => !v)}
            title={hideCompleted ? "Show Completed Checks" : "Hide Completed Checks"}
            className={`p-2 border rounded-xl transition-colors cursor-pointer ${
              hideCompleted 
                ? "bg-teal-50 border-teal-200 text-teal-600 hover:bg-teal-100" 
                : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
            }`}
          >
            <CheckSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Empty state */}
      {!hasAny ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center">
          <CheckSquare className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">No checks scheduled for this date</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Use the <strong>"Generate Today's Checks"</strong> button above to create checks from your active templates.</p>
        </div>
      ) : (
        <>
          {/* Area sections */}
          <div className="space-y-3">
            {Object.entries(grouped).map(([area, areaInstances]) => (
              <CheckAreaSection
                key={area}
                area={area}
                instances={areaInstances}
                templateItems={templateItems}
                completions={completions}
                onStart={onStart}
                onViewDetails={onViewDetails}
              />
            ))}
          </div>

          {/* Bottom info bar */}
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
            <Info className="w-4 h-4 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700 flex-1">
              Submitted items are reviewed by your manager. You'll be notified of any follow-up actions.
            </p>
            <button className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline shrink-0">
              Learn more <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}