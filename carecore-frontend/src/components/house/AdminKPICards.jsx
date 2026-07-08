import { AlertTriangle, FileWarning, FileText, CalendarClock } from "lucide-react";

const CARD_CONFIG = [
  { key: "overdue", title: "Overdue Bills", icon: AlertTriangle, iconBg: "bg-red-50", iconColor: "text-red-500", borderColor: "border-l-red-400" },
  { key: "dd", title: "Direct Debit Issues", icon: FileWarning, iconBg: "bg-amber-50", iconColor: "text-amber-500", borderColor: "border-l-amber-400" },
  { key: "docs", title: "Expiring Documents", icon: FileText, iconBg: "bg-purple-50", iconColor: "text-purple-500", borderColor: "border-l-purple-400" },
  { key: "leases", title: "Expiring Leases", icon: CalendarClock, iconBg: "bg-orange-50", iconColor: "text-orange-500", borderColor: "border-l-orange-400" },
];

export default function AdminKPICards({ overdueBills, overdueAmount, directDebitFails, expiringDocs, expiringLeases, onOverdueClick, onDDClick, onDocsClick, onLeasesClick }) {
  const data = [
    { key: "overdue", value: overdueBills, sub: `£${overdueAmount.toLocaleString()} Total`, onClick: onOverdueClick },
    { key: "dd", value: directDebitFails, sub: "Requiring attention", onClick: onDDClick },
    { key: "docs", value: expiringDocs, sub: "Documents expiring within 60 days", onClick: onDocsClick },
    { key: "leases", value: expiringLeases, sub: "Within 90 days", onClick: onLeasesClick },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {CARD_CONFIG.map((cfg, i) => {
        const Icon = cfg.icon;
        const d = data[i];
        return (
          <div
            key={cfg.key}
            onClick={d.onClick}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${cfg.borderColor} p-4 shadow-sm ${d.onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">{cfg.title}</p>
                <p className="text-3xl font-bold text-slate-900">{d.value}</p>
                <p className="text-xs text-slate-400 mt-1">{d.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}