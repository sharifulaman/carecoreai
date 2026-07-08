import { AlertTriangle, CheckCircle2, TrendingUp, Share2, Trash2, Download } from "lucide-react";

const KPI_CONFIG = [
  { key: "totalEvents", label: "Total Events", icon: CheckCircle2, color: "bg-blue-50 text-blue-700", iconColor: "text-blue-500" },
  { key: "highRiskEvents", label: "High-Risk Events", icon: AlertTriangle, color: "bg-red-50 text-red-700", iconColor: "text-red-500" },
  { key: "approvalActions", label: "Approval Actions", icon: CheckCircle2, color: "bg-green-50 text-green-700", iconColor: "text-green-500" },
  { key: "escalations", label: "Escalations", icon: TrendingUp, color: "bg-purple-50 text-purple-700", iconColor: "text-purple-500" },
  { key: "deletedRestored", label: "Deleted / Restored", icon: Trash2, color: "bg-orange-50 text-orange-700", iconColor: "text-orange-500" },
  { key: "exportsDownloads", label: "Exports / Downloads", icon: Download, color: "bg-cyan-50 text-cyan-700", iconColor: "text-cyan-500" },
];

export default function AuditKPICards({ kpis, filters, setFilters }) {
  return (
    <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
      {KPI_CONFIG.map(config => {
        const Icon = config.icon;
        const value = kpis[config.key];
        return (
          <button
            key={config.key}
            onClick={() => {
              // TODO: Implement filter clicking to update main table
            }}
            className={`${config.color} rounded-lg p-3 text-left hover:shadow-md transition-shadow border border-transparent hover:border-current/20`}
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-2xl font-bold">{value.toLocaleString()}</p>
                <p className="text-xs font-medium mt-1 opacity-75">{config.label}</p>
              </div>
              <Icon className={`w-5 h-5 shrink-0 ${config.iconColor}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
}