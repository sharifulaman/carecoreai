import { useNavigate } from "react-router-dom";
import { AlertTriangle, FileText, Bell, Download, ClipboardList, Database } from "lucide-react";

export default function QuickActionButtons({ onExport }) {
  const navigate = useNavigate();

  const actions = [
    { label: "Report Missing", icon: AlertTriangle, color: "text-blue-300", bg: "bg-blue-500/20", onClick: () => navigate("/24hours?tab=significant-events") },
    { label: "Significant Event", icon: FileText, color: "text-emerald-300", bg: "bg-emerald-500/20", onClick: () => navigate("/24hours?tab=significant-events") },
    { label: "Reg 4 Report", icon: ClipboardList, color: "text-violet-300", bg: "bg-violet-500/20", onClick: () => navigate("/24hours?tab=reg44") },
    { label: "Data Rectification", icon: Database, color: "text-orange-300", bg: "bg-orange-500/20", onClick: () => navigate("/24hours?tab=ofsted-notifications") },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-sm font-semibold text-white/90">Quick Actions</p>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={a.onClick}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left border border-white/10"
            >
              <div className={`w-7 h-7 rounded-lg ${a.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${a.color}`} />
              </div>
              <span className="text-xs font-medium text-white/90 leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>
      <button
        onClick={onExport}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-colors text-sm font-medium text-white/90"
      >
        <Download className="w-4 h-4" /> Report Compliance Pack
      </button>
    </div>
  );
}