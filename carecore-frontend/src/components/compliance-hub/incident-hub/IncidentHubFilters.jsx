import { useState, useMemo } from "react";
import { Calendar, Search, ChevronDown, X } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfToday } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const DATE_PRESETS = [
  { label: "Today", get: () => ({ from: startOfToday(), to: new Date() }) },
  { label: "Last 7 days", get: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: "Last 30 days", get: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: "This Month", get: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Last Month", get: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth() - 1, 1); return { from: s, to: endOfMonth(s) }; } },
];

const INCIDENT_TYPES = [
  { value: "all", label: "All Types" },
  { value: "safeguarding_concern", label: "Safeguarding Concern" },
  { value: "police_missing", label: "Missing Episode" },
  { value: "medical_emergency", label: "Medical Emergency" },
  { value: "serious_injury", label: "Serious Injury" },
  { value: "restraint", label: "Behaviour / Restraint" },
  { value: "police_behaviour_management", label: "Police Involvement" },
  { value: "fire_evacuation", label: "Fire / Evacuation" },
  { value: "other", label: "Other" },
];

const SEVERITIES = [
  { value: "all", label: "All Severities" },
  { value: "Critical", label: "Critical" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

const STATUSES = [
  { value: "all", label: "All Statuses" },
  { value: "draft", label: "Draft / Logged" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "In Review" },
  { value: "closed", label: "Closed" },
];

function MiniSelect({ value, onChange, options, className }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={`text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-400 ${className}`}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function IncidentHubFilters({ filters, setFilters, homes }) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [homeSearch, setHomeSearch] = useState("");

  const dateLabel = filters.dateFrom && filters.dateTo
    ? `${format(filters.dateFrom, "d MMM yyyy")} — ${format(filters.dateTo, "d MMM yyyy")}`
    : "Select date range";

  const filteredHomes = useMemo(() => {
    if (!homeSearch) return homes;
    const q = homeSearch.toLowerCase();
    return homes.filter(h => h.name?.toLowerCase().includes(q));
  }, [homes, homeSearch]);

  const toggleHome = (id) => {
    setFilters(p => {
      const isSelected = p.homeIds.includes(id);
      return {
        ...p,
        homeIds: isSelected ? p.homeIds.filter(h => h !== id) : [...p.homeIds, id],
      };
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 flex-wrap">
      {/* Date Range */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-700">{dateLabel}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r border-slate-100 p-3 flex flex-col gap-1 min-w-[130px]">
              <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Quick Select</p>
              {DATE_PRESETS.map(preset => (
                <button key={preset.label}
                  onClick={() => { const r = preset.get(); setFilters(f => ({ ...f, dateFrom: r.from, dateTo: r.to })); setDatePickerOpen(false); }}
                  className="text-xs text-left px-2 py-1.5 rounded hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors">
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="p-2">
              <CalendarUI mode="range" selected={{ from: filters.dateFrom, to: filters.dateTo }}
                onSelect={(range) => { if (range?.from) setFilters(f => ({ ...f, dateFrom: range.from, dateTo: range.to || range.from })); if (range?.from && range?.to) setDatePickerOpen(false); }}
                numberOfMonths={2} initialFocus />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Homes Multi-select */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <span className="text-slate-700">Homes: {filters.homeIds.length === 0 ? `All (${homes.length})` : `${filters.homeIds.length} selected`}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus placeholder="Search homes..." value={homeSearch} onChange={e => setHomeSearch(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
          </div>
          <div className="max-h-60 overflow-y-auto">
            <button onClick={() => setFilters(f => ({ ...f, homeIds: [] }))}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 ${filters.homeIds.length === 0 ? "bg-blue-50 text-blue-700 font-semibold" : "text-slate-600"}`}>
              All Homes ({homes.length})
            </button>
            {filteredHomes.map(h => (
              <button key={h.id} onClick={() => toggleHome(h.id)}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center justify-between ${filters.homeIds.includes(h.id) ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}>
                <span className="truncate">{h.name}</span>
                {filters.homeIds.includes(h.id) && <span className="text-blue-600">✓</span>}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Incident Type */}
      <MiniSelect value={filters.incidentType} onChange={v => setFilters(p => ({ ...p, incidentType: v }))} options={INCIDENT_TYPES} />

      {/* Severity */}
      <MiniSelect value={filters.severity} onChange={v => setFilters(p => ({ ...p, severity: v }))} options={SEVERITIES} />

      {/* Status */}
      <MiniSelect value={filters.status} onChange={v => setFilters(p => ({ ...p, status: v }))} options={STATUSES} />

      {/* Reg 27 Toggle */}
      <button onClick={() => setFilters(p => ({ ...p, reg27Only: !p.reg27Only }))}
        className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${filters.reg27Only ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`}>
        Reg 27 / Ofsted Trigger
      </button>

      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input placeholder="Search resident, home or incident ID..."
          value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
          className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
      </div>

      {/* Reset */}
      {(filters.homeIds.length > 0 || filters.incidentType !== "all" || filters.severity !== "all" || filters.status !== "all" || filters.reg27Only || filters.search) && (
        <button onClick={() => setFilters({ dateFrom: subDays(new Date(), 30), dateTo: new Date(), homeIds: [], incidentType: "all", severity: "all", status: "all", reg27Only: false, search: "" })}
          className="text-xs text-slate-500 hover:text-red-600 flex items-center gap-1">
          <X className="w-3 h-3" /> Reset
        </button>
      )}
    </div>
  );
}