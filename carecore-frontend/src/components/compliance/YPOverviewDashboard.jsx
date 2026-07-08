import { useMemo, useState } from "react";
import { AlertTriangle, Users, TrendingUp, Heart, FileText, Calendar, X } from "lucide-react";
import ComplianceIndicators from "./ComplianceIndicators";
import HomesComplianceOverview from "./HomesComplianceOverview";

function calcAge(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

// Modal showing a list of residents
function ResidentListModal({ title, residents, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {residents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No records found.</p>
          ) : (
            <div className="space-y-2">
              {residents.map((r, i) => (
                <div key={r.id || i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                    {r.initials || r.display_name?.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.display_name || r.name || "—"}</p>
                    {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                  </div>
                  {r.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${r.badgeClass || "bg-red-100 text-red-700"}`}>
                      {r.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, onClick, urgent }) {
  const colorMap = {
    primary: "text-blue-600 bg-blue-50",
    destructive: "text-red-600 bg-red-50",
    secondary: "text-slate-500 bg-slate-100",
    amber: "text-amber-600 bg-amber-50",
    purple: "text-purple-600 bg-purple-50",
  };
  const iconClass = colorMap[color] || colorMap.secondary;

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`bg-card border border-border rounded-xl p-4 text-left transition-colors ${onClick ? "hover:bg-muted/40 cursor-pointer" : "cursor-default"} ${urgent ? "ring-2 ring-red-400" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium leading-tight">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </button>
  );
}

export default function YPOverviewDashboard({ residents, homes, staff, data }) {
  const activeResidents = residents.filter(r => r.status === "active");
  const [modal, setModal] = useState(null); // { title, items }

  const today = new Date().toISOString().split("T")[0];

  const stats = useMemo(() => {
    const activeMissing = (data?.mfhRecords || []).filter(m => m.status === "active");
    const highRiskList = activeResidents.filter(r => ["high", "critical"].includes(r.risk_level));
    const exploitationHighList = (data?.exploitationRisks || []).filter(e => ["high", "critical"].includes(e.overall_risk_level));
    const reportsTodayList = (data?.visitReports || []).filter(r => r.date === today);
    const appointmentsTodayList = (data?.appointments || []).filter(a => a.start_datetime?.split("T")[0] === today);

    return {
      active: activeResidents.length,
      activeList: activeResidents,
      missing: activeMissing.length,
      missingList: activeMissing,
      highRisk: highRiskList.length,
      highRiskList,
      exploitationHigh: exploitationHighList.length,
      exploitationHighList,
      reportsToday: reportsTodayList.length,
      reportsTodayList,
      appointmentsToday: appointmentsTodayList.length,
      appointmentsTodayList,
    };
  }, [activeResidents, data, today]);

  const openMissingModal = () => {
    const items = stats.missingList.map(m => {
      const res = activeResidents.find(r => r.id === m.resident_id);
      return {
        id: m.id,
        display_name: m.resident_name || res?.display_name || "Unknown",
        initials: res?.initials || m.resident_name?.charAt(0) || "?",
        subtitle: `Missing since: ${m.reported_missing_datetime ? new Date(m.reported_missing_datetime).toLocaleString("en-GB") : "—"}`,
        badge: "Active",
        badgeClass: "bg-red-100 text-red-700",
      };
    });
    setModal({ title: "Currently Missing", items });
  };

  const openHighRiskModal = () => {
    const items = stats.highRiskList.map(r => ({
      ...r,
      subtitle: `Risk: ${r.risk_level}`,
      badge: r.risk_level,
      badgeClass: r.risk_level === "critical" ? "bg-red-700 text-white" : "bg-red-100 text-red-700",
    }));
    setModal({ title: "High / Critical Risk Residents", items });
  };

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Active Residents" value={stats.active} icon={Users} color="primary" />
        <StatCard
          title="Currently Missing"
          value={stats.missing}
          icon={AlertTriangle}
          color={stats.missing > 0 ? "destructive" : "secondary"}
          urgent={stats.missing > 0}
          onClick={stats.missing > 0 ? openMissingModal : undefined}
        />
        <StatCard
          title="High/Critical Risk"
          value={stats.highRisk}
          icon={TrendingUp}
          color="destructive"
          onClick={stats.highRisk > 0 ? openHighRiskModal : undefined}
        />
        <StatCard title="Exploitation High" value={stats.exploitationHigh} icon={Heart} color="destructive" />
        <StatCard title="Reports Today" value={stats.reportsToday} icon={FileText} color="amber" />
        <StatCard title="Appointments Today" value={stats.appointmentsToday} icon={Calendar} color="purple" />
      </div>

      {/* Compliance Health Grid */}
      <ComplianceIndicators residents={activeResidents} homes={homes} staff={staff} data={data} />

      {/* Homes Compliance Overview */}
      <HomesComplianceOverview homes={homes} data={data} />

      {/* Modal */}
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