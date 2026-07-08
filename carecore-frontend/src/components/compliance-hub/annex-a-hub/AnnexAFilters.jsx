import { Calendar, Home, Layers, Shield, Flag, Clock, RefreshCw } from "lucide-react";

export default function AnnexAFilters({
  reportPeriodMonths, setReportPeriodMonths,
  selectedHome, setSelectedHome, homes,
  serviceType, setServiceType,
  sectionFilter, setSectionFilter,
  riskLevel, setRiskLevel,
  statusFilter, setStatusFilter,
  lastScan, onRefreshScan,
}) {
  const sections = [
    { value: "all", label: "All Sections" },
    { value: "overview", label: "1. Overview & Readiness" },
    { value: "provider", label: "2. Provider Details" },
    { value: "children", label: "3. Children & Placements" },
    { value: "incidents", label: "4. Incidents, Missing & Complaints" },
    { value: "safeguarding", label: "5. Safeguarding" },
    { value: "staffing", label: "6. Staffing" },
    { value: "education", label: "7. Education, Employment & Health" },
    { value: "premises", label: "8. Organisation & Premises" },
    { value: "support", label: "9. Key People & Support Services" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Reporting Period */}
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={reportPeriodMonths}
            onChange={(e) => setReportPeriodMonths(parseInt(e.target.value))}
            className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white"
          >
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
            <option value={24}>Last 24 months</option>
          </select>
        </div>

        {/* Home Selector */}
        <div className="flex items-center gap-1.5">
          <Home className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedHome}
            onChange={(e) => setSelectedHome(e.target.value)}
            className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white min-w-[120px]"
          >
            <option value="">All Homes</option>
            {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>

        {/* Service Type */}
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white"
          >
            <option value="all">All Service Types</option>
            <option value="outreach">Outreach</option>
            <option value="eighteen_plus">18+ Supported</option>
            <option value="twenty_four_hours">24 Hours</option>
          </select>
        </div>

        {/* Section / Domain */}
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white min-w-[140px]"
          >
            {sections.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Risk Level */}
        <div className="flex items-center gap-1.5">
          <Flag className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs border border-slate-200 rounded-lg px-2 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready</option>
            <option value="review">Review Needed</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {/* Last Scan */}
        <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-500">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Last scan: {lastScan}</span>
          <button
            onClick={onRefreshScan}
            className="ml-1 flex items-center gap-1 px-2 py-1 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>
    </div>
  );
}