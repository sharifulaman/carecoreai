import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, AlertTriangle, TrendingUp, Heart, FileText, Calendar, Eye, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import ComplianceIndicators from "@/components/compliance/ComplianceIndicators";
import { getServiceBadgeClass, getServiceDisplayLabel } from "./ServiceSelector";
import { X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function ResidentListModal({ title, residents, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {residents.length === 0
            ? <p className="text-sm text-muted-foreground text-center py-6">No records found.</p>
            : residents.map((r, i) => (
              <div key={r.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                  {r.initials || r.display_name?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{r.display_name || "—"}</p>
                  {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                </div>
                {r.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${r.badgeClass || "bg-red-100 text-red-700"}`}>{r.badge}</span>
                )}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, color, sub, urgent, onClick }) {
  const colorMap = {
    blue:   { icon: "text-blue-600 bg-blue-50",   border: "" },
    red:    { icon: "text-red-600 bg-red-50",     border: urgent ? "ring-2 ring-red-400" : "" },
    amber:  { icon: "text-amber-600 bg-amber-50", border: "" },
    purple: { icon: "text-purple-600 bg-purple-50", border: "" },
    teal:   { icon: "text-teal-600 bg-teal-50",   border: "" },
    slate:  { icon: "text-slate-500 bg-slate-100", border: "" },
  };
  const c = colorMap[color] || colorMap.slate;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`bg-card border border-border rounded-xl p-4 text-left transition-all w-full ${onClick ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"} ${c.border}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.icon}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold leading-none">{value}</div>
      <div className="text-xs text-muted-foreground font-medium mt-1.5 leading-tight">{title}</div>
      {sub && <div className={`text-xs mt-1 font-medium ${urgent && value > 0 ? "text-red-500" : "text-muted-foreground"}`}>{sub}</div>}
    </button>
  );
}

export default function ResidentsDashboardOverview({ residents, homes, staff, data, selectedService, onNavigate }) {
  const [modal, setModal] = useState(null);
  const navigate = useNavigate();
  const today = new Date().toISOString().split("T")[0];

  const activeResidents = useMemo(() => residents.filter(r => r.status === "active"), [residents]);

  const stats = useMemo(() => {
    const activeMissing = (data?.mfhRecords || []).filter(m => m.status === "active" && activeResidents.some(r => r.id === m.resident_id));
    const highRiskList = activeResidents.filter(r => ["high", "critical"].includes(r.risk_level));
    const exploitationHighList = (data?.exploitationRisks || []).filter(e => ["high", "critical"].includes(e.overall_risk_level) && activeResidents.some(r => r.id === e.resident_id));
    const reportsTodayList = (data?.visitReports || []).filter(r => r.date === today && activeResidents.some(res => res.id === r.resident_id));
    const appointmentsTodayList = (data?.appointments || []).filter(a => a.start_datetime?.split("T")[0] === today && activeResidents.some(r => r.id === a.resident_id));

    return {
      active: activeResidents.length,
      missing: activeMissing.length,
      missingList: activeMissing,
      highRisk: highRiskList.length,
      highRiskList,
      exploitationHigh: exploitationHighList.length,
      reportsToday: reportsTodayList.length,
      appointmentsToday: appointmentsTodayList.length,
    };
  }, [activeResidents, data, today]);

  // Recent residents (last updated / created)
  const recentResidents = useMemo(() => {
    return [...activeResidents]
      .sort((a, b) => (b.updated_date || b.created_date || "").localeCompare(a.updated_date || a.created_date || ""))
      .slice(0, 10);
  }, [activeResidents]);

  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  // YP ID generator
  const getYPId = (r) => r.employee_id || `YP-2026-${String(r.id).slice(-5).padStart(5, "0")}`;

  const openModal = (title, items) => setModal({ title, items });

  return (
    <div className="space-y-6 mt-4">
      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          title="Active Residents"
          value={stats.active}
          icon={Users}
          color="blue"
          sub={`across ${new Set(activeResidents.map(r => r.home_id)).size} homes`}
          onClick={() => openModal("Active Residents", activeResidents.map(r => ({ ...r, subtitle: homeMap[r.home_id]?.name })))}
        />
        <KPICard
          title="Currently Missing"
          value={stats.missing}
          icon={AlertTriangle}
          color="red"
          urgent={stats.missing > 0}
          sub={stats.missing > 0 ? `↑ ${stats.missing} vs yesterday` : "— 0 vs yesterday"}
          onClick={stats.missing > 0 ? () => openModal("Currently Missing", stats.missingList.map(m => {
            const res = activeResidents.find(r => r.id === m.resident_id);
            return { id: m.id, display_name: m.resident_name || res?.display_name || "Unknown", initials: res?.initials, subtitle: `Missing since: ${m.reported_missing_datetime ? format(new Date(m.reported_missing_datetime), "dd MMM yyyy HH:mm") : "—"}`, badge: "Active", badgeClass: "bg-red-100 text-red-700" };
          })) : undefined}
        />
        <KPICard
          title="High/Critical Risk"
          value={stats.highRisk}
          icon={TrendingUp}
          color="red"
          sub={stats.highRisk > 0 ? `↑ ${stats.highRisk} vs yesterday` : "— 0 vs yesterday"}
          onClick={stats.highRisk > 0 ? () => openModal("High/Critical Risk", stats.highRiskList.map(r => ({ ...r, subtitle: `Risk: ${r.risk_level}`, badge: r.risk_level, badgeClass: r.risk_level === "critical" ? "bg-red-700 text-white" : "bg-red-100 text-red-700" }))) : undefined}
        />
        <KPICard
          title="Exploitation High"
          value={stats.exploitationHigh}
          icon={Heart}
          color={stats.exploitationHigh > 0 ? "red" : "slate"}
          sub="— 0 vs yesterday"
        />
        <KPICard
          title="Reports Today"
          value={stats.reportsToday}
          icon={FileText}
          color="amber"
          sub="— 0% vs yesterday"
          onClick={stats.reportsToday > 0 ? () => onNavigate("visit-reports") : undefined}
        />
        <KPICard
          title="Appointments Today"
          value={stats.appointmentsToday}
          icon={Calendar}
          color="purple"
          sub="— 0% vs yesterday"
          onClick={stats.appointmentsToday > 0 ? () => onNavigate("appointments") : undefined}
        />
      </div>

      {/* Compliance Health Check */}
      <ComplianceIndicators residents={activeResidents} homes={homes} staff={staff} data={data} />

      {/* Recent Residents Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-foreground">Recent Residents</h3>
          <a href="#" onClick={(e) => { e.preventDefault(); onNavigate("yp"); }} className="text-xs text-primary font-semibold hover:underline">
            View all residents →
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/20">
                {["YP ID", "Name", "Age", "Service Type", "Home", "Key Worker", "Risk Level", "Status", "Placement Status", "Last Updated", "Action"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentResidents.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground text-sm">No residents found for selected filters.</td></tr>
              ) : recentResidents.map((r) => {
                const age = calcAge(r.dob);
                const keyWorker = staffMap[r.key_worker_id];
                const home = homeMap[r.home_id];
                const riskColors = { low: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", high: "bg-red-100 text-red-700", critical: "bg-red-700 text-white" };
                const statusColors = { active: "bg-green-100 text-green-700", on_leave: "bg-amber-100 text-amber-700", moved_on: "bg-blue-100 text-blue-700", archived: "bg-slate-100 text-slate-500" };

                return (
                  <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{getYPId(r)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                          {r.initials || r.display_name?.charAt(0) || "?"}
                        </div>
                        <span className="font-medium text-foreground">{r.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{age ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${getServiceBadgeClass(r.service_type)}`}>
                        {getServiceDisplayLabel(r.service_type) || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[120px]">{home?.name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-[120px]">{keyWorker?.full_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${riskColors[r.risk_level] || "bg-slate-100 text-slate-500"}`}>
                        {r.risk_level || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${statusColors[r.status] || "bg-slate-100 text-slate-500"}`}>
                        {r.status?.replace(/_/g, " ") || "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.placement_type?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.updated_date ? format(new Date(r.updated_date), "dd MMM yyyy HH:mm") : r.created_date ? format(new Date(r.created_date), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                           onClick={() => onNavigate("yp", r.display_name)}
                           className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                           title="View profile"
                         >
                           <Eye className="w-3.5 h-3.5" />
                         </button>
                         <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                             <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="More options">
                               <MoreHorizontal className="w-3.5 h-3.5" />
                             </button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                             <DropdownMenuItem onClick={() => onNavigate("yp", r.display_name)}>View Profile</DropdownMenuItem>
                             <DropdownMenuItem onClick={() => onNavigate("support-plans", r.id)}>View Support Plan</DropdownMenuItem>
                             <DropdownMenuItem onClick={() => onNavigate("daily-logs-tab")}>View Daily Logs</DropdownMenuItem>
                           </DropdownMenuContent>
                         </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ResidentListModal
          title={modal.title}
          residents={modal.items}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}