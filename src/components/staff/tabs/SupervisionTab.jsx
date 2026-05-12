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
import MidYearCheckInModal from "../appraisal/MidYearCheckInModal";
import { generateAppraisalPDF } from "../appraisal/AppraisalPDFExport";

function LogForm({ initialData, type, staff, myProfile, onClose, onSubmit }) {
  const isAppraisal = type === "appraisal";
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState(initialData || {
    supervisee_id: "", supervisor_id: myProfile?.id || "",
    session_date: today,
    notes: "", action_points: "", next_supervision_date: "",
    status: "completed",
    appraisee_id: "", appraiser_id: myProfile?.id || "",
    appraisal_date: today,
    rating: 3, development_goals: "", outcome: "", next_appraisal_date: "",
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{isAppraisal ? "Log Appraisal" : "Log Supervision"}</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">{isAppraisal ? "Appraisee" : "Supervisee"}</label>
          <Select value={isAppraisal ? form.appraisee_id : form.supervisee_id}
            onValueChange={v => f(isAppraisal ? "appraisee_id" : "supervisee_id", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Date</label>
          <Input type="date" className="mt-1"
            value={isAppraisal ? form.appraisal_date : form.session_date}
            onChange={e => f(isAppraisal ? "appraisal_date" : "session_date", e.target.value)} />
        </div>

        {!isAppraisal && (
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <Select value={form.status} onValueChange={v => f("status", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled (future)</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground">Notes</label>
          <textarea className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 min-h-[80px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={form.notes} onChange={e => f("notes", e.target.value)} />
        </div>

        {!isAppraisal && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Action Points</label>
              <Input className="mt-1" value={form.action_points} onChange={e => f("action_points", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Next Supervision Date</label>
              <Input type="date" className="mt-1" value={form.next_supervision_date} onChange={e => f("next_supervision_date", e.target.value)} />
            </div>
          </>
        )}

        {isAppraisal && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Rating (1–5)</label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(r => (
                  <button key={r} onClick={() => f("rating", r)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${form.rating >= r ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground"}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Development Goals</label>
              <textarea className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.development_goals} onChange={e => f("development_goals", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Outcome</label>
              <Input className="mt-1" value={form.outcome} onChange={e => f("outcome", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Next Appraisal Date</label>
              <Input type="date" className="mt-1" value={form.next_appraisal_date} onChange={e => f("next_appraisal_date", e.target.value)} />
            </div>
          </>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onSubmit(form)}>Save</Button>
        </div>
      </div>
    </div>
  );
}

export default function SupervisionTab({ user, staff = [], homes = [] }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "admin_officer";
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
      const payload = {
        org_id: ORG_ID,
        staff_id: data.appraisee_id,
        staff_name: appr?.full_name || "",
        home_id: appr?.home_ids?.[0] || "",
        appraiser_id: data.appraiser_id || myProfile?.id,
        appraiser_name: myProfile?.full_name || user?.full_name || "",
        appraisal_date: data.appraisal_date,
        next_appraisal_date: data.next_appraisal_date,
        overall_rating: data.overall_rating,
        performance_notes: data.performance_notes,
        strengths: data.strengths,
        areas_for_development: data.areas_for_development,
        goals: data.goals || [],
        outcome: data.outcome,
        status: "draft",
      };
      if (editRecord?.id) {
        await secureGateway.update("AppraisalRecord", editRecord.id, payload);
        await logAudit({
          entity_name: "AppraisalRecord", entity_id: editRecord.id, action: "update",
          changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
          old_values: { appraisal_date: editRecord.appraisal_date, overall_rating: editRecord.overall_rating },
          new_values: { appraisal_date: payload.appraisal_date, overall_rating: payload.overall_rating, next_appraisal_date: payload.next_appraisal_date },
          org_id: ORG_ID,
          description: `Appraisal updated for ${payload.staff_name}`,
        });
      } else {
        await secureGateway.create("AppraisalRecord", payload);
        await logAudit({
          entity_name: "AppraisalRecord", entity_id: undefined, action: "create",
          changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
          old_values: null,
          new_values: { staff_name: payload.staff_name, appraiser_name: payload.appraiser_name, appraisal_date: payload.appraisal_date, overall_rating: payload.overall_rating },
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
      {(overdueSupervisions.length > 0 || overdueAppraisals.length > 0) && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs space-y-1">
          {overdueSupervisions.length > 0 && (
            <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span><strong>Overdue Supervisions ({overdueSupervisions.length}):</strong> {overdueSupervisions.map(s => s.full_name).join(", ")}</span>
            </div>
          )}
          {overdueAppraisals.length > 0 && (
            <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span><strong>Overdue Appraisals ({overdueAppraisals.length}):</strong> {overdueAppraisals.map(s => s.full_name).join(", ")}</span>
            </div>
          )}
        </div>
      )}

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
              <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditRecord(null); setShowForm("supervision"); }}>
                <Plus className="w-3.5 h-3.5" /> Log Supervision
              </Button>
              <Button size="sm" className="gap-1" onClick={() => { setEditRecord(null); setShowForm("appraisal"); }}>
                <Plus className="w-3.5 h-3.5" /> Log Appraisal
              </Button>
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
                  <td className="px-4 py-3 font-medium">{a.staff_name}</td>
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
                                await generateAppraisalPDF(a, staff.find(s => s.id === a.staff_id), { name: "Organisation" }, user);
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
        <LogForm
          initialData={editRecord}
          type="supervision"
          staff={staff.filter(s => s.status === "active")}
          myProfile={myProfile}
          onClose={() => { setShowForm(null); setEditRecord(null); }}
          onSubmit={saveSupervision.mutate}
        />
      )}

      {showForm === "appraisal" && (
        <AppraisalLogForm
          initialData={editRecord}
          staff={staff.filter(s => s.status === "active")}
          myProfile={myProfile}
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