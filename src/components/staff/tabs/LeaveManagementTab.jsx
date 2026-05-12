import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO, format, eachDayOfInterval } from "date-fns";
import { createNotification } from "@/lib/createNotification";
import LeaveCalendar from "../leave/LeaveCalendar";
import YearEndCarryOver from "../leave/YearEndCarryOver";
import ReturnToWorkModal from "../wellbeing/ReturnToWorkModal";
import SSPBreakdownPanel from "../ssp/SSPBreakdownPanel";
import SelfCertForm from "../ssp/SelfCertForm";
import { calculateSSP } from "@/lib/sspCalculator";
import { logAudit } from "@/lib/logAudit";
import { ORG_ID } from "@/lib/roleConfig";

const LEAVE_TYPES = [
  { value: "annual_leave", label: "Annual Leave", color: "bg-blue-100 text-blue-700" },
  { value: "sick_leave", label: "Sick Leave", color: "bg-red-100 text-red-700" },
  { value: "unpaid_leave", label: "Unpaid Leave", color: "bg-gray-100 text-gray-700" },
  { value: "compassionate", label: "Compassionate", color: "bg-purple-100 text-purple-700" },
  { value: "maternity_paternity", label: "Maternity/Paternity", color: "bg-pink-100 text-pink-700" },
  { value: "toil", label: "TOIL", color: "bg-amber-100 text-amber-700" },
];

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function RequestForm({ staff, myProfile, prefillDate, onClose, onSubmit }) {
  const [form, setForm] = useState({ leave_type: "annual_leave", date_from: prefillDate || "", date_to: prefillDate || "", notes: "", staff_id: myProfile?.id || "" });
  const isAdmin = true;

  const days = form.date_from && form.date_to
    ? differenceInDays(parseISO(form.date_to), parseISO(form.date_from)) + 1
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">New Leave Request</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          {staff.length > 0 && (
            <div>
              <label className="text-xs text-muted-foreground">Staff Member</label>
              <Select value={form.staff_id} onValueChange={v => setForm(f => ({ ...f, staff_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground">Leave Type</label>
            <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
            </div>
          </div>
          {days > 0 && <p className="text-xs text-muted-foreground">{days} day{days > 1 ? "s" : ""} requested</p>}
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Input placeholder="Optional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!form.staff_id || !form.date_from || !form.date_to}
            onClick={() => {
              const member = staff.find(s => s.id === form.staff_id);
              onSubmit({ ...form, staff_name: member?.full_name || "", days_requested: days });
            }}>Submit</Button>
        </div>
      </div>
    </div>
  );
}

export default function LeaveManagementTab({ user, staff = [], homes = [], staffProfile }) {
  const queryClient = useQueryClient();
  const effectiveRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isAdmin = effectiveRole === "admin" || effectiveRole === "admin_officer";
  const isTL = effectiveRole === "team_leader";

  const { data: org = null } = useQuery({
    queryKey: ["organisation"],
    queryFn: () => secureGateway.filter("Organisation"),
    select: d => d?.[0] || null,
    staleTime: 10 * 60 * 1000,
  });
  const defaultEntitlement = org?.hr_policy?.annual_leave_days ?? 28;
  const [showForm, setShowForm] = useState(false);
  const [prefillDate, setPrefillDate] = useState("");
  const [activeTab, setActiveTab] = useState("requests");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [clashWarning, setClashWarning] = useState(null);
  const [rtwModal, setRtwModal] = useState(null); // leave request needing RTW
  const [sspResults, setSspResults] = useState({}); // { [leaveRequestId]: sspResult }
  const [expandedSelfCert, setExpandedSelfCert] = useState(null);

  const myProfile = staff.find(s => s.email === user?.email);

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["leave-requests"],
    queryFn: () => secureGateway.filter("LeaveRequest"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["leave-balances"],
    queryFn: () => secureGateway.filter("LeaveBalance"),
  });

  const submitLeave = useMutation({
    mutationFn: async (data) => {
      const created = await secureGateway.create("LeaveRequest", data);
      await logAudit({
        entity_name: "LeaveRequest", entity_id: created?.id, action: "create",
        changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
        old_values: null,
        new_values: { staff_name: data.staff_name, leave_type: data.leave_type, date_from: data.date_from, date_to: data.date_to, days_requested: data.days_requested },
        org_id: ORG_ID,
        description: `Leave request created: ${data.leave_type} for ${data.staff_name} (${data.date_from} – ${data.date_to})`,
      });
      return created;
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-bell"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-messages"] });
      setShowForm(false);
      toast.success("Leave request submitted");
      // Trigger 4 — notify TL or admin
      const requester = staff.find(s => s.id === (data.staff_id || myProfile?.id));
      const tlId = requester?.team_leader_id;
      const recipient = tlId ? staff.find(s => s.id === tlId) : staff.find(s => s.role === "admin");
      if (recipient?.user_id) {
        createNotification({
          recipient_user_id: recipient.user_id,
          recipient_staff_id: recipient.id,
          title: "Leave Request Pending Approval",
          body: `${data.staff_name || requester?.full_name || "A staff member"} has requested ${(data.leave_type || "").replace(/_/g, " ")} leave from ${data.date_from} to ${data.date_to} (${data.days_requested} days). Please review.`,
          type: "leave_request",
          link: "/staff?tab=leave",
        });
      }
    },
  });

  const maxStaffOff = org?.hr_policy?.max_staff_off_per_home ?? 2;

  const checkClash = (req) => {
    if (!req) return false;
    const reqStaff = staff.find(s => s.id === req.staff_id);
    const homeId = reqStaff?.home_ids?.[0];
    if (!homeId) return false;
    const homeStaffIds = new Set(staff.filter(s => (s.home_ids || []).includes(homeId)).map(s => s.id));
    // Count how many staff from same home are already approved off on any day of this request
    const days = req.date_from && req.date_to
      ? eachDayOfInterval({ start: parseISO(req.date_from), end: parseISO(req.date_to) })
      : [];
    const maxOff = days.reduce((max, d) => {
      const ds = format(d, "yyyy-MM-dd");
      const count = leaveRequests.filter(r =>
        r.id !== req.id && r.status === "approved" &&
        homeStaffIds.has(r.staff_id) &&
        r.date_from <= ds && r.date_to >= ds
      ).length;
      return Math.max(max, count);
    }, 0);
    if (maxOff >= maxStaffOff) {
      const home = homes.find(h => h.id === homeId);
      return { homeName: home?.name || "Home", clashCount: maxOff };
    }
    return false;
  };

  const updateSelfCert = useMutation({
    mutationFn: ({ id, data }) => secureGateway.update("LeaveRequest", id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Self-certification saved");
      setExpandedSelfCert(null);
    },
  });

  const reviewLeave = useMutation({
    mutationFn: async ({ id, status, reason }) => {
      const req = leaveRequests.find(r => r.id === id);

      // Calculate SSP automatically for sick leave approvals
      let sspPatch = {};
      if (status === "approved" && req?.leave_type === "sick_leave") {
        const staffMember = staff.find(s => s.id === req.staff_id);
        const attendanceLogs = await secureGateway.filter("AttendanceLog", { staff_id: req.staff_id }).catch(() => []);
        const calDays = req.date_from && req.date_to
          ? Math.round((new Date(req.date_to) - new Date(req.date_from)) / (1000 * 60 * 60 * 24)) + 1
          : 0;
        const sspResult = calculateSSP({
          staffProfile: staffMember,
          dateFrom: req.date_from,
          dateTo: req.date_to,
          attendanceLogs,
          allLeaveRequests: leaveRequests,
        });
        setSspResults(prev => ({ ...prev, [id]: sspResult }));
        sspPatch = {
          ssp_eligible: sspResult.eligible,
          ssp_amount: sspResult.eligible ? sspResult.totalSSP : 0,
          ssp_qualifying_days: sspResult.eligible ? sspResult.sspDays : 0,
          ssp_waiting_days: sspResult.eligible ? sspResult.waitingDays : 0,
          ssp_daily_rate: sspResult.eligible ? sspResult.dailyRate : 0,
          ssp_calculated_at: new Date().toISOString(),
          ssp_ineligibility_reason: !sspResult.eligible ? sspResult.reason : undefined,
          ssp_linked_absence: sspResult.linkedAbsence || false,
          fit_note_required: calDays > 7,
        };
      }

      await secureGateway.update("LeaveRequest", id, {
        status,
        reviewed_by: myProfile?.id || user?.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: reason || undefined,
        ...sspPatch,
      });
      await logAudit({
        entity_name: "LeaveRequest", entity_id: id, action: "update",
        changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
        old_values: { status: req?.status },
        new_values: status === "approved"
          ? { status: "approved", reviewed_by: myProfile?.full_name, ssp_eligible: sspPatch.ssp_eligible, ssp_amount: sspPatch.ssp_amount }
          : { status: "rejected", rejection_reason: reason },
        org_id: ORG_ID,
        description: `Leave request ${status} for ${req?.staff_name} (${req?.leave_type}, ${req?.date_from} – ${req?.date_to})`,
      });
      // Part 5 — notify the requesting staff member
      const requester = staff.find(s => s.id === req?.staff_id);
      if (requester?.user_id && req) {
        const leaveTypeLabel = (req.leave_type || "").replace(/_/g, " ");
        const reviewerName = myProfile?.full_name || user?.full_name || "Your manager";
        const body = status === "approved"
          ? `Your ${leaveTypeLabel} leave request from ${req.date_from} to ${req.date_to} has been approved by ${reviewerName}.`
          : `Your ${leaveTypeLabel} leave request from ${req.date_from} to ${req.date_to} has been rejected. Reason: ${reason || "No reason given"}.`;
        createNotification({
          recipient_user_id: requester.user_id,
          recipient_staff_id: requester.id,
          title: `Leave Request ${status === "approved" ? "Approved" : "Rejected"}`,
          body,
          type: "leave_response",
          link: "/messages",
        });
      }
      // If approved, deduct from balance
      if (status === "approved") {
        const req = leaveRequests.find(r => r.id === id);
        const currentYear = new Date().getFullYear();
        const existing = balances.find(b => b.staff_id === req?.staff_id && b.year === currentYear);
        if (req && existing) {
          const newDaysTaken = (existing.days_taken || 0) + (req.days_requested || 0);
          const newDaysRemaining = Math.max(0, (existing.days_remaining || existing.annual_entitlement || defaultEntitlement) - (req.days_requested || 0));
          await secureGateway.update("LeaveBalance", existing.id, {
            days_taken: newDaysTaken,
            days_remaining: newDaysRemaining,
            sick_occurrences: req.leave_type === "sick_leave" ? (existing.sick_occurrences || 0) + 1 : existing.sick_occurrences,
          });
          await logAudit({
            entity_name: "LeaveBalance", entity_id: existing.id, action: "update",
            changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
            old_values: { days_taken: existing.days_taken, days_remaining: existing.days_remaining },
            new_values: { days_taken: newDaysTaken, days_remaining: newDaysRemaining, reason: `Leave approved: ${req.leave_type}`, adjusted_by: myProfile?.full_name },
            org_id: ORG_ID,
            description: `Leave balance adjusted for ${req.staff_name}: −${req.days_requested} days (${req.leave_type})`,
          });
        } else if (req && !existing) {
          const created = await secureGateway.create("LeaveBalance", {
            staff_id: req.staff_id,
            year: currentYear,
            annual_entitlement: defaultEntitlement,
            days_taken: req.days_requested || 0,
            days_remaining: Math.max(0, defaultEntitlement - (req.days_requested || 0)),
            sick_occurrences: req.leave_type === "sick_leave" ? 1 : 0,
          });
          await logAudit({
            entity_name: "LeaveBalance", entity_id: created?.id, action: "create",
            changed_by: myProfile?.id, changed_by_name: myProfile?.full_name || "",
            old_values: null,
            new_values: { days_taken: req.days_requested, days_remaining: Math.max(0, defaultEntitlement - (req.days_requested || 0)), reason: `Initial balance created on leave approval`, adjusted_by: myProfile?.full_name },
            org_id: ORG_ID,
            description: `Leave balance created for ${req.staff_name} (${currentYear})`,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-bell"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-messages"] });
      setRejectingId(null);
      toast.success("Leave request updated");
    },
  });

  // Calendar: get approved leave for current month
  const today = new Date();
  const approvedLeave = leaveRequests.filter(r => r.status === "approved");

  // Bradford factor warning: sick leaves > 3 in rolling 12 months
  const sickWarnings = staff.filter(s => {
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
    const sickCount = leaveRequests.filter(r => r.staff_id === s.id && r.leave_type === "sick_leave" && r.status === "approved" && new Date(r.date_from) > cutoff).length;
    return sickCount >= 3;
  });

  const visibleRequests = isAdmin || isTL
    ? leaveRequests
    : leaveRequests.filter(r => r.staff_id === myProfile?.id);

  return (
    <div className="space-y-4">
      {/* Year-end carry-over tool */}
      {isAdmin && (
        <YearEndCarryOver staff={staff} org={org} balances={balances} isAdmin={isAdmin} />
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {["requests", "balances", "calendar"].map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`text-xs px-3 py-1 rounded-md font-medium capitalize transition-colors ${activeTab === t ? "bg-card shadow text-foreground" : "text-muted-foreground"}`}>
              {t === "balances" ? "Leave Balances" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-1" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> Request Leave
        </Button>
      </div>

      {sickWarnings.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Bradford Factor Alert:</strong> {sickWarnings.map(s => s.full_name).join(", ")} — 3+ sick leave occurrences in last 12 months.</span>
        </div>
      )}

      {activeTab === "requests" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Dates</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Days</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                {(isAdmin || isTL) && <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {visibleRequests.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-xs">No leave requests.</td></tr>
              ) : visibleRequests.sort((a, b) => b.date_from?.localeCompare(a.date_from)).map(req => {
                const lt = LEAVE_TYPES.find(t => t.value === req.leave_type);
                const sspResult = sspResults[req.id] || (req.ssp_eligible !== undefined ? {
                  eligible: req.ssp_eligible,
                  totalSSP: req.ssp_amount,
                  sspDays: req.ssp_qualifying_days,
                  waitingDays: req.ssp_waiting_days,
                  dailyRate: req.ssp_daily_rate,
                  sspWeeklyRate: 116.75,
                  qualifyingDaysPerWeek: req.ssp_qualifying_days ? Math.round(req.ssp_qualifying_days / (req.days_requested / 7)) : 5,
                  linkedAbsence: req.ssp_linked_absence,
                  reason: req.ssp_ineligibility_reason,
                  cappedAt28Weeks: false,
                } : null);
                const calDays = req.date_from && req.date_to
                  ? Math.round((new Date(req.date_to) - new Date(req.date_from)) / (1000 * 60 * 60 * 24)) + 1 : 0;
                const fitNoteAlertNeeded = req.fit_note_required && !req.fit_note_received_date;
                return (
                  <>
                  <tr key={req.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      {req.staff_name}
                      {fitNoteAlertNeeded && (
                        <div className="flex items-center gap-1 text-[10px] text-red-600 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Fit note required
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lt?.color || ""}`}>{lt?.label}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{req.date_from} – {req.date_to}</td>
                    <td className="px-4 py-3 text-center">{req.days_requested}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`text-xs ${STATUS_COLORS[req.status]}`}>{req.status}</Badge>
                    </td>
                    {(isAdmin || isTL) && (
                      <td className="px-4 py-3 text-center">
                        {req.status === "approved" && req.leave_type === "sick_leave" && (
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => setRtwModal(req)}>
                              RTW
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => setExpandedSelfCert(expandedSelfCert === req.id ? null : req.id)}>
                              <FileText className="w-3 h-3" /> Cert
                            </Button>
                          </div>
                        )}
                        {req.status === "pending" && (
                          rejectingId === req.id ? (
                            <div className="flex items-center gap-1">
                              <Input className="h-6 text-xs w-28" placeholder="Reason…" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                              <Button size="sm" className="h-6 text-xs" variant="destructive"
                                onClick={() => reviewLeave.mutate({ id: req.id, status: "rejected", reason: rejectReason })}>
                                Confirm
                              </Button>
                              <button onClick={() => setRejectingId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3 h-3" /></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs text-green-600"
                                disabled={reviewLeave.isPending}
                                onClick={() => {
                                  const clash = checkClash(req);
                                  if (clash) {
                                    setClashWarning({ id: req.id, ...clash });
                                  } else {
                                    reviewLeave.mutate({ id: req.id, status: "approved" });
                                  }
                                }}>Approve</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600"
                                disabled={reviewLeave.isPending}
                                onClick={() => setRejectingId(req.id)}>Reject</Button>
                            </div>
                          )
                        )}
                      </td>
                    )}
                  </tr>
                  {/* SSP breakdown row for approved sick leave */}
                  {req.status === "approved" && req.leave_type === "sick_leave" && sspResult && (
                    <tr key={`${req.id}-ssp`} className="bg-blue-50/30">
                      <td colSpan={6} className="px-4 pb-3">
                        <SSPBreakdownPanel
                          result={sspResult}
                          staffName={req.staff_name}
                          dateFrom={req.date_from}
                          dateTo={req.date_to}
                        />
                      </td>
                    </tr>
                  )}
                  {/* Self-cert / Fit note row */}
                  {expandedSelfCert === req.id && (
                    <tr key={`${req.id}-cert`} className="bg-muted/10">
                      <td colSpan={6} className="px-4 pb-3">
                        <SelfCertForm
                          leaveRequest={req}
                          isAdmin={isAdmin}
                          onSave={(data) => updateSelfCert.mutate({ id: req.id, data })}
                        />
                      </td>
                    </tr>
                  )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "balances" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff Member</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Entitlement</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Taken</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Remaining</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Sick Occurrences</th>
              </tr>
            </thead>
            <tbody>
              {staff.filter(s => s.status === "active").map(s => {
                const bal = balances.find(b => b.staff_id === s.id && b.year === new Date().getFullYear());
                const entitlement = bal?.annual_entitlement ?? defaultEntitlement;
                const taken = bal?.days_taken ?? 0;
                const remaining = bal?.days_remaining ?? entitlement;
                const sick = bal?.sick_occurrences ?? 0;
                return (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{s.full_name}</td>
                    <td className="px-4 py-3 text-right">{entitlement} days</td>
                    <td className="px-4 py-3 text-right">{taken} days</td>
                    <td className="px-4 py-3 text-right">
                      <span className={remaining <= 5 ? "text-red-500 font-medium" : ""}>{remaining} days</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={sick >= 3 ? "text-red-600 font-semibold" : ""}>{sick}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "calendar" && (
        <LeaveCalendar
          leaveRequests={leaveRequests}
          staff={staff}
          homes={homes}
          org={org}
          onClickDay={(dateStr) => { setPrefillDate(dateStr); setShowForm(true); }}
          onClickLeave={(req) => {
            const lt = LEAVE_TYPES.find(t => t.value === req.leave_type);
            toast.info(`${req.staff_name} — ${lt?.label || req.leave_type} (${req.date_from} to ${req.date_to})`);
          }}
        />
      )}

      {showForm && (
        <RequestForm
          staff={isAdmin || isTL ? staff.filter(s => s.status === "active") : [myProfile].filter(Boolean)}
          myProfile={myProfile}
          prefillDate={prefillDate}
          onClose={() => { setShowForm(false); setPrefillDate(""); }}
          onSubmit={(data) => submitLeave.mutate(data)}
        />
      )}

      {/* RTW Modal */}
      {rtwModal && (
        <ReturnToWorkModal
          leaveRequest={rtwModal}
          staffMember={staff.find(s => s.id === rtwModal.staff_id)}
          conductedBy={staffProfile?.full_name}
          onClose={() => setRtwModal(null)}
        />
      )}

      {/* Clash warning modal */}
      {clashWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Staffing Clash Warning</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Approving this will leave <strong>{clashWarning.homeName}</strong> below minimum staffing.
                  There are already {clashWarning.clashCount} staff off on overlapping days
                  (max allowed: {maxStaffOff}).
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setClashWarning(null)}>Cancel</Button>
              <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                onClick={() => { reviewLeave.mutate({ id: clashWarning.id, status: "approved" }); setClashWarning(null); }}>
                Approve Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}