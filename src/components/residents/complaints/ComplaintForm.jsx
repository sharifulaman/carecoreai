import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

export default function ComplaintForm({ resident, residents, staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    resident_id: resident?.id || "",
    received_datetime: new Date().toISOString().slice(0, 16),
    received_method: "in_person",
    complainant_type: "resident",
    complainant_name: "",
    complainant_relationship: "",
    complainant_contact: "",
    complaint_type: "care_quality",
    severity: "moderate",
    summary: "",
    full_detail: "",
    is_representation: false,
    acknowledged: false,
    acknowledged_date: "",
  });

  const selectedResident = useMemo(() => residents.find(r => r.id === form.resident_id), [form.resident_id, residents]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const targetResolutionDate = new Date(data.received_datetime);
      if (data.severity === "minor") targetResolutionDate.setDate(targetResolutionDate.getDate() + 10);
      else targetResolutionDate.setDate(targetResolutionDate.getDate() + 28);

      const complaint = {
        org_id: ORG_ID,
        resident_id: data.resident_id,
        resident_name: selectedResident?.display_name,
        home_id: selectedResident?.home_id,
        received_by_id: user?.id,
        received_by_name: user?.full_name,
        target_resolution_date: targetResolutionDate.toISOString().split("T")[0],
        status: "received",
        ...data,
      };

      await secureGateway.create("Complaint", complaint);

      // Notify admin/TL
      if (!data.is_representation) {
        await secureGateway.create("Notification", {
          org_id: ORG_ID,
          type: "complaint",
          priority: data.severity === "very_serious" ? "urgent" : "high",
          title: `New complaint: ${selectedResident?.display_name}`,
          message: `${data.severity.toUpperCase()} complaint received: ${data.summary}`,
          recipient_role: "team_leader",
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      toast.success("Complaint logged");
      qc.invalidateQueries({ queryKey: ["complaints"] });
      onSave();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const canNext = step === 1
    ? form.resident_id && form.received_datetime && form.complainant_name
    : step === 2 ? form.summary
    : true;

  const handleSubmit = () => {
    if (!form.resident_id || !form.received_datetime || !form.complainant_name || !form.summary) {
      toast.error("Missing required fields");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Log {form.is_representation ? "Compliment" : "Complaint"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b border-border">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s}
              </div>
              {s < 3 && <div className={`flex-1 h-1 mx-2 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {step === 1 && (
            <>
              <div><label className="text-sm font-medium">Is this positive feedback? (Compliment)</label>
                <label className="flex items-center gap-2 text-sm mt-1 cursor-pointer">
                  <input type="checkbox" checked={form.is_representation} onChange={e => setForm(p => ({ ...p, is_representation: e.target.checked }))} />
                  Log as compliment/positive representation
                </label>
              </div>
              <div><label className="text-sm font-medium">About Young Person *</label>
                <Select value={form.resident_id} onValueChange={v => setForm(p => ({ ...p, resident_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Received Date & Time *</label>
                <Input type="datetime-local" value={form.received_datetime} onChange={e => setForm(p => ({ ...p, received_datetime: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">Received Method</label>
                <Select value={form.received_method} onValueChange={v => setForm(p => ({ ...p, received_method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["in_person", "phone", "letter", "email", "other"].map(m => (
                      <SelectItem key={m} value={m}>{m.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Who is complaining? *</label>
                <Select value={form.complainant_type} onValueChange={v => setForm(p => ({ ...p, complainant_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["resident", "parent", "family_member", "advocate", "social_worker", "other_professional", "anonymous"].map(t => (
                      <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Complainant Name *</label>
                <Input value={form.complainant_name} onChange={e => setForm(p => ({ ...p, complainant_name: e.target.value }))} placeholder="Full name or identifier" />
              </div>
              <div><label className="text-sm font-medium">Relationship to Child</label>
                <Input value={form.complainant_relationship} onChange={e => setForm(p => ({ ...p, complainant_relationship: e.target.value }))} placeholder="e.g., mother, social worker" />
              </div>
              <div><label className="text-sm font-medium">Contact Details</label>
                <Input value={form.complainant_contact} onChange={e => setForm(p => ({ ...p, complainant_contact: e.target.value }))} placeholder="Phone or email" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {!form.is_representation && (
                <>
                  <div><label className="text-sm font-medium">Type of Complaint</label>
                    <Select value={form.complaint_type} onValueChange={v => setForm(p => ({ ...p, complaint_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["care_quality", "staff_conduct", "accommodation", "food", "activities", "contact_arrangements", "decisions_made", "discrimination", "other"].map(t => (
                          <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><label className="text-sm font-medium">Severity</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["minor", "moderate", "serious", "very_serious"].map(s => (
                        <button
                          key={s}
                          onClick={() => setForm(p => ({ ...p, severity: s }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.severity === s ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div><label className="text-sm font-medium">Summary (one line) *</label>
                <Input value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} placeholder="Brief summary of the complaint/feedback" />
              </div>
              <div><label className="text-sm font-medium">Full Detail</label>
                <Textarea value={form.full_detail} onChange={e => setForm(p => ({ ...p, full_detail: e.target.value }))} rows={4} placeholder="Detailed description..." />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Statutory Timelines:</strong><br />
                  Minor: 10 days to resolution<br />
                  Serious/Very Serious: 28 days to resolution
                </p>
              </div>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.acknowledged} onChange={e => setForm(p => ({ ...p, acknowledged: e.target.checked }))} />
                Acknowledged to complainant?
              </label></div>
              {form.acknowledged && (
                <div><label className="text-sm font-medium">Acknowledgement Date</label>
                  <Input type="date" value={form.acknowledged_date} onChange={e => setForm(p => ({ ...p, acknowledged_date: e.target.value }))} />
                </div>
              )}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                ℹ️ Complaints must be acknowledged within 3 working days. Resolution timeline starts from receipt date.
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className={`${form.is_representation ? "bg-green-600 hover:bg-green-700" : ""}`}>
              {createMutation.isPending ? "Saving..." : "Log " + (form.is_representation ? "Compliment" : "Complaint")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}