// @ts-nocheck
export default function RoleGroupChips({ selected, onChange }) {
  const chips = [
    { id: "all", label: "All Employees", icon: "👥" },
    { id: "support_workers", label: "Outreach", icon: "🤝" },
    { id: "24_hours", label: "24 Hours", icon: "🏠" },
    { id: "18_plus", label: "18+ Accommodation", icon: "🏡" },
    { id: "admin", label: "HR & Admin", icon: "📋" },
    { id: "maintenance", label: "Maintenance", icon: "🔧" },
    { id: "team_leaders", label: "Team Leaders", icon: "👨‍💼" },
    { id: "managers", label: "Managers", icon: "👨‍✈️" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map(chip => (
        <button
          key={chip.id}
          onClick={() => onChange(chip.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
            selected === chip.id
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card border-border text-foreground hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <span className="mr-2">{chip.icon}</span>
          {chip.label}
        </button>
      ))}
    </div>
  );
}