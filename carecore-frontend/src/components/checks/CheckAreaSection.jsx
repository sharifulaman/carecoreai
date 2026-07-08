import { useState } from "react";
import { ChevronDown, ChevronUp, Shield, Utensils, Bath, Users, Flame, Home } from "lucide-react";
import CheckTaskCard from "./CheckTaskCard";

const AREA_ICONS = {
  Kitchen: Utensils,
  Bathroom: Bath,
  "Communal Area": Users,
  Safety: Shield,
  "Fire Safety": Flame,
  General: Home,
  default: Home,
};

function getAreaBadge(instances, now) {
  const hasOverdue = instances.some(i => {
    if (["completed", "submitted_for_review", "cancelled"].includes(i.status)) return false;
    const due = new Date(`${i.scheduled_date}T${i.due_at || "23:59"}:00`);
    return due < now;
  });
  const hasDue = instances.some(i => ["due", "in_progress"].includes(i.status));
  const allComplete = instances.every(i => ["completed", "submitted_for_review"].includes(i.status));

  if (hasOverdue) return { label: `${instances.filter(i => { const d = new Date(`${i.scheduled_date}T${i.due_at || "23:59"}:00`); return d < now && !["completed","submitted_for_review","cancelled"].includes(i.status); }).length} Overdue`, cls: "bg-red-100 text-red-700" };
  if (allComplete) return { label: "All Clear", cls: "bg-green-100 text-green-700" };
  const dueCount = instances.filter(i => ["due","in_progress"].includes(i.status)).length;
  if (dueCount > 0) return { label: `${dueCount} Due Now`, cls: "bg-red-50 text-red-600" };
  return { label: "All Clear", cls: "bg-green-100 text-green-700" };
}

export default function CheckAreaSection({ area, instances, templateItems, completions, onStart, onViewDetails }) {
  const [collapsed, setCollapsed] = useState(false);
  const now = new Date();
  const Icon = AREA_ICONS[area] || AREA_ICONS.default;
  const badge = getAreaBadge(instances, now);

  const getItemCount = (instance) => {
    return templateItems.filter(ti => ti.template_id === instance.template_id).length;
  };

  const getCompletionCount = (instance) => {
    const comp = completions.find(c => c.instance_id === instance.id);
    return comp ? (comp._response_count || 0) : 0;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Section header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <Icon className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-sm font-bold text-slate-800">{area}</span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
      </button>

      {/* Task cards */}
      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {instances.map(instance => (
            <CheckTaskCard
              key={instance.id}
              instance={instance}
              itemCount={getItemCount(instance)}
              completionCount={getCompletionCount(instance)}
              onStart={onStart}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </div>
  );
}