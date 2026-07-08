import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, ChevronRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  "Shift Details",
  "Resident Welfare",
  "Incidents",
  "Medication Check",
  "Outstanding Tasks",
  "Home Condition",
  "Visitors",
  "Summary & Sign Off",
];

export default function HandoverFormNew({ home, residents, staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    home_id: home?.id || "",
    date: new Date().toISOString().split("T")[0],
    shift: "morning",
    outgoing_staff_id: user?.id || "",
    outgoing_staff_name: user?.full_name || "",
    incoming_staff_id: "",
    incoming_staff_name: "",
    resident_statuses: residents.map(r => ({
      resident_id: r.id,
      resident_name: r.display_name,
      location: "in_home",
      mood: "settled",
      any_concerns: false,
      concern_notes: "",
      medication_given_this_shift: false,
      medication_notes: "",
      bed_time: "",
      sleep_check_completed: false,
    })),
    incidents: [],
    newIncident: { incident_type: "behaviour", resident_id: "", description: "", action_taken: "" },
    controlled_drug_balance_checked: false,
    medication_storage_secure: false,
    any_medication_issues: false,
    medication_notes: "",
    outstanding_tasks: [],
    newTask: { task: "", priority: "normal", assigned_to: "" },
    property_secure: false,
    any_maintenance_issues: false,
    maintenance_notes: "",
    cleaning_completed: false,
    visitors: [],
    newVisitor: { name: "", relationship: "", purpose: "", time_in: "", time_out: "", resident_visited: "" },
    summary: "",
    additional_notes: "",
    action_items: [],
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const incomingStaff = staff.find(s => s.id === data.incoming_staff_id);
      const handover = {
        org_id: ORG_ID,
        home_id: data.home_id,
        home_name: home?.name,
        date: data.date,
        shift: data.shift,
        outgoing_staff_id: data.outgoing_staff_id,
        outgoing_staff_name: data.outgoing_staff_name,
        incoming_staff_id: data.incoming_staff_id,
        incoming_staff_name: incomingStaff?.full_name,
        resident_statuses: data.resident_statuses,
        incidents: data.incidents,
        controlled_drug_balance_checked: data.controlled_drug_balance_checked,
        medication_storage_secure: data.medication_storage_secure,
        any_medication_issues: data.any_medication_issues,
        medication_notes: data.medication_notes,
        outstanding_tasks: data.outstanding_tasks,
        property_secure: data.property_secure,
        any_maintenance_issues: data.any_maintenance_issues,
        maintenance_notes: data.maintenance_notes,
        cleaning_completed: data.cleaning_completed,
        visitors: data.visitors,
        summary: data.summary,
        additional_notes: data.additional_notes,
        action_items: data.action_items,
        outgoing_signed_at: new Date().toISOString(),
        status: "submitted",
      };

      await secureGateway.create("ShiftHandover", handover);

      // Notify incoming staff
      if (incomingStaff) {
        await secureGateway.create("Notification", {
          org_id: ORG_ID,
          type: "handover",
          priority: "high",
          title: `Shift handover submitted for ${home?.name}`,
          message: `${data.shift} shift handover. Please acknowledge.`,
          recipient_role: "support_worker",
          is_read: false,
        });
      }
    },
    onSuccess: () => {
      toast.success("Handover submitted");
      qc.invalidateQueries({ queryKey: ["shift-handovers"] });
      onSave();
      onClose();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const allResidentsComplete = form.resident_statuses.every(r => r.location && r.mood);
  const canSubmit = step === STEPS.length && allResidentsComplete;

  const handleNext = () => {
    if (step === 2 && !allResidentsComplete) {
      toast.error("All residents must have location and mood recorded");
      return;
    }
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const handleIncidentAdd = () => {
    if (!form.newIncident.resident_id || !form.newIncident.description) {
      toast.error("Resident and description required");
      return;
    }
    const resident = residents.find(r => r.id === form.newIncident.resident_id);
    setForm(p => ({
      ...p,
      incidents: [...p.incidents, { ...p.newIncident, resident_name: resident?.display_name }],
      newIncident: { incident_type: "behaviour", resident_id: "", description: "", action_taken: "" },
    }));
  };

  const handleTaskAdd = () => {
    if (!form.newTask.task) {
      toast.error("Task description required");
      return;
    }
    setForm(p => ({
      ...p,
      outstanding_tasks: [...p.outstanding_tasks, { ...p.newTask }],
      newTask: { task: "", priority: "normal", assigned_to: "" },
    }));
  };

  const handleVisitorAdd = () => {
    if (!form.newVisitor.name || !form.newVisitor.resident_visited) {
      toast.error("Visitor name and resident required");
      return;
    }
    setForm(p => ({
      ...p,
      visitors: [...p.visitors, { ...p.newVisitor }],
      newVisitor: { name: "", relationship: "", purpose: "", time_in: "", time_out: "", resident_visited: "" },
    }));
  };

  const handleSubmit = () => {
    if (!allResidentsComplete) {
      toast.error("All residents must have location and mood recorded");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Shift Handover</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 px-6 py-3 bg-muted/30 border-b border-border overflow-x-auto scrollbar-none">
          {STEPS.map((s, idx) => (
            <div key={idx} className="flex items-center shrink-0">
              <button
                onClick={() => setStep(idx + 1)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > idx + 1 ? "bg-green-600 text-white" : step === idx + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {step > idx + 1 ? "✓" : idx + 1}
              </button>
              {idx < STEPS.length - 1 && <div className={`w-4 h-0.5 mx-1 ${step > idx + 1 ? "bg-green-600" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4 min-h-[300px]">
          {step === 1 && (
            <>
              <div><label className="text-sm font-medium">Date</label>
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div><label className="text-sm font-medium">Shift</label>
                <select value={form.shift} onChange={e => setForm(p => ({ ...p, shift: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg bg-card">
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="night">Night</option>
                </select>
              </div>
              <div><label className="text-sm font-medium">Outgoing Staff</label>
                <Input value={form.outgoing_staff_name} disabled className="bg-muted" />
              </div>
              <div><label className="text-sm font-medium">Incoming Staff *</label>
                <select value={form.incoming_staff_id} onChange={e => {
                  const s = staff.find(st => st.id === e.target.value);
                  setForm(p => ({ ...p, incoming_staff_id: e.target.value, incoming_staff_name: s?.full_name }));
                }} className="w-full px-3 py-2 border border-border rounded-lg bg-card">
                  <option value="">Select...</option>
                  {staff.filter(s => s.id !== form.outgoing_staff_id).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded font-medium">All residents must have location and mood recorded to continue.</p>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {form.resident_statuses.map((r, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <p className="font-medium text-sm">{r.resident_name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Location *</label>
                        <select value={r.location} onChange={e => {
                          const updated = [...form.resident_statuses];
                          updated[i].location = e.target.value;
                          setForm(p => ({ ...p, resident_statuses: updated }));
                        }} className="w-full px-2 py-1 border border-border rounded text-xs bg-card">
                          <option value="in_home">In Home</option>
                          <option value="out">Out</option>
                          <option value="overnight_stay">Overnight Stay</option>
                          <option value="hospital">Hospital</option>
                          <option value="missing">Missing</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Mood *</label>
                        <select value={r.mood} onChange={e => {
                          const updated = [...form.resident_statuses];
                          updated[i].mood = e.target.value;
                          setForm(p => ({ ...p, resident_statuses: updated }));
                        }} className="w-full px-2 py-1 border border-border rounded text-xs bg-card">
                          <option value="settled">Settled</option>
                          <option value="anxious">Anxious</option>
                          <option value="distressed">Distressed</option>
                          <option value="angry">Angry</option>
                          <option value="happy">Happy</option>
                          <option value="withdrawn">Withdrawn</option>
                        </select>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={r.any_concerns} onChange={e => {
                        const updated = [...form.resident_statuses];
                        updated[i].any_concerns = e.target.checked;
                        setForm(p => ({ ...p, resident_statuses: updated }));
                      }} />
                      Any concerns?
                    </label>
                    {r.any_concerns && (
                      <Input value={r.concern_notes} onChange={e => {
                        const updated = [...form.resident_statuses];
                        updated[i].concern_notes = e.target.value;
                        setForm(p => ({ ...p, resident_statuses: updated }));
                      }} placeholder="Concern notes..." className="text-xs h-8" />
                    )}
                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={r.medication_given_this_shift} onChange={e => {
                        const updated = [...form.resident_statuses];
                        updated[i].medication_given_this_shift = e.target.checked;
                        setForm(p => ({ ...p, resident_statuses: updated }));
                      }} />
                      Medication given this shift?
                    </label>
                    {r.medication_given_this_shift && (
                      <Input value={r.medication_notes} onChange={e => {
                        const updated = [...form.resident_statuses];
                        updated[i].medication_notes = e.target.value;
                        setForm(p => ({ ...p, resident_statuses: updated }));
                      }} placeholder="Medication notes..." className="text-xs h-8" />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-2">
                {form.incidents.map((inc, i) => (
                  <div key={i} className="p-2 bg-muted/30 rounded text-xs space-y-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium capitalize">{inc.incident_type}</p>
                        <p className="text-muted-foreground">{inc.resident_name}</p>
                        <p className="mt-1">{inc.description}</p>
                      </div>
                      <button onClick={() => setForm(p => ({ ...p, incidents: p.incidents.filter((_, idx) => idx !== i) }))} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/10">
                <label className="text-xs font-medium">Add Incident</label>
                <select value={form.newIncident.incident_type} onChange={e => setForm(p => ({ ...p, newIncident: { ...p.newIncident, incident_type: e.target.value } }))} className="w-full px-2 py-1 border border-border rounded text-xs bg-card">
                  {["behaviour", "missing", "medical", "property_damage", "police_attendance", "self_harm", "other"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={form.newIncident.resident_id} onChange={e => setForm(p => ({ ...p, newIncident: { ...p.newIncident, resident_id: e.target.value } }))} className="w-full px-2 py-1 border border-border rounded text-xs bg-card">
                  <option value="">Select resident...</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                </select>
                <Input value={form.newIncident.description} onChange={e => setForm(p => ({ ...p, newIncident: { ...p.newIncident, description: e.target.value } }))} placeholder="Description" className="text-xs h-8" />
                <Input value={form.newIncident.action_taken} onChange={e => setForm(p => ({ ...p, newIncident: { ...p.newIncident, action_taken: e.target.value } }))} placeholder="Action taken" className="text-xs h-8" />
                <Button size="sm" onClick={handleIncidentAdd} className="w-full gap-1"><Plus className="w-3 h-3" /> Add</Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.controlled_drug_balance_checked} onChange={e => setForm(p => ({ ...p, controlled_drug_balance_checked: e.target.checked }))} />
                Controlled drug balance checked
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.medication_storage_secure} onChange={e => setForm(p => ({ ...p, medication_storage_secure: e.target.checked }))} />
                Medication storage secure
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.any_medication_issues} onChange={e => setForm(p => ({ ...p, any_medication_issues: e.target.checked }))} />
                Any medication issues?
              </label>
              {form.any_medication_issues && (
                <Textarea value={form.medication_notes} onChange={e => setForm(p => ({ ...p, medication_notes: e.target.value }))} rows={2} placeholder="Medication issues notes..." />
              )}
            </>
          )}

          {step === 5 && (
            <>
              <div className="space-y-2">
                {form.outstanding_tasks.map((task, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                    <div className="flex-1">
                      <p>{task.task}</p>
                      <p className="text-xs text-muted-foreground">Priority: {task.priority} · Assigned to: {task.assigned_to}</p>
                    </div>
                    <button onClick={() => setForm(p => ({ ...p, outstanding_tasks: p.outstanding_tasks.filter((_, idx) => idx !== i) }))} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/10">
                <Input value={form.newTask.task} onChange={e => setForm(p => ({ ...p, newTask: { ...p.newTask, task: e.target.value } }))} placeholder="Task description" className="text-xs h-8" />
                <select value={form.newTask.priority} onChange={e => setForm(p => ({ ...p, newTask: { ...p.newTask, priority: e.target.value } }))} className="w-full px-2 py-1 border border-border rounded text-xs bg-card">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <Input value={form.newTask.assigned_to} onChange={e => setForm(p => ({ ...p, newTask: { ...p.newTask, assigned_to: e.target.value } }))} placeholder="Assigned to (name)" className="text-xs h-8" />
                <Button size="sm" onClick={handleTaskAdd} className="w-full gap-1"><Plus className="w-3 h-3" /> Add Task</Button>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.property_secure} onChange={e => setForm(p => ({ ...p, property_secure: e.target.checked }))} />
                Property secure
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.any_maintenance_issues} onChange={e => setForm(p => ({ ...p, any_maintenance_issues: e.target.checked }))} />
                Any maintenance issues?
              </label>
              {form.any_maintenance_issues && (
                <Textarea value={form.maintenance_notes} onChange={e => setForm(p => ({ ...p, maintenance_notes: e.target.value }))} rows={2} placeholder="Maintenance notes..." />
              )}
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.cleaning_completed} onChange={e => setForm(p => ({ ...p, cleaning_completed: e.target.checked }))} />
                Cleaning completed
              </label>
            </>
          )}

          {step === 7 && (
            <>
              <div className="space-y-2">
                {form.visitors.map((v, i) => (
                  <div key={i} className="p-2 bg-muted/30 rounded text-xs space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        <p className="text-muted-foreground">{v.relationship} · visited {v.resident_visited}</p>
                        <p className="text-muted-foreground">{v.time_in} - {v.time_out}</p>
                      </div>
                      <button onClick={() => setForm(p => ({ ...p, visitors: p.visitors.filter((_, idx) => idx !== i) }))} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/10">
                <Input value={form.newVisitor.name} onChange={e => setForm(p => ({ ...p, newVisitor: { ...p.newVisitor, name: e.target.value } }))} placeholder="Visitor name" className="text-xs h-8" />
                <Input value={form.newVisitor.relationship} onChange={e => setForm(p => ({ ...p, newVisitor: { ...p.newVisitor, relationship: e.target.value } }))} placeholder="Relationship" className="text-xs h-8" />
                <select value={form.newVisitor.resident_visited} onChange={e => setForm(p => ({ ...p, newVisitor: { ...p.newVisitor, resident_visited: e.target.value } }))} className="w-full px-2 py-1 border border-border rounded text-xs bg-card">
                  <option value="">Visited resident...</option>
                  {residents.map(r => <option key={r.id} value={r.display_name}>{r.display_name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="time" value={form.newVisitor.time_in} onChange={e => setForm(p => ({ ...p, newVisitor: { ...p.newVisitor, time_in: e.target.value } }))} className="text-xs h-8" />
                  <Input type="time" value={form.newVisitor.time_out} onChange={e => setForm(p => ({ ...p, newVisitor: { ...p.newVisitor, time_out: e.target.value } }))} className="text-xs h-8" />
                </div>
                <Button size="sm" onClick={handleVisitorAdd} className="w-full gap-1"><Plus className="w-3 h-3" /> Add Visitor</Button>
              </div>
            </>
          )}

          {step === 8 && (
            <>
              <div><label className="text-sm font-medium">Shift Summary</label>
                <Textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))} rows={3} placeholder="Overall summary of the shift..." />
              </div>
              <div><label className="text-sm font-medium">Additional Notes</label>
                <Textarea value={form.additional_notes} onChange={e => setForm(p => ({ ...p, additional_notes: e.target.value }))} rows={2} placeholder="Any other notes..." />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={handleNext} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit || createMutation.isPending}>
              {createMutation.isPending ? "Submitting..." : "Submit Handover"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}