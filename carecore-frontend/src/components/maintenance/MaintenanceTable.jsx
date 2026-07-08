import { format, isToday, isPast, differenceInDays } from "date-fns";
import { ChevronRight, MoreVertical } from "lucide-react";
import { PriorityBadge, StatusBadge, CategoryBadge, Avatar, CATEGORY_ICONS } from "./MaintenanceBadges";

export default function MaintenanceTable({ issues, onRowClick, page, setPage, pageSize = 8 }) {
  const total = issues.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginated = issues.slice((page - 1) * pageSize, page * pageSize);
  const today = new Date().toISOString().split("T")[0];

  const DueDateCell = ({ due_at, status }) => {
    if (!due_at) return <span className="text-slate-400 text-xs">—</span>;
    const dueDate = new Date(due_at);
    const dueDateStr = due_at.slice(0, 10);
    const isCompleted = status === "completed" || status === "cancelled";

    if (isCompleted) {
      return (
        <div>
          <p className="text-slate-700 text-xs">{format(dueDate, "d MMM yyyy")}</p>
          <p className="text-slate-400 text-xs">{format(dueDate, "HH:mm")}</p>
        </div>
      );
    }

    if (dueDateStr === today) {
      return (
        <div>
          <p className="text-amber-600 text-xs font-semibold">Today</p>
          <p className="text-slate-400 text-xs">{format(dueDate, "HH:mm")}</p>
        </div>
      );
    }

    if (dueDateStr < today) {
      const days = Math.abs(differenceInDays(dueDate, new Date()));
      return (
        <div>
          <p className="text-red-600 text-xs font-semibold">Overdue</p>
          <p className="text-red-400 text-xs">{days} day{days !== 1 ? "s" : ""}</p>
        </div>
      );
    }

    return (
      <div>
        <p className="text-slate-700 text-xs">{format(dueDate, "d MMM yyyy")}</p>
        <p className="text-slate-400 text-xs">{format(dueDate, "HH:mm")}</p>
      </div>
    );
  };

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {["Issue","Home","Category","Priority","Status","Reported","Due Date","Assigned To",""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 py-3 px-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-16 text-slate-400">
                  <p className="text-base font-medium">No maintenance issues found</p>
                  <p className="text-sm mt-1">Start tracking repairs and property issues across your homes.</p>
                </td>
              </tr>
            ) : paginated.map((issue) => (
              <tr
                key={issue.id}
                onClick={() => onRowClick(issue)}
                className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                {/* Issue */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{CATEGORY_ICONS[issue.category] || "📋"}</span>
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{issue.issue_title}</p>
                      <p className="text-xs text-slate-400">#{issue.issue_reference}</p>
                    </div>
                  </div>
                </td>
                {/* Home */}
                <td className="py-3 px-3">
                  <span className="text-xs font-medium text-slate-700">{issue.home_name}</span>
                </td>
                {/* Category */}
                <td className="py-3 px-3"><CategoryBadge category={issue.category} /></td>
                {/* Priority */}
                <td className="py-3 px-3"><PriorityBadge priority={issue.priority} /></td>
                {/* Status */}
                <td className="py-3 px-3"><StatusBadge status={issue.status} /></td>
                {/* Reported */}
                <td className="py-3 px-3">
                  {issue.reported_at ? (
                    <div>
                      <p className="text-xs text-slate-700">{format(new Date(issue.reported_at), "d MMM yyyy")}</p>
                      <p className="text-xs text-slate-400">{format(new Date(issue.reported_at), "HH:mm")}</p>
                    </div>
                  ) : <span className="text-slate-400 text-xs">—</span>}
                </td>
                {/* Due */}
                <td className="py-3 px-3"><DueDateCell due_at={issue.due_at} status={issue.status} /></td>
                {/* Assigned */}
                <td className="py-3 px-3">
                  {issue.assigned_to_name ? (
                    <div className="flex items-center gap-2">
                      <Avatar name={issue.assigned_to_name} />
                      <span className="text-xs text-slate-700 max-w-[90px] truncate">{issue.assigned_to_name}</span>
                    </div>
                  ) : <span className="text-slate-400 text-xs">Unassigned</span>}
                </td>
                {/* Arrow */}
                <td className="py-3 px-3">
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 0 && (
        <div className="flex items-center justify-between px-3 py-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">
            Showing {Math.min((page - 1) * pageSize + 1, total)} to {Math.min(page * pageSize, total)} of {total} issues
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ‹
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pg = i + 1;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                    page === pg
                      ? "bg-blue-600 text-white"
                      : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            {totalPages > 5 && <span className="text-xs text-slate-400">...</span>}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-2 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}