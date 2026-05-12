import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { X, Loader2, UserPlus, Users, Building2, Briefcase, Home } from "lucide-react";

const SCOPES = [
  { key: "Individual", label: "Individual", icon: UserPlus },
  { key: "Multiple Staff", label: "Multiple Staff", icon: Users },
  { key: "All Staff", label: "All Staff", icon: Users },
  { key: "Department", label: "Department", icon: Building2 },
  { key: "Role", label: "Role", icon: Briefcase },
  { key: "Home", label: "Home", icon: Home },
];

const ROLES = ["admin", "admin_officer", "team_leader", "support_worker"];
const ROLE_LABELS = { admin: "Admin", admin_officer: "Admin Officer", team_leader: "Team Leader", support_worker: "Support Worker" };

export default function AssignPolicyModal({ staffProfile, staff, homes, onClose, onSaved }) {
  const [form, setForm] = useState({
    scope: "Individual",
    selected_staff_ids: [],
    selected_departments: [],
    selected_roles: [],
    selected_home_ids: [],
    due_date: "",
    requires_acknowledgement: true,
    reminder_enabled: false,
    reminder_frequency: "Weekly",
    notes: "",
  });
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: policies = [] } = useQuery({
    queryKey: ["hr-policies-active"],
    queryFn: () => base44.entities.HRPolicy.filter({ org_id: ORG_ID, status: "Active" }, "-created_date", 100),
    staleTime: 60000,
  });

  const departments = useMemo(() => [...new Set(staff.map(s => s.notes).filter(Boolean))], [staff]);
  const allDepts = useMemo(() => {
    const depts = new Set();
    staff.forEach(s => { if (s.job_title) depts.add(s.job_title); if (s.notes) depts.add(s.notes); });
    return [...depts].filter(Boolean);
  }, [staff]);

  const resolveStaff = () => {
    const active = staff.filter(s => s.status === "active");
    if (form.scope === "All Staff") return active;
    if (form.scope === "Individual" || form.scope === "Multiple Staff") {
      return active.filter(s => form.selected_staff_ids.includes(s.id));
    }
    if (form.scope === "Department") {
      return active.filter(s => form.selected_departments.some(d => s.job_title === d || s.notes === d));
    }
    if (form.scope === "Role") {
      return active.filter(s => form.selected_roles.includes(s.role));
    }
    if (form.scope === "Home") {
      return active.filter(s => form.selected_home_ids.some(hId => (s.home_ids || []).includes(hId)));
    }
    return [];
  };

  const handleAssign = async () => {
    if (!selectedPolicyId) { toast.error("Select a policy"); return; }
    const policy = policies.find(p => p.id === selectedPolicyId);
    if (!policy) return;
    const targetStaff = resolveStaff();
    if (targetStaff.length === 0) { toast.error("No matching active staff found"); return; }

    setSaving(true);
    try {
      // Create batch
      const batch = await base44.entities.HRPolicyAssignmentBatch.create({
        org_id: ORG_ID,
        policy_id: policy.id,
        policy_title: policy.policy_title,
        policy_version_number: policy.current_version_number,
        assignment_name: `${policy.policy_title} — ${form.scope}`,
        assignment_scope: form.scope,
        assigned_by_staff_id: staffProfile?.id,
        assigned_by_name: staffProfile?.full_name,
        assigned_at: new Date().toISOString(),
        due_date: form.due_date,
        requires_acknowledgement: form.requires_acknowledgement,
        reminder_enabled: form.reminder_enabled,
        reminder_frequency: form.reminder_frequency,
        status: "Active",
        staff_count: targetStaff.length,
        notes: form.notes,
      });

      // Create individual assignments
      let skipped = 0;
      for (const member of targetStaff) {
        // Check for existing
        const existing = await base44.entities.HRPolicyStaffAssignment.filter({
          org_id: ORG_ID,
          policy_id: policy.id,
          staff_id: member.id,
        }, "-created_date", 1);
        const active = (existing || []).filter(a => !["Exempted", "Cancelled"].includes(a.status));
        if (active.length > 0) { skipped++; continue; }

        const home = homes.find(h => (member.home_ids || []).includes(h.id));
        await base44.entities.HRPolicyStaffAssignment.create({
          org_id: ORG_ID,
          assignment_batch_id: batch.id,
          policy_id: policy.id,
          policy_title: policy.policy_title,
          policy_version_number: policy.current_version_number,
          staff_id: member.id,
          staff_name: member.full_name,
          staff_role: member.role,
          staff_department: member.job_title || "",
          staff_home_id: home?.id || "",
          staff_home_name: home?.name || "",
          assigned_by_staff_id: staffProfile?.id,
          assigned_by_name: staffProfile?.full_name,
          assigned_at: new Date().toISOString(),
          due_date: form.due_date,
          status: "Assigned",
          acknowledgement_required: form.requires_acknowledgement,
          file_url: policy.current_file_url || "",
          file_name: policy.current_file_name || "",
        });
      }

      await base44.entities.HRPolicyActivityEvent.create({
        org_id: ORG_ID,
        event_type: "Policy Assigned",
        event_title: `Policy assigned to ${targetStaff.length} staff`,
        event_description: `${policy.policy_title} assigned by ${staffProfile?.full_name}`,
        policy_id: policy.id,
        policy_title: policy.policy_title,
        performed_by_staff_id: staffProfile?.id,
        performed_by_name: staffProfile?.full_name,
        event_date: new Date().toISOString(),
      });

      toast.success(`Policy assigned to ${targetStaff.length - skipped} staff${skipped > 0 ? `. ${skipped} duplicate(s) skipped.` : ""}`);
      onSaved();
    } catch (e) {
      toast.error("Failed to assign policy");
    } finally {
      setSaving(false);
    }
  };

  const toggleStaff = (id) => set("selected_staff_ids", form.selected_staff_ids.includes(id) ? form.selected_staff_ids.filter(x => x !== id) : [...form.selected_staff_ids, id]);
  const toggleRole = (r) => set("selected_roles", form.selected_roles.includes(r) ? form.selected_roles.filter(x => x !== r) : [...form.selected_roles, r]);
  const toggleHome = (id) => set("selected_home_ids", form.selected_home_ids.includes(id) ? form.selected_home_ids.filter(x => x !== id) : [...form.selected_home_ids, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-800">Assign Policy</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Select Policy *</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={selectedPolicyId} onChange={e => setSelectedPolicyId(e.target.value)}>
              <option value="">Select a policy…</option>
              {policies.map(p => <option key={p.id} value={p.id}>{p.policy_title} (v{p.current_version_number || "1.0"})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Assign To</label>
            <div className="grid grid-cols-3 gap-2">
              {SCOPES.map(s => {
                const Icon = s.icon;
                return (
                  <button key={s.key} onClick={() => set("scope", s.key)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-medium transition-colors ${form.scope === s.key ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    <Icon className="w-4 h-4" />{s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scope-specific selectors */}
          {(form.scope === "Individual" || form.scope === "Multiple Staff") && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Select Staff</label>
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {staff.filter(s => s.status === "active").map(s => (
                  <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type={form.scope === "Individual" ? "radio" : "checkbox"}
                      checked={form.selected_staff_ids.includes(s.id)}
                      onChange={() => form.scope === "Individual" ? set("selected_staff_ids", [s.id]) : toggleStaff(s.id)}
                    />
                    <div>
                      <p className="text-sm font-medium">{s.full_name}</p>
                      <p className="text-xs text-slate-400 capitalize">{s.role?.replace(/_/g, " ")}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.scope === "Role" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Select Roles</label>
              <div className="flex flex-wrap gap-2">
                {ROLES.map(r => (
                  <button key={r} onClick={() => toggleRole(r)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${form.selected_roles.includes(r) ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"}`}>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.scope === "Home" && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-2">Select Homes</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {homes.map(h => (
                  <label key={h.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                    <input type="checkbox" checked={form.selected_home_ids.includes(h.id)} onChange={() => toggleHome(h.id)} />
                    <span className="text-sm">{h.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Due Date</label>
            <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.due_date} onChange={e => set("due_date", e.target.value)} />
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Require Acknowledgement</p>
            <button onClick={() => set("requires_acknowledgement", !form.requires_acknowledgement)} className={`w-12 h-6 rounded-full transition-colors ${form.requires_acknowledgement ? "bg-teal-500" : "bg-slate-200"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.requires_acknowledgement ? "translate-x-6" : ""}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Enable Reminders</p>
            <button onClick={() => set("reminder_enabled", !form.reminder_enabled)} className={`w-12 h-6 rounded-full transition-colors ${form.reminder_enabled ? "bg-teal-500" : "bg-slate-200"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.reminder_enabled ? "translate-x-6" : ""}`} />
            </button>
          </div>

          {form.reminder_enabled && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Reminder Frequency</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.reminder_frequency} onChange={e => set("reminder_frequency", e.target.value)}>
                {["Daily", "Every 3 days", "Weekly", "Fortnightly"].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none h-16" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{resolveStaff().length} staff</span> will be assigned this policy
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleAssign} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Assigning…</> : <><UserPlus className="w-4 h-4" /> Assign Now</>}
            </button>
            <button onClick={onClose} className="px-4 border border-slate-200 rounded-xl text-sm text-slate-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}