import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save } from "lucide-react";
import { toast } from "sonner";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger"; // Custom hook to trigger workflows

export default function ReferralForm({ residents, homes, staff, user, staffProfile, onClose, onSave }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });


  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    referral_date: "",
    resident_ids: [],
    referral_type: "",
    local_authority_children_services_referral: false,
    radicalisation_concern: false,
    prevent_referral: false,
    home_id: "",
    referral_details: "",
    outcome_status: "pending",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const selectedHome = homes.find(h => h.id === form.home_id);
      const selectedResidents = residents.filter(r => form.resident_ids.includes(r.id));

      return secureGateway.create("Referral", {
        org_id: ORG_ID,
        referral_date: form.referral_date,
        resident_ids: form.resident_ids,
        resident_names: selectedResidents.map(r => r.display_name),
        referral_type: form.referral_type,
        local_authority_children_services_referral: form.local_authority_children_services_referral,
        radicalisation_concern: form.radicalisation_concern,
        prevent_referral: form.prevent_referral,
        home_id: form.home_id,
        home_name: selectedHome?.name,
        accommodation_category: selectedHome?.accommodation_category,
        referral_details: form.referral_details,
        outcome_status: form.outcome_status,
        status: "open",
      });
    },
    onSuccess: (created) => {
      toast.success("Referral logged");
      const selectedHome = homes.find(h => h.id === form.home_id);
      const selectedResidents = residents.filter(r => form.resident_ids.includes(r.id));
      const isSafeguarding = ["child_protection", "safeguarding", "radicalisation_prevent"].includes(form.referral_type) ||
        form.radicalisation_concern;

      triggerWorkflow({
        workflowType: "referral",
        entityId: created?.id,
        entityRef: created?.id ? `REF-${created.id.slice(0, 8)}` : "",
        title: `Referral — ${selectedResidents.map(r => r.display_name).join(", ")}`,
        description: `${form.referral_type?.replace(/_/g, " ")} referral logged for review.`,
        homeId: form.home_id,
        homeName: selectedHome?.name || "",
        priority: isSafeguarding ? "urgent" : "routine",
      });

      onSave();
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const handleResidentToggle = (residentId) => {
    setForm(prev => ({
      ...prev,
      resident_ids: prev.resident_ids.includes(residentId)
        ? prev.resident_ids.filter(id => id !== residentId)
        : [...prev.resident_ids, residentId],
    }));
  };

  const isValid = form.referral_date && form.resident_ids.length > 0 && form.referral_type && form.home_id;

  const handleSave = () => {
    const errs = {};
    if (!form.referral_date) errs.referral_date = "Date is required";
    if (form.resident_ids.length === 0) errs.resident_ids = "Please select at least one resident";
    if (!form.referral_type) errs.referral_type = "Please select a referral type";
    if (!form.home_id) errs.home_id = "Please select a home";
    if (!form.referral_details?.trim()) errs.referral_details = "Referral details are required";
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error("Please fill in all required fields"); return; }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/30 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Log Referral</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Referral Date *</label>
            <input
              type="date"
              value={form.referral_date}
              onChange={(ev) => { setForm({ ...form, referral_date: ev.target.value }); setErrors(e => ({ ...e, referral_date: undefined })); }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${errors.referral_date ? "border-red-500" : "border-border"}`}
            />
            {errors.referral_date && <p className="text-xs text-red-500 mt-1">{errors.referral_date}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Resident(s) *</label>
            {errors.resident_ids && <p className="text-xs text-red-500 mb-1">{errors.resident_ids}</p>}
            <div className={`space-y-2 bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto ${errors.resident_ids ? "border border-red-500" : ""}`}>
              {residents.map(r => (
                <div key={r.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={form.resident_ids.includes(r.id)}
                    onCheckedChange={() => handleResidentToggle(r.id)}
                  />
                  <label className="text-sm cursor-pointer">{r.display_name}</label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Referral Type *</label>
            <Select value={form.referral_type} onValueChange={(value) => { setForm({ ...form, referral_type: value }); setErrors(e => ({ ...e, referral_type: undefined })); }}>
              <SelectTrigger className={`text-sm ${errors.referral_type ? "border-red-500" : ""}`}><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="child_protection">Child Protection Referral</SelectItem>
                <SelectItem value="safeguarding">Safeguarding Referral</SelectItem>
                <SelectItem value="radicalisation_prevent">Radicalisation / Prevent Referral</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.referral_type && <p className="text-xs text-red-500 mt-1">{errors.referral_type}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.local_authority_children_services_referral}
                onCheckedChange={(checked) => setForm({ ...form, local_authority_children_services_referral: checked })}
              />
              <label className="text-sm font-medium">LA Children's Services</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.prevent_referral}
                onCheckedChange={(checked) => setForm({ ...form, prevent_referral: checked })}
              />
              <label className="text-sm font-medium">Prevent referral</label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.radicalisation_concern}
              onCheckedChange={(checked) => setForm({ ...form, radicalisation_concern: checked })}
            />
            <label className="text-sm font-medium">Radicalisation concern</label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Home/Address *</label>
            <Select value={form.home_id} onValueChange={(value) => { setForm({ ...form, home_id: value }); setErrors(e => ({ ...e, home_id: undefined })); }}>
              <SelectTrigger className={`text-sm ${errors.home_id ? "border-red-500" : ""}`}><SelectValue placeholder="Select home..." /></SelectTrigger>
              <SelectContent>
                {homes.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.home_id && <p className="text-xs text-red-500 mt-1">{errors.home_id}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Referral Details *</label>
            <textarea
              value={form.referral_details}
              onChange={(e) => { setForm({ ...form, referral_details: e.target.value }); setErrors(err => ({ ...err, referral_details: undefined })); }}
              placeholder="Details of the referral..."
              rows={4}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none ${errors.referral_details ? "border-red-500" : "border-border"}`}
            />
            {errors.referral_details && <p className="text-xs text-red-500 mt-1">{errors.referral_details}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Outcome/Status</label>
            <Select value={form.outcome_status} onValueChange={(value) => setForm({ ...form, outcome_status: value })}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="referred">Referred</SelectItem>
                <SelectItem value="under_assessment">Under Assessment</SelectItem>
                <SelectItem value="supported">Supported</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={mutation.isPending}>
            <Save className="w-4 h-4 mr-1" /> Save
          </Button>
        </div>
      </div>
    </div>
  );
}