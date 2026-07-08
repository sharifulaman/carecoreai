export const PRIORITY_STYLES = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

export const STATUS_STYLES = {
  reported: "bg-slate-100 text-slate-700 border-slate-200",
  assigned: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-indigo-100 text-indigo-700 border-indigo-200",
  awaiting_contractor: "bg-purple-100 text-purple-700 border-purple-200",
  awaiting_parts: "bg-amber-100 text-amber-700 border-amber-200",
  planned: "bg-teal-100 text-teal-700 border-teal-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-slate-100 text-slate-400 border-slate-200",
};

export const CATEGORY_LABELS = {
  heating_boiler: "Heating / Boiler",
  plumbing: "Plumbing",
  garden_external: "Garden / External",
  security: "Security",
  fire_safety: "Fire Safety",
  electrical: "Electrical",
  pest_control: "Pest Control",
  structural: "Structural",
  cleaning_hygiene: "Cleaning / Hygiene",
  appliance: "Appliance",
  internet_utilities: "Internet / Utilities",
  furniture_fixtures: "Furniture / Fixtures",
  gas: "Gas",
  other: "Other",
};

export const CATEGORY_COLORS = {
  heating_boiler: "bg-red-100 text-red-600",
  plumbing: "bg-blue-100 text-blue-600",
  garden_external: "bg-green-100 text-green-600",
  security: "bg-amber-100 text-amber-600",
  fire_safety: "bg-orange-100 text-orange-600",
  electrical: "bg-yellow-100 text-yellow-700",
  pest_control: "bg-lime-100 text-lime-700",
  structural: "bg-stone-100 text-stone-600",
  cleaning_hygiene: "bg-cyan-100 text-cyan-600",
  appliance: "bg-violet-100 text-violet-600",
  internet_utilities: "bg-sky-100 text-sky-600",
  furniture_fixtures: "bg-purple-100 text-purple-600",
  gas: "bg-rose-100 text-rose-600",
  other: "bg-slate-100 text-slate-600",
};

export const CATEGORY_ICONS = {
  heating_boiler: "🔥",
  plumbing: "💧",
  garden_external: "🌿",
  security: "🔒",
  fire_safety: "🧯",
  electrical: "⚡",
  pest_control: "🐛",
  structural: "🏗️",
  cleaning_hygiene: "🧹",
  appliance: "⚙️",
  internet_utilities: "📡",
  furniture_fixtures: "🪑",
  gas: "🔧",
  other: "📋",
};

export function PriorityBadge({ priority }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.low}`}>
      {priority?.charAt(0).toUpperCase() + priority?.slice(1)}
    </span>
  );
}

export function StatusBadge({ status }) {
  const label = status?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.reported}`}>
      {label}
    </span>
  );
}

export function CategoryBadge({ category }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ${CATEGORY_COLORS[category] || CATEGORY_COLORS.other}`}>
      <span>{CATEGORY_ICONS[category] || "📋"}</span>
      {CATEGORY_LABELS[category] || category}
    </span>
  );
}

export function Avatar({ name, className = "" }) {
  const initials = name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const colors = ["bg-blue-500","bg-teal-500","bg-purple-500","bg-amber-500","bg-rose-500","bg-indigo-500"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-xs font-bold ${color} ${className}`}>
      {initials}
    </span>
  );
}