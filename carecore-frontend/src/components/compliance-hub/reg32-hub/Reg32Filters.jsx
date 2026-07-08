import { useState, useRef, useEffect } from "react";
import { Calendar, Home, Clock, ChevronDown, Check } from "lucide-react";

const SERVICE_TYPES = [
  { value: "all", label: "All Service Types" },
  { value: "care", label: "Children's" },
  { value: "24_hours", label: "24 Hr Supported" },
  { value: "outreach", label: "Outreach" },
  { value: "18_plus", label: "18 Plus" },
];

const QUALITY_DOMAINS = [
  { value: "all", label: "All Domains" },
  { value: "safety", label: "Safety & Safeguarding" },
  { value: "relationships", label: "Relationships & Voice" },
  { value: "health", label: "Health & Wellbeing" },
  { value: "education", label: "Education & Outcomes" },
  { value: "staffing", label: "Staffing & Supervision" },
  { value: "complaints", label: "Complaints & Learning" },
];

const RISK_THRESHOLDS = [
  { value: "all", label: "All Risk Levels" },
  { value: "critical", label: "Critical only" },
  { value: "high", label: "High and above" },
  { value: "medium", label: "Medium and above" },
];

function HomesMultiSelect({ homes, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  const label = selected.length === 0 ? "All Homes" : selected.length === 1 ? homes.find(h => h.id === selected[0])?.name || "1 home" : `${selected.length} homes selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 h-8 px-3 text-xs border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
      >
        <Home className="w-3.5 h-3.5 text-slate-400" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 sticky top-0 bg-white">
            <span className="text-xs font-semibold text-slate-700">{homes.length} homes</span>
            <button onClick={() => onChange([])} className="text-[10px] text-blue-600 hover:underline">Clear</button>
          </div>
          {homes.map(h => (
            <button
              key={h.id}
              onClick={() => toggle(h.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 text-left"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center ${selected.includes(h.id) ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                {selected.includes(h.id) && <Check className="w-3 h-3 text-white" />}
              </span>
              <span className="truncate">{h.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Reg32Filters({ filters, setFilters, homes, lastScan }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2 flex-wrap">
      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <Calendar className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="date"
          value={filters.dateFrom}
          onChange={e => setFilters(p => ({ ...p, dateFrom: e.target.value }))}
          className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
        />
        <span className="text-slate-400 text-xs">→</span>
        <input
          type="date"
          value={filters.dateTo}
          onChange={e => setFilters(p => ({ ...p, dateTo: e.target.value }))}
          className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
        />
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Homes multi-select */}
      <HomesMultiSelect homes={homes} selected={filters.homeIds} onChange={(ids) => setFilters(p => ({ ...p, homeIds: ids }))} />

      {/* Service type */}
      <select
        value={filters.serviceType}
        onChange={e => setFilters(p => ({ ...p, serviceType: e.target.value }))}
        className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
      >
        {SERVICE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Quality domain */}
      <select
        value={filters.qualityDomain}
        onChange={e => setFilters(p => ({ ...p, qualityDomain: e.target.value }))}
        className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
      >
        {QUALITY_DOMAINS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {/* Risk threshold */}
      <select
        value={filters.riskThreshold}
        onChange={e => setFilters(p => ({ ...p, riskThreshold: e.target.value }))}
        className="h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
      >
        {RISK_THRESHOLDS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      <div className="w-px h-6 bg-slate-200" />

      {/* Last scan */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="w-3.5 h-3.5" />
        <span>Last scan: {lastScan || "—"}</span>
      </div>

      {(filters.homeIds.length > 0 || filters.serviceType !== "all" || filters.qualityDomain !== "all" || filters.riskThreshold !== "all") && (
        <button
          onClick={() => setFilters(p => ({ ...p, homeIds: [], serviceType: "all", qualityDomain: "all", riskThreshold: "all" }))}
          className="ml-auto text-xs text-blue-600 hover:underline"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}