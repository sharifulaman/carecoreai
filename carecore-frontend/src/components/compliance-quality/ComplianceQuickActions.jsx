import { Plus, Upload, CalendarDays, FolderOpen, Download, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ComplianceQuickActions({ onExportPack, onOpenReport }) {
  const navigate = useNavigate();

  const actions = [
    {
      icon: Plus,
      label: "Create New Report",
      action: () => onOpenReport("reg32"),
    },
    {
      icon: Upload,
      label: "Upload Evidence",
      action: () => onOpenReport("reg26"),
    },
    {
      icon: CalendarDays,
      label: "Schedule Review",
      action: () => onOpenReport("reg32"),
    },
    {
      icon: FolderOpen,
      label: "Document Library",
      action: () => navigate("/compliance-hub"),
    },
    {
      icon: Download,
      label: "Export Pack",
      action: onExportPack,
    },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-1">
      <h3 className="text-sm font-bold text-foreground mb-3">Quick Actions</h3>
      {actions.map(({ icon: Icon, label, action }) => (
        <button
          key={label}
          onClick={action}
          className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 text-left transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
            </span>
            <span className="text-sm text-foreground">{label}</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}