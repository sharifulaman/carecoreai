import { Activity, CheckCircle2, AlertTriangle, Users, Home, UserX, MessageSquare, UserCog, GraduationCap, FileText } from "lucide-react";

function KPICard({ icon: Icon, label, value, sub, color, bg, border, onClick }) {
  return (
    <button onClick={onClick} className={`bg-white rounded-xl border ${border} p-2.5 flex items-start gap-2 text-left hover:shadow-md hover:border-slate-300 transition-all cursor-pointer w-full`}>
      <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-base font-black ${color} leading-tight`}>{value}</div>
        <div className="text-[10px] font-semibold text-slate-700 leading-tight">{label}</div>
        {sub && <div className="text-[9px] text-slate-400 truncate">{sub}</div>}
      </div>
    </button>
  );
}

export default function AnnexAKPIs({ onCardClick, readinessScore, passedChecks, totalChecks, criticalGaps, currentResidents, homes, mfhRecords, complaints, staff, educationRecords, healthProfiles, lastExportTime }) {
  const eduHealthCount = currentResidents.length > 0
    ? Math.round(((educationRecords.filter(e => currentResidents.some(r => r.id === e.resident_id)).length + healthProfiles.filter(h => currentResidents.some(r => r.id === h.resident_id)).length) / (currentResidents.length * 2)) * 100)
    : 0;

  const exportStatus = readinessScore >= 80 ? "Ready" : readinessScore >= 50 ? "Review Needed" : "Blocked";
  const exportColor = readinessScore >= 80 ? "text-green-600" : readinessScore >= 50 ? "text-amber-600" : "text-red-600";
  const exportBg = readinessScore >= 80 ? "bg-green-50" : readinessScore >= 50 ? "bg-amber-50" : "bg-red-50";
  const exportBorder = readinessScore >= 80 ? "border-green-100" : readinessScore >= 50 ? "border-amber-100" : "border-red-100";

  const readinessColor = readinessScore >= 80 ? "text-green-600" : readinessScore >= 50 ? "text-amber-600" : "text-red-600";
  const readinessBg = readinessScore >= 80 ? "bg-green-50" : readinessScore >= 50 ? "bg-amber-50" : "bg-red-50";
  const readinessBorder = readinessScore >= 80 ? "border-green-100" : readinessScore >= 50 ? "border-amber-100" : "border-red-100";

  const cards = [
    { icon: Activity, type: "readiness", label: "Annex A Readiness", value: `${readinessScore}%`, sub: readinessScore >= 80 ? "Ready" : readinessScore >= 50 ? "Review Needed" : "Critical", color: readinessColor, bg: readinessBg, border: readinessBorder },
    { icon: CheckCircle2, type: "checks", label: "Checks Passed", value: `${passedChecks}/${totalChecks}`, sub: "Pre-check items", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { icon: AlertTriangle, type: "gaps", label: "Critical Gaps", value: criticalGaps, sub: "Need attention", color: criticalGaps > 0 ? "text-red-600" : "text-green-600", bg: criticalGaps > 0 ? "bg-red-50" : "bg-green-50", border: criticalGaps > 0 ? "border-red-100" : "border-green-100" },
    { icon: Users, type: "residents", label: "Residents in Scope", value: currentResidents.length, sub: "Active", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { icon: Home, type: "homes", label: "Homes in Scope", value: homes.length, sub: "Registered", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { icon: UserX, type: "missing", label: "Missing Episodes", value: mfhRecords.length, sub: "Last 12 months", color: mfhRecords.length > 0 ? "text-amber-600" : "text-slate-600", bg: mfhRecords.length > 0 ? "bg-amber-50" : "bg-slate-50", border: mfhRecords.length > 0 ? "border-amber-100" : "border-slate-100" },
    { icon: MessageSquare, type: "complaints", label: "Complaints", value: complaints.length, sub: "Total logged", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { icon: UserCog, type: "staff", label: "Staff Records", value: staff.length, sub: "Active", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { icon: GraduationCap, type: "education", label: "Education / Health", value: `${eduHealthCount}%`, sub: "Coverage", color: eduHealthCount >= 80 ? "text-green-600" : eduHealthCount >= 50 ? "text-amber-600" : "text-red-600", bg: eduHealthCount >= 80 ? "bg-green-50" : eduHealthCount >= 50 ? "bg-amber-50" : "bg-red-50", border: eduHealthCount >= 80 ? "border-green-100" : eduHealthCount >= 50 ? "border-amber-100" : "border-red-100" },
    { icon: FileText, type: "export", label: "Export Status", value: exportStatus, sub: lastExportTime ? "Last exported" : "Not exported", color: exportColor, bg: exportBg, border: exportBorder },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-2">
      {cards.map((c, i) => (
        <KPICard key={i} icon={c.icon} label={c.label} value={c.value} sub={c.sub} color={c.color} bg={c.bg} border={c.border} onClick={() => onCardClick?.(c)} />
      ))}
    </div>
  );
}