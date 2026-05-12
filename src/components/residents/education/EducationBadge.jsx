import { GraduationCap } from "lucide-react";
import { STATUS_OPTIONS, STATUS_COLOURS } from "./EducationModal";

export default function EducationBadge({ resident, onClick, compact = false }) {
  const status = resident.education_status || "unknown";
  const label = STATUS_OPTIONS.find(o => o.value === status)?.label || "Unknown";
  const colour = STATUS_COLOURS[status] || "bg-gray-100 text-gray-600";

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colour} cursor-pointer`} onClick={onClick}>
        <GraduationCap className="w-3 h-3" />
        {label}
      </span>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium w-full text-left hover:opacity-80 transition-opacity ${colour}`}
    >
      <GraduationCap className="w-4 h-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-xs">{label}</p>
        {resident.education_provider && (
          <p className="text-xs opacity-75 truncate">{resident.education_provider}{resident.education_course ? ` · ${resident.education_course}` : ""}</p>
        )}
      </div>
      <span className="text-xs opacity-60">Edit →</span>
    </button>
  );
}