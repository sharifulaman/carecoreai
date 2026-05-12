import { ChevronRight } from "lucide-react";

const PRIORITY_COLORS = {
  High: "bg-red-100 text-red-600",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-slate-100 text-slate-500",
  Urgent: "bg-red-200 text-red-800",
};

const STATUS_COLORS = {
  "In Progress": "bg-blue-100 text-blue-700",
  "Due Soon": "bg-orange-100 text-orange-600",
  "Pending": "bg-slate-100 text-slate-500",
  "Scheduled": "bg-purple-100 text-purple-600",
  "Completed": "bg-green-100 text-green-700",
  "Overdue": "bg-red-100 text-red-600",
};

export default function SWTasksTable({ tasks, residents, onViewAll, onViewTask }) {
  const resMap = Object.fromEntries(residents.map(r => [r.id, r]));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="font-bold text-slate-800 text-sm">Today's Tasks & Appointments</h3>
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No tasks due today.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["Time", "Task", "Young Person", "Priority", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-slate-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tasks.slice(0, 8).map((t, i) => {
                  const yp = resMap[t.resident_id];
                  const priority = t.priority || "Medium";
                  const status = t.status || "Pending";
                  return (
                    <tr
                      key={t.id || i}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                      onClick={() => onViewTask(t)}
                    >
                      <td className="px-4 py-2.5 font-medium text-slate-600">{t.time_start || t.due_time || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-700">{t.title || t.task_type || t.action_text || "Task"}</td>
                      <td className="px-4 py-2.5 text-slate-500">{yp?.display_name || t.resident_name || "All Young People"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium}`}>
                          {priority}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[status] || STATUS_COLORS.Pending}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-slate-100">
            <button onClick={onViewAll} className="flex items-center gap-1 text-xs text-blue-500 font-semibold hover:underline">
              View all tasks <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}