import { ClipboardList, Bell, FileText, Users, MessageSquare, BookOpen, AlertTriangle } from "lucide-react";

const REPORT_TYPES = [
  { id: "reg32", label: "Reg 32 — Quality Review", icon: ClipboardList, badgeType: "due" },
  { id: "reg33", label: "Reg 33 — Notifications", icon: Bell, badgeType: "count", countKey: "reg33" },
  { id: "sop", label: "Statement of Purpose", icon: FileText, badgeType: "version", version: "v2.1" },
  { id: "workforce", label: "Workforce Plan", icon: Users, badgeType: "outdated" },
  { id: "complaints", label: "Complaints Log", icon: MessageSquare, badgeType: "count", countKey: "complaints" },
  { id: "childrens_guide", label: "Children's Guide", icon: BookOpen, badgeType: "version", version: "v1.3" },
  { id: "reg27", label: "Reg 27 Changes", icon: AlertTriangle, badgeType: "alert" },
];

function Badge({ type, count, version }) {
  if (type === "due") return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-white">Due</span>;
  if (type === "count" && count) return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">{count} open</span>;
  if (type === "version") return <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">{version}</span>;
  if (type === "outdated") return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white">Outdated</span>;
  if (type === "alert") return <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">!</span>;
  return null;
}

export default function ReportTypeSelector({ active, onChange, counts = {} }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Select Report Type</p>
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map((rt) => {
          const Icon = rt.icon;
          const isActive = active === rt.id;
          const count = counts[rt.countKey] || 0;
          return (
            <button
              key={rt.id}
              onClick={() => onChange(rt.id)}
              className={[
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card border-border text-foreground hover:bg-muted",
              ].join(" ")}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {rt.label}
              <Badge type={rt.badgeType} count={count} version={rt.version} />
            </button>
          );
        })}
      </div>
    </div>
  );
}