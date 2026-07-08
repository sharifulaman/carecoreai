import { AlertTriangle, FileWarning, Clock, Calendar, ShieldCheck, ClipboardList } from "lucide-react";

const CARDS = [
  { key: "critical", label: "Critical Overdue", desc: "> 30 days overdue", icon: AlertTriangle, bg: "bg-red-50", border: "border-red-200", iconColor: "text-red-500", valColor: "text-red-700" },
  { key: "expired", label: "Expired", desc: "Past expiry date", icon: FileWarning, bg: "bg-rose-50", border: "border-rose-200", iconColor: "text-rose-500", valColor: "text-rose-700" },
  { key: "due30", label: "Due in 30 Days", desc: "Urgent renewal", icon: Clock, bg: "bg-amber-50", border: "border-amber-200", iconColor: "text-amber-500", valColor: "text-amber-700" },
  { key: "due90", label: "Due in 90 Days", desc: "Upcoming renewals", icon: Calendar, bg: "bg-yellow-50", border: "border-yellow-200", iconColor: "text-yellow-600", valColor: "text-yellow-700" },
  { key: "current", label: "Current", desc: "All compliant", icon: ShieldCheck, bg: "bg-green-50", border: "border-green-200", iconColor: "text-green-500", valColor: "text-green-700" },
  { key: "audit", label: "Open Audit Actions", desc: "Follow-up pending", icon: ClipboardList, bg: "bg-blue-50", border: "border-blue-200", iconColor: "text-blue-500", valColor: "text-blue-700" },
];

export default function ComplianceKPICards({ counts, activeFilter, onFilter }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {CARDS.map(card => {
        const Icon = card.icon;
        const isActive = activeFilter === card.key;
        return (
          <button
            key={card.key}
            onClick={() => onFilter(isActive ? null : card.key)}
            className={`${card.bg} ${card.border} border rounded-2xl p-4 text-left transition-all hover:shadow-md group relative ${isActive ? "ring-2 ring-offset-1 ring-teal-400" : ""}`}
          >
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-5 h-5 ${card.iconColor}`} />
              <span className="text-slate-300 text-xs group-hover:text-slate-400">›</span>
            </div>
            <div className={`text-3xl font-bold ${card.valColor} leading-none`}>{counts[card.key] ?? 0}</div>
            <div className="text-xs font-semibold text-slate-600 mt-1.5">{card.label}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{card.desc}</div>
          </button>
        );
      })}
    </div>
  );
}