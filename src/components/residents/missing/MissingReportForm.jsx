import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function MissingReportForm({ resident, residents, homes = [], staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    resident_id: resident?.id || "",
    last_seen_datetime: "",
    last_seen_location: "",
    last_seen_by: "",
    reported_to_police: false,
    police_report_datetime: "",
    police_reference_number: "",
    police_station: "",
    risk_level_at_time: "medium",
    known_associates_checked: false,
    cse_risk_considered: false,
    areas_searched: [],
    people_contacted: [],
    la_notified: false,
  });
  const [areaInput, setAreaInput] = useState("");
  const [personInput, setPersonInput] = useState("");

  const selectedResident = useMemo(() => residents.find(r => r.id === form.resident_id), [form.resident_id, residents]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const homeName = homes.find(h => h.id === selectedResident?.home_id)?.name || selectedResident?.home_id;
      const mfh = {
        org_id: ORG_ID,
        resident_id: data.resident_id,
        resident_name: selectedResident?.display_name,
        home_id: selectedResident?.home_id,
        home_name: homeName,
        reported_by_id: user?.id,
        reported_by_name: user?.full_name,
        last_seen_datetime: data.last_seen_datetime,
        last_seen_location: data.last_seen_location,
        last_seen_by: data.last_seen_by,
        reported_missing_datetime: new Date().toISOString(),
        reported_to_police: data.reported_to_police,
        police_report_datetime: data.police_report_datetime,
        police_reference_number: data.police_reference_number,
        police_station: data.police_station,
        risk_level_at_time: data.risk_level_at_time,
        known_associates_checked: data.known_associates_checked,
        cse_risk_considered: data.cse_risk_considered,
        areas_searched: data.areas_searched,
        people_contacted: data.people_contacted,
        la_notified: data.la_notified,
        status: "active",
      };
      return await base44.entities.MissingFromHome.create(mfh);
      // Create notification
      await base44.entities.Notification.create({
        org_id: ORG_ID,
        type: "missing_child",
        priority: "high",
        title: `URGENT: ${selectedResident?.display_name} reported missing`,
        message: `${selectedResident?.display_name} has been reported missing from ${homeName}`,
        recipient_role: "team_leader",
        is_read: false,
      });
    },
    onSuccess: () => {
      toast.success("Missing person report logged");
      qc.invalidateQueries({ queryKey: ["mfh-records"] });
      onSave();
    },
    onError: (err) => toast.error("Error saving report: " + err.message),
  });

  const handleAddArea = () => {
    if (areaInput.trim()) {
      setForm(p => ({ ...p, areas_searched: [...p.areas_searched, areaInput] }));
      setAreaInput("");
    }
  };

  const handleAddPerson = () => {
    if (personInput.trim()) {
      setForm(p => ({ ...p, people_contacted: [...p.people_contacted, personInput] }));
      setPersonInput("");
    }
  };

  const canNext = step === 1
    ? form.resident_id && form.last_seen_datetime
    : step === 2 ? !form.reported_to_police || (form.police_report_datetime && form.police_reference_number)
    : true;

  const handleSubmit = async () => {
    if (!form.resident_id || !form.last_seen_datetime) {
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
          <h2 className="text-lg font-bold">Report Missing From Home</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b border-border">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {s}
              </div>
              {s < 4 && <div className={`flex-1 h-1 mx-2 rounded ${step > s ? "bg-primary" : "bg-muted"}`} />}
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
              <div><label className="text-sm font-medium">Last Seen Date & Time *</label>
                <Input type="datetime-local" value={form.last_seen_datetime} onChange={e => setForm(p => ({ ...p, last_seen_datetime: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">Last Seen Location</label>
                <Input value={form.last_seen_location} onChange={e => setForm(p => ({ ...p, last_seen_location: e.target.value }))} placeholder="Where were they last seen?" />
              </div>
              <div><label className="text-sm font-medium">Last Seen By</label>
                <Input value={form.last_seen_by} onChange={e => setForm(p => ({ ...p, last_seen_by: e.target.value }))} placeholder="Who last saw them?" />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="p-3 bg-amber-100 border border-amber-300 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                <p className="text-sm text-amber-700">UK guidance requires police notification within 1 hour for a looked-after child aged 16-17.</p>
              </div>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.reported_to_police} onChange={e => setForm(p => ({ ...p, reported_to_police: e.target.checked }))} />
                Has this been reported to police?
              </label></div>
              {form.reported_to_police && (
                <>
                  <div><label className="text-sm font-medium">Police Report Date & Time</label>
                    <Input type="datetime-local" value={form.police_report_datetime} onChange={e => setForm(p => ({ ...p, police_report_datetime: e.target.value }))} />
                  </div>
                  <div><label className="text-sm font-medium">Police Reference Number *</label>
                    <Input value={form.police_reference_number} onChange={e => setForm(p => ({ ...p, police_reference_number: e.target.value }))} placeholder="e.g., OP/2026/123456" />
                  </div>
                  <div><label className="text-sm font-medium">Police Station</label>
                    <Input value={form.police_station} onChange={e => setForm(p => ({ ...p, police_station: e.target.value }))} />
                  </div>
                </>
              )}
              {!form.reported_to_police && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-sm text-red-700 font-medium">⚠️ Police must be notified. Document reason for delay if applicable.</p>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <div><label className="text-sm font-medium">Risk Level at Time of Going Missing</label>
                <Select value={form.risk_level_at_time} onValueChange={v => setForm(p => ({ ...p, risk_level_at_time: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.cse_risk_considered} onChange={e => setForm(p => ({ ...p, cse_risk_considered: e.target.checked }))} />
                Is there a known CSE risk?
              </label></div>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.known_associates_checked} onChange={e => setForm(p => ({ ...p, known_associates_checked: e.target.checked }))} />
                Known associates checked?
              </label></div>
              <div>
                <label className="text-sm font-medium">Areas Already Searched</label>
                <div className="flex gap-2 mb-2">
                  <Input value={areaInput} onChange={e => setAreaInput(e.target.value)} placeholder="Add location..." />
                  <Button size="sm" onClick={handleAddArea}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.areas_searched.map((area, i) => (
                    <span key={i} className="bg-muted px-3 py-1 rounded-full text-xs flex items-center gap-2">
                      {area} <button onClick={() => setForm(p => ({ ...p, areas_searched: p.areas_searched.filter((_, x) => x !== i) })) }><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">People Already Contacted</label>
                <div className="flex gap-2 mb-2">
                  <Input value={personInput} onChange={e => setPersonInput(e.target.value)} placeholder="Add contact..." />
                  <Button size="sm" onClick={handleAddPerson}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.people_contacted.map((person, i) => (
                    <span key={i} className="bg-muted px-3 py-1 rounded-full text-xs flex items-center gap-2">
                      {person} <button onClick={() => setForm(p => ({ ...p, people_contacted: p.people_contacted.filter((_, x) => x !== i) })) }><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={form.la_notified} onChange={e => setForm(p => ({ ...p, la_notified: e.target.checked }))} />
                Local Authority notified?
              </label></div>
              <p className="text-xs text-muted-foreground">Review the details above before submitting.</p>
              <div className="bg-blue-100 border border-blue-300 rounded-lg p-3">
                <p className="text-sm text-blue-700"><strong>Summary:</strong></p>
                <p className="text-sm text-blue-700 mt-1">Missing: <strong>{selectedResident?.display_name}</strong></p>
                <p className="text-sm text-blue-700">Since: <strong>{form.last_seen_datetime}</strong></p>
                {form.reported_to_police && <p className="text-sm text-blue-700">Police: <strong>{form.police_reference_number}</strong></p>}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-red-600 hover:bg-red-700">
              {createMutation.isPending ? "Saving..." : "Report Missing"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}