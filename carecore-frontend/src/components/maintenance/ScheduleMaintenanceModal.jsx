import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { CATEGORY_LABELS } from "./MaintenanceBadges";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { toast } from "sonner";
import Portal from "@/components/ui/Portal";

const FREQUENCIES = ["one_off","weekly","monthly","quarterly","biannually","yearly","custom"];
const MAINTENANCE_TYPES = ["service","inspection","test","contractor_visit","planned_repair","compliance_check","other"];

export default function ScheduleMaintenanceModal({ homes, user, onClose, onSuccess }) {
  const [form, setForm] = useState({
    home_id: "", home_name: "", applies_to_all_homes: false,
    schedule_title: "", category: "", maintenance_type: "service",
    frequency: "yearly", start_date: new Date().toISOString().slice(0,10),
    next_due_at: "", assigned_to_name: "", contractor_name: "",
    estimated_cost: "", reminder_days_before: 7, notes: "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: staffList = [] } = useQuery({ 
    queryKey: ["staff"], 
    queryFn: () => secureGateway.filter("StaffProfile"), 
    staleTime: 5 * 60 * 1000 
  });

  const { data: contractsList = [] } = useQuery({
    queryKey: ["maintenance-contracts", ORG_ID],
    queryFn: () => base44.entities.MaintenanceContract.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  const staffOptions = staffList.map(s => s.full_name).filter(Boolean);
  const contractorOptions = [...new Set(contractsList.map(c => c.contractor_name).filter(Boolean))];

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.schedule_title || !form.category || !form.next_due_at) {
      toast.error("Please fill in required fields.");
      return;
    }
    setSaving(true);
    const home = homes.find(h => h.id === form.home_id);
    await base44.entities.MaintenanceSchedule.create({
      org_id: ORG_ID,
      home_id: form.applies_to_all_homes ? undefined : form.home_id,
      home_name: form.applies_to_all_homes ? undefined : home?.name,
      applies_to_all_homes: form.applies_to_all_homes,
      schedule_title: form.schedule_title,
      category: form.category,
      maintenance_type: form.maintenance_type,
      frequency: form.frequency,
      start_date: form.start_date,
      next_due_at: new Date(form.next_due_at).toISOString(),
      assigned_to_name: form.assigned_to_name,
      contractor_name: form.contractor_name,
      estimated_cost: form.estimated_cost ? parseFloat(form.estimated_cost) : undefined,
      reminder_days_before: parseInt(form.reminder_days_before) || 7,
      notes: form.notes,
      status: "active",
      created_by_name: user?.full_name || "Admin",
    });
    toast.success("Maintenance schedule created.");
    setSaving(false);
    onSuccess();
  };

  return (
    <Portal>
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Schedule Maintenance</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-3 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <input type="checkbox" id="allHomes" checked={form.applies_to_all_homes} onChange={e => set("applies_to_all_homes", e.target.checked)} className="rounded" />
            <label htmlFor="allHomes" className="text-xs font-medium text-slate-600">Apply to All Homes</label>
          </div>
          {!form.applies_to_all_homes && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Home</label>
              <select value={form.home_id} onChange={e => { const h = homes.find(h=>h.id===e.target.value); set("home_id", e.target.value); set("home_name", h?.name||""); }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                <option value="">Select home...</option>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Schedule Title *</label>
              <input type="text" value={form.schedule_title} onChange={e => set("schedule_title", e.target.value)} placeholder="e.g. Annual boiler service" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required>
                <option value="">Select...</option>
                {Object.entries(CATEGORY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
              <select value={form.maintenance_type} onChange={e => set("maintenance_type", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => set("frequency", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                {FREQUENCIES.map(f => <option key={f} value={f}>{f.charAt(0).toUpperCase()+f.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Next Due *</label>
              <input type="datetime-local" value={form.next_due_at} onChange={e => set("next_due_at", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assigned To</label>
              <AutocompleteInput
                value={form.assigned_to_name}
                onChange={val => set("assigned_to_name", val)}
                options={staffOptions}
                placeholder="Select staff..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contractor</label>
              <AutocompleteInput
                value={form.contractor_name}
                onChange={val => set("contractor_name", val)}
                options={contractorOptions}
                placeholder="Select contractor..."
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Est. Cost (£)</label>
              <input type="number" value={form.estimated_cost} onChange={e => set("estimated_cost", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Reminder (days before)</label>
              <input type="number" min="1" value={form.reminder_days_before} onChange={e => set("reminder_days_before", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
            </div>
          </div>
        </form>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving..." : "Create Schedule"}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}