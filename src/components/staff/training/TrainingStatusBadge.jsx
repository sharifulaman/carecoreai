export const STATUS_CONFIG = {
  completed:     { label: "Completed",     bg: "bg-green-100",  text: "text-green-700",  border: "border-green-300" },
  valid:         { label: "Valid",          bg: "bg-green-50",   text: "text-green-700",  border: "border-green-400" },
  in_progress:   { label: "In Progress",   bg: "bg-blue-100",   text: "text-blue-700",   border: "border-blue-300" },
  not_started:   { label: "Not Started",   bg: "bg-red-50",     text: "text-red-500",    border: "border-red-200" },
  expired:       { label: "Expired",       bg: "bg-red-500",    text: "text-white",      border: "border-red-500" },
  expiring_soon: { label: "Expiring Soon", bg: "bg-amber-100",  text: "text-amber-700",  border: "border-amber-300" },
  na:            { label: "N/A",           bg: "bg-slate-100",  text: "text-slate-400",  border: "border-slate-200" },
};

export function calcTrainingStatus(record) {
  if (!record) return "not_started";
  const today = new Date();
  const { training_status, expiry_date, completion_date, status } = record;
  // If already set to expired
  if (training_status === "expired" || status === "expired") return "expired";
  // If has expiry
  if (expiry_date) {
    const exp = new Date(expiry_date);
    if (exp < today) return "expired";
    const diff = (exp - today) / (1000 * 60 * 60 * 24);
    if (diff <= 60) return "expiring_soon";
  }
  if (completion_date || status === "completed") return expiry_date ? "completed" : "valid";
  if (status === "in_progress" || training_status === "in_progress") return "in_progress";
  return "not_started";
}

export default function TrainingStatusBadge({ status, small }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  return (
    <span className={`inline-flex items-center rounded-full border font-medium whitespace-nowrap ${cfg.bg} ${cfg.text} ${cfg.border} ${small ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"}`}>
      {cfg.label}
    </span>
  );
}