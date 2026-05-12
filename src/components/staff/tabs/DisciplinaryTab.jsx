import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Lock, Pencil, Trash2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO } from "date-fns";
import { createNotification } from "@/lib/createNotification";
import { logAudit } from "@/lib/logAudit";
import { ORG_ID } from "@/lib/roleConfig";

const DISC_STAGES = [
  { value: "informal", label: "Informal Discussion", color: "bg-blue-100 text-blue-700" },
  { value: "verbal_warning", label: "Verbal Warning", color: "bg-amber-100 text-amber-700" },
  { value: "written_warning", label: "Written Warning", color: "bg-orange-100 text-orange-700" },
  { value: "final_warning", label: "Final Written Warning", color: "bg-red-100 text-red-700" },
  { value: "dismissal", label: "Dismissal", color: "bg-red-900/20 text-red-900" },
];

const STAGE_LABELS = Object.fromEntries(DISC_STAGES.map(s => [s.value, s.label]));
const STAGE_COLORS = Object.fromEntries(DISC_STAGES.map(s => [s.value, s.color]));

const GRIEVANCE_OUTCOMES = ["Upheld", "Not upheld", "Partially upheld"];
const DISC_STATUS = ["Issued", "Acknowledged by staff", "Appeal submitted", "Appeal outcome received"];

function RecordForm({ initialData, type, staff, myProfile, onClose, onSubmit }) {
  const isGrievance = type === "grievance";
  const [form, setForm] = useState(initialData || {
    staff_id: "", incident_date: new Date().toISOString().split("T")[0],
    disciplinary_type: "verbal_warning", incident_summary: "", outcome: "",
    witnesses: "", policy_clause: "", review_date: "", status_stage: "Issued",
    confidential: true,
    // grievance
    nature: "", investigator: "", grievance_outcome: "", resolution_actions: "",
    resolved_by: "", resolution_date: "",
  });
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-xl p-6 space-y-3 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{isGrievance ? "Log Grievance" : "Log Disciplinary"}</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Staff Member</label>
          <Select value={form.staff_id} onValueChange={v => f("staff_id", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Date</label>
          <Input type="date" className="mt-1" value={form.incident_date} onChange={e => f("incident_date", e.target.value)} />
        </div>

        {!isGrievance && (
          <div>
            <label className="text-xs text-muted-foreground">Stage</label>
            <Select value={form.disciplinary_type} onValueChange={v => f("disciplinary_type", v)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{DISC_STAGES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}

        <div>
          <label className="text-xs text-muted-foreground">{isGrievance ? "Nature of Grievance" : "Incident Summary"}</label>
          <textarea className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 min-h-[80px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            value={isGrievance ? form.nature : form.incident_summary}
            onChange={e => f(isGrievance ? "nature" : "incident_summary", e.target.value)} />
        </div>

        {!isGrievance && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Witnesses</label>
              <Input className="mt-1" placeholder="Names of witnesses…" value={form.witnesses} onChange={e => f("witnesses", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">HR Policy Clause Referenced</label>
              <Input className="mt-1" placeholder="e.g. Section 4.2 — Conduct" value={form.policy_clause} onChange={e => f("policy_clause", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Outcome</label>
                <Input className="mt-1" value={form.outcome} onChange={e => f("outcome", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Review Date</label>
                <Input type="date" className="mt-1" value={form.review_date} onChange={e => f("review_date", e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={form.status_stage} onValueChange={v => f("status_stage", v)}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{DISC_STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={form.confidential} onChange={e => f("confidential", e.target.checked)} className="rounded w-3 h-3" />
              Mark as confidential (hidden from Team Leaders)
            </label>
          </>
        )}

        {isGrievance && (
          <>
            <div>
              <label className="text-xs text-muted-foreground">Investigator</label>
              <Input className="mt-1" value={form.investigator} onChange={e => f("investigator", e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Outcome</label>
              <Select value={form.grievance_outcome} onValueChange={v => f("grievance_outcome", v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select outcome…" /></SelectTrigger>
                <SelectContent>{GRIEVANCE_OUTCOMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Resolution Actions</label>
              <textarea className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                value={form.resolution_actions} onChange={e => f("resolution_actions", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Resolved By</label>
                <Input className="mt-1" value={form.resolved_by} onChange={e => f("resolved_by", e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Resolution Date</label>
                <Input type="date" className="mt-1" value={form.resolution_date} onChange={e => f("resolution_date", e.target.value)} />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!form.staff_id} onClick={() => onSubmit({ ...form, record_type: type })}>Save</Button>
        </div>
      </div>
    </div>
  );
}

export default function DisciplinaryTab({ user, staff = [] }) {
  const queryClient = useQueryClient();
  const canAccess = user?.role === "admin" || user?.role === "admin_officer";
  const [activeTab, setActiveTab] = useState("disciplinary");
  const [showForm, setShowForm] = useState(null); // "disciplinary" | "grievance"
  const [editRecord, setEditRecord] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const myProfile = staff.find(s => s.email === user?.email);

  const { data: records = [] } = useQuery({
    queryKey: ["disciplinary-records"],
    queryFn: () => secureGateway.filter("DisciplinaryRecord"),
    enabled: canAccess,
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const member = staff.find(s => s.id === data.staff_id);
      const payload = {
        ...data,
        staff_name: member?.full_name || "",
        issued_by: myProfile?.id,
        issued_by_name: myProfile?.full_name || user?.full_name || "",
      };
      if (editRecord?.id) {
        await secureGateway.update("DisciplinaryRecord", editRecord.id, payload);
        await logAudit({
          entity_name: "DisciplinaryRecord", entity_id: editRecord.id, action: "update",
          changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
          old_values: { staff_name: editRecord.staff_name, disciplinary_type: editRecord.disciplinary_type, status_stage: editRecord.status_stage },
          new_values: { staff_name: payload.staff_name, disciplinary_type: payload.disciplinary_type, status_stage: payload.status_stage },
          org_id: ORG_ID,
          description: `Disciplinary record updated for ${payload.staff_name}`,
        });
      } else {
        await secureGateway.create("DisciplinaryRecord", payload);
        await logAudit({
          entity_name: "DisciplinaryRecord", entity_id: undefined, action: "create",
          changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
          old_values: null,
          new_values: { staff_name: payload.staff_name, disciplinary_type: payload.disciplinary_type, incident_date: payload.incident_date, issued_by_name: payload.issued_by_name, record_type: payload.record_type, note: "incident_summary omitted (confidential)" },
          org_id: ORG_ID,
          description: `Disciplinary record created for ${payload.staff_name} (${payload.disciplinary_type})`,
        });
        // Notify admin
        const admin = staff.find(s => (s.role === "admin" || s.role === "admin_officer") && s.user_id && s.id !== myProfile?.id);
        if (admin?.user_id) {
          createNotification({
            recipient_user_id: admin.user_id,
            recipient_staff_id: admin.id,
            title: `${data.record_type === "grievance" ? "Grievance" : "Disciplinary"} Record Created`,
            body: `A ${data.record_type} record has been created for ${member?.full_name}. Please review.`,
            type: "alert",
            link: "/staff?tab=disciplinary",
            priority: data.disciplinary_type === "dismissal" ? "high" : "normal",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["disciplinary-records"] });
      setShowForm(null);
      setEditRecord(null);
      toast.success("Record saved");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const rec = records.find(r => r.id === id);
      await secureGateway.delete("DisciplinaryRecord", id);
      await logAudit({
        entity_name: "DisciplinaryRecord", entity_id: id, action: "delete",
        changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
        old_values: null,
        new_values: { note: `Record deleted by ${myProfile?.full_name || "admin"}`, staff_name: rec?.staff_name, disciplinary_type: rec?.disciplinary_type },
        org_id: ORG_ID,
        description: `Disciplinary record deleted for ${rec?.staff_name || id}`,
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["disciplinary-records"] }); setDeleteId(null); toast.success("Record deleted"); },
  });

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Lock className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="font-medium">Restricted Access</p>
        <p className="text-sm text-muted-foreground mt-1">Disciplinary & Grievance records are visible to admins only.</p>
      </div>
    );
  }

  const disciplinaryRecords = records.filter(r => r.record_type === "disciplinary");
  const grievanceRecords = records.filter(r => r.record_type === "grievance");

  // Review date approaching alerts
  const reviewDue = disciplinaryRecords.filter(r => {
    if (!r.review_date) return false;
    const diff = differenceInDays(parseISO(r.review_date), new Date());
    return diff >= 0 && diff <= 7;
  });

  return (
    <div className="space-y-4">
      {reviewDue.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Review dates approaching:</strong> {reviewDue.map(r => `${r.staff_name} (${r.review_date})`).join(", ")}</span>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["disciplinary", "grievance"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`text-xs px-3 py-1 rounded-md font-medium capitalize transition-colors ${activeTab === t ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
              {t} ({t === "disciplinary" ? disciplinaryRecords.length : grievanceRecords.length})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={() => { setEditRecord(null); setShowForm("disciplinary"); }}>
            <Plus className="w-3.5 h-3.5" /> Disciplinary
          </Button>
          <Button size="sm" className="gap-1" onClick={() => { setEditRecord(null); setShowForm("grievance"); }}>
            <Plus className="w-3.5 h-3.5" /> Grievance
          </Button>
        </div>
      </div>

      {activeTab === "disciplinary" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-8"></th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Review</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {disciplinaryRecords.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">No disciplinary records.</td></tr>
              ) : disciplinaryRecords.sort((a, b) => b.incident_date?.localeCompare(a.incident_date)).map(r => (
                <>
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <button onClick={() => setExpanded(v => v === r.id ? null : r.id)}>
                        {expanded === r.id ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 font-medium">{r.staff_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.incident_date}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-xs ${STAGE_COLORS[r.disciplinary_type] || "bg-muted text-muted-foreground"}`}>
                        {STAGE_LABELS[r.disciplinary_type] || r.disciplinary_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.status_stage || "Issued"}</td>
                    <td className="px-4 py-3 text-xs">
                      {r.review_date ? (
                        <span className={differenceInDays(parseISO(r.review_date), new Date()) <= 7 ? "text-amber-600 font-medium" : ""}>
                          {r.review_date}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => { setEditRecord(r); setShowForm("disciplinary"); }} className="text-muted-foreground hover:text-primary">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(r.id)} className="text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-detail`} className="bg-muted/10">
                      <td colSpan={7} className="px-6 py-3 text-xs space-y-1 text-muted-foreground">
                        {r.incident_summary && <p><strong>Summary:</strong> {r.incident_summary}</p>}
                        {r.witnesses && <p><strong>Witnesses:</strong> {r.witnesses}</p>}
                        {r.policy_clause && <p><strong>Policy Clause:</strong> {r.policy_clause}</p>}
                        {r.outcome && <p><strong>Outcome:</strong> {r.outcome}</p>}
                        {r.issued_by_name && <p><strong>Issued By:</strong> {r.issued_by_name}</p>}
                        {r.confidential && <p className="text-amber-600">🔒 Confidential</p>}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "grievance" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Nature</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Outcome</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Resolved By</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grievanceRecords.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-xs">No grievance records.</td></tr>
              ) : grievanceRecords.sort((a, b) => b.incident_date?.localeCompare(a.incident_date)).map(r => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{r.staff_name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.incident_date}</td>
                  <td className="px-4 py-3 text-xs max-w-[150px] truncate">{r.nature}</td>
                  <td className="px-4 py-3 text-xs">{r.grievance_outcome || "—"}</td>
                  <td className="px-4 py-3 text-xs">{r.resolved_by || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => { setEditRecord(r); setShowForm("grievance"); }} className="text-muted-foreground hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(r.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <RecordForm
          initialData={editRecord}
          type={showForm}
          staff={staff}
          myProfile={myProfile}
          onClose={() => { setShowForm(null); setEditRecord(null); }}
          onSubmit={saveMutation.mutate}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm text-center space-y-4">
            <p className="font-semibold">Delete this record?</p>
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1" onClick={() => deleteMutation.mutate(deleteId)}>Delete</Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeleteId(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}