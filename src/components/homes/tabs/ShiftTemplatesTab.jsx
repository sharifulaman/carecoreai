import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Sun, Moon, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const SHIFT_ICONS = {
  morning: <Sun className="w-4 h-4 text-amber-500" />,
  night: <Moon className="w-4 h-4 text-blue-500" />,
};

const SHIFT_DEFAULTS = {
  morning: { time_start: "07:00", time_end: "19:00" },
  night:   { time_start: "19:00", time_end: "07:00" },
};

const EMPTY_FORM = { name: "", shift_type: "morning", time_start: "07:00", time_end: "19:00", staff_required: 1, notes: "" };

function TemplateForm({ initial, homeName, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleShiftTypeChange = (val) => {
    const defaults = SHIFT_DEFAULTS[val] || {};
    setForm(f => ({ ...f, shift_type: val, ...defaults }));
  };

  return (
    <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Template Name</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Morning Shift" className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Shift Type</Label>
          <Select value={form.shift_type} onValueChange={handleShiftTypeChange}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="morning">Morning (Day)</SelectItem>
              <SelectItem value="night">Night</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Staff Required</Label>
          <Input type="number" min={1} max={20} value={form.staff_required} onChange={e => set("staff_required", parseInt(e.target.value) || 1)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Start Time</Label>
          <Input type="time" value={form.time_start} onChange={e => set("time_start", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">End Time</Label>
          <Input type="time" value={form.time_end} onChange={e => set("time_end", e.target.value)} className="h-8 text-sm" />
        </div>
        <div className="col-span-2 space-y-1">
          <Label className="text-xs">Notes (optional)</Label>
          <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional info…" className="h-8 text-sm" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button size="sm" onClick={() => onSave(form)} disabled={saving || !form.name}>{saving ? "Saving…" : "Save Template"}</Button>
      </div>
    </div>
  );
}

export default function ShiftTemplatesTab({ homeId, homeName }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["shift-templates", homeId],
    queryFn: () => base44.entities.ShiftTemplate.filter({ org_id: ORG_ID, home_id: homeId }),
    enabled: !!homeId,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ShiftTemplate.create({ ...data, org_id: ORG_ID, home_id: homeId, home_name: homeName }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-templates", homeId] }); setShowForm(false); toast.success("Template created"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ShiftTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-templates", homeId] }); setEditingId(null); toast.success("Template updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ShiftTemplate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-templates", homeId] }); toast.success("Template deleted"); },
  });

  const toggleActive = (t) => updateMutation.mutate({ id: t.id, data: { active: !t.active } });

  const active = templates.filter(t => t.active !== false);
  const inactive = templates.filter(t => t.active === false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-base">Shift Templates</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Define recurring shift patterns used when generating rotas for this home.</p>
        </div>
        <Button size="sm" className="gap-2 rounded-xl" onClick={() => { setShowForm(true); setEditingId(null); }}>
          <Plus className="w-4 h-4" /> Add Template
        </Button>
      </div>

      {showForm && !editingId && (
        <TemplateForm
          homeName={homeName}
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          saving={createMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : templates.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-xl p-12 text-center">
          <Moon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No shift templates yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add templates to enable rota generation for this home.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {active.map(t => (
            <div key={t.id}>
              {editingId === t.id ? (
                <TemplateForm
                  initial={{ name: t.name, shift_type: t.shift_type, time_start: t.time_start, time_end: t.time_end, staff_required: t.staff_required || 1, notes: t.notes || "" }}
                  homeName={homeName}
                  onSave={(data) => updateMutation.mutate({ id: t.id, data })}
                  onCancel={() => setEditingId(null)}
                  saving={updateMutation.isPending}
                />
              ) : (
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {SHIFT_ICONS[t.shift_type] || <Sun className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {t.shift_type} · {t.time_start}–{t.time_end} · {t.staff_required || 1} staff required
                    </p>
                    {t.notes && <p className="text-xs text-muted-foreground mt-0.5">{t.notes}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(t)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Deactivate">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </button>
                    <button onClick={() => { setEditingId(t.id); setShowForm(false); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {inactive.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">Inactive templates</p>
              {inactive.map(t => (
                <div key={t.id} className="bg-card border border-dashed border-border rounded-xl p-4 flex items-center gap-4 opacity-60">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {SHIFT_ICONS[t.shift_type] || <Sun className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.shift_type} · {t.time_start}–{t.time_end}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(t)} className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Reactivate">
                      <XCircle className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}