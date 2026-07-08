import { useState } from "react";
import { X, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import Portal from "@/components/ui/Portal";

const CATEGORIES = [
  ["gas_safety","Gas Safety"],["electrical_safety","Electrical Safety"],["fire_safety","Fire Safety"],
  ["water_safety","Water Safety"],["emergency_lighting","Emergency Lighting"],["insurance","Insurance"],
  ["property_licence","Property Licence"],["local_authority","Local Authority"],["health_safety","Health & Safety"],
  ["risk_assessment","Risk Assessment"],["staff_compliance","Staff Compliance"],["yp_resident_records","YP / Resident Records"],
  ["audit_visit","Audit Visit"],["policy_review","Policy Review"],["maintenance_compliance","Maintenance Compliance"],["other","Other"]
];
const FREQUENCIES = [["monthly","Monthly"],["quarterly","Quarterly"],["biannually","Bi-annually"],["annually","Annually"],["2_yearly","2 Yearly"],["3_yearly","3 Yearly"],["5_yearly","5 Yearly"],["one_off","One-off"],["other","Other"]];
const PRIORITIES = [["critical","Critical"],["high","High"],["medium","Medium"],["review","Review"],["current","Current"]];
const STATUSES = [["current","Current"],["expired","Expired"],["due_in_30","Due in 30 Days"],["due_in_90","Due in 90 Days"],["review_required","Review Required"],["missing_evidence","Missing Evidence"],["renewal_requested","Renewal Requested"],["assigned","Assigned"],["closed","Closed"]];

// ── Add Compliance Item Modal ──────────────────────────────────────────────────
export function AddComplianceModal({ homes, user, staffList, onClose, onSuccess }) {
  const [form, setForm] = useState({ item_name:"",home_id:"",home_name:"",category:"",expiry_date:"",issue_date:"",renewal_frequency:"annually",owner_name:"",priority:"medium",status:"current",notes:"",reminder_days_before:30 });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f => ({...f,[k]:v}));

  const handleSubmit = async () => {
    if (!form.item_name || !form.home_id || !form.category) { toast.error("Please fill required fields."); return; }
    setSaving(true);
    const home = homes.find(h=>h.id===form.home_id);
    await base44.entities.ComplianceItem.create({ ...form, org_id: ORG_ID, home_name: home?.name||"", created_by_name: user?.full_name||"" });
    await base44.entities.ComplianceActivityEvent.create({ org_id: ORG_ID, home_id: form.home_id, home_name: home?.name||"", compliance_item_name: form.item_name, event_type: "item_created", event_title: `${form.item_name} added`, performed_by_name: user?.full_name||"", event_datetime: new Date().toISOString() });
    toast.success("Compliance item added.");
    setSaving(false);
    onSuccess();
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Add Compliance Item</h2>
            <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <div className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name *</label>
              <input value={form.item_name} onChange={e=>set("item_name",e.target.value)} placeholder="e.g. Gas Safety Certificate" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Home *</label>
                <select value={form.home_id} onChange={e=>set("home_id",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="">Select...</option>
                  {homes.map(h=><option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                <select value={form.category} onChange={e=>set("category",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                  <option value="">Select...</option>
                  {CATEGORIES.map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={e=>set("expiry_date",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Issue Date</label>
                <input type="date" value={form.issue_date} onChange={e=>set("issue_date",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Renewal Frequency</label>
                <select value={form.renewal_frequency} onChange={e=>set("renewal_frequency",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                  {FREQUENCIES.map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Owner</label>
                <input value={form.owner_name} onChange={e=>set("owner_name",e.target.value)} placeholder="Staff name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                <select value={form.priority} onChange={e=>set("priority",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                  {PRIORITIES.map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={e=>set("status",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                  {STATUSES.map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reminder (days before expiry)</label>
                <input type="number" min="1" value={form.reminder_days_before} onChange={e=>set("reminder_days_before",parseInt(e.target.value)||30)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
                <textarea rows={3} value={form.notes} onChange={e=>set("notes",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60">{saving?"Saving...":"Add Item"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Audit Review Modal ─────────────────────────────────────────────────────────
export function AuditReviewModal({ onClose, onRun }) {
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    await onRun();
    setRunning(false);
    onClose();
  };
  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-2">Run Compliance Audit Review</h2>
          <p className="text-sm text-slate-500 mb-4">This will scan all compliance records and update statuses for expired, critical, due soon, and missing evidence items.</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={run} disabled={running} className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60">{running ? "Running..." : "Run Audit"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Upload Evidence Modal ──────────────────────────────────────────────────────
export function UploadEvidenceModal({ item, user, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ evidence_type:"certificate", notes:"", requires_manager_review: false });
  const [uploading, setUploading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleUpload = async () => {
    if (!file) { toast.error("Please select a file."); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ComplianceEvidence.create({ org_id: ORG_ID, compliance_item_id: item.id, file_url, file_name: file.name, file_type: file.type, evidence_type: form.evidence_type, notes: form.notes, uploaded_by_name: user?.full_name||"", is_latest: true, requires_manager_review: form.requires_manager_review, uploaded_at: new Date().toISOString() });
    await base44.entities.ComplianceItem.update(item.id, { evidence_status: "uploaded" });
    await base44.entities.ComplianceActivityEvent.create({ org_id: ORG_ID, home_id: item.home_id, home_name: item.home_name, compliance_item_id: item.id, compliance_item_name: item.item_name, event_type: "evidence_uploaded", event_title: `Evidence uploaded for ${item.item_name}`, performed_by_name: user?.full_name||"", event_datetime: new Date().toISOString() });
    toast.success("Evidence uploaded.");
    setUploading(false);
    onSuccess();
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Upload Evidence</h2>
            <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <p className="text-xs text-slate-500 mb-3">For: <span className="font-semibold text-slate-700">{item.item_name}</span></p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence File *</label>
              <input type="file" onChange={e=>setFile(e.target.files[0])} className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Evidence Type</label>
              <select value={form.evidence_type} onChange={e=>set("evidence_type",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                {[["certificate","Certificate"],["report","Report"],["inspection","Inspection Record"],["policy","Policy Document"],["other","Other"]].map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e=>set("notes",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none" />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
              <input type="checkbox" checked={form.requires_manager_review} onChange={e=>set("requires_manager_review",e.target.checked)} className="rounded" />
              Requires manager review
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleUpload} disabled={uploading} className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60 flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />{uploading?"Uploading...":"Upload"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Renewal Modal ──────────────────────────────────────────────────────────────
export function RenewalModal({ item, user, onClose, onSuccess }) {
  const [form, setForm] = useState({ expected_renewal_date:"", assigned_owner:"", notes:"", priority:"medium" });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.ComplianceItem.update(item.id, { status:"renewal_requested", owner_name: form.assigned_owner||item.owner_name });
    await base44.entities.ComplianceTask.create({ org_id: ORG_ID, compliance_item_id: item.id, home_id: item.home_id, home_name: item.home_name, title: `Renew: ${item.item_name}`, assigned_to_name: form.assigned_owner||item.owner_name, due_date: form.expected_renewal_date, priority: form.priority, status:"open", notes: form.notes });
    await base44.entities.ComplianceActivityEvent.create({ org_id: ORG_ID, home_id: item.home_id, home_name: item.home_name, compliance_item_id: item.id, compliance_item_name: item.item_name, event_type:"renewal_requested", event_title:`Renewal requested for ${item.item_name}`, performed_by_name: user?.full_name||"", event_datetime: new Date().toISOString() });
    toast.success("Renewal request submitted.");
    setSaving(false);
    onSuccess();
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Request Renewal</h2>
            <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <p className="text-xs text-slate-500 mb-3">Item: <span className="font-semibold text-slate-700">{item.item_name}</span></p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned Owner</label>
              <input value={form.assigned_owner} onChange={e=>set("assigned_owner",e.target.value)} placeholder={item.owner_name||"Staff name"} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Expected Renewal Date</label>
              <input type="date" value={form.expected_renewal_date} onChange={e=>set("expected_renewal_date",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e=>set("priority",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                {[["low","Low"],["medium","Medium"],["high","High"],["critical","Critical"]].map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e=>set("notes",e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60">{saving?"Saving...":"Submit"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ── Add Note / Edit Modal ──────────────────────────────────────────────────────
export function AddNoteModal({ item, user, onClose, onSuccess }) {
  const [note, setNote] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) { toast.error("Note cannot be empty."); return; }
    setSaving(true);
    await base44.entities.ComplianceNote.create({ org_id: ORG_ID, compliance_item_id: item.id, note_text: note, note_type: noteType, added_by_name: user?.full_name||"", added_at: new Date().toISOString() });
    await base44.entities.ComplianceActivityEvent.create({ org_id: ORG_ID, home_id: item.home_id, home_name: item.home_name, compliance_item_id: item.id, compliance_item_name: item.item_name, event_type:"note_added", event_title:`Note added to ${item.item_name}`, performed_by_name: user?.full_name||"", event_datetime: new Date().toISOString() });
    toast.success("Note saved.");
    setSaving(false);
    onSuccess();
  };

  return (
    <Portal>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Add Note</h2>
            <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <p className="text-xs text-slate-500 mb-3">Item: <span className="font-semibold text-slate-700">{item.item_name}</span></p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Note Type</label>
              <select value={noteType} onChange={e=>setNoteType(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300">
                {[["general","General"],["risk","Risk"],["renewal","Renewal"],["escalation","Escalation"],["evidence","Evidence"],["manager_review","Manager Review"]].map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Note *</label>
              <textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Enter your note..." className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-60">{saving?"Saving...":"Save Note"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}