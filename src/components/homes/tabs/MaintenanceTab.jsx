import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wrench, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const CATEGORIES = ["plumbing", "electrical", "heating", "structural", "appliance", "garden", "cleaning", "other"];
const PRIORITIES = ["low", "medium", "high", "urgent"];
const STATUSES = ["open", "in_progress", "completed", "cancelled"];

const PRIORITY_COLOR = { low: "bg-green-500/10 text-green-600", medium: "bg-amber-500/10 text-amber-600", high: "bg-red-500/10 text-red-600", urgent: "bg-red-700/10 text-red-700" };
const STATUS_COLOR = { open: "bg-blue-500/10 text-blue-600", in_progress: "bg-amber-500/10 text-amber-600", completed: "bg-green-500/10 text-green-600", cancelled: "bg-muted text-muted-foreground" };

const EMPTY = { title: "", description: "", category: "other", priority: "medium", status: "open", contractor: "", cost: "", date_reported: new Date().toISOString().split("T")[0], notes: "" };

export default function MaintenanceTab({ homeId, homeName, user }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: logs = [] } = useQuery({
    queryKey: ["maintenance", homeId],
    queryFn: () => base44.entities.MaintenanceLog.filter({ org_id: ORG_ID, home_id: homeId }, "-date_reported", 50),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.MaintenanceLog.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance", homeId] }); setShowForm(false); setForm(EMPTY); toast.success("Maintenance log added"); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceLog.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance", homeId] }); toast.success("Status updated"); },
  });

  const handleSubmit = () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    create.mutate({ org_id: ORG_ID, home_id: homeId, home_name: homeName, reported_by: user?.email, reported_by_name: user?.full_name, ...form, cost: form.cost ? parseFloat(form.cost) : null });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Maintenance Logs</h3>
        <Button className="gap-2 rounded-xl text-sm" onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4" /> Log Issue
        </Button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <Input placeholder="Issue title *" value={form.title} onChange={e => f("title", e.target.value)} />
          <Textarea rows={3} placeholder="Description..." value={form.description} onChange={e => f("description", e.target.value)} />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Category</p>
              <Select value={form.category} onValueChange={v => f("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Priority</p>
              <Select value={form.priority} onValueChange={v => f("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Date Reported</p>
              <Input type="date" value={form.date_reported} onChange={e => f("date_reported", e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contractor (optional)</p>
              <Input placeholder="Contractor name..." value={form.contractor} onChange={e => f("contractor", e.target.value)} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Est. Cost (£)</p>
              <Input type="number" placeholder="0.00" value={form.cost} onChange={e => f("cost", e.target.value)} />
            </div>
          </div>
          <Input placeholder="Additional notes..." value={form.notes} onChange={e => f("notes", e.target.value)} />
          <div className="flex gap-2">
            <Button className="rounded-xl" onClick={handleSubmit} disabled={create.isPending}>Save</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {logs.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">No maintenance logs yet.</div>
        ) : logs.map(log => (
          <div key={log.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm">{log.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">{log.category} · Reported {log.date_reported}</p>
              </div>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${PRIORITY_COLOR[log.priority]}`}>{log.priority}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_COLOR[log.status]}`}>{log.status?.replace(/_/g, " ")}</span>
              </div>
            </div>
            {log.description && <p className="text-sm text-muted-foreground">{log.description}</p>}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              {log.contractor && <span>Contractor: {log.contractor}</span>}
              {log.cost && <span>£{log.cost}</span>}
              {log.reported_by_name && <span>By: {log.reported_by_name}</span>}
              {log.status !== "completed" && (
                <button onClick={() => update.mutate({ id: log.id, data: { status: "completed", date_resolved: new Date().toISOString().split("T")[0] } })}
                  className="ml-auto text-green-600 hover:underline flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark Resolved
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}