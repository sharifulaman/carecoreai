import { Activity, Home, Users, Star, FileCheck, AlertTriangle, MessageSquare, ClipboardCheck } from "lucide-react";
import { STATUS_COLORS } from "@/lib/reg32Scoring";

function KPICard({ icon: Icon, label, value, sub, color, bg, border, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border ${border} p-3 flex items-start gap-2.5 text-left transition-all hover:shadow-md hover:border-slate-300 cursor-pointer w-full`}
    >
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`text-lg font-black ${color} leading-tight`}>{value}</div>
        <div className="text-[10px] font-semibold text-slate-700 leading-tight">{label}</div>
        {sub && <div className="text-[9px] text-slate-400 truncate">{sub}</div>}
      </div>
    </button>
  );
}

export default function Reg32KPIs({ scores, loading, onOpenModal }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const k = scores.kpis;
  const sc = STATUS_COLORS[scores.overallStatus];

  const evColor = k.evidenceCompleteness >= 80 ? "text-green-600" : k.evidenceCompleteness >= 60 ? "text-amber-600" : "text-red-600";
  const evBg = k.evidenceCompleteness >= 80 ? "bg-green-50" : k.evidenceCompleteness >= 60 ? "bg-amber-50" : "bg-red-50";
  const evBorder = k.evidenceCompleteness >= 80 ? "border-green-100" : k.evidenceCompleteness >= 60 ? "border-amber-100" : "border-red-100";

  const riskColor = k.unresolvedQualityRisks > 0 ? "text-red-600" : "text-green-600";
  const riskBg = k.unresolvedQualityRisks > 0 ? "bg-red-50" : "bg-green-50";
  const riskBorder = k.unresolvedQualityRisks > 0 ? "border-red-100" : "border-green-100";

  const laColor = k.laFeedbackCoverage >= 80 ? "text-green-600" : k.laFeedbackCoverage >= 50 ? "text-amber-600" : "text-red-600";
  const laBg = k.laFeedbackCoverage >= 80 ? "bg-green-50" : k.laFeedbackCoverage >= 50 ? "bg-amber-50" : "bg-red-50";
  const laBorder = k.laFeedbackCoverage >= 80 ? "border-green-100" : k.laFeedbackCoverage >= 50 ? "border-amber-100" : "border-red-100";

  const supColor = k.staffSupervisionCompliance >= 80 ? "text-green-600" : k.staffSupervisionCompliance >= 60 ? "text-amber-600" : "text-red-600";
  const supBg = k.staffSupervisionCompliance >= 80 ? "bg-green-50" : k.staffSupervisionCompliance >= 60 ? "bg-amber-50" : "bg-red-50";
  const supBorder = k.staffSupervisionCompliance >= 80 ? "border-green-100" : k.staffSupervisionCompliance >= 60 ? "border-amber-100" : "border-red-100";

  const cards = [
    { icon: Activity, label: "Overall Quality Score", value: `${scores.overallScore}/100`, sub: scores.overallStatus, color: sc.text, bg: sc.bg, border: sc.border, modalKey: "quality-score" },
    { icon: Home, label: "Homes Scanned", value: k.homesScanned, sub: "Included in scan", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", modalKey: "homes" },
    { icon: Users, label: "Young People Included", value: k.youngPeopleIncluded, sub: "In review", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", modalKey: "young-people" },
    { icon: Star, label: "Support Quality Rating", value: k.supportQualityRating, sub: "Overall rating", color: sc.text, bg: sc.bg, border: sc.border, modalKey: "quality-score" },
    { icon: FileCheck, label: "Evidence Completeness", value: `${k.evidenceCompleteness}%`, sub: "Of required items", color: evColor, bg: evBg, border: evBorder, modalKey: "evidence-readiness" },
    { icon: AlertTriangle, label: "Unresolved Quality Risks", value: k.unresolvedQualityRisks, sub: "Need attention", color: riskColor, bg: riskBg, border: riskBorder, modalKey: "risks" },
    { icon: MessageSquare, label: "LA Feedback Coverage", value: `${k.laFeedbackCoverage}%`, sub: "Completed", color: laColor, bg: laBg, border: laBorder, modalKey: "la-reviews" },
    { icon: ClipboardCheck, label: "Staff Supervision", value: `${k.staffSupervisionCompliance}%`, sub: "Compliance", color: supColor, bg: supBg, border: supBorder, modalKey: "supervision" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-2.5">
      {cards.map((c, i) => (
        <KPICard
          key={i}
          icon={c.icon}
          label={c.label}
          value={c.value}
          sub={c.sub}
          color={c.color}
          bg={c.bg}
          border={c.border}
          onClick={() => onOpenModal?.(c.modalKey)}
        />
      ))}
    </div>
  );
}