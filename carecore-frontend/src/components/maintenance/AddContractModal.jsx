import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import Portal from "@/components/ui/Portal";

const SERVICE_TYPES = [
  "Gas Safety", "Electrical Inspection (EICR)", "Fire Safety & Alarms",
  "Boiler Service", "Plumbing", "Pest Control", "Cleaning",
  "Lift Maintenance", "Security Systems", "Grounds & Garden",
  "Waste Collection", "Broadband / Utilities", "General Maintenance", "Other",
];

const COST_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
  { value: "one_off", label: "One-off" },
];

const EMPTY = {
  home_id: "",
  applies_to_all_homes: true,
  contractor_name: "",
  service_type: "",
  contract_start_date: "",
  contract_end_date: "",
  cost_amount: "",
  cost_frequency: "annual",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  status: "active",
  notes: "",
  document_url: "",
};

export default function AddContractModal({ homes, user, onClose, onSuccess }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  const validate = () => {
    const errs = {};
    if (!form.contractor_name.trim()) errs.contractor_name = "Contractor name is required";
    if (!form.service_type) errs.service_type = "Service type is required";
    if (!form.applies_to_all_homes && !form.home_id) errs.home_id = "Please select a home or apply to all homes";
    if (form.cost_amount && (isNaN(Number(form.cost_amount)) || Number(form.cost_amount) < 0))
      errs.cost_amount = "Please enter a valid cost";
    return errs;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const home = homes.find(h => h.id === form.home_id);
      await base44.entities.MaintenanceContract.create({
        org_id: ORG_ID,
        home_id: form.applies_to_all_homes ? "" : (form.home_id || ""),
        home_name: form.applies_to_all_homes ? "All Homes" : (home?.name || ""),
        contractor_name: form.contractor_name.trim(),
        service_type: form.service_type,
        contract_start_date: form.contract_start_date || null,
        contract_end_date: form.contract_end_date || null,
        cost_amount: form.cost_amount ? parseFloat(form.cost_amount) : undefined,
        cost_frequency: form.cost_frequency,
        contact_name: form.contact_name,
        contact_phone: form.contact_phone,
        contact_email: form.contact_email,
        status: form.status,
        notes: form.notes,
        document_url: form.document_url,
      });
      toast.success("Contract added successfully.");
      onSuccess();
    } catch (err) {
      toast.error("Failed to add contract: " + (err?.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const activeHomes = homes.filter(h => h.status !== "archived");

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h2 className="text-base font-bold text-slate-900">Add Maintenance Contract</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

            {/* Apply to all homes */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.applies_to_all_homes}
                onChange={e => set("applies_to_all_homes", e.target.checked)}
                className="w-4 h-4 rounded" />
              <span className="text-sm font-medium text-slate-700">Apply to All Homes</span>
            </label>

            {/* Home selector */}
            {!form.applies_to_all_homes && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Property / Home <span className="text-red-500">*</span></label>
                <select value={form.home_id} onChange={e => set("home_id", e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.home_id ? "border-red-400" : "border-slate-200"}`}>
                  <option value="">Select home...</option>
                  {activeHomes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
                {errors.home_id && <p className="text-xs text-red-500 mt-1">{errors.home_id}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Contractor name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contractor / Supplier Name <span className="text-red-500">*</span></label>
                <input value={form.contractor_name} onChange={e => set("contractor_name", e.target.value)}
                  placeholder="e.g. British Gas, Corgi Plumbing Ltd"
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.contractor_name ? "border-red-400" : "border-slate-200"}`} />
                {errors.contractor_name && <p className="text-xs text-red-500 mt-1">{errors.contractor_name}</p>}
              </div>

              {/* Service type */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Service Type <span className="text-red-500">*</span></label>
                <select value={form.service_type} onChange={e => set("service_type", e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.service_type ? "border-red-400" : "border-slate-200"}`}>
                  <option value="">Select service type...</option>
                  {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.service_type && <p className="text-xs text-red-500 mt-1">{errors.service_type}</p>}
              </div>

              {/* Start date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contract Start</label>
                <input type="date" value={form.contract_start_date} onChange={e => set("contract_start_date", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {/* End date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contract End</label>
                <input type="date" value={form.contract_end_date} onChange={e => set("contract_end_date", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {/* Cost */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cost (£)</label>
                <input type="number" min="0" step="0.01" value={form.cost_amount} onChange={e => set("cost_amount", e.target.value)}
                  placeholder="0.00"
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${errors.cost_amount ? "border-red-400" : "border-slate-200"}`} />
                {errors.cost_amount && <p className="text-xs text-red-500 mt-1">{errors.cost_amount}</p>}
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                <select value={form.cost_frequency} onChange={e => set("cost_frequency", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  {COST_FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              {/* Contact name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
                <input value={form.contact_name} onChange={e => set("contact_name", e.target.value)}
                  placeholder="Account manager name"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {/* Contact phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input type="tel" value={form.contact_phone} onChange={e => set("contact_phone", e.target.value)}
                  placeholder="e.g. 0800 123 4567"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {/* Contact email */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
                <input type="email" value={form.contact_email} onChange={e => set("contact_email", e.target.value)}
                  placeholder="contracts@supplier.com"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select value={form.status} onChange={e => set("status", e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Notes */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)}
                  placeholder="Any additional details..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Add Contract"}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
