import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const CATEGORIES = ["Safeguarding", "Health & Safety", "Clinical", "Behaviour", "Legislation", "Compliance", "Induction", "Other"];
const HOME_TYPES = ["outreach", "24_hours", "care", "18_plus"];
const ROLES = ["admin", "admin_officer", "team_leader", "support_worker"];

// Core Mandatory Training (Annual) + Development Training
const OFSTED_COURSES = [
  // Core Mandatory
  { course_name: "Safeguarding Children", category: "Safeguarding", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Health & Safety Awareness", category: "Health & Safety", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Mental Health Awareness", category: "Other", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Missing Child Procedures", category: "Safeguarding", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Behaviour Management", category: "Behaviour", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Equality, Diversity & Inclusion", category: "Compliance", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Children's Rights & Entitlements", category: "Legislation", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Induction Training", category: "Induction", expiry_months: 0, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES, notes: "Policies, Statement of Purpose, Young Person's Guide" },
  { course_name: "Risk Assessment", category: "Compliance", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES, notes: "Individual Young Person Risks, Contextual Risks" },
  { course_name: "Prevent / Radicalisation Awareness", category: "Safeguarding", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Information Governance / GDPR", category: "Compliance", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Fire Safety Awareness", category: "Health & Safety", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Trauma-Informed Care", category: "Other", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Independent Living Skills (ILS)", category: "Other", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Incident Reporting / Safeguarding Reporting", category: "Safeguarding", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Contingency / Emergency Planning", category: "Compliance", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Child Criminal Exploitation (CCE)", category: "Safeguarding", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Child Sexual Exploitation (CSE)", category: "Safeguarding", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "County Lines Safeguarding", category: "Safeguarding", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  { course_name: "Lone Working", category: "Health & Safety", expiry_months: 12, is_mandatory: true, mandatory: "Mandatory for all", home_types: [], roles: ROLES },
  // Development / Desirable
  { course_name: "Medication Awareness", category: "Other", expiry_months: 12, is_mandatory: false, mandatory: "Optional", home_types: [], roles: ROLES },
];

const BLANK_FORM = {
  course_name: "", category: "Safeguarding", home_types: [], roles: [],
  expiry_months: "", is_mandatory: true, mandatory: "Mandatory for all",
  display_order: 0, is_active: true, notes: "",
};

export default function TrainingCoursesTab({ staffProfile }) {
  const qc = useQueryClient();
  const isAdmin = staffProfile?.role === "admin" || staffProfile?.role === "admin_officer";
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ["training-requirements"],
    queryFn: async () => {
      const recs = await secureGateway.filter("TrainingRequirement");
      // Seed if empty
      if (recs.length === 0) {
        for (let i = 0; i < OFSTED_COURSES.length; i++) {
          await secureGateway.create("TrainingRequirement", {
            ...OFSTED_COURSES[i],
            is_active: true,
            display_order: i + 1,
          });
        }
        return secureGateway.filter("TrainingRequirement");
      }
      return recs;
    },
    staleTime: 5 * 60 * 1000,
  });

  const openEdit = (rec) => {
    setEditRecord(rec);
    setForm({
      course_name: rec.course_name || "",
      category: rec.category || "Safeguarding",
      home_types: rec.home_types || [],
      roles: rec.roles || [],
      expiry_months: rec.expiry_months ?? "",
      is_mandatory: rec.is_mandatory ?? true,
      mandatory: rec.mandatory || "Mandatory for all",
      display_order: rec.display_order || 0,
      is_active: rec.is_active !== false,
      notes: rec.notes || "",
    });
    setShowForm(true);
  };

  const openAdd = () => {
    setEditRecord(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.course_name.trim()) { toast.error("Course name is required"); return; }
    setSaving(true);
    const payload = {
      ...form,
      expiry_months: form.expiry_months === "" ? 0 : parseInt(form.expiry_months) || 0,
    };
    if (editRecord?.id) {
      await secureGateway.update("TrainingRequirement", editRecord.id, payload);
    } else {
      await secureGateway.create("TrainingRequirement", payload);
    }
    qc.invalidateQueries({ queryKey: ["training-requirements"] });
    toast.success("Course saved");
    setSaving(false);
    setShowForm(false);
  };

  const handleDelete = async () => {
    await secureGateway.delete("TrainingRequirement", deleteId);
    qc.invalidateQueries({ queryKey: ["training-requirements"] });
    toast.success("Course removed");
    setDeleteId(null);
  };

  const toggleHomeType = (ht) => setForm(f => ({
    ...f, home_types: f.home_types.includes(ht) ? f.home_types.filter(x => x !== ht) : [...f.home_types, ht]
  }));
  const toggleRole = (r) => setForm(f => ({
    ...f, roles: f.roles.includes(r) ? f.roles.filter(x => x !== r) : [...f.roles, r]
  }));

  const sorted = [...requirements].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  if (!isAdmin) {
    return <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">Admin access only.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Training Requirements</h2>
        <Button onClick={openAdd} className="gap-1.5" size="sm"><Plus className="w-4 h-4" /> Add Course</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-medium">#</th>
                <th className="text-left px-4 py-3 font-medium">Course Name</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-left px-4 py-3 font-medium">Home Types</th>
                <th className="text-left px-4 py-3 font-medium">Roles</th>
                <th className="text-left px-4 py-3 font-medium">Expiry</th>
                <th className="text-left px-4 py-3 font-medium">Mandatory</th>
                <th className="text-center px-4 py-3 font-medium">Active</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2.5 text-muted-foreground">{r.display_order || "—"}</td>
                  <td className="px-4 py-2.5 font-medium max-w-[200px]">
                    <span title={r.course_name}>{r.course_name}</span>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{r.category}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{(r.home_types || []).join(", ") || "All"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{(r.roles || []).map(x => x.replace(/_/g, " ")).join(", ") || "All"}</td>
                  <td className="px-4 py-2.5">{r.expiry_months ? `${r.expiry_months} months` : "No expiry"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${r.is_mandatory ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.mandatory || (r.is_mandatory ? "Mandatory" : "Optional")}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`w-2 h-2 rounded-full inline-block ${r.is_active !== false ? "bg-green-500" : "bg-slate-300"}`} />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(r)} className="text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(r.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">No courses yet. Click "+ Add Course" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="font-semibold">{editRecord ? "Edit Course" : "Add Course"}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium">Course Name *</label>
                <Input value={form.course_name} onChange={e => setForm(f => ({ ...f, course_name: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Home Types</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {HOME_TYPES.map(ht => (
                    <label key={ht} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={form.home_types.includes(ht)} onChange={() => toggleHomeType(ht)} className="rounded" />
                      {ht.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Applicable Roles</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {ROLES.map(r => (
                    <label key={r} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <input type="checkbox" checked={form.roles.includes(r)} onChange={() => toggleRole(r)} className="rounded" />
                      {r.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Expiry Period (months)</label>
                  <Input type="number" value={form.expiry_months} onChange={e => setForm(f => ({ ...f, expiry_months: e.target.value }))} className="mt-1" placeholder="0 = no expiry" />
                </div>
                <div>
                  <label className="text-xs font-medium">Display Order</label>
                  <Input type="number" value={form.display_order} onChange={e => setForm(f => ({ ...f, display_order: parseInt(e.target.value) || 0 }))} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Mandatory</label>
                <Select value={form.mandatory} onValueChange={v => setForm(f => ({ ...f, mandatory: v, is_mandatory: v === "Mandatory for all" }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mandatory for all">Mandatory for all</SelectItem>
                    <SelectItem value="Role-specific">Role-specific</SelectItem>
                    <SelectItem value="Optional">Optional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[60px]"
                  placeholder="Optional notes…"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <span className="text-xs font-medium">Active (shown in matrix)</span>
              </div>
            </div>
            <div className="flex gap-2 p-5 pt-0">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Course"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl border border-border shadow-xl p-6 w-full max-w-sm text-center space-y-4">
            <p className="font-semibold">Remove this course?</p>
            <p className="text-sm text-muted-foreground">This will remove the course from the training matrix. Existing training records are not deleted.</p>
            <div className="flex gap-3">
              <Button variant="destructive" onClick={handleDelete} className="flex-1">Remove</Button>
              <Button variant="outline" onClick={() => setDeleteId(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}