import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle, Flag } from "lucide-react";
import { toast } from "sonner";
import { createNotification } from "@/lib/createNotification";
import { secureGateway } from "@/lib/secureGateway";

const MOOD_OPTIONS = ["good", "settled", "anxious", "low", "agitated", "distressed"];
const LOCATION_OPTIONS = ["in_home", "out", "hospital", "school", "other"];

export default function HandoverForm({ shift, home, myStaffProfile, allShifts, onClose }) {
  const queryClient = useQueryClient();

  const [generalNotes, setGeneralNotes] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [maintenanceNotes, setMaintenanceNotes] = useState("");
  const [flagged, setFlagged] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagSeverity, setFlagSeverity] = useState("medium");
  const [incomingStaffId, setIncomingStaffId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [residentEntries, setResidentEntries] = useState([]);
  const [selectedResidentIds, setSelectedResidentIds] = useState([]);

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-handover-form", home?.id],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, home_id: home?.id, status: "active" }),
    enabled: !!home?.id,
  });

  const { data: openIncidents = [] } = useQuery({
    queryKey: ["incidents-handover", home?.id],
    queryFn: () => base44.entities.AccidentReport.filter({ org_id: ORG_ID, home_id: home?.id, status: "open" }),
    enabled: !!home?.id,
  });

  const { data: flaggedLogs = [] } = useQuery({
    queryKey: ["flagged-logs-handover", home?.id],
    queryFn: async () => {
      const logs = await base44.entities.DailyLog.filter({ org_id: ORG_ID, home_id: home?.id, flagged: true });
      return logs.filter(l => !l.acknowledged_by);
    },
    enabled: !!home?.id,
  });

  const { data: homeStaff = [] } = useQuery({
    queryKey: ["home-staff-handover", home?.id],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID, status: "active" }),
    enabled: !!home?.id,
  });

  // Find next shift
  const today = shift?.date || new Date().toISOString().split("T")[0];
  const SHIFT_ORDER = ["morning", "afternoon", "night", "sleeping"];
  const currentIdx = SHIFT_ORDER.indexOf(shift?.shift_type);
  const nextShiftType = SHIFT_ORDER[(currentIdx + 1) % SHIFT_ORDER.length];
  const nextShift = allShifts?.find(s => s.date >= today && s.shift_type === nextShiftType && s.home_id === home?.id && s.id !== shift?.id);
  const nextShiftStaff = homeStaff.filter(s => nextShift?.assigned_staff?.includes(s.id));
  const eligibleIncoming = nextShiftStaff.length > 0 ? nextShiftStaff : homeStaff.filter(s => s.home_ids?.includes(home?.id));

  // Pre-populate resident entries
  useEffect(() => {
    if (residents.length > 0 && residentEntries.length === 0) {
      setResidentEntries(residents.map(r => ({
        resident_id: r.id,
        mood: "settled",
        behaviour_noted: false,
        behaviour_notes: "",
        any_concerns: false,
        concern_notes: "",
        location: "in_home",
      })));
    }
  }, [residents]);

  const updateResident = (residentId, field, value) => {
    setResidentEntries(prev => prev.map(e => e.resident_id === residentId ? { ...e, [field]: value } : e));
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const shiftEndTime = shift?.time_end || "00:00";
      const shiftEndDt = new Date(shift?.date + "T" + shiftEndTime);
      const now = new Date();
      const lateHandover = (now - shiftEndDt) > 30 * 60000;

      const handover = await base44.entities.ShiftHandover.create({
        org_id: ORG_ID,
        shift_id: shift.id,
        home_id: home.id,
        written_by: myStaffProfile.id,
        handover_datetime: now.toISOString(),
        incoming_staff_id: incomingStaffId || null,
        incoming_shift_id: nextShift?.id || null,
        general_notes: generalNotes,
        medication_notes: medicationNotes || null,
        maintenance_notes: maintenanceNotes || null,
        resident_ids: selectedResidentIds,
        residents_summary: residentEntries,
        open_incidents_count: openIncidents.length,
        open_flags_count: flaggedLogs.length,
        flagged,
        flag_reason: flagged ? flagReason : null,
        flag_severity: flagged ? flagSeverity : null,
        late_handover: lateHandover,
      });

      // Mark shift as completed
      await base44.entities.Shift.update(shift.id, { status: "completed" });

      // Notify incoming staff member
      if (incomingStaffId) {
        const incoming = homeStaff.find(s => s.id === incomingStaffId);
        if (incoming?.user_id) {
          createNotification({
            recipient_user_id: incoming.user_id,
            recipient_staff_id: incoming.id,
            org_id: ORG_ID,
            title: "Shift Handover Ready",
            body: `A handover has been submitted for ${home?.name} (${shift?.shift_type} shift). Please acknowledge before starting your shift.`,
            type: "handover",
            link: "/24hours?tab=shifts",
            priority: "normal",
          });
        }
      }
      // Notify TL/admin if handover is flagged
      if (flagged) {
        const allStaffList = await secureGateway.filter("StaffProfile", { status: "active" });
        const tl = home?.team_leader_id ? allStaffList.find(s => s.id === home.team_leader_id && s.user_id) : null;
        const admin = allStaffList.find(s => s.role === "admin" && s.user_id);
        const recipient = tl || admin;
        if (recipient?.user_id) {
          createNotification({
            recipient_user_id: recipient.user_id,
            recipient_staff_id: recipient.id,
            org_id: ORG_ID,
            title: "Flagged Handover — Action Required",
            body: `A ${flagSeverity} severity handover has been flagged at ${home?.name} by ${myStaffProfile?.full_name}. Reason: ${flagReason}`,
            type: "handover",
            link: "/24hours?tab=shifts",
            priority: flagSeverity === "critical" || flagSeverity === "high" ? "high" : "normal",
          });
        }
      }
      return handover;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["handovers"] });
      toast.success("Handover submitted successfully");
      onClose();
    },
    onError: (err) => toast.error(`Failed to submit: ${err.message}`),
  });

  const canSubmit = generalNotes.trim().length > 0 && (!flagged || (flagReason.trim() && flagSeverity)) && confirmed;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="w-full max-w-[600px] h-full bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold">Shift Handover</h2>
            <p className="text-sm text-muted-foreground">{home?.name} · {shift?.shift_type} shift</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Pre-populated alerts */}
          {(openIncidents.length > 0 || flaggedLogs.length > 0) && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold flex items-center gap-2 text-amber-800"><AlertTriangle className="w-4 h-4" /> Current alerts for {home?.name}</p>
              {openIncidents.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">Open incidents ({openIncidents.length}):</p>
                  {openIncidents.slice(0, 3).map(inc => (
                    <p key={inc.id} className="text-xs text-amber-600">• {inc.type} — {inc.date}</p>
                  ))}
                </div>
              )}
              {flaggedLogs.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1">Unacknowledged flagged logs ({flaggedLogs.length}):</p>
                  {flaggedLogs.slice(0, 3).map(log => (
                    <p key={log.id} className="text-xs text-amber-600">• {log.date} {log.shift} — {log.flag_severity}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* General notes */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Shift Summary <span className="text-red-500">*</span></h3>
            <textarea
              className="w-full border border-border rounded-lg px-3 py-2 text-sm min-h-[100px] bg-transparent"
              placeholder="How did the shift go overall? Key events, activities, any issues…"
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
            />
          </section>

          <div className="grid grid-cols-2 gap-4">
            <section>
              <h3 className="text-sm font-semibold mb-2">Medication Notes</h3>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-2 text-sm min-h-[80px] bg-transparent"
                placeholder="Any medication issues this shift?"
                value={medicationNotes}
                onChange={e => setMedicationNotes(e.target.value)}
              />
            </section>
            <section>
              <h3 className="text-sm font-semibold mb-2">Maintenance Notes</h3>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-2 text-sm min-h-[80px] bg-transparent"
                placeholder="Any maintenance issues arising?"
                value={maintenanceNotes}
                onChange={e => setMaintenanceNotes(e.target.value)}
              />
            </section>
          </div>

          {/* Residents */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Residents ({residentEntries.length})</h3>
            <div className="space-y-3">
              {residentEntries.map(entry => {
                const r = residents.find(res => res.id === entry.resident_id);
                return (
                  <div key={entry.resident_id} className="bg-muted/20 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{r?.initials || "?"}</div>
                      <span className="text-sm font-medium">{r?.display_name || "Resident"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground">Location</label>
                        <Select value={entry.location} onValueChange={v => updateResident(entry.resident_id, "location", v)}>
                          <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LOCATION_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs capitalize">{o.replace("_", " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Mood</label>
                        <Select value={entry.mood} onValueChange={v => updateResident(entry.resident_id, "mood", v)}>
                          <SelectTrigger className="h-8 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {MOOD_OPTIONS.map(o => <SelectItem key={o} value={o} className="text-xs capitalize">{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={entry.behaviour_noted} onChange={e => updateResident(entry.resident_id, "behaviour_noted", e.target.checked)} />
                        Behaviour noted
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={entry.any_concerns} onChange={e => updateResident(entry.resident_id, "any_concerns", e.target.checked)} />
                        Concerns
                      </label>
                    </div>
                    {entry.behaviour_noted && (
                      <textarea className="w-full border border-border rounded px-2 py-1 text-xs min-h-[50px] bg-transparent" placeholder="Behaviour notes…" value={entry.behaviour_notes} onChange={e => updateResident(entry.resident_id, "behaviour_notes", e.target.value)} />
                    )}
                    {entry.any_concerns && (
                      <textarea className="w-full border border-red-200 rounded px-2 py-1 text-xs min-h-[50px] bg-red-50" placeholder="Concern details…" value={entry.concern_notes} onChange={e => updateResident(entry.resident_id, "concern_notes", e.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Flag */}
          <section>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={flagged} onChange={e => setFlagged(e.target.checked)} />
              <Flag className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium">Flag this handover for attention</span>
            </label>
            {flagged && (
              <div className="mt-2 space-y-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <textarea className="w-full border border-red-200 rounded px-2 py-1 text-sm min-h-[60px] bg-white" placeholder="Reason for flagging (required)…" value={flagReason} onChange={e => setFlagReason(e.target.value)} />
                <Select value={flagSeverity} onValueChange={setFlagSeverity}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high", "critical"].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          {/* Residents covered in this handover */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Residents Covered in Handover</h3>
            <p className="text-xs text-muted-foreground mb-2">Select the residents this handover covers (optional)</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto border border-border rounded-lg p-2 bg-muted/10">
              {residents.map(r => (
                <label key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/30 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedResidentIds.includes(r.id)}
                    onChange={e => {
                      setSelectedResidentIds(prev =>
                        e.target.checked ? [...prev, r.id] : prev.filter(id => id !== r.id)
                      );
                    }}
                    className="rounded w-3.5 h-3.5"
                  />
                  <span className="text-sm">{r.display_name}</span>
                </label>
              ))}
              {residents.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No residents loaded.</p>}
            </div>
          </section>

          {/* Incoming staff */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Handover To</h3>
            <Select value={incomingStaffId} onValueChange={setIncomingStaffId}>
              <SelectTrigger className="text-sm"><SelectValue placeholder="Select incoming staff member…" /></SelectTrigger>
              <SelectContent>
                {eligibleIncoming.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {nextShift && <p className="text-xs text-muted-foreground mt-1">Pre-populated from next {nextShiftType} shift</p>}
          </section>

          {/* Confirmation */}
          <label className="flex items-start gap-2 cursor-pointer bg-muted/30 rounded-lg p-3">
            <input type="checkbox" className="mt-0.5" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />
            <span className="text-sm">I confirm this handover is accurate and complete to the best of my knowledge.</span>
          </label>
        </div>

        <div className="px-5 py-4 border-t border-border shrink-0">
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={!canSubmit || submitMutation.isPending}
            className="w-full"
          >
            {submitMutation.isPending ? "Submitting…" : "Submit Handover"}
          </Button>
        </div>
      </div>
    </div>
  );
}