import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { Search, Filter, MoreVertical, Bell } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  Completed: "bg-green-100 text-green-700",
  "Due Soon": "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
  Outstanding: "bg-slate-100 text-slate-600",
  "No Assignments": "bg-slate-50 text-slate-400",
};

function ProgressMini({ value, color }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value || 0)}%` }} />
      </div>
      <span className="text-[10px] text-slate-500">{value}%</span>
    </div>
  );
}

function StaffActionMenu({ assignment, canManage, onRemind }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="p-1 rounded hover:bg-slate-100"><MoreVertical className="w-4 h-4 text-slate-400" /></button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[160px]">
            {canManage && (
              <button onClick={() => { onRemind(); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                <Bell className="w-3.5 h-3.5" /> Send Reminder
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function StaffAcknowledgementTracker({ assignments = [], staff = [], canManage, staffProfile, onRefresh }) {
  const [search, setSearch] = useState("");
  const today = new Date().toISOString().split("T")[0];

  const staffStats = useMemo(() => {
    const map = {};
    assignments.forEach(a => {
      if (!map[a.staff_id]) {
        map[a.staff_id] = {
          staff_id: a.staff_id,
          staff_name: a.staff_name,
          staff_department: a.staff_department,
          staff_role: a.staff_role,
          total: 0, viewed: 0, acked: 0, outstanding: 0,
          last_activity: null,
          has_overdue: false,
        };
      }
      const s = map[a.staff_id];
      s.total++;
      if (a.viewed_at) { s.viewed++; if (!s.last_activity || a.viewed_at > s.last_activity) s.last_activity = a.viewed_at; }
      if (a.acknowledged_at) { s.acked++; if (!s.last_activity || a.acknowledged_at > s.last_activity) s.last_activity = a.acknowledged_at; }
      else if (!["Exempted", "Cancelled"].includes(a.status)) s.outstanding++;
      if (a.due_date && a.due_date < today && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status)) s.has_overdue = true;
    });
    return Object.values(map);
  }, [assignments, today]);

  const filtered = useMemo(() => staffStats.filter(s => {
    const q = search.toLowerCase();
    return !q || s.staff_name?.toLowerCase().includes(q) || s.staff_department?.toLowerCase().includes(q);
  }), [staffStats, search]);

  const getStatus = (s) => {
    if (s.total === 0) return "No Assignments";
    if (s.has_overdue) return "Overdue";
    if (s.outstanding === 0 && s.total > 0) return "Completed";
    return "Outstanding";
  };

  const handleRemind = async (staffId, staffName) => {
    const pending = assignments.filter(a => a.staff_id === staffId && !a.acknowledged_at && !["Exempted", "Cancelled"].includes(a.status));
    for (const a of pending) {
      await base44.entities.HRPolicyReminder.create({
        org_id: ORG_ID,
        staff_assignment_id: a.id,
        policy_id: a.policy_id,
        policy_title: a.policy_title,
        staff_id: staffId,
        staff_name: staffName,
        sent_by_staff_id: staffProfile?.id,
        sent_by_name: staffProfile?.full_name,
        sent_at: new Date().toISOString(),
        reminder_type: "Manual",
        status: "Sent",
      });
      await base44.entities.HRPolicyStaffAssignment.update(a.id, {
        last_reminder_sent_at: new Date().toISOString(),
        reminder_count: (a.reminder_count || 0) + 1,
      });
      await base44.entities.HRPolicyActivityEvent.create({
        org_id: ORG_ID,
        event_type: "Reminder Sent",
        event_title: `Reminder sent to ${staffName}`,
        policy_id: a.policy_id,
        policy_title: a.policy_title,
        staff_id: staffId,
        staff_name: staffName,
        performed_by_staff_id: staffProfile?.id,
        performed_by_name: staffProfile?.full_name,
        event_date: new Date().toISOString(),
      });
    }
    toast.success(`Reminder sent to ${staffName}`);
    onRefresh?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
        <h3 className="text-sm font-bold text-slate-800">Staff Acknowledgement Tracker</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff…" className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none w-40" />
          </div>
          <button className="flex items-center gap-1 px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-50"><Filter className="w-3.5 h-3.5" /> Filters</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Staff Member", "Department", "Role", "Policies Assigned", "Viewed", "Acknowledged", "Outstanding", "Last Activity", "Status", ""].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400 text-sm">No assignment data yet</td></tr>
            ) : filtered.map(s => {
              const viewPct = s.total > 0 ? Math.round((s.viewed / s.total) * 100) : 0;
              const ackPct = s.total > 0 ? Math.round((s.acked / s.total) * 100) : 0;
              const status = getStatus(s);
              return (
                <tr key={s.staff_id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {s.staff_name?.charAt(0) || "?"}
                      </div>
                      <span className="font-medium text-slate-700">{s.staff_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{s.staff_department || "—"}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs capitalize">{s.staff_role?.replace(/_/g, " ") || "—"}</td>
                  <td className="px-4 py-3 text-slate-700 font-semibold text-center">{s.total}</td>
                  <td className="px-4 py-3"><ProgressMini value={viewPct} color="bg-blue-500" /></td>
                  <td className="px-4 py-3"><ProgressMini value={ackPct} color="bg-green-500" /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${s.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>{s.outstanding}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{s.last_activity ? format(new Date(s.last_activity), "dd MMM yyyy, HH:mm") : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[status] || STATUS_COLORS.Outstanding}`}>{status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {canManage && s.outstanding > 0 && (
                      <StaffActionMenu assignment={null} canManage={canManage} onRemind={() => handleRemind(s.staff_id, s.staff_name)} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {filtered.length > 0 && <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">Showing {filtered.length} of {staffStats.length} staff</div>}
    </div>
  );
}