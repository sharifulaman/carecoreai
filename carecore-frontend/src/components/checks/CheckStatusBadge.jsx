const STATUS_CFG = {
  due: { label: "Due Now", cls: "bg-red-100 text-red-700 border border-red-200" },
  overdue: { label: "Overdue", cls: "bg-red-200 text-red-800 border border-red-300" },
  in_progress: { label: "In Progress", cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  submitted_for_review: { label: "Submitted for Review", cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  completed: { label: "Complete", cls: "bg-green-100 text-green-700 border border-green-200" },
  changes_requested: { label: "Changes Requested", cls: "bg-orange-100 text-orange-700 border border-orange-200" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-500" },
  archived: { label: "Archived", cls: "bg-slate-100 text-slate-500" },
  issue: { label: "Issue", cls: "bg-amber-100 text-amber-700 border border-amber-200" },
};

export default function CheckStatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.due;
  return (
    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function getDisplayStatus(instance, now) {
  if (!instance) return "due";
  if (["completed", "submitted_for_review", "cancelled", "archived", "changes_requested"].includes(instance.status)) {
    return instance.status;
  }
  const due = new Date(`${instance.scheduled_date}T${instance.due_at || "23:59"}:00`);
  if (due < now) return "overdue";
  return instance.status || "due";
}