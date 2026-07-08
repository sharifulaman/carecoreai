import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

export default function StaffMovementsTab({ staff, homes, canEditStaff }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const { data: movements = [] } = useQuery({
    queryKey: ["staff-movements"],
    queryFn: () => secureGateway.filter("StaffMovement", {}),
    staleTime: 5 * 60 * 1000,
  });

  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  const [form, setForm] = useState({
    staff_id: "",
    movement_type: "new_starter",
    movement_date: new Date().toISOString().split("T")[0],
    previous_role: "",
    new_role: "",
    previous_home_id: "",
    new_home_id: "",
    accommodation_category_affected: "",
    reason: "",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const selectedStaff = staff.find(s => s.id === form.staff_id);
      const payload = {
        org_id: selectedStaff?.org_id,
        staff_id: form.staff_id,
        staff_name: selectedStaff?.full_name,
        staff_role: selectedStaff?.job_title,
        movement_type: form.movement_type,
        movement_date: form.movement_date,
        is_support_role: selectedStaff?.is_support_role,
        previous_role: form.previous_role,
        new_role: form.new_role,
        previous_home_id: form.previous_home_id,
        previous_home_name: form.previous_home_id ? homeMap[form.previous_home_id]?.name : "",
        new_home_id: form.new_home_id,
        new_home_name: form.new_home_id ? homeMap[form.new_home_id]?.name : "",
        accommodation_category_affected: form.accommodation_category_affected,
        reason: form.reason,
      };

      if (editingId) {
        await secureGateway.update("StaffMovement", editingId, payload);
      } else {
        await secureGateway.create("StaffMovement", payload);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Movement updated" : "Movement recorded");
      qc.invalidateQueries({ queryKey: ["staff-movements"] });
      setShowForm(false);
      setEditingId(null);
      setForm({
        staff_id: "",
        movement_type: "new_starter",
        movement_date: new Date().toISOString().split("T")[0],
        previous_role: "",
        new_role: "",
        previous_home_id: "",
        new_home_id: "",
        accommodation_category_affected: "",
        reason: "",
      });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => secureGateway.delete("StaffMovement", id),
    onSuccess: () => {
      toast.success("Movement deleted");
      qc.invalidateQueries({ queryKey: ["staff-movements"] });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">Staff Movements</h3>
          <p className="text-xs text-muted-foreground mt-1">Track staff changes, roles, and assignments</p>
        </div>
        {canEditStaff && (
          <Button onClick={() => { setEditingId(null); setShowForm(true); }} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Record Movement
          </Button>
        )}
      </div>

      {movements.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          No staff movements recorded.
        </div>
      ) : (
        <div className="space-y-3">
          {movements.sort((a, b) => (b.movement_date || b.created_date)?.localeCompare(a.movement_date || a.created_date)).map(movement => (
            <div key={movement.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold">{staffMap[movement.staff_id]?.full_name || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{movement.movement_type?.replace(/_/g, " ")}</p>
                </div>
                {canEditStaff && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingId(movement.id); setForm(movement); setShowForm(true); }} className="text-xs h-7">Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteMutation.mutate(movement.id)} className="text-red-600 hover:text-red-700 h-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Movement Date:</span>
                  <p className="font-medium">{movement.movement_date ? new Date(movement.movement_date).toLocaleDateString("en-GB") : "—"}</p>
                </div>
                {movement.previous_role && (
                  <div>
                    <span className="text-muted-foreground">Previous Role:</span>
                    <p className="font-medium">{movement.previous_role}</p>
                  </div>
                )}
                {movement.new_role && (
                  <div>
                    <span className="text-muted-foreground">New Role:</span>
                    <p className="font-medium">{movement.new_role}</p>
                  </div>
                )}
                {movement.new_home_name && (
                  <div>
                    <span className="text-muted-foreground">New Home:</span>
                    <p className="font-medium">{movement.new_home_name}</p>
                  </div>
                )}
              </div>

              {movement.reason && <p className="text-xs text-muted-foreground mt-2">{movement.reason}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{editingId ? "Edit Movement" : "Record Staff Movement"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Staff Member</label>
                <select
                  value={form.staff_id}
                  onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Select staff member</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Movement Type</label>
                <select
                  value={form.movement_type}
                  onChange={(e) => setForm({ ...form, movement_type: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="new_starter">New Starter</option>
                  <option value="leaver">Leaver</option>
                  <option value="role_change">Role Change</option>
                  <option value="service_reassignment">Service Reassignment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Movement Date</label>
                <input
                  type="date"
                  value={form.movement_date}
                  onChange={(e) => setForm({ ...form, movement_date: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {["role_change", "leaver"].includes(form.movement_type) && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Previous Role</label>
                  <Input value={form.previous_role} onChange={(e) => setForm({ ...form, previous_role: e.target.value })} placeholder="e.g. Support Worker" />
                </div>
              )}

              {["role_change"].includes(form.movement_type) && (
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">New Role</label>
                  <Input value={form.new_role} onChange={(e) => setForm({ ...form, new_role: e.target.value })} placeholder="e.g. Team Leader" />
                </div>
              )}

              {["service_reassignment"].includes(form.movement_type) && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Previous Home</label>
                    <select
                      value={form.previous_home_id}
                      onChange={(e) => setForm({ ...form, previous_home_id: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">—</option>
                      {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">New Home</label>
                    <select
                      value={form.new_home_id}
                      onChange={(e) => setForm({ ...form, new_home_id: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">—</option>
                      {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Accommodation Category Affected</label>
                <select
                  value={form.accommodation_category_affected}
                  onChange={(e) => setForm({ ...form, accommodation_category_affected: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">—</option>
                  <option value="self_contained">Self-contained</option>
                  <option value="shared_ring_fenced">Shared Ring-fenced</option>
                  <option value="shared_non_ring_fenced">Shared Non-ring-fenced</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Reason</label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for movement" className="h-16" />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.staff_id}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}