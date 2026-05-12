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

export default function FamilyContactForm({ resident, residents, staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    resident_id: resident?.id || "",
    contact_datetime: "",
    contact_person_name: "",
    contact_person_relationship: "other_family",
    contact_method: "phone_call",
    duration_minutes: 30,
    location: "",
    was_supervised: false,
    supervised_by_id: "",
    is_court_ordered: false,
    court_order_reference: "",
    contact_initiated_by: "staff",
    mood_before: "calm",
    mood_after: "calm",
    resident_engagement: "positive",
    resident_comments: "",
    any_concerns: false,
    concern_details: "",
    safeguarding_concern: false,
    la_to_be_notified: false,
    contact_to_be_reviewed: false,
    review_reason: "",
    next_contact_planned: false,
    next_contact_datetime: "",
    notes: "",
  });

  const selectedResident = useMemo(() => residents.find(r => r.id === form.resident_id), [form.resident_id, residents]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const fc = {
        org_id: ORG_ID,
        resident_id: data.resident_id,
        resident_name: selectedResident?.display_name,
        home_id: selectedResident?.home_id,
        recorded_by_id: user?.id,
        recorded_by_name: user?.full_name,
        ...data,
      };
      await secureGateway.create("FamilyContact", fc);

      // If safeguarding concern: create SafeguardingRecord and notify
      if (data.safeguarding_concern) {
        await secureGateway.create("SafeguardingRecord", {
          org_id: ORG_ID,
          resident_id: data.resident_id,
          resident_name: selectedResident?.display_name,
          incident_type: "family_contact_concern",
          concern_description: data.concern_details,
          reported_by_id: user?.id,
          reported_by_name: user?.full_name,
          status: "open",
        });
        await secureGateway.create("Notification", {
          org_id: ORG_ID,
          type: "safeguarding",
          priority: "high",
          title: `Safeguarding concern from Family Contact: ${selectedResident?.display_name}`,
          message: `Family contact on ${new Date(data.contact_datetime).toLocaleDateString("en-GB")} raised safeguarding concern. Details: ${data.concern_details}`,
          recipient_role: "team_leader",
          is_read: false,
        });
      }

      // If LA notification needed: create task reminder
      if (data.la_to_be_notified) {
        await secureGateway.create("HomeTask", {
          org_id: ORG_ID,
          home_id: selectedResident?.home_id,
          resident_id: data.resident_id,
          title: `Notify LA: Family contact on ${new Date(data.contact_datetime).toLocaleDateString("en-GB")}`,
          type: "notification",
          due_date: new Date().toISOString().split("T")[0],
          status: "pending",
        });
      }
    },
    onSuccess: () => {
      toast.success("Contact logged successfully");
      qc.invalidateQueries({ queryKey: ["family-contacts"] });
      onSave();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const canNext = step === 1
    ? form.resident_id && form.contact_datetime && form.contact_person_name
    : step === 2 ? true
    : step === 3 ? true
    : step === 4 ? true
    : true;

  const handleSubmit = async () => {
    if (!form.resident_id || !form.contact_datetime || !form.contact_person_name) {
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
          <h2 className="text-lg font-bold">Log Family Contact</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b border-border">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s}
              </div>
              {s < 5 && <div className={`flex-1 h-1 mx-2 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {step === 1 && (
            <>
              <div><label className="text-sm font-medium">Young Person *</label>
                <Select value={form.resident_id} onValueChange={v => setForm(p => ({ ...p, resident_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Contact Date & Time *</label>
                <Input type="datetime-local" value={form.contact_datetime} onChange={e => setForm(p => ({ ...p, contact_datetime: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">Contact Person Name *</label>
                <Input value={form.contact_person_name} onChange={e => setForm(p => ({ ...p, contact_person_name: e.target.value }))} placeholder="e.g., Jane Smith" />
              </div>
              <div><label className="text-sm font-medium">Relationship</label>
                <Select value={form.contact_person_relationship} onValueChange={v => setForm(p => ({ ...p, contact_person_relationship: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["mother", "father", "sibling", "grandparent", "aunt_uncle", "other_family", "friend", "professional", "unknown"].map(r => (
                      <SelectItem key={r} value={r}>{r.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div><label className="text-sm font-medium">Contact Method *</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["phone_call", "video_call", "in_person_visit", "letter", "text_message", "social_media", "other"].map(m => (
                    <button
                      key={m}
                      onClick={() => setForm(p => ({ ...p, contact_method: m }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.contact_method === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}
                    >
                      {m.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Duration (minutes)</label>
                  <Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))} />
                </div>
                <div><label className="text-sm font-medium">Initiated By</label>
                  <Select value={form.contact_initiated_by} onValueChange={v => setForm(p => ({ ...p, contact_initiated_by: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["resident", "family", "staff", "court_order", "la_arranged"].map(i => (
                        <SelectItem key={i} value={i}>{i.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.contact_method === "in_person_visit" && (
                <div><label className="text-sm font-medium">Location</label>
                  <Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Where did the contact take place?" />
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.was_supervised} onChange={e => setForm(p => ({ ...p, was_supervised: e.target.checked }))} />
                Was this contact supervised?
              </label></div>
              {form.was_supervised && (
                <div><label className="text-sm font-medium">Supervised By</label>
                  <Select value={form.supervised_by_id} onValueChange={v => setForm(p => ({ ...p, supervised_by_id: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.is_court_ordered} onChange={e => setForm(p => ({ ...p, is_court_ordered: e.target.checked }))} />
                Is this a court-ordered contact?
              </label></div>
              {form.is_court_ordered && (
                <div><label className="text-sm font-medium">Court Order Reference</label>
                  <Input value={form.court_order_reference} onChange={e => setForm(p => ({ ...p, court_order_reference: e.target.value }))} placeholder="e.g., Case no. 123/2026" />
                </div>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm font-medium">Mood Before Contact</p>
              <div className="flex flex-wrap gap-2">
                {["happy", "calm", "anxious", "distressed", "angry", "withdrawn", "excited", "neutral"].map(m => (
                  <button
                    key={m}
                    onClick={() => setForm(p => ({ ...p, mood_before: m }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.mood_before === m ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-sm font-medium mt-3">Mood After Contact</p>
              <div className="flex flex-wrap gap-2">
                {["happy", "calm", "anxious", "distressed", "angry", "withdrawn", "excited", "neutral"].map(m => (
                  <button
                    key={m}
                    onClick={() => setForm(p => ({ ...p, mood_after: m }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.mood_after === m ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <div><label className="text-sm font-medium">Engagement Level</label>
                <Select value={form.resident_engagement} onValueChange={v => setForm(p => ({ ...p, resident_engagement: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["positive", "neutral", "reluctant", "refused", "distressed"].map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">What did the resident say?</label>
                <Textarea value={form.resident_comments} onChange={e => setForm(p => ({ ...p, resident_comments: e.target.value }))} rows={3} placeholder="Resident's comments or feedback about the contact..." />
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.any_concerns} onChange={e => setForm(p => ({ ...p, any_concerns: e.target.checked }))} />
                Any concerns arising from this contact?
              </label></div>
              {form.any_concerns && (
                <>
                  <div><label className="text-sm font-medium">Concern Details</label>
                    <Textarea value={form.concern_details} onChange={e => setForm(p => ({ ...p, concern_details: e.target.value }))} rows={3} placeholder="Describe the concern..." />
                  </div>
                  <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="checkbox" checked={form.safeguarding_concern} onChange={e => setForm(p => ({ ...p, safeguarding_concern: e.target.checked }))} />
                    Safeguarding concern? (auto-creates record)
                  </label></div>
                  <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="checkbox" checked={form.la_to_be_notified} onChange={e => setForm(p => ({ ...p, la_to_be_notified: e.target.checked }))} />
                    Does LA need to be notified?
                  </label></div>
                </>
              )}
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.next_contact_planned} onChange={e => setForm(p => ({ ...p, next_contact_planned: e.target.checked }))} />
                Next contact planned?
              </label></div>
              {form.next_contact_planned && (
                <div><label className="text-sm font-medium">Planned Date & Time</label>
                  <Input type="datetime-local" value={form.next_contact_datetime} onChange={e => setForm(p => ({ ...p, next_contact_datetime: e.target.value }))} />
                </div>
              )}
              <div><label className="text-sm font-medium">Notes</label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Any additional notes..." />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < 5 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              {createMutation.isPending ? "Saving..." : "Log Contact"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}