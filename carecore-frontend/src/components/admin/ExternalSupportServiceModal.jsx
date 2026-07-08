import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function ExternalSupportServiceModal({ service, homes, residents, onClose, onSuccess }) {
  const qc = useQueryClient();
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    agency_organisation_name: service?.agency_organisation_name || "",
    contact_name: service?.contact_name || "",
    contact_phone: service?.contact_phone || "",
    contact_email: service?.contact_email || "",
    contact_address: service?.contact_address || "",
    service_type: service?.service_type || "education",
    service_description: service?.service_description || "",
    hours_per_week_provided: service?.hours_per_week_provided || 0,
    number_of_children_receiving_service: service?.number_of_children_receiving_service || 0,
    linked_resident_ids: service?.linked_resident_ids || [],
    linked_home_ids: service?.linked_home_ids || [],
    accommodation_categories: service?.accommodation_categories || [],
    contract_start_date: service?.contract_start_date || "",
    contract_end_date: service?.contract_end_date || "",
    status: service?.status || "active",
    notes: service?.notes || "",
  });

  const SERVICE_TYPES = [
    "education", "employment_training", "mental_health", "substance_misuse", "sexual_health",
    "disability_support", "youth_offending_team", "camhs", "social_services", "health_nhs",
    "housing_support", "financial_advice", "advocacy", "family_support", "other"
  ];

  const mutation = useMutation({
    mutationFn: (data) => {
      if (service?.id) {
        return base44.entities.ExternalSupportService.update(service.id, data);
      } else {
        return base44.entities.ExternalSupportService.create({ ...data, org_id: ORG_ID });
      }
    },
    onSuccess: () => {
      toast.success(service ? "Service updated" : "Service created");
      onSuccess();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.agency_organisation_name.trim()) errs.agency_organisation_name = "Organisation name is required";
    if (!form.service_type) errs.service_type = "Please select a service type";
    if (!form.service_description.trim()) errs.service_description = "Service description is required";
    if (!form.contact_phone.trim()) errs.contact_phone = "Contact phone is required";
    if (!form.contact_email.trim()) errs.contact_email = "Contact email is required";
    if (form.linked_resident_ids.length === 0) errs.linked_resident_ids = "Please link at least one resident";
    if (form.linked_home_ids.length === 0) errs.linked_home_ids = "Please link at least one home";
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error("Please fill in all required fields"); return; }
    mutation.mutate(form);
  };

  const toggleResidentId = (id) => {
    setForm(f => ({
      ...f,
      linked_resident_ids: f.linked_resident_ids.includes(id)
        ? f.linked_resident_ids.filter(rid => rid !== id)
        : [...f.linked_resident_ids, id]
    }));
    setErrors(err => ({ ...err, linked_resident_ids: undefined }));
  };

  const toggleHomeId = (id) => {
    setForm(f => ({
      ...f,
      linked_home_ids: f.linked_home_ids.includes(id)
        ? f.linked_home_ids.filter(hid => hid !== id)
        : [...f.linked_home_ids, id]
    }));
    setErrors(err => ({ ...err, linked_home_ids: undefined }));
  };

  const toggleCategory = (cat) => {
    setForm(f => ({
      ...f,
      accommodation_categories: f.accommodation_categories.includes(cat)
        ? f.accommodation_categories.filter(c => c !== cat)
        : [...f.accommodation_categories, cat]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-semibold text-slate-900">{service ? "Edit Service" : "Add External Support Service"}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Agency / Organisation Name *</label>
              <Input value={form.agency_organisation_name} onChange={(e) => { setForm({ ...form, agency_organisation_name: e.target.value }); setErrors(err => ({ ...err, agency_organisation_name: undefined })); }} placeholder="E.g. CAMHS, XYZ Training Ltd" className={errors.agency_organisation_name ? "border-red-500" : ""} />
              {errors.agency_organisation_name && <p className="text-xs text-red-500 mt-1">{errors.agency_organisation_name}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Service Type *</label>
              <select value={form.service_type} onChange={(e) => { setForm({ ...form, service_type: e.target.value }); setErrors(err => ({ ...err, service_type: undefined })); }} className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 ${errors.service_type ? "border-red-500" : "border-slate-200"}`}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              {errors.service_type && <p className="text-xs text-red-500 mt-1">{errors.service_type}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Name</label>
              <Input value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Primary contact person" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Phone *</label>
              <Input value={form.contact_phone} onChange={(e) => { setForm({ ...form, contact_phone: e.target.value }); setErrors(err => ({ ...err, contact_phone: undefined })); }} placeholder="Phone number" className={errors.contact_phone ? "border-red-500" : ""} />
              {errors.contact_phone && <p className="text-xs text-red-500 mt-1">{errors.contact_phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Email *</label>
              <Input type="email" value={form.contact_email} onChange={(e) => { setForm({ ...form, contact_email: e.target.value }); setErrors(err => ({ ...err, contact_email: undefined })); }} placeholder="Email address" className={errors.contact_email ? "border-red-500" : ""} />
              {errors.contact_email && <p className="text-xs text-red-500 mt-1">{errors.contact_email}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contact Address</label>
              <Input value={form.contact_address} onChange={(e) => setForm({ ...form, contact_address: e.target.value })} placeholder="Office address" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Service Description *</label>
            <Textarea value={form.service_description} onChange={(e) => { setForm({ ...form, service_description: e.target.value }); setErrors(err => ({ ...err, service_description: undefined })); }} placeholder="What services are provided?" className={`h-20 ${errors.service_description ? "border-red-500" : ""}`} />
            {errors.service_description && <p className="text-xs text-red-500 mt-1">{errors.service_description}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Hours Per Week</label>
              <Input type="number" value={form.hours_per_week_provided} onChange={(e) => setForm({ ...form, hours_per_week_provided: parseFloat(e.target.value) || 0 })} placeholder="E.g. 10" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Number of Children</label>
              <Input type="number" value={form.number_of_children_receiving_service} onChange={(e) => setForm({ ...form, number_of_children_receiving_service: parseInt(e.target.value) || 0 })} placeholder="How many in this service" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract Start Date</label>
              <Input type="date" value={form.contract_start_date} onChange={(e) => setForm({ ...form, contract_start_date: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Contract End Date</label>
              <Input type="date" value={form.contract_end_date} onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Linked Residents *</label>
            {errors.linked_resident_ids && <p className="text-xs text-red-500 mb-1">{errors.linked_resident_ids}</p>}
            <div className={`space-y-1 max-h-32 overflow-y-auto border rounded-lg p-3 bg-slate-50 ${errors.linked_resident_ids ? "border-red-500" : "border-slate-200"}`}>
              {residents.length === 0 ? (
                <p className="text-xs text-slate-500">No residents available</p>
              ) : (
                residents.map(r => (
                  <label key={r.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.linked_resident_ids.includes(r.id)} onChange={() => toggleResidentId(r.id)} className="w-4 h-4 rounded" />
                    <span className="text-slate-700">{r.display_name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Linked Homes *</label>
            {errors.linked_home_ids && <p className="text-xs text-red-500 mb-1">{errors.linked_home_ids}</p>}
            <div className={`space-y-1 max-h-32 overflow-y-auto border rounded-lg p-3 bg-slate-50 ${errors.linked_home_ids ? "border-red-500" : "border-slate-200"}`}>
              {homes.length === 0 ? (
                <p className="text-xs text-slate-500">No homes available</p>
              ) : (
                homes.map(h => (
                  <label key={h.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={form.linked_home_ids.includes(h.id)} onChange={() => toggleHomeId(h.id)} className="w-4 h-4 rounded" />
                    <span className="text-slate-700">{h.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Accommodation Categories</label>
            <div className="flex flex-wrap gap-2">
              {["self_contained", "shared_ring_fenced", "shared_non_ring_fenced"].map(cat => (
                <label key={cat} className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" checked={form.accommodation_categories.includes(cat)} onChange={() => toggleCategory(cat)} className="w-4 h-4 rounded" />
                  <span className="text-sm text-slate-700">{cat.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes about this service" className="h-20" />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 sticky bottom-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Service"}</Button>
        </div>
      </div>
    </div>
  );
}