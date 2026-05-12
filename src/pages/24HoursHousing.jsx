import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const SHIFT_TYPES = ["day", "night", "bank", "management", "outreach", "other"];

function formatTime(t) {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${m} ${ampm}`;
}

const EMPTY_FORM = {
  name: "",
  time_start: "",
  time_end: "",
  sleeping_time: "",
  staff_required: "",
  shift_type: "day",
  notes: "",
  home_id: "",
};

export default function TwentyFourHoursHousing() {
  const { user } = useOutletContext();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [filterHomeId, setFilterHomeId] = useState("all");
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID, status: "active" }),
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ["shift-templates-all"],
    queryFn: () => base44.entities.ShiftTemplate.filter({ org_id: ORG_ID }, "name", 200),
  });

  const create = useMutation({
    mutationFn: (data) => base44.entities.ShiftTemplate.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-templates-all"] }); qc.invalidateQueries({ queryKey: ["shift-templates"] }); closeForm(); toast.success("Shift created"); },
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftTemplate.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-templates-all"] }); qc.invalidateQueries({ queryKey: ["shift-templates"] }); closeForm(); toast.success("Shift updated"); },
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.ShiftTemplate.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["shift-templates-all"] }); qc.invalidateQueries({ queryKey: ["shift-templates"] }); toast.success("Shift deleted"); },
  });

  const closeForm = () => { setShowForm(false); setEditId(null); setForm({ ...EMPTY_FORM }); };

  const openCreate = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setShowForm(true); };

  const openEdit = (s) => {
    setForm({
      name: s.name || "",
      time_start: s.time_start || "",
      time_end: s.time_end || "",
      sleeping_time: s.sleeping_time || "",
      staff_required: s.staff_required ?? "",
      shift_type: s.shift_type || "day",
      notes: s.notes || "",
      home_id: s.home_id || "",
    });
    setEditId(s.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Shift name is required"); return; }
    if (!form.home_id) { toast.error("Please select a home"); return; }
    const home = homes.find(h => h.id === form.home_id);
    const payload = {
      org_id: ORG_ID,
      home_id: form.home_id,
      home_name: home?.name || "",
      name: form.name,
      time_start: form.time_start,
      time_end: form.time_end,
      sleeping_time: form.sleeping_time,
      staff_required: form.staff_required !== "" ? Number(form.staff_required) : null,
      shift_type: form.shift_type,
      notes: form.notes,
      active: true,
    };
    if (editId) update.mutate({ id: editId, data: payload });
    else create.mutate(payload);
  };

  const filtered = filterHomeId === "all"
    ? shifts
    : shifts.filter(s => s.home_id === filterHomeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">24 Hours Housing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage shift templates used across homes</p>
        </div>
        <Button className="gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={openCreate}>
          <Plus className="w-4 h-4" /> Add Shift
        </Button>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{editId ? "Edit Shift" : "New Shift Template"}</p>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Home <span className="text-red-500">*</span></p>
              <Select value={form.home_id} onValueChange={v => f("home_id", v)}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select home..." /></SelectTrigger>
                <SelectContent>{homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Shift Name <span className="text-red-500">*</span></p>
              <Input placeholder="e.g. Grafton Day Shift" value={form.name} onChange={e => f("name", e.target.value)} className="text-sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Shift Type</p>
              <Select value={form.shift_type} onValueChange={v => f("shift_type", v)}>
                <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{SHIFT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Start Time</p>
              <Input type="time" value={form.time_start} onChange={e => f("time_start", e.target.value)} className="text-sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">End Time</p>
              <Input type="time" value={form.time_end} onChange={e => f("time_end", e.target.value)} className="text-sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Sleeping Time</p>
              <Input placeholder="e.g. 10:00 PM - 6:00 AM" value={form.sleeping_time} onChange={e => f("sleeping_time", e.target.value)} className="text-sm" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">No. of Staff Required</p>
              <Input type="number" min="0" placeholder="e.g. 1" value={form.staff_required} onChange={e => f("staff_required", e.target.value)} className="text-sm" />
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Notes</p>
              <Input placeholder="Optional notes..." value={form.notes} onChange={e => f("notes", e.target.value)} className="text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="rounded-xl bg-teal-600 hover:bg-teal-700 text-white gap-1" onClick={handleSave} disabled={create.isPending || update.isPending}>
              <Check className="w-4 h-4" /> {editId ? "Update" : "Create"} Shift
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={closeForm}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Filter by home */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground font-medium">Filter by home:</span>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterHomeId("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterHomeId === "all" ? "bg-teal-600 text-white border-teal-600" : "border-border text-muted-foreground hover:bg-muted"}`}
          >
            All Homes
          </button>
          {homes.map(h => (
            <button
              key={h.id}
              onClick={() => setFilterHomeId(h.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${filterHomeId === h.id ? "bg-teal-600 text-white border-teal-600" : "border-border text-muted-foreground hover:bg-muted"}`}
            >
              {h.name}
            </button>
          ))}
        </div>
      </div>

      {/* Shifts table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/10">
              <th className="text-center px-6 py-3 text-xs font-semibold text-foreground w-56">Name</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-foreground">Time</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-foreground">Sleeping Time</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-foreground w-44">No. of Staff Required</th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-foreground w-36">Home</th>
              <th className="w-20" />
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground text-sm">
                  No shift templates yet. Click "Add Shift" to get started.
                </td>
              </tr>
            ) : filtered.map((s, idx) => (
              <tr key={s.id} className={`border-b border-border/50 last:border-0 ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}>
                <td className="px-6 py-4 text-center font-semibold text-sm">{s.name}</td>
                <td className="px-6 py-4 text-center text-muted-foreground text-sm">
                  {s.time_start && s.time_end ? `${formatTime(s.time_start)} - ${formatTime(s.time_end)}` : "—"}
                </td>
                <td className="px-6 py-4 text-center text-muted-foreground text-sm">{s.sleeping_time || "—"}</td>
                <td className="px-6 py-4 text-center text-muted-foreground text-sm">{s.staff_required ?? "—"}</td>
                <td className="px-6 py-4 text-center text-xs text-muted-foreground">{s.home_name || "—"}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2 justify-center">
                    <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-primary transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => remove.mutate(s.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}