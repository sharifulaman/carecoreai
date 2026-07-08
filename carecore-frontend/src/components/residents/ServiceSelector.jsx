import { Users, MapPin, Building2, Home } from "lucide-react";

const SERVICES = [
  {
    key: "all",
    label: "All Residents",
    icon: Users,
    badge: null,
    color: "teal",
  },
  {
    key: "outreach",
    label: "Outreach",
    icon: MapPin,
    badge: "YP",
    color: "blue",
  },
  {
    key: "eighteen_plus",
    label: "18+ Accommodation",
    icon: Building2,
    badge: "YP",
    color: "purple",
  },
  {
    key: "twenty_four_hours",
    label: "24 Hours Housing",
    icon: Home,
    badge: "YP",
    color: "amber",
  },
];

const COLOR_MAP = {
  teal:   { active: "border-teal-500 bg-teal-50 text-teal-700", badge: "bg-teal-500 text-white", icon: "text-teal-500" },
  blue:   { active: "border-blue-500 bg-blue-50 text-blue-700",  badge: "bg-blue-500 text-white",  icon: "text-blue-500" },
  purple: { active: "border-purple-500 bg-purple-50 text-purple-700", badge: "bg-purple-500 text-white", icon: "text-purple-500" },
  amber:  { active: "border-amber-500 bg-amber-50 text-amber-700",  badge: "bg-amber-500 text-white",  icon: "text-amber-500" },
};

export default function ServiceSelector({ selected, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {SERVICES.map((svc) => {
        const isActive = selected === svc.key;
        const colors = COLOR_MAP[svc.color];
        const Icon = svc.icon;

        return (
          <button
            key={svc.key}
            onClick={() => onChange(svc.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all whitespace-nowrap ${
              isActive
                ? `${colors.active} border-2 shadow-sm`
                : "border-border bg-card text-muted-foreground hover:border-border hover:bg-muted/40"
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${isActive ? colors.icon : "text-muted-foreground"}`} />
            <span>{svc.label}</span>
            {svc.badge && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? colors.badge : "bg-muted text-muted-foreground"}`}>
                {svc.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* Info hint */}
      <div className="ml-auto hidden lg:flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 border border-border rounded-lg px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        All data below reflects the selected service type.
      </div>
    </div>
  );
}

export function getServiceLabel(key) {
  return SERVICES.find(s => s.key === key)?.label || "All Residents";
}

export function getServiceBadgeClass(serviceType) {
  const map = {
    outreach: "bg-blue-100 text-blue-700",
    eighteen_plus: "bg-purple-100 text-purple-700",
    twenty_four_hours: "bg-amber-100 text-amber-700",
  };
  return map[serviceType] || "bg-slate-100 text-slate-600";
}

export function getServiceDisplayLabel(serviceType) {
  const map = {
    outreach: "Outreach",
    eighteen_plus: "18+ Accommodation",
    twenty_four_hours: "24 Hours Housing",
  };
  return map[serviceType] || "Unknown";
}