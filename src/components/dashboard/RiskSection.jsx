import { useNavigate } from "react-router-dom";
import { Shield, AlertTriangle, AlertCircle, FileX, Users, Heart, ChevronRight } from "lucide-react";

const RISK_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const RISK_BADGE = {
  critical: "bg-red-100 text-red-600 border border-red-200",
  high: "bg-amber-100 text-amber-700 border border-amber-200",
  medium: "bg-yellow-100 text-yellow-700 border border-yellow-200",
  low: "bg-green-100 text-green-700 border border-green-200",
};

const AVATAR_COLORS = [
  "bg-slate-200 text-slate-700",
  "bg-blue-100 text-blue-700",
  "bg-purple-100 text-purple-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];

function avatarColor(name = "") {
  const s = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}

const COLUMNS = [
  { key: "24_hours", title: "Young People (24h)", icon: Users,  color: "text-blue-600",   bar: "bg-blue-500"   },
  { key: "18_plus",  title: "18+ Residents",      icon: Users,  color: "text-teal-600",   bar: "bg-teal-500"   },
  { key: "care",     title: "Care Services",       icon: Heart,  color: "text-purple-600", bar: "bg-purple-500" },
  { key: "outreach", title: "Outreach",            icon: Users,  color: "text-orange-500", bar: "bg-orange-500" },
];

function ResidentCard({ resident, home, lastLog, navigate }) {
  const noLog = !lastLog;
  return (
    <button
      onClick={() => navigate("/residents")}
      className="w-full text-left flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor(resident.display_name)}`}>
        {resident.initials || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{resident.display_name}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize inline-block mt-0.5 ${RISK_BADGE[resident.risk_level] || RISK_BADGE.low}`}>
          {resident.risk_level}
        </span>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{home?.name || "—"}</p>
      </div>
      <span className={`text-[10px] font-semibold shrink-0 ${noLog ? "text-red-500" : "text-slate-400"}`}>
        {noLog ? "No logs" : "Logged"}
      </span>
    </button>
  );
}

function RiskColumn({ col, residents, homes, dailyLogs, navigate }) {
  const Icon = col.icon;
  const getHome = id => homes.find(h => h.id === id);
  const getLastLog = resId => {
    const logs = dailyLogs
      .filter(l => l.resident_id === resId)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    return logs[0] || null;
  };
  const sorted = [...residents]
    .sort((a, b) => (RISK_ORDER[a.risk_level] ?? 9) - (RISK_ORDER[b.risk_level] ?? 9))
    .slice(0, 4);

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`h-1 w-full ${col.bar}`} />
      <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-slate-100">
        <Icon className={`w-4 h-4 shrink-0 ${col.color}`} />
        <p className={`text-sm font-semibold flex-1 ${col.color}`}>{col.title}</p>
        <span className="text-sm font-bold text-slate-600">{sorted.length}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="flex-1 px-4 pb-1">
        {sorted.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No high-risk residents.</p>
        ) : (
          sorted.map(r => (
            <ResidentCard
              key={r.id}
              resident={r}
              home={getHome(r.home_id)}
              lastLog={getLastLog(r.id)}
              navigate={navigate}
            />
          ))
        )}
      </div>
      <div className="px-4 py-3 border-t border-slate-100">
        <button
          onClick={() => navigate("/residents")}
          className={`flex items-center gap-1 text-xs font-semibold ${col.color} hover:opacity-70 transition-opacity`}
        >
          View all ({residents.length}) <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function RiskSection({ homes, residents, dailyLogs }) {
  const navigate = useNavigate();

  const highRisk = residents.filter(r => r.risk_level === "high" || r.risk_level === "critical");
  const criticalCount = residents.filter(r => r.risk_level === "critical").length;
  const missingLogs = highRisk.filter(r => !dailyLogs.some(l => l.resident_id === r.id)).length;

  const getResidentsForType = (type) =>
    highRisk.filter(r => homes.find(h => h.id === r.home_id)?.type === type);

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <div className="flex flex-wrap items-center gap-4 mb-5">
        <div className="flex items-center gap-2 flex-1">
          <Shield className="w-5 h-5 text-slate-700" />
          <h2 className="text-base font-bold text-slate-900">Risk &amp; Safeguarding</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2.5 border border-amber-200 bg-amber-50 rounded-xl px-4 py-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-xl font-bold text-slate-800 leading-none">{highRisk.length}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">High risk items</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 border border-red-200 bg-red-50 rounded-xl px-4 py-2">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <div>
              <p className="text-xl font-bold text-slate-800 leading-none">{criticalCount}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Critical cases</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 border border-slate-200 bg-slate-50 rounded-xl px-4 py-2">
            <FileX className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-xl font-bold text-slate-800 leading-none">{missingLogs}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Missing logs</p>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {COLUMNS.map(col => (
          <RiskColumn
            key={col.key}
            col={col}
            residents={getResidentsForType(col.key)}
            homes={homes}
            dailyLogs={dailyLogs}
            navigate={navigate}
          />
        ))}
      </div>
    </section>
  );
}