import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { createNotification } from "@/lib/createNotification";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { Plus, Check, AlertTriangle, Clock, X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── helpers ────────────────────────────────────────────────────────────────

function restraintDatetime(rec) {
  return new Date(`${rec.restraint_date}T${rec.restraint_time || "00:00"}`);
}

function calcWithin24h(rec, createdAt) {
  const dt = restraintDatetime(rec);
  return (new Date(createdAt) - dt) <= 24 * 3600 * 1000;
}

function calcWithin48h(rec, signedAt) {
  const dt = restraintDatetime(rec);
  return (new Date(signedAt) - dt) <= 48 * 3600 * 1000;
}

function calcWithin5Days(rec, agreedAt) {
  const dt = restraintDatetime(rec);
  return (new Date(agreedAt) - dt) <= 5 * 24 * 3600 * 1000;
}

// ─── status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    stage1_pending: "bg-amber-100 text-amber-700",
    stage2_pending: "bg-blue-100 text-blue-700",
    stage3_pending: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };
  const labels = {
    stage1_pending: "Stage 1 Pending",
    stage2_pending: "Stage 2 Pending",
    stage3_pending: "Stage 3 Pending",
    completed: "Completed",
    overdue: "Overdue",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] || "bg-muted text-muted-foreground"}`}>
      {labels[status] || status}
    </span>
  );
}

function StageBadge({ done, overdue }) {
  if (done) return <span className="text-green-600"><Check className="w-4 h-4" /></span>;
  if (overdue) return <span className="text-red-600 text-xs font-semibold">Overdue</span>;
  return <span className="text-amber-500 text-xs font-semibold">Pending</span>;
}

// ─── Stage 2 Modal ───────────────────────────────────────────────────────────

function Stage2Modal({ record, staffProfile, onClose, onSaved }) {
  const [spokenAt, setSpokenAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [confirmed, setConfirmed] = useState(false);
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      const within48h = calcWithin48h(record, spokenAt);
      await secureGateway.update("RestraintRecord", record.id, {
        rsm_spoken_to_child: true,
        rsm_spoken_to_child_at: new Date(spokenAt).toISOString(),
        rsm_signed_off_by_id: staffProfile?.id,
        rsm_signed_off_by_name: staffProfile?.full_name,
        rsm_signed_off_at: new Date().toISOString(),
        rsm_confirmed_accurate: confirmed,
        rsm_within_48h: within48h,
        stage2_status: "completed",
        overall_status: "stage3_pending",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reg22-records"] });
      onSaved();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-md w-full p-6 space-y-4">
        <h3 className="font-semibold">Stage 2 — RSM Sign-off</h3>
        <p className="text-sm text-muted-foreground">
          Confirm you have spoken to <strong>{record.child_name}</strong> about this restraint and that the record is accurate. This must be completed within 48 hours of the restraint.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Date &amp; time spoken to child</label>
            <input type="datetime-local" value={spokenAt} onChange={e => setSpokenAt(e.target.value)}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5" />
            <span>I confirm the record is an accurate account of the restraint</span>
          </label>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={!confirmed || mut.isPending}>
            {mut.isPending ? "Saving…" : "Submit Stage 2"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Stage 3 Modal ───────────────────────────────────────────────────────────

function Stage3Modal({ record, staffProfile, onClose, onSaved }) {
  const [agreedAt, setAgreedAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [agreed, setAgreed] = useState(false);
  const [comments, setComments] = useState("");
  const queryClient = useQueryClient();

  const mut = useMutation({
    mutationFn: async () => {
      const within5d = calcWithin5Days(record, agreedAt);
      await secureGateway.update("RestraintRecord", record.id, {
        child_spoken_to_at: new Date(agreedAt).toISOString(),
        child_agreed_accuracy: agreed,
        child_agreed_at: agreed ? new Date(agreedAt).toISOString() : null,
        child_comments: comments,
        stage3_confirmed_by_id: staffProfile?.id,
        stage3_confirmed_by_name: staffProfile?.full_name,
        stage3_within_5_days: within5d,
        stage3_status: "completed",
        overall_status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reg22-records"] });
      onSaved();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-md w-full p-6 space-y-4">
        <h3 className="font-semibold">Stage 3 — Child Agrees Accuracy</h3>
        <p className="text-sm text-muted-foreground">
          Confirm that <strong>{record.child_name}</strong> has been given the opportunity to agree the accuracy of the record. Must be within 5 days.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Date &amp; time child spoken to</label>
            <input type="datetime-local" value={agreedAt} onChange={e => setAgreedAt(e.target.value)}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
          </div>
          <label className="flex items-start gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5" />
            <span>Child agreed the record is accurate</span>
          </label>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Child's comments (optional)</label>
            <textarea value={comments} onChange={e => setComments(e.target.value)} rows={3}
              placeholder="Any comments made by the child…"
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? "Saving…" : "Complete Stage 3"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── New Record Modal (3 steps) ───────────────────────────────────────────────

function NewRestraintModal({ homes, residents, incidents, staffProfile, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);

  // Step 1
  const [homeId, setHomeId] = useState("");
  const [residentId, setResidentId] = useState("");
  const [incidentId, setIncidentId] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("12:00");
  const [location, setLocation] = useState("");

  // Step 2
  const [behaviour, setBehaviour] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [methods, setMethods] = useState("");
  const [persons, setPersons] = useState([{ name: "", role: "" }]);
  const [effectiveness, setEffectiveness] = useState("");
  const [injuriesChild, setInjuriesChild] = useState("None");
  const [injuriesOthers, setInjuriesOthers] = useState("None");
  const [medical, setMedical] = useState("None");

  const homeResidents = useMemo(() => residents.filter(r => r.home_id === homeId && r.status === "active"), [residents, homeId]);
  const selectedResident = useMemo(() => residents.find(r => r.id === residentId), [residents, residentId]);

  const createMut = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const restraintDt = new Date(`${date}T${time}`);
      const within24h = (now - restraintDt) <= 24 * 3600 * 1000;
      const overdue = (now - restraintDt) > 24 * 3600 * 1000;

      const payload = {
        org_id: ORG_ID,
        home_id: homeId,
        resident_id: residentId,
        resident_name: selectedResident?.display_name || selectedResident?.full_name || "",
        child_name: selectedResident?.display_name || selectedResident?.full_name || "",
        incident_id: incidentId || null,
        restraint_date: date,
        restraint_time: time,
        restraint_location: location,
        behaviour_leading_to_restraint: behaviour,
        restraint_description: description,
        duration_minutes: duration ? parseInt(duration) : null,
        methods_to_avoid: methods,
        persons_present: persons.filter(p => p.name),
        effectiveness_and_consequences: effectiveness,
        injuries_to_child: injuriesChild,
        injuries_to_others: injuriesOthers,
        medical_treatment_administered: medical,
        record_created_by_id: staffProfile?.id,
        record_created_by_name: staffProfile?.full_name,
        record_created_at: now.toISOString(),
        record_within_24h: within24h,
        stage1_status: "completed",
        stage2_status: "pending",
        stage3_status: "pending",
        overall_status: overdue ? "overdue" : "stage2_pending",
      };

      const rec = await secureGateway.create("RestraintRecord", payload);

      if (overdue) {
        // Notify RSM
        const rsmStaff = (await secureGateway.filter("StaffProfile", { role: "rsm" }, "-created_date", 5))[0];
        if (rsmStaff?.user_id) {
          await createNotification({
            recipient_user_id: rsmStaff.user_id,
            org_id: ORG_ID,
            title: "Restraint Record — Late Submission",
            body: `A restraint record for ${payload.child_name} was submitted more than 24 hours after the incident. Immediate review required.`,
            type: "incident_review",
            link: "/compliance-hub",
            priority: "critical",
          });
        }
      }
      return rec;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reg22-records"] });
      onSaved();
    },
  });

  const step1Valid = homeId && residentId && date && time && location;
  const step2Valid = behaviour && description && methods && effectiveness && persons.some(p => p.name);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold">New Restraint Record</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Steps indicator */}
        <div className="flex border-b border-border">
          {["Basic Details", "Statutory Fields", "Review & Submit"].map((label, i) => (
            <div key={i} className={`flex-1 text-center py-2 text-xs font-medium pointer-events-none select-none ${step === i + 1 ? "text-primary border-b-2 border-primary" : i + 1 < step ? "text-green-600" : "text-muted-foreground"}`}>
              {i + 1 < step ? "✓ " : ""}{label}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-4 flex-1">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Home *</label>
                <select value={homeId} onChange={e => { setHomeId(e.target.value); setResidentId(""); }}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">Select home…</option>
                  {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Resident *</label>
                <select value={residentId} onChange={e => setResidentId(e.target.value)} disabled={!homeId}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background disabled:opacity-50">
                  <option value="">Select resident…</option>
                  {homeResidents.map(r => <option key={r.id} value={r.id}>{r.display_name || r.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Link to existing incident (optional)</label>
                <select value={incidentId} onChange={e => setIncidentId(e.target.value)}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                  <option value="">None</option>
                  {incidents.filter(i => !residentId || i.resident_id === residentId).map(i => (
                    <option key={i.id} value={i.id}>{i.incident_type?.replace(/_/g, " ")} — {i.incident_datetime ? format(new Date(i.incident_datetime), "dd MMM yyyy") : "—"}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Restraint date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Restraint time *</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Location *</label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Living room, hallway…"
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Behaviour leading to restraint *</label>
                <textarea value={behaviour} onChange={e => setBehaviour(e.target.value)} rows={3}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Description of the measure and its duration *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Duration (minutes)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} min={1}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Steps taken to avoid the need to use restraint *</label>
                <textarea value={methods} onChange={e => setMethods(e.target.value)} rows={3}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Persons present *</label>
                <div className="space-y-2 mt-1">
                  {persons.map((p, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="text" value={p.name} onChange={e => { const n = [...persons]; n[i].name = e.target.value; setPersons(n); }}
                        placeholder="Name" className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                      <input type="text" value={p.role} onChange={e => { const n = [...persons]; n[i].role = e.target.value; setPersons(n); }}
                        placeholder="Role" className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background" />
                      {persons.length > 1 && (
                        <button onClick={() => setPersons(persons.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setPersons([...persons, { name: "", role: "" }])}
                    className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add person
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Effectiveness and consequences *</label>
                <textarea value={effectiveness} onChange={e => setEffectiveness(e.target.value)} rows={3}
                  className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Injuries to child</label>
                  <textarea value={injuriesChild} onChange={e => setInjuriesChild(e.target.value)} rows={2}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Injuries to others</label>
                  <textarea value={injuriesOthers} onChange={e => setInjuriesOthers(e.target.value)} rows={2}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Medical treatment administered</label>
                  <textarea value={medical} onChange={e => setMedical(e.target.value)} rows={2}
                    className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 — Summary */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Review before submitting</p>
              {[
                ["Home", homes.find(h => h.id === homeId)?.name],
                ["Resident", selectedResident?.display_name || selectedResident?.full_name],
                ["Date & Time", `${date} at ${time}`],
                ["Location", location],
                ["Duration", duration ? `${duration} minutes` : "—"],
                ["Persons present", persons.filter(p => p.name).map(p => `${p.name} (${p.role})`).join(", ")],
              ].map(([label, val]) => (
                <div key={label} className="flex gap-4 text-sm border-b border-border/50 pb-2">
                  <span className="text-muted-foreground w-36 shrink-0">{label}</span>
                  <span className="font-medium">{val || "—"}</span>
                </div>
              ))}
              {new Date() - new Date(`${date}T${time}`) > 24 * 3600 * 1000 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>This restraint occurred more than 24 hours ago. This record will be marked <strong>overdue</strong> and the RSM will be notified.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-border">
          <Button variant="outline" onClick={() => step > 1 ? setStep(step - 1) : onClose()} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> {step === 1 ? "Cancel" : "Back"}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(step + 1)} disabled={step === 1 ? !step1Valid : !step2Valid} className="gap-1.5">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending ? "Submitting…" : "Submit Record"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SENIOR_ROLES = ["admin", "rsm", "regional_manager", "risk_manager"];

export default function Reg22RestraintRecords({ homes, residents, staffProfile }) {
  const queryClient = useQueryClient();
  const staffRole = staffProfile?.role || "support_worker";
  const isSenior = SENIOR_ROLES.includes(staffRole);

  const [showNew, setShowNew] = useState(false);
  const [stage2Record, setStage2Record] = useState(null);
  const [stage3Record, setStage3Record] = useState(null);

  // Scope by home if not senior
  const homeFilter = useMemo(() => {
    if (isSenior) return {};
    const ids = staffProfile?.home_ids || (staffProfile?.primary_home_id ? [staffProfile.primary_home_id] : []);
    return ids.length ? { home_id: ids[0] } : {};
  }, [isSenior, staffProfile]);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["reg22-records", homeFilter],
    queryFn: () => secureGateway.filter("RestraintRecord", { ...homeFilter, is_deleted: false }, "-restraint_date", 200),
    staleTime: 60 * 1000,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ["reg22-incidents"],
    queryFn: () => secureGateway.filter("Incident", {}, "-incident_datetime", 200),
    staleTime: 5 * 60 * 1000,
  });

  const now = new Date();

  const stage1Overdue = records.filter(r => {
    if (r.stage1_status === "completed") return false;
    return (now - restraintDatetime(r)) > 24 * 3600 * 1000;
  }).length;

  const stage2Overdue = records.filter(r => {
    if (r.stage2_status === "completed" || r.stage1_status !== "completed") return false;
    return (now - restraintDatetime(r)) > 48 * 3600 * 1000;
  }).length;

  const stage3Overdue = records.filter(r => {
    if (r.stage3_status === "completed" || r.stage2_status !== "completed") return false;
    return (now - restraintDatetime(r)) > 5 * 24 * 3600 * 1000;
  }).length;

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Reg 22 — Behaviour Management Policy and Records</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Restraint records must be created within 24 hours. RSM must sign off within 48 hours. Child must agree accuracy within 5 days.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" /> New Restraint Record
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-xs text-red-700 font-medium">Stage 1 Overdue</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{stage1Overdue}</p>
          <p className="text-xs text-red-600 mt-0.5">Record not created within 24h</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-700 font-medium">Stage 2 Overdue</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stage2Overdue}</p>
          <p className="text-xs text-amber-600 mt-0.5">RSM not signed within 48h</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-700 font-medium">Stage 3 Overdue</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{stage3Overdue}</p>
          <p className="text-xs text-amber-600 mt-0.5">Child not agreed within 5 days</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 text-xs font-semibold">Date & Time</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Home</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Resident</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Recorded By</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Stage 1</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Stage 2</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Stage 3</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Ofsted</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-sm">Loading…</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground text-sm">No restraint records found.</td></tr>
            ) : records.map(r => {
              const dt = restraintDatetime(r);
              const s1Overdue = r.stage1_status !== "completed" && (now - dt) > 24 * 3600 * 1000;
              const s2Overdue = r.stage2_status !== "completed" && r.stage1_status === "completed" && (now - dt) > 48 * 3600 * 1000;
              const s3Overdue = r.stage3_status !== "completed" && r.stage2_status === "completed" && (now - dt) > 5 * 24 * 3600 * 1000;
              const showStage2Btn = r.stage1_status === "completed" && r.stage2_status === "pending";
              const showStage3Btn = r.stage2_status === "completed" && r.stage3_status === "pending";

              return (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs">
                    {r.restraint_date ? format(new Date(r.restraint_date), "dd MMM yyyy") : "—"}
                    {r.restraint_time && <span className="text-muted-foreground ml-1">{r.restraint_time}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">{homeMap[r.home_id]?.name || "—"}</td>
                  <td className="px-4 py-3 text-xs font-medium">{r.resident_name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.record_created_by_name || "—"}</td>
                  <td className="px-4 py-3"><StageBadge done={r.stage1_status === "completed"} overdue={s1Overdue} /></td>
                  <td className="px-4 py-3"><StageBadge done={r.stage2_status === "completed"} overdue={s2Overdue} /></td>
                  <td className="px-4 py-3"><StageBadge done={r.stage3_status === "completed"} overdue={s3Overdue} /></td>
                  <td className="px-4 py-3"><StatusBadge status={r.overall_status} /></td>
                  <td className="px-4 py-3">
                    {r.ofsted_notified
                      ? <span className="text-xs text-green-600 font-medium">Yes</span>
                      : <span className="text-xs text-muted-foreground">No</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {showStage2Btn && (
                        <button onClick={() => setStage2Record(r)}
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium whitespace-nowrap">
                          RSM Sign-off
                        </button>
                      )}
                      {showStage3Btn && (
                        <button onClick={() => setStage3Record(r)}
                          className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 font-medium whitespace-nowrap">
                          Child Agree
                        </button>
                      )}
                      {!r.ofsted_notified && r.stage1_status === "completed" && (
                        <a href="/compliance-hub" className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium whitespace-nowrap">
                          Notify Ofsted
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showNew && (
        <NewRestraintModal
          homes={homes}
          residents={residents}
          incidents={incidents}
          staffProfile={staffProfile}
          onClose={() => setShowNew(false)}
          onSaved={() => setShowNew(false)}
        />
      )}
      {stage2Record && (
        <Stage2Modal
          record={stage2Record}
          staffProfile={staffProfile}
          onClose={() => setStage2Record(null)}
          onSaved={() => setStage2Record(null)}
        />
      )}
      {stage3Record && (
        <Stage3Modal
          record={stage3Record}
          staffProfile={staffProfile}
          onClose={() => setStage3Record(null)}
          onSaved={() => setStage3Record(null)}
        />
      )}
    </div>
  );
}