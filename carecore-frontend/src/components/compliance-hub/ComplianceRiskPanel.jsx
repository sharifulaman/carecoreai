import { AlertTriangle, Clock, User, ChevronRight } from "lucide-react";
import { format, isAfter, isBefore, addDays } from "date-fns";

export default function ComplianceRiskPanel({ items, homes, myTasks, onFilterHome, onFilterDue }) {
  const today = new Date();

  // Highest risk homes
  const homeCounts = {};
  items.forEach(item => {
    if (!item.home_id) return;
    if (!homeCounts[item.home_id]) homeCounts[item.home_id] = { name: item.home_name || "Unknown", expired: 0, critical: 0 };
    if (item.status === "expired" || (item.expiry_date && isBefore(new Date(item.expiry_date), today))) {
      homeCounts[item.home_id].expired++;
    }
    if (item.priority === "critical") homeCounts[item.home_id].critical++;
  });
  const riskHomes = Object.entries(homeCounts)
    .map(([id, v]) => ({ id, ...v, score: v.critical * 2 + v.expired }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Upcoming renewals
  const upcoming = [...items]
    .filter(i => i.expiry_date && isAfter(new Date(i.expiry_date), today))
    .sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date))
    .slice(0, 5)
    .map(i => {
      const days = Math.round((new Date(i.expiry_date) - today) / 86400000);
      return { ...i, daysLeft: days };
    });

  const getRiskBadge = (score) => {
    if (score >= 5) return "bg-red-100 text-red-700";
    if (score >= 3) return "bg-amber-100 text-amber-700";
    return "bg-yellow-100 text-yellow-700";
  };
  const getRiskLabel = (score) => {
    if (score >= 5) return "High Risk";
    if (score >= 3) return "High Risk";
    return "Medium Risk";
  };

  const getDaysColor = (days) => {
    if (days < 0) return "text-red-600 font-bold";
    if (days <= 14) return "text-red-600 font-semibold";
    if (days <= 30) return "text-amber-600 font-semibold";
    return "text-slate-500";
  };

  const getTaskBadge = (task) => {
    if (!task.due_date) return { label: "No date", cls: "bg-slate-100 text-slate-500" };
    const days = Math.round((new Date(task.due_date) - today) / 86400000);
    if (days < 0) return { label: "Overdue", cls: "bg-red-100 text-red-700" };
    if (days <= 7) return { label: `Due in ${days}d`, cls: "bg-amber-100 text-amber-700" };
    return { label: `Due in ${days}d`, cls: "bg-blue-100 text-blue-700" };
  };

  return (
    <div className="space-y-4">
      {/* Highest Risk Homes */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <h3 className="text-sm font-bold text-slate-800">Highest Risk Homes</h3>
        </div>
        {riskHomes.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No risk data available</p>
        ) : (
          <div className="space-y-2">
            {riskHomes.map((home, i) => (
              <div key={home.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer" onClick={() => onFilterHome(home.id)}>
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 truncate">{home.name}</p>
                  <p className="text-[10px] text-slate-400">{home.expired} expired item{home.expired !== 1 ? "s" : ""}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${getRiskBadge(home.score)}`}>{getRiskLabel(home.score)}</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => onFilterHome(null)} className="mt-2 text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">View all homes <ChevronRight className="w-3 h-3" /></button>
      </div>

      {/* Upcoming Renewals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-800">Upcoming Renewals</h3>
        </div>
        {upcoming.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No upcoming renewals</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(item => (
              <div key={item.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 truncate">{item.item_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{item.home_name}</p>
                </div>
                <span className={`text-[10px] shrink-0 ${getDaysColor(item.daysLeft)}`}>{item.daysLeft}d</span>
              </div>
            ))}
          </div>
        )}
        <button onClick={() => onFilterDue("due90")} className="mt-2 text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">View all upcoming <ChevronRight className="w-3 h-3" /></button>
      </div>

      {/* Assigned To Me */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-blue-500" />
          <h3 className="text-sm font-bold text-slate-800">Assigned To Me</h3>
        </div>
        {myTasks.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No tasks assigned to you</p>
        ) : (
          <div className="space-y-1.5">
            {myTasks.slice(0, 4).map(task => {
              const badge = getTaskBadge(task);
              return (
                <div key={task.id} className="flex items-center gap-2 py-1">
                  <input type="checkbox" checked={task.status === "completed"} readOnly className="w-3.5 h-3.5 accent-teal-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{task.title}</p>
                    <p className="text-[10px] text-slate-400">{task.home_name || "—"}</p>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${badge.cls}`}>{badge.label}</span>
                </div>
              );
            })}
          </div>
        )}
        <button className="mt-2 text-xs text-teal-600 font-semibold hover:underline flex items-center gap-1">View all tasks <ChevronRight className="w-3 h-3" /></button>
      </div>
    </div>
  );
}