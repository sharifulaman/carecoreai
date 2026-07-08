import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertTriangle, Star, Pencil, Trash2, FileText, Calendar, Download, Clock } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO, format } from "date-fns";
import { createNotification } from "@/lib/createNotification";
import { logAudit } from "@/lib/logAudit";
import { ORG_ID } from "@/lib/roleConfig";
import AppraisalLogForm from "../appraisal/AppraisalLogForm";
import SupervisionLogForm from "../supervision/SupervisionLogForm";
import MidYearCheckInModal from "../appraisal/MidYearCheckInModal";
import { generateAppraisalPDF } from "../appraisal/AppraisalPDFExport";


export default function SupervisionTab({ user, staff = [], homes = [] }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "admin_officer";
  const isAdminOrHR = isAdmin || user?.role === "hr_manager" || user?.role === "hr_officer";
  const isTL = user?.role === "team_leader";
  const [showForm, setShowForm] = useState(null);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState("supervisions");
  const [midYearCheckIn, setMidYearCheckIn] = useState(null);
  const [exporting, setExporting] = useState(null);

  const myProfile = staff.find(s => s.email === user?.email);
  const today = new Date();

  const { data: supervisions = [] } = useQuery({
    queryKey: ["supervision-records"],
    queryFn: () => secureGateway.filter("SupervisionRecord"),
    staleTime: 5 * 60 * 1000,
  });
  const { data: appraisals = [] } = useQuery({
    queryKey: ["appraisal-records"],
    queryFn: () => secureGateway.filter("AppraisalRecord"),
    staleTime: 5 * 60 * 1000,
  });

  const saveSupervision = useMutation({
    mutationFn: async (data) => {
      const sup = staff.find(s => s.id === data.supervisee_id);
      // Derive concern_flags
      const concern_flags = [];
      if (data.stress_rag === "high" || ["stressed","struggling"].includes(data.wellbeing_mood)) concern_flags.push("wellbeing_concern");
      if (data.safeguarding_support_needed) concern_flags.push("safeguarding_raised");
      if (data.training_needs?.length || (data.actions || []).some(a => a.type === "training")) concern_flags.push("training_identified");

      // Sign-off status: auto-set to signed if both parties signed
      let signoff_status = data.signoff_status || "draft";
      if (data.supervisor_signed && data.supervisee_signed) signoff_status = "signed";

      // Process actions — handle training linkage
      const processedActions = [];
      for (const action of (data.actions || [])) {
        let act = { ...action };
        if (act.type === "training" && act.text?.trim() && !act.training_requirement_id) {
          try {
            const existing = await secureGateway.filter("TrainingRequirement", { org_id: ORG_ID, staff_id: data.supervisee_id });
            const match = existing.find(r => r.requirement_name?.toLowerCase() === act.text.toLowerCase());
            if (match) {
              act.training_requirement_id = match.id;
            } else {
              const created = await secureGateway.create("TrainingRequirement", {
                org_id: ORG_ID,
                staff_id: data.supervisee_id,
                staff_name: sup?.full_name || "",
                requirement_name: act.text,
                source: "supervision",
                status: "pending",
              });
              act.training_requirement_id = created?.id || "";
            }
          } catch {}
        }
        processedActions.push(act);
      }

      // Also create TrainingRequirement records for training_needs items
      for (const need of (data.training_needs || [])) {
        try {
          const existing = await secureGateway.filter("TrainingRequirement", { org_id: ORG_ID, staff_id: data.supervisee_id });
          const match = existing.find(r => r.requirement_name?.toLowerCase() === need.toLowerCase());
          if (!match) {
            await secureGateway.create("TrainingRequirement", {
              org_id: ORG_ID,
              staff_id: data.supervisee_id,
              staff_name: sup?.full_name || "",
              requirement_name: need,
              source: "supervision",
              status: "pending",
            });
          }
        } catch {}
      }

      const payload = {
        supervisee_id: data.supervisee_id,
        supervisee_name: sup?.full_name || "",
        supervisor_id: data.supervisor_id || myProfile?.id,
        supervisor_name: myProfile?.full_name || user?.full_name || "",
        session_date: data.session_date,
        notes: data.notes,
        action_points: data.action_points,
        next_supervision_date: data.next_supervision_date,
        status: data.status || "completed",
        supervision_type: data.supervision_type || "standard",
        agenda_items: data.agenda_items || [],
        wellbeing_mood: data.wellbeing_mood || undefined,
        stress_rag: data.stress_rag || undefined,
        wellbeing_drivers: data.wellbeing_drivers || [],
        wellbeing_note: data.wellbeing_note || undefined,
        workload_status: data.workload_status || undefined,
        reflective_questions: data.reflective_questions || [],
        safeguarding_confidence: data.safeguarding_confidence || undefined,
        safeguarding_support_needed: data.safeguarding_support_needed || false,
        safeguarding_note: data.safeguarding_note || undefined,
        training_needs: data.training_needs || [],
        actions: processedActions,
        concern_flags,
        signoff_status,
        supervisor_signed: data.supervisor_signed || false,
        supervisor_signed_at: data.supervisor_signed_at || undefined,
        supervisee_signed: data.supervisee_signed || false,
        supervisee_signed_at: data.supervisee_signed_at || undefined,
        transcript: data.transcript || undefined,
        audio_file_url: data.audio_file_url || undefined,
        ai_structured: data.ai_structured || false,
      };
      if (editRecord?.id) {
        await secureGateway.update("SupervisionRecord", editRecord.id, payload);
        await logAudit({
          entity_name: "SupervisionRecord", entity_id: editRecord.id, action: "update",
          changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
          old_values: { session_date: editRecord.session_date, status: editRecord.status },
          new_values: { session_date: payload.session_date, status: payload.status, next_supervision_date: payload.next_supervision_date },
          org_id: ORG_ID,
          description: `Supervision record updated for ${payload.supervisee_name}`,
        });
      } else {
        await secureGateway.create("SupervisionRecord", payload);
        await logAudit({
          entity_name: "SupervisionRecord", entity_id: undefined, action: "create",
          changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
          old_values: null,
          new_values: { supervisee_name: payload.supervisee_name, supervisor_name: payload.supervisor_name, session_date: payload.session_date, next_supervision_date: payload.next_supervision_date, status: payload.status },
          org_id: ORG_ID,
          description: `Supervision logged for ${payload.supervisee_name} on ${payload.session_date}`,
        });
        // Notify supervisee if completed
        if (data.status === "completed" && sup?.user_id) {
          const actionPoints = data.action_points ? `Action points: ${data.action_points}` : "No action points recorded.";
          createNotification({
            recipient_user_id: sup.user_id,
            recipient_staff_id: sup.id,
            title: "Supervision Session Recorded",
            body: `Your supervision notes from ${data.session_date} have been recorded by ${myProfile?.full_name || "your manager"}. ${actionPoints}`,
            type: "general",
            link: "/messages",
          });
        }
        // If next_supervision_date set, create a scheduled record
        if (data.next_supervision_date) {
          await secureGateway.create("SupervisionRecord", {
            supervisee_id: data.supervisee_id,
            supervisee_name: sup?.full_name || "",
            supervisor_id: data.supervisor_id || myProfile?.id,
            supervisor_name: myProfile?.full_name || user?.full_name || "",
            session_date: data.next_supervision_date,
            notes: "",
            status: "scheduled",
          });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supervision-records"] }); setShowForm(null); setEditRecord(null); toast.success("Supervision saved"); },
  });

  const saveAppraisal = useMutation({
    mutationFn: async (data) => {
      const appr = staff.find(s => s.id === data.appraisee_id);

      // ── Training linkage: scan all goals (including improvement plan) for training type ──
      const allGoals = [...(data.goals || [])];
      const linkedGoals = [];
      for (const goal of allGoals) {
        let g = { ...goal };
        const isTraining = g.source === "improvement_plan"
          || /train|develop|course|qualif/i.test(g.title || "");
        if (isTraining && g.title?.trim() && !g.training_requirement_id) {
          try {
            const existing = await secureGateway.filter("TrainingRequirement", { org_id: ORG_ID, staff_id: data.appraisee_id });
            const match = existing.find(r => r.requirement_name?.toLowerCase() === g.title.toLowerCase());
            if (match) {
              g.training_requirement_id = match.id;
            } else {
              const created = await secureGateway.create("TrainingRequirement", {
                org_id: ORG_ID,
                staff_id: data.appraisee_id,
                staff_name: appr?.full_name || "",
                requirement_name: g.title,
                source: "appraisal",
                status: "pending",
              });
              g.training_requirement_id = created?.id || "";
            }
          } catch {}
        }
        linkedGoals.push(g);
      }

      // ── Status flow ──
      let status = data.status || "draft";
      if (data.appraiser_signed && data.appraisee_signed && !data.reviewed_by) status = "completed";
      if (data.reviewed_by) status = "signed_off";

      const payload = {
        org_id: ORG_ID,
        appraisee_id: data.appraisee_id,
        appraisee_name: appr?.full_name || "",
        home_id: appr?.home_ids?.[0] || "",
        appraiser_id: data.appraiser_id || myProfile?.id,
        appraiser_name: myProfile?.full_name || user?.full_name || "",
        appraisal_date: data.appraisal_date,
        next_appraisal_date: data.next_appraisal_date,
        overall_rating: data.overall_rating,
        performance_notes: data.performance_notes,
        strengths: data.strengths,
        areas_for_development: data.areas_for_development,
        goals: linkedGoals,
        outcome: data.outcome,
        employee_comments: data.employee_comments || undefined,
        status,
        // Evidence + competency fields
        appraisal_type: data.appraisal_type || "annual",
        period_start: data.period_start || undefined,
        period_end: data.period_end || undefined,
        competency_scores: data.competency_scores || [],
        evidence_snapshot: data.evidence_snapshot || {},
        suggested_outcome: data.suggested_outcome || undefined,
        suggested_rating: data.suggested_rating || undefined,
        rolling_score: data.rolling_score ?? undefined,
        feedback_summary: data.feedback_summary || {},
        // Sign-off
        appraiser_signed: data.appraiser_signed || false,
        appraiser_signed_at: data.appraiser_signed_at || undefined,
        appraisee_signed: data.appraisee_signed || false,
        appraisee_signed_at: data.appraisee_signed_at || undefined,
        reviewed_by: data.reviewed_by || undefined,
        reviewed_at: data.reviewed_at || undefined,
        // Self-assessment
        self_assessment: data.self_assessment || {},
        // Improvement plan
        improvement_plan: data.improvement_plan || {},
      };
      if (editRecord?.id) {
        await secureGateway.update("AppraisalRecord", editRecord.id, payload);
        const statusChanged = editRecord.status !== payload.status;
        await logAudit({
          entity_name: "AppraisalRecord", entity_id: editRecord.id, action: "update",
          changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
          old_values: { appraisal_date: editRecord.appraisal_date, overall_rating: editRecord.overall_rating, status: editRecord.status },
          new_values: { appraisal_date: payload.appraisal_date, overall_rating: payload.overall_rating, next_appraisal_date: payload.next_appraisal_date, status: payload.status },
          org_id: ORG_ID,
          description: statusChanged
            ? `Appraisal status changed: ${editRecord.status} → ${payload.status} for ${payload.staff_name}`
            : `Appraisal updated for ${payload.staff_name}`,
        });
        // Notify on sign-off
        if (statusChanged && payload.status === "signed_off") {
          const appraiseeStaff = staff.find(s => s.id === payload.staff_id);
          if (appraiseeStaff?.user_id) {
            createNotification({
              recipient_user_id: appraiseeStaff.user_id,
              recipient_staff_id: appraiseeStaff.id,
              title: "Appraisal signed off",
              body: `Your appraisal (${payload.appraisal_date}) has been fully signed off. You can view it in My HR.`,
              type: "general",
              link: "/my-hr",
            });
          }
        }
      } else {
        await secureGateway.create("AppraisalRecord", payload);
        await logAudit({
          entity_name: "AppraisalRecord", entity_id: undefined, action: "create",
          changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
          old_values: null,
          new_values: { staff_name: payload.staff_name, appraiser_name: payload.appraiser_name, appraisal_date: payload.appraisal_date, overall_rating: payload.overall_rating, status: payload.status },
          org_id: ORG_ID,
          description: `Appraisal logged for ${payload.staff_name} on ${payload.appraisal_date} (rating: ${payload.overall_rating}/5)`,
        });
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appraisal-records"] }); setShowForm(null); setEditRecord(null); toast.success("Appraisal saved"); },
  });

  const deleteSupervision = useMutation({
    mutationFn: (id) => secureGateway.delete("SupervisionRecord", id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["supervision-records"] }); setDeleteId(null); toast.success("Deleted"); },
  });

  const deleteAppraisal = useMutation({
    mutationFn: (id) => secureGateway.delete("AppraisalRecord", id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appraisal-records"] }); setDeleteId(null); toast.success("Deleted"); },
  });

  const overdueSupervisions = staff.filter(s => s.status === "active").filter(s => {
    const last = supervisions.filter(r => r.supervisee_id === s.id && r.status === "completed").sort((a, b) => b.session_date?.localeCompare(a.session_date))[0];
    if (!last) return true;
    return differenceInDays(today, parseISO(last.session_date)) > 56;
  });

  const overdueAppraisals = staff.filter(s => s.status === "active").filter(s => {
    const last = appraisals.filter(r => r.staff_id === s.id).sort((a, b) => b.appraisal_date?.localeCompare(a.appraisal_date))[0];
    if (!last || !last.next_appraisal_date) return false;
    return differenceInDays(today, parseISO(last.next_appraisal_date)) > 0;
  });

  // Upcoming scheduled
  const upcomingSupervisions = supervisions.filter(s => s.status === "scheduled" && s.session_date >= format(today, "yyyy-MM-dd")).sort((a, b) => a.session_date?.localeCompare(b.session_date));

  const STATUS_COLORS = {
    completed: "bg-green-100 text-green-700",
    scheduled: "bg-blue-100 text-blue-700",
    missed: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">


      {upcomingSupervisions.length > 0 && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-semibold mb-1"><Calendar className="w-3.5 h-3.5" /> Upcoming Scheduled Supervisions</div>
          {upcomingSupervisions.slice(0, 5).map(s => {
            const isToday = s.session_date === format(today, "yyyy-MM-dd");
            return (
              <div key={s.id} className="flex items-center gap-2 justify-between">
                <span>{s.supervisee_name} — {s.session_date}</span>
                {isToday && (
                  <button
                    className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-700"
                    onClick={() => { setEditRecord(s); setShowForm("supervision"); }}>
                    Mark Completed
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button onClick={() => setActiveTab("supervisions")} className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${activeTab === "supervisions" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>Supervisions</button>
          <button onClick={() => setActiveTab("appraisals")} className={`text-xs px-3 py-1 rounded-md font-medium transition-colors ${activeTab === "appraisals" ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>Appraisals</button>
        </div>
        <div className="flex gap-2">
          {(isAdmin || isTL) && (
            <>
              {activeTab === "supervisions" && (
                <Button size="sm" className="gap-1" onClick={() => { setEditRecord(null); setShowForm("supervision"); }}>
                  <Plus className="w-3.5 h-3.5" /> Log Supervision
                </Button>
              )}
              {activeTab === "appraisals" && (
                <Button size="sm" className="gap-1" onClick={() => { setEditRecord(null); setShowForm("appraisal"); }}>
                  <Plus className="w-3.5 h-3.5" /> Log Appraisal
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {activeTab === "supervisions" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Supervisee</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Supervisor</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Next Due</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {supervisions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-xs">No supervisions recorded yet.</td></tr>
              ) : supervisions.sort((a, b) => b.session_date?.localeCompare(a.session_date)).map(s => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{s.supervisee_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.supervisor_name}</td>
                  <td className="px-4 py-3">{s.session_date}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={`text-xs ${STATUS_COLORS[s.status] || "bg-muted text-muted-foreground"}`}>{s.status || "completed"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {s.next_supervision_date ? (
                      <span className={differenceInDays(parseISO(s.next_supervision_date), today) < 0 ? "text-red-500 text-xs" : "text-xs"}>{s.next_supervision_date}</span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {(isAdmin || isTL) && (
                        <button onClick={() => { setEditRecord(s); setShowForm("supervision"); }} className="text-muted-foreground hover:text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setDeleteId({ id: s.id, type: "supervision" })} className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "appraisals" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff Member</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Appraiser</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Rating</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Next Due</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Goals</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {appraisals.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">No appraisals recorded yet.</td></tr>
              ) : appraisals.sort((a, b) => b.appraisal_date?.localeCompare(a.appraisal_date)).map(a => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{a.appraisee_name || a.staff_name || "Unknown"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.appraiser_name}</td>
                  <td className="px-4 py-3">{a.appraisal_date}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-0.5">
                      {[1,2,3,4,5].map(r => <Star key={r} className={`w-3.5 h-3.5 ${r <= (a.overall_rating || 0) ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs">{a.next_appraisal_date || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{a.goals?.length || 0} goals</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {(isAdmin || isTL) && (
                        <>
                          <button onClick={() => { setEditRecord(a); setShowForm("appraisal"); }} className="text-muted-foreground hover:text-primary" title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setMidYearCheckIn(a)} className="text-muted-foreground hover:text-blue-500" title="Mid-year check-in">
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={async () => {
                              setExporting(a.id);
                              try {
                                await generateAppraisalPDF(a, staff.find(s => s.id === (a.appraisee_id || a.staff_id)), { name: "Organisation" }, user);
                                toast.success("Appraisal PDF exported");
                              } catch (err) {
                                toast.error(err.message);
                              } finally {
                                setExporting(null);
                              }
                            }}
                            disabled={exporting === a.id}
                            className="text-muted-foreground hover:text-green-500"
                            title="Export PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {isAdmin && (
                        <button onClick={() => setDeleteId({ id: a.id, type: "appraisal" })} className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm === "supervision" && (
        <SupervisionLogForm
          initialData={editRecord}
          staff={staff.filter(s => s.status === "active")}
          myProfile={myProfile}
          isAdminOrHR={isAdminOrHR}
          onClose={() => { setShowForm(null); setEditRecord(null); }}
          onSubmit={saveSupervision.mutate}
        />
      )}

      {showForm === "appraisal" && (
        <AppraisalLogForm
          initialData={editRecord}
          staff={staff.filter(s => s.status === "active")}
          myProfile={myProfile}
          appraisals={appraisals}
          isAdminOrHR={isAdminOrHR}
          onClose={() => { setShowForm(null); setEditRecord(null); }}
          onSubmit={saveAppraisal.mutate}
        />
      )}

      {midYearCheckIn && (
        <MidYearCheckInModal
          record={midYearCheckIn}
          onSave={async (checkinData) => {
            await secureGateway.update("AppraisalRecord", midYearCheckIn.id, {
              mid_year_checkin: checkinData,
            });
            queryClient.invalidateQueries({ queryKey: ["appraisal-records"] });
            setMidYearCheckIn(null);
            toast.success("Mid-year check-in saved");
          }}
          onClose={() => setMidYearCheckIn(null)}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm text-center space-y-4">
            <p className="font-semibold">Delete this record?</p>
            <p className="text-sm text-muted-foreground">This cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1"
                onClick={() => deleteId.type === "appraisal" ? deleteAppraisal.mutate(deleteId.id) : deleteSupervision.mutate(deleteId.id)}>
                Delete
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}