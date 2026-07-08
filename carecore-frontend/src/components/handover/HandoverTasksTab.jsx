import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Plus, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";

const PRIORITY_STYLES = {
  low:    "bg-slate-100 text-slate-600",
  medium: "bg-amber-100 text-amber-700",
  high:   "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const STATUS_STYLES = {
  open:               { label: "Open",              color: "text-slate-500", bg: "bg-slate-100" },
  in_progress:        { label: "In Progress",       color: "text-blue-600",  bg: "bg-blue-100" },
  completed:          { label: "Completed",         color: "text-emerald-600", bg: "bg-emerald-100" },
  passed_to_next_shift: { label: "Passed to next",  color: "text-purple-600", bg: "bg-purple-100" },
  overdue:            { label: "Overdue",           color: "text-red-600",   bg: "bg-red-100" },
  cancelled:          { label: "Cancelled",         color: "text-slate-400", bg: "bg-slate-100" },
};

export default function HandoverTasksTab({ handover, homeId, locked }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_at: "", assigned_to_name: "" });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["handover-tasks", handover?.id],
    queryFn: () => base44.entities.HandoverTask.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID }),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.HandoverTask.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["handover-tasks", handover?.id] });
      setShowForm(false);
      setForm({ title: "", description: "", priority: "medium", due_at: "", assigned_to_name: "" });
      toast.success("Task added");
    },
  });

  const updateStatus = async (task, status) => {
    await base44.entities.HandoverTask.update(task.id, { status, completed_at: status === "completed" ? new Date().toISOString() : undefined });
    qc.invalidateQueries({ queryKey: ["handover-tasks", handover?.id] });
    toast.success("Task updated");
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    create.mutate({ org_id: ORG_ID, handover_id: handover?.id, home_id: homeId, ...form });
  };

  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-teal-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700">Tasks &amp; Reminders</h3>
        {!locked && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold">
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">No open tasks for this handover</p>
          {!locked && <button onClick={() => setShowForm(true)} className="mt-3 text-xs font-semibold text-teal-600 hover:underline">Add Task / Reminder</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => {
            const st = STATUS_STYLES[task.status] || STATUS_STYLES.open;
            return (
              <div key={task.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-sm font-semibold ${task.status === "completed" ? "line-through text-slate-400" : "text-slate-800"}`}>{task.title}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                  </div>
                  {task.description && <p className="text-xs text-slate-400">{task.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    {task.due_at && <span className="text-[10px] text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{task.due_at}</span>}
                    {task.assigned_to_name && <span className="text-[10px] text-slate-400">→ {task.assigned_to_name}</span>}
                    {task.passed_to_next_shift && <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">Passed to next shift</span>}
                  </div>
                </div>
                {!locked && task.status !== "completed" && (
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => updateStatus(task, "completed")} className="text-[10px] font-semibold px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100">Done</button>
                    <button onClick={() => updateStatus(task, "passed_to_next_shift")} className="text-[10px] font-semibold px-2 py-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100">Pass on</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-4">Add Task / Reminder</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title..." className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Details..." className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none">
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Due At</label>
                  <input value={form.due_at} onChange={e => setForm(f => ({ ...f, due_at: e.target.value }))} placeholder="e.g. 5:00 PM" className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Assigned To</label>
                <AutocompleteInput
                  value={form.assigned_to_name}
                  onChange={v => setForm(f => ({ ...f, assigned_to_name: v }))}
                  options={staff.map(s => s.full_name).filter(Boolean)}
                  placeholder="Select staff name..."
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={create.isPending} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save Task
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}