import { X, AlertTriangle, Home, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo } from "react";

const RISK_CONFIG = {
  Critical: {
    title: "Critical Homes",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    header: "bg-red-600",
    description: "Homes with critical compliance or safeguarding issues requiring immediate attention.",
    filter: (home, data) => {
      const openIncidents = data.incidents.filter(i => i.home_id === home.id && (i.status === "open" || i.status === "under_investigation")).length;
      const activeMissing = data.missingFromHome.filter(m => m.home_id === home.id && m.status === "active").length;
      const criticalSG = data.safeguarding.filter(s => s.home_id === home.id && s.immediate_risk === "critical" && s.status !== "closed").length;
      return openIncidents + activeMissing + criticalSG >= 2;
    },
    getIssues: (home, data) => {
      const issues = [];
      const openInc = data.incidents.filter(i => i.home_id === home.id && (i.status === "open" || i.status === "under_investigation")).length;
      const missing = data.missingFromHome.filter(m => m.home_id === home.id && m.status === "active").length;
      const sg = data.safeguarding.filter(s => s.home_id === home.id && s.status !== "closed").length;
      if (openInc) issues.push(`${openInc} open incident${openInc > 1 ? "s" : ""}`);
      if (missing) issues.push(`${missing} missing episode${missing > 1 ? "s" : ""}`);
      if (sg) issues.push(`${sg} safeguarding case${sg > 1 ? "s" : ""}`);
      return issues;
    }
  },
  "At Risk": {
    title: "At Risk Homes",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    header: "bg-orange-500",
    description: "Homes with notable compliance gaps or unresolved issues needing prompt attention.",
    filter: (home, data) => {
      const openIncidents = data.incidents.filter(i => i.home_id === home.id && (i.status === "open" || i.status === "under_investigation")).length;
      const highRiskYP = data.residents.filter(r => r.home_id === home.id && (r.risk_level === "high" || r.risk_level === "critical")).length;
      return openIncidents === 1 || (highRiskYP >= 2 && openIncidents < 2);
    },
    getIssues: (home, data) => {
      const issues = [];
      const openInc = data.incidents.filter(i => i.home_id === home.id && (i.status === "open" || i.status === "under_investigation")).length;
      const highRisk = data.residents.filter(r => r.home_id === home.id && (r.risk_level === "high" || r.risk_level === "critical")).length;
      if (openInc) issues.push(`${openInc} open incident`);
      if (highRisk) issues.push(`${highRisk} high-risk YP`);
      return issues;
    }
  },
  Watch: {
    title: "Watch Homes",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    header: "bg-amber-500",
    description: "Homes with minor concerns that need monitoring but are not immediately critical.",
    filter: (home, data) => {
      const pendingChecks = data.homeChecks.filter(c => c.home_id === home.id && c.manager_review_status === "pending").length;
      const highRiskYP = data.residents.filter(r => r.home_id === home.id && r.risk_level === "high").length;
      return pendingChecks > 0 || highRiskYP === 1;
    },
    getIssues: (home, data) => {
      const issues = [];
      const pendingChecks = data.homeChecks.filter(c => c.home_id === home.id && c.manager_review_status === "pending").length;
      const highRisk = data.residents.filter(r => r.home_id === home.id && r.risk_level === "high").length;
      if (pendingChecks) issues.push(`${pendingChecks} pending check${pendingChecks > 1 ? "s" : ""}`);
      if (highRisk) issues.push(`${highRisk} high-risk YP`);
      return issues;
    }
  },
  Healthy: {
    title: "Healthy Homes",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    header: "bg-green-600",
    description: "Homes operating within normal parameters with no outstanding compliance concerns.",
    filter: (home, data) => {
      const openIncidents = data.incidents.filter(i => i.home_id === home.id && (i.status === "open" || i.status === "under_investigation")).length;
      const activeMissing = data.missingFromHome.filter(m => m.home_id === home.id && m.status === "active").length;
      const pendingChecks = data.homeChecks.filter(c => c.home_id === home.id && c.manager_review_status === "pending").length;
      const criticalYP = data.residents.filter(r => r.home_id === home.id && (r.risk_level === "high" || r.risk_level === "critical")).length;
      return openIncidents === 0 && activeMissing === 0 && pendingChecks === 0 && criticalYP === 0;
    },
    getIssues: () => ["No outstanding issues"]
  },
};

export default function RiskSummaryModal({ type, homes, data, onClose }) {
  const config = RISK_CONFIG[type];

  const matchedHomes = useMemo(() => {
    if (!config) return [];
    return homes.filter(h => config.filter(h, data));
  }, [homes, data, config]);

  if (!config) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className={`${config.header} px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-white" />
            <h2 className="text-sm font-bold text-white">{config.title}</h2>
            <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{matchedHomes.length}</span>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className={`px-5 py-2.5 text-xs text-slate-500 border-b border-slate-100 ${config.bg}`}>
          {config.description}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          {matchedHomes.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No homes match this category</div>
          ) : (
            matchedHomes.map(home => {
              const issues = config.getIssues(home, data);
              const residents = data.residents.filter(r => r.home_id === home.id && r.status === "active");
              return (
                <div key={home.id} className="px-5 py-3 hover:bg-slate-50 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{home.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{residents.length} resident{residents.length !== 1 ? "s" : ""} · {home.type?.replace(/_/g, " ") || "—"}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {issues.map((issue, i) => (
                        <span key={i} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.bg} ${config.color} ${config.border}`}>
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                  <Link to="/homes-hub" className="shrink-0 text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5 mt-1">
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center">
          <Link to="/compliance-hub" className="text-xs text-blue-600 hover:underline font-medium">Open Compliance Hub →</Link>
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Close</button>
        </div>
      </div>
    </div>
  );
}