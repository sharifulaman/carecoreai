import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { X, Loader2, Users } from "lucide-react";

const ROLES = ["admin", "admin_officer", "team_leader", "support_worker"];
const ROLE_LABELS = { admin: "Admin", admin_officer: "Admin Officer", team_leader: "Team Leader", support_worker: "Support Worker" };

export default function CreateGroupModal({ staffProfile, staff, homes, onClose, onSaved }) {
  const [form, setForm] = useState({ group_name: "", description: "", role_filters: [], home_filters: [], member_staff_ids: [] });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleRole = (r) => set("role_filters", form.role_filters.includes(r) ? form.role_filters.filter(x => x !== r) : [...form.role_filters, r]);
  const toggleHome = (id) => set("home_filters", form.home_filters.includes(id) ? form.home_filters.filter(x => x !== id) : [...form.home_filters, id]);
  const toggleStaff = (id) => set("member_staff_ids", form.member_staff_ids.includes(id) ? form.member_staff_ids.filter(x => x !== id) : [...form.member_staff_ids, id]);

  const handleSave = async () => {
    if (!form.group_name) { toast.error("Group name required"); return; }
    setSaving(true);
    try {
      const memberNames = staff.filter(s => form.member_staff_ids.includes(s.id)).map(s => s.full_name);
      await base44.entities.HRPolicyGroup.create({
        org_id: ORG_ID,
        ...form,
        member_staff_names: memberNames,
        member_count: form.member_staff_ids.length,
        created_by_staff_id: staffProfile?.id,
        created_by_name: staffProfile?.full_name,
        status: "Active",
      });
      toast.success("Group created");
      onSaved();
    } catch (e) {
      toast.error("Failed to create group");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-800">Create Policy Group</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Group Name *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.group_name} onChange={e => set("group_name", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none h-16" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Role Filters</label>
            <div className="flex flex-wrap gap-2">
              {ROLES.map(r => (
                <button key={r} onClick={() => toggleRole(r)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${form.role_filters.includes(r) ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Home Filters</label>
            <div className="flex flex-wrap gap-2">
              {homes.map(h => (
                <button key={h.id} onClick={() => toggleHome(h.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${form.home_filters.includes(h.id) ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600"}`}>
                  {h.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Manual Staff Members</label>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
              {staff.filter(s => s.status === "active").map(s => (
                <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={form.member_staff_ids.includes(s.id)} onChange={() => toggleStaff(s.id)} />
                  <div>
                    <p className="text-sm font-medium">{s.full_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{s.role?.replace(/_/g, " ")}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><Users className="w-4 h-4" /> Create Group</>}
            </button>
            <button onClick={onClose} className="px-4 border border-slate-200 rounded-xl text-sm text-slate-600">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}