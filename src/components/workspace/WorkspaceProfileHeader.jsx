import { useMemo } from "react";
import { MapPin, AlertTriangle, Heart, GraduationCap, User, ShieldAlert, Zap } from "lucide-react";
import { format, differenceInYears, differenceInMonths } from "date-fns";

function calcAgeDetailed(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  const years = differenceInYears(now, d);
  const months = differenceInMonths(now, d) % 12;
  return `${years} years ${months} months`;
}

function Badge({ icon: Icon, label, value, color = "slate" }) {
  const colors = {
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-green-50 text-green-700 border-green-200",
    teal: "bg-teal-50 text-teal-700 border-teal-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium ${colors[color]}`}>
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
        <div className="font-semibold mt-0.5">{value || "Not recorded"}</div>
      </div>
    </div>
  );
}

export default function WorkspaceProfileHeader({ resident, home, keyWorker, accidents, riskAssessments, mfhRecords, onTabChange }) {
  const age = calcAgeDetailed(resident.dob);
  const dobFormatted = resident.dob ? format(new Date(resident.dob), "dd MMM yyyy") : "Unknown";

  const openIncidents = useMemo(() => (accidents || []).filter(a => a.status === "open" || a.status === "Draft").length, [accidents]);
  const activeRisks = useMemo(() => (riskAssessments || []).filter(r => r.overall_rating === "high" || r.overall_rating === "medium").length, [riskAssessments]);
  const activeMFH = useMemo(() => (mfhRecords || []).filter(m => m.status === "active").length, [mfhRecords]);

  const allergyText = useMemo(() => {
    const allergies = resident.allergies || [];
    if (allergies.length === 0) return null;
    return allergies.map(a => a.allergen).join(", ");
  }, [resident]);

  const selfHarmRisk = useMemo(() => {
    const r = (riskAssessments || []).find(a => a.category === "suicide_self_harm");
    return r?.overall_rating || null;
  }, [riskAssessments]);

  const eduStatus = resident.education_status?.replace(/_/g, " ") || null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5 mb-4">
      <div className="flex items-start gap-5 flex-wrap">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center text-2xl font-bold shrink-0">
          {resident.photo_url
            ? <img src={resident.photo_url} alt="" className="w-full h-full rounded-2xl object-cover" />
            : (resident.initials || resident.display_name?.charAt(0) || "?")}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">{resident.display_name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
              resident.status === "active" ? "bg-green-100 text-green-700" :
              resident.status === "on_leave" ? "bg-amber-100 text-amber-700" :
              "bg-slate-100 text-slate-600"
            }`}>{resident.status || "Active"}</span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {age && <span>{age} (DOB: {dobFormatted})</span>}
          </p>
          {home && (
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
              <MapPin className="w-3.5 h-3.5" />
              {home.name}
            </p>
          )}

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mt-3">
            {allergyText && (
              <Badge icon={AlertTriangle} label="Allergies" value={allergyText} color="red" />
            )}
            {activeMFH > 0 && (
              <Badge icon={ShieldAlert} label="Missing Risk" value="Active" color="red" />
            )}
            {selfHarmRisk && (
              <Badge icon={Heart} label="Self-harm Risk" value={selfHarmRisk.charAt(0).toUpperCase() + selfHarmRisk.slice(1)} color={selfHarmRisk === "high" ? "red" : selfHarmRisk === "medium" ? "amber" : "green"} />
            )}
            {eduStatus && (
              <Badge icon={GraduationCap} label="Education" value={eduStatus.replace(/\b\w/g, c => c.toUpperCase())} color="blue" />
            )}
            {keyWorker && (
              <Badge icon={User} label="Key Worker" value={keyWorker.full_name} color="teal" />
            )}
            {openIncidents > 0 && (
              <Badge icon={AlertTriangle} label="Open Incidents" value={openIncidents} color="amber" />
            )}
            {activeRisks > 0 && (
              <Badge icon={Zap} label="Active Risks" value={activeRisks} color="amber" />
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => onTabChange("care-risk")}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
          >
            Quick Actions ▾
          </button>
          <button
            onClick={() => onTabChange("records")}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            View Records
          </button>
        </div>
      </div>
    </div>
  );
}