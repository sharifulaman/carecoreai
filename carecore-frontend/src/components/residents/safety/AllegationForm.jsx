import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Save } from "lucide-react";
import { toast } from "sonner";

export default function AllegationForm({ residents, homes, staff, user, onClose, onSave }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    allegation_date: "",
    allegation_made_by: "",
    is_allegation_against_staff: false,
    resident_ids: [],
    staff_subject_to_allegation_id: "",
    home_id: "",
    allegation_details: "",
    lado_notified: false,
    local_authority_notified: false,
    investigation_status: "open",
    outcome: "pending",
  });

  const supportStaff = staff.filter(s => s.is_support_role);

  const mutation = useMutation({
    mutationFn: async () => {
      const selectedHome = homes.find(h => h.id === form.home_id);
      const selectedStaff = staff.find(s => s.id === form.staff_subject_to_allegation_id);
      const selectedResidents = residents.filter(r => form.resident_ids.includes(r.id));

      return secureGateway.create("Allegation", {
        org_id: ORG_ID,
        allegation_date: form.allegation_date,
        allegation_made_by: form.allegation_made_by,
        is_allegation_against_staff: form.is_allegation_against_staff,
        resident_ids: form.resident_ids,
        resident_names: selectedResidents.map(r => r.display_name),
        staff_subject_to_allegation_id: form.staff_subject_to_allegation_id || null,
        staff_subject_to_allegation_name: selectedStaff?.full_name || null,
        home_id: form.home_id,
        home_name: selectedHome?.name,
        accommodation_category: selectedHome?.accommodation_category,
        allegation_details: form.allegation_details,
        lado_notified: form.lado_notified,
        local_authority_notified: form.local_authority_notified,
        investigation_status: form.investigation_status,
        outcome: form.outcome,
        status: "open",
      });
    },
    onSuccess: () => {
      toast.success("Allegation logged");
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

  const isValid = form.allegation_date && form.allegation_made_by && form.home_id && (form.is_allegation_against_staff ? form.staff_subject_to_allegation_id : true);

  const handleSave = () => {
    const errs = {};
    if (!form.allegation_date) errs.allegation_date = "Date is required";
    if (!form.allegation_made_by) errs.allegation_made_by = "Please select who made the allegation";
    if (!form.home_id) errs.home_id = "Please select a home";
    if (form.is_allegation_against_staff && !form.staff_subject_to_allegation_id) errs.staff_subject_to_allegation_id = "Please select the staff member";
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error("Please fill in all required fields"); return; }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/30 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Log Allegation</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Allegation Date *</label>
            <input
              type="date"
              value={form.allegation_date}
              onChange={(ev) => { setForm({ ...form, allegation_date: ev.target.value }); setErrors(e => ({ ...e, allegation_date: undefined })); }}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${errors.allegation_date ? "border-red-500" : "border-border"}`}
            />
            {errors.allegation_date && <p className="text-xs text-red-500 mt-1">{errors.allegation_date}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Allegation Made By *</label>
            <Select value={form.allegation_made_by} onValueChange={(value) => { setForm({ ...form, allegation_made_by: value }); setErrors(e => ({ ...e, allegation_made_by: undefined })); }}>
              <SelectTrigger className={`text-sm ${errors.allegation_made_by ? "border-red-500" : ""}`}><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="parent_carer">Parent/Carer</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.allegation_made_by && <p className="text-xs text-red-500 mt-1">{errors.allegation_made_by}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.is_allegation_against_staff}
              onCheckedChange={(checked) => setForm({ ...form, is_allegation_against_staff: checked })}
            />
            <label className="text-sm font-medium">Allegation against staff?</label>
          </div>

          {form.is_allegation_against_staff && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Staff Subject to Allegation *</label>
              <Select value={form.staff_subject_to_allegation_id} onValueChange={(value) => setForm({ ...form, staff_subject_to_allegation_id: value })}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Select staff..." /></SelectTrigger>
                <SelectContent>
                  {supportStaff.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Resident(s) Making Allegation</label>
            <div className="space-y-2 bg-muted/30 rounded-lg p-3 max-h-48 overflow-y-auto">
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
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Allegation Details</label>
            <textarea
              value={form.allegation_details}
              onChange={(e) => setForm({ ...form, allegation_details: e.target.value })}
              placeholder="Details of the allegation..."
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.lado_notified}
                onCheckedChange={(checked) => setForm({ ...form, lado_notified: checked })}
              />
              <label className="text-sm font-medium">LADO notified?</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.local_authority_notified}
                onCheckedChange={(checked) => setForm({ ...form, local_authority_notified: checked })}
              />
              <label className="text-sm font-medium">Local authority notified?</label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Investigation Status</label>
            <Select value={form.investigation_status} onValueChange={(value) => setForm({ ...form, investigation_status: value })}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="under_investigation">Under Investigation</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Outcome</label>
            <Select value={form.outcome} onValueChange={(value) => setForm({ ...form, outcome: value })}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="substantiated">Substantiated</SelectItem>
                <SelectItem value="unsubstantiated">Unsubstantiated</SelectItem>
                <SelectItem value="inconclusive">Inconclusive</SelectItem>
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