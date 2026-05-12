import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { X, Upload, Loader2 } from "lucide-react";

const CATEGORIES = ["Safeguarding", "Clinical", "Compliance", "Operations", "Health & Safety", "HR", "Finance", "IT & Data", "Other"];

export default function UploadPolicyModal({ staffProfile, onClose, onSaved }) {
  const [form, setForm] = useState({
    policy_title: "", category: "Compliance", policy_type: "", version_number: "1.0",
    effective_date: "", review_date: "", expiry_date: "", owner_department: "",
    description: "", status: "Active", requires_acknowledgement: true, notes: ""
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.policy_title) { toast.error("Policy title is required"); return; }
    setSaving(true);
    try {
      let file_url = "";
      let file_name = "";
      if (file) {
        const res = await base44.integrations.Core.UploadFile({ file });
        file_url = res.file_url;
        file_name = file.name;
      }

      const policy = await base44.entities.HRPolicy.create({
        org_id: ORG_ID,
        ...form,
        current_version_number: form.version_number,
        current_file_url: file_url,
        current_file_name: file_name,
        created_by_staff_id: staffProfile?.id,
        created_by_name: staffProfile?.full_name,
      });

      if (file_url) {
        await base44.entities.HRPolicyVersion.create({
          org_id: ORG_ID,
          policy_id: policy.id,
          policy_title: form.policy_title,
          version_number: form.version_number,
          file_url,
          file_name,
          file_type: file?.type || "",
          uploaded_by_staff_id: staffProfile?.id,
          uploaded_by_name: staffProfile?.full_name,
          effective_date: form.effective_date,
          review_date: form.review_date,
          expiry_date: form.expiry_date,
          status: "Active",
        });
      }

      await base44.entities.HRPolicyActivityEvent.create({
        org_id: ORG_ID,
        event_type: "Policy Uploaded",
        event_title: `Policy uploaded: ${form.policy_title} v${form.version_number}`,
        event_description: `Uploaded by ${staffProfile?.full_name}`,
        policy_id: policy.id,
        policy_title: form.policy_title,
        performed_by_staff_id: staffProfile?.id,
        performed_by_name: staffProfile?.full_name,
        event_date: new Date().toISOString(),
      });

      toast.success("Policy uploaded successfully");
      onSaved();
    } catch (e) {
      toast.error("Failed to upload policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-800">Upload Policy</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          {[
            ["Policy Title *", "policy_title", "text"],
            ["Policy Code", "policy_code", "text"],
            ["Policy Type", "policy_type", "text"],
            ["Version Number", "version_number", "text"],
            ["Effective Date", "effective_date", "date"],
            ["Review Date", "review_date", "date"],
            ["Expiry Date (optional)", "expiry_date", "date"],
            ["Owner Department", "owner_department", "text"],
          ].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
              <input type={type} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-400" value={form[key] || ""} onChange={e => set(key, e.target.value)} />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.category} onChange={e => set("category", e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" value={form.status} onChange={e => set("status", e.target.value)}>
              {["Draft", "Active", "Archived"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Description</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none h-20" value={form.description} onChange={e => set("description", e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Notes</label>
            <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none resize-none h-16" value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Require Acknowledgement</p>
              <p className="text-xs text-slate-400">Staff must confirm they have read this policy</p>
            </div>
            <button onClick={() => set("requires_acknowledgement", !form.requires_acknowledgement)} className={`w-12 h-6 rounded-full transition-colors ${form.requires_acknowledgement ? "bg-teal-500" : "bg-slate-200"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${form.requires_acknowledgement ? "translate-x-6" : ""}`} />
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Upload File (PDF, Word)</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
              {file ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 truncate">{file.name}</span>
                  <button onClick={() => setFile(null)} className="text-red-400 hover:text-red-600 ml-2"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Click to select file</p>
                  <input type="file" accept=".pdf,.doc,.docx" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => setFile(e.target.files[0])} />
                </>
              )}
            </div>
            <input type="file" accept=".pdf,.doc,.docx" className="mt-2 text-sm w-full" onChange={e => setFile(e.target.files[0])} />
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 bg-teal-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Upload Policy</>}
            </button>
            <button onClick={onClose} className="px-4 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}