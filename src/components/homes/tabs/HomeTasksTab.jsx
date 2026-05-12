import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import { Plus, CheckCircle2, Calendar, Users, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { useOptimisticMutation } from "@/lib/useOptimisticMutation";
import { ORG_ID } from "@/lib/roleConfig";

const TYPES = ["task", "meeting", "appointment"];
const STATUSES = ["pending", "in_progress", "completed", "cancelled"];
const PRIORITIES = ["low", "medium", "high"];

const TYPE_ICON = { task: ClipboardList, meeting: Users, appointment: Calendar };
const STATUS_COLOR = { pending: "bg-amber-500/10 text-amber-600", in_progress: "bg-blue-500/10 text-blue-600", completed: "bg-green-500/10 text-green-600", cancelled: "bg-muted text-muted-foreground" };
const PRIORITY_COLOR = { low: "text-green-600", medium: "text-amber-600", high: "text-red-600" };

const EMPTY = { title: "", description: "", type: "task", due_date: "", due_time: "", location: "", status: "pending", priority: "medium", notes: "" };

export default function HomeTasksTab({ homeId, homeName, user, staff = [] }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [activeTab, setActiveTab] = useState("pending");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: tasks = [] } = useQuery({
    queryKey: ["home-tasks", homeId],
    queryFn: () => base44.entities.HomeTask.filter({ org_id: ORG_ID, home_id: homeId }, "-due_date", 100),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.HomeTask.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["home-tasks", homeId] }); setShowForm(false); setForm(EMPTY); toast.success("Task added"); },
  });

  const update = useOptimisticMutation({
    mutationFn: ({ id, data }) => base44.entities.HomeTask.update(id, data),
    invalidateKeys: [["home-tasks", homeId]],
    updateCache: (prev, { id, data }) => 
      prev.map(t => t.id === id ? { ...t, ...data } : t),
    successMsg: "Task updated",
    errorMsg: "Failed to update task",
  });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.due_date) { toast.error("Title and date required"); return; }
    create.mutate({ org_id: ORG_ID, home_id: homeId, home_name: homeName, assigned_to_id: user?.email, assigned_to_name: user?.full_name, ...form });
  };

  const filtered = tasks.filter(t => activeTab === "all" ? true : t.status === activeTab);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Tasks, Meetings & Appointments</h3>
        <Button className="gap-2 rounded-xl text-sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Type</p>
              <NativeSelect value={form.type} onValueChange={v => f("type", v)}>
                {TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
              </NativeSelect>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <NativeSelect value={form.priority} onValueChange={v => f("priority", v)}>
                {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
              </NativeSelect>
            </div>
          </div>
          <Input placeholder="Title *" value={form.title} onChange={e => f("title", e.target.value)} />
          <Textarea rows={2} placeholder="Description..." value={form.description} onChange={e => f("description", e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Due Date *</p>
              <Input type="date" value={form.due_date} onChange={e => f("due_date", e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Time</p>
              <Input type="time" value={form.due_time} onChange={e => f("due_time", e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Location</p>
              <Input placeholder="Location..." value={form.location} onChange={e => f("location", e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-xl" onClick={handleSubmit} disabled={create.isPending}>Save</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {["pending", "in_progress", "completed", "all"].map(s => (
          <button key={s} onClick={() => setActiveTab(s)}
            className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition-colors ${activeTab === s ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
            {s === "in_progress" ? "In Progress" : s}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">No {activeTab} items.</div>
        ) : filtered.map(task => {
          const Icon = TYPE_ICON[task.type] || ClipboardList;
          return (
            <div key={task.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
              <div className="w-9 h-9 bg-primary/10 text-primary rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{task.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_COLOR[task.status]}`}>{task.status?.replace(/_/g, " ")}</span>
                  <span className={`text-xs font-medium capitalize ${PRIORITY_COLOR[task.priority]}`}>{task.priority}</span>
                </div>
                {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{task.due_date}{task.due_time ? ` at ${task.due_time}` : ""}</span>
                  {task.location && <span>📍 {task.location}</span>}
                </div>
              </div>
              {task.status !== "completed" && (
                <button onClick={() => update.mutate({ id: task.id, data: { status: "completed", completed_at: new Date().toISOString(), completed_by: user?.full_name } })}
                  className="shrink-0 text-green-600 hover:text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}