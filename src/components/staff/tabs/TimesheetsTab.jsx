import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Plus, FileText, AlertTriangle, X, Printer, ChevronRight, Zap, Info, Mail } from "lucide-react";
import { format, startOfMonth, endOfMonth, parseISO, eachDayOfInterval } from "date-fns";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { logAudit } from "@/lib/logAudit";
import PayslipDocument from "../payroll/PayslipDocument";
import PayslipModal from "../payroll/PayslipModal";
import HMRCExport from "../payroll/HMRCExport";
import PayslipEmailModal from "../payroll/PayslipEmailModal";
import BulkEmailModal from "../payroll/BulkEmailModal";
import { base44 } from "@/api/base44Client";
import TimesheetCalendarPanel from "../TimesheetCalendarPanel.jsx";

const STATUS_COLORS = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-600",
  approved: "bg-green-100 text-green-600",
  paid: "bg-purple-100 text-purple-600",
};

function PayslipViewModal({ payslip, orgName, user, onClose }) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    // GDPR access log
    import("@/lib/logAudit").then(({ logAudit }) => logAudit({
      entity_name: "Payslip", entity_id: payslip.id, action: "view",
      changed_by: user?.id, changed_by_name: user?.full_name || "",
      old_values: null,
      new_values: { event: "print", pay_period_label: payslip.pay_period_label, staff_name: payslip.staff_name },
      org_id: payslip.org_id,
      description: `Payslip printed for ${payslip.staff_name} (${payslip.pay_period_label})`,
      retention_category: "payroll",
    })).catch(() => {});
    const el = document.getElementById("payslip-print-area");
    printWindow.document.write(`<html><head><title>Payslip - ${payslip.staff_name}</title>
      <style>body{margin:20px;font-family:Arial,sans-serif;}</style></head>
      <body>${el.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-base">Payslip — {payslip.pay_period_label}</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5"><Printer className="w-4 h-4" /> Print</Button>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="p-6" id="payslip-print-area">
          <PayslipDocument payslip={payslip} orgName={orgName} />
        </div>
      </div>
    </div>
  );
}

function TimesheetDetailPanel({ timesheet, shifts, attendanceLogs, staff, org, onClose, onUpdate }) {
  const hrPolicy = org?.hr_policy || {};
  const staffMember = staff.find(s => s.id === timesheet.staff_id);
  const otThreshold = hrPolicy.overtime_threshold_hours || 37.5;
  const otMultiplier = hrPolicy.overtime_rate_multiplier || 1.5;
  const sleepInAllowance = hrPolicy.sleep_in_allowance || 50;
  const onCallAllowance = hrPolicy.on_call_allowance || 25;
  const hourlyRate = staffMember?.hourly_rate || 0;

  // Build day rows from period dates
  const days = eachDayOfInterval({
    start: parseISO(timesheet.period_start),
    end: parseISO(timesheet.period_end),
  });

  const totalActual = days.reduce((sum, d) => {
    const ds = format(d, "yyyy-MM-dd");
    const log = attendanceLogs.find(l => l.staff_id === timesheet.staff_id && l.clock_in_time?.startsWith(ds));
    return sum + (log?.total_hours || 0);
  }, 0);

  const otHours = Math.max(0, totalActual - otThreshold);
  const regularHours = totalActual - otHours;
  const regularPay = regularHours * hourlyRate;
  const otPay = otHours * hourlyRate * otMultiplier;
  const grossPay = parseFloat((regularPay + otPay).toFixed(2));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div className="bg-card w-full max-w-2xl h-full overflow-y-auto shadow-2xl border-l border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-bold">{timesheet.staff_name}</h2>
            <p className="text-xs text-muted-foreground">{timesheet.pay_period_label} · {timesheet.period_start} – {timesheet.period_end}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Day-by-day table */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-2 font-medium">Date</th>
                  <th className="text-left px-3 py-2 font-medium">Shift</th>
                  <th className="text-right px-3 py-2 font-medium">Scheduled</th>
                  <th className="text-right px-3 py-2 font-medium">Actual</th>
                  <th className="text-right px-3 py-2 font-medium">OT</th>
                </tr>
              </thead>
              <tbody>
                {days.map(d => {
                  const ds = format(d, "yyyy-MM-dd");
                  const shift = shifts.find(s => s.staff_id === timesheet.staff_id && s.date === ds);
                  const log = attendanceLogs.find(l => l.staff_id === timesheet.staff_id && l.clock_in_time?.startsWith(ds));
                  const actual = log?.total_hours || 0;
                  const scheduled = shift ? (shift.duration_hours || 0) : 0;
                  const ot = Math.max(0, actual - scheduled);
                  const isSleepIn = shift?.shift_type === "sleeping";
                  const isOnCall = shift?.shift_type === "on_call";
                  return (
                    <tr key={ds} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                      <td className="px-3 py-2">{format(d, "EEE d MMM")}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {shift ? (
                          <span className="capitalize">{shift.shift_type}
                            {isSleepIn && <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1 rounded">+£{sleepInAllowance}</span>}
                            {isOnCall && <span className="ml-1 text-[10px] bg-blue-100 text-blue-700 px-1 rounded">+£{onCallAllowance}</span>}
                          </span>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-3 py-2 text-right">{scheduled > 0 ? `${scheduled}h` : "—"}</td>
                      <td className="px-3 py-2 text-right">{actual > 0 ? `${actual.toFixed(2)}h` : "—"}</td>
                      <td className="px-3 py-2 text-right">{ot > 0 ? <span className="text-amber-600 font-medium">{ot.toFixed(2)}h</span> : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pay summary */}
          <div className="bg-muted/20 rounded-xl p-4 space-y-2 text-sm">
            <p className="font-semibold mb-3">Pay Summary</p>
            <div className="flex justify-between"><span className="text-muted-foreground">Regular Hours</span><span>{regularHours.toFixed(2)}h × £{hourlyRate}/hr</span><span className="font-medium">£{regularPay.toFixed(2)}</span></div>
            {otHours > 0 && <div className="flex justify-between text-amber-600"><span>Overtime ({otHours.toFixed(2)}h × {otMultiplier}x)</span><span></span><span className="font-medium">£{otPay.toFixed(2)}</span></div>}
            {/* Sleep-in / on-call */}
            {shifts.filter(s => s.staff_id === timesheet.staff_id && s.shift_type === "sleeping" &&
              s.date >= timesheet.period_start && s.date <= timesheet.period_end).map(s => (
              <div key={s.id} className="flex justify-between text-purple-600">
                <span>Sleep-in ({s.date})</span><span></span><span className="font-medium">£{sleepInAllowance.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold border-t border-border pt-2 mt-2">
              <span>Gross Pay</span><span></span><span>£{grossPay.toFixed(2)}</span>
            </div>
            {hourlyRate === 0 && (
              <p className="text-xs text-amber-600">⚠️ No hourly rate set on staff profile — gross pay is £0</p>
            )}
          </div>

          {/* Sync button */}
          {timesheet.status === "draft" && (
            <Button
              className="w-full gap-2"
              onClick={() => onUpdate(timesheet.id, {
                total_actual_hours: parseFloat(totalActual.toFixed(2)),
                total_overtime_hours: parseFloat(otHours.toFixed(2)),
                gross_pay: grossPay,
                status: "submitted",
              })}
            >
              <Zap className="w-4 h-4" /> Sync & Submit Timesheet
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TimesheetsTab({ user, staff = [], homes = [], staffProfile }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "admin_officer";
  const isTL = user?.role === "team_leader";
  const isSW = !isAdmin && !isTL;

  const myProfile = staffProfile || staff.find(s => s.email === user?.email);

  const visibleStaffIds = (() => {
    if (isAdmin) return null;
    if (isTL && myProfile) {
      const tlId = myProfile.id;
      const tlHomes = myProfile.home_ids || [];
      return new Set(
        staff.filter(s => s.id === tlId || s.team_leader_id === tlId || (s.home_ids || []).some(h => tlHomes.includes(h))).map(s => s.id)
      );
    }
    return myProfile ? new Set([myProfile.id]) : new Set();
  })();

  const [selectedStaffId, setSelectedStaffId] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("");
  const [showPayslipForm, setShowPayslipForm] = useState(null);
  const [viewPayslip, setViewPayslip] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [activeTab, setActiveTab] = useState("timesheets");
  const [generating, setGenerating] = useState(false);
  const [emailModal, setEmailModal] = useState(null); // { payslip, staffEmail }
  const [bulkEmailModal, setBulkEmailModal] = useState(null); // period label
  const [resendingId, setResendingId] = useState(null);

  const { data: org = null } = useQuery({
    queryKey: ["organisation"],
    queryFn: () => secureGateway.filter("Organisation"),
    select: d => d?.[0] || null,
    staleTime: 10 * 60 * 1000,
  });
  const orgName = org?.name || org?.app_name || "CareCore AI";

  const { data: timesheets = [] } = useQuery({
    queryKey: ["timesheets"],
    queryFn: () => secureGateway.filter("Timesheet"),
    staleTime: 0,
  });
  const { data: payPeriods = [] } = useQuery({
    queryKey: ["pay-periods"],
    queryFn: () => secureGateway.filter("PayPeriod"),
    staleTime: 0,
  });
  const { data: payslips = [] } = useQuery({
    queryKey: ["payslips"],
    queryFn: () => secureGateway.filter("Payslip"),
    staleTime: 0,
  });
  const { data: attendanceLogs = [] } = useQuery({
    queryKey: ["attendance-logs-payroll"],
    queryFn: () => secureGateway.filter("AttendanceLog"),
    staleTime: 60000,
  });
  const { data: allShifts = [] } = useQuery({
    queryKey: ["all-shifts-payroll"],
    queryFn: () => secureGateway.filter("Shift"),
    staleTime: 60000,
  });

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["leave-requests-ssp"],
    queryFn: () => secureGateway.filter("LeaveRequest", { leave_type: "sick_leave" }),
    staleTime: 60000,
  });

  const approveTimesheet = useMutation({
    mutationFn: async (ts) => {
      await secureGateway.update("Timesheet", ts.id, {
        status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      });
      await logAudit({
        entity_name: "Timesheet", entity_id: ts.id, action: "update",
        changed_by: user?.id, changed_by_name: user?.full_name || "",
        old_values: { status: ts.status },
        new_values: { status: "approved", approved_by: user?.full_name, gross_pay: ts.gross_pay },
        org_id: ORG_ID,
        description: `Timesheet approved for ${ts.staff_name} (${ts.pay_period_label}), gross: £${(ts.gross_pay || 0).toFixed(2)}`,
        retention_category: "payroll",
      });
      const staffMember = staff.find(s => s.id === ts.staff_id);
      const homeId = staffMember?.home_ids?.[0] || ts.home_id;
      if (homeId) {
        await secureGateway.create("HomeExpense", {
          home_id: homeId,
          expense_type: "staff_expense",
          amount: ts.gross_pay || 0,
          date: ts.period_end || new Date().toISOString().split("T")[0],
          description: `${ts.staff_name} (${staffMember?.employee_id || ""}) — ${ts.pay_period_label}`,
          claimed_by: ts.staff_id,
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Timesheet approved & Finance updated");
    },
  });

  const updateTimesheet = useMutation({
    mutationFn: ({ id, data }) => secureGateway.update("Timesheet", id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      setViewDetail(null);
      toast.success("Timesheet updated");
    },
  });

  const generatePayslip = useMutation({
    mutationFn: async ({ ts, ni, tax, pension, net, ssp_amount, employer_ni, employer_pension, total_employer_cost, tax_code, expenses = [], total_expenses = 0, overrides }) => {
      const staffMember = staff.find(s => s.id === ts.staff_id);
      // Build expense lines for payslip document
      const expenseLines = expenses.map(e => ({
        expense_date: e.expense_date,
        description: e.description,
        amount: e.amount,
        category: e.category,
      }));
      const created = await secureGateway.create("Payslip", {
        org_id: ORG_ID,
        staff_id: ts.staff_id,
        staff_name: ts.staff_name,
        employee_id: staffMember?.employee_id || "",
        home_id: ts.home_id,
        timesheet_id: ts.id,
        pay_period_label: ts.pay_period_label,
        period_start: ts.period_start,
        period_end: ts.period_end,
        gross_pay: ts.gross_pay || 0,
        ni_deduction: ni,
        tax_deduction: tax,
        pension_deduction: pension,
        net_pay: net,
        ssp_amount: ssp_amount || 0,
        employer_name: orgName,
        generated_at: new Date().toISOString(),
        generated_by: user?.id,
        tax_code,
        employer_ni,
        employer_pension,
        total_employer_cost,
        ni_number: staffMember?.ni_number || "",
        expense_lines: expenseLines,
        total_expenses: total_expenses,
      });
      await secureGateway.update("Timesheet", ts.id, { status: "paid" });

      // Mark approved expenses as paid and link to payslip
      for (const exp of expenses) {
        await secureGateway.update("StaffExpense", exp.id, {
          status: "paid",
          payslip_id: created?.id,
          reviewed_at: new Date().toISOString(),
        });
        // Create HomeExpense for finance module
        if (exp.home_id) {
          await secureGateway.create("HomeExpense", {
            org_id: ORG_ID,
            home_id: exp.home_id,
            expense_type: "staff_expense",
            amount: exp.amount || 0,
            date: exp.expense_date,
            description: `${exp.staff_name} — ${exp.category}: ${exp.description}`,
            claimed_by: exp.staff_id,
            status: "approved",
            approved_by: user?.id,
            approved_at: new Date().toISOString(),
          });
        }
      }

      await logAudit({
        entity_name: "Payslip", entity_id: created?.id, action: "create",
        changed_by: user?.id, changed_by_name: user?.full_name || "",
        old_values: null,
        new_values: { staff_name: ts.staff_name, pay_period_label: ts.pay_period_label, gross_pay: ts.gross_pay, net_pay: net, generated_by: user?.full_name },
        org_id: ORG_ID,
        description: `Payslip generated for ${ts.staff_name} (${ts.pay_period_label}), gross: £${(ts.gross_pay || 0).toFixed(2)}, net: £${net.toFixed(2)}`,
        retention_category: "payroll",
      });
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      setShowPayslipForm(null);
      // Show email confirmation modal
      const staffMember = staff.find(s => s.id === created?.staff_id);
      setEmailModal({ payslip: created, staffEmail: staffMember?.email || "" });
      setActiveTab("payslips");
    },
  });

  const handleResend = async (ps) => {
    const staffMember = staff.find(s => s.id === ps.staff_id);
    const email = staffMember?.email;
    if (!email) { toast.error("No email address for this staff member"); return; }
    setResendingId(ps.id);
    try {
      await base44.functions.invoke("sendPayslipEmail", {
        payslip_id: ps.id,
        staff_email: email,
        staff_name: staffMember?.full_name || ps.staff_name,
        org_name: org?.name || "CareCore AI",
        org_contact_email: org?.contact_email || "",
      });
      queryClient.invalidateQueries({ queryKey: ["payslips"] });
      toast.success(`Payslip resent to ${email}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to resend payslip");
    }
    setResendingId(null);
  };

  const createPayPeriod = async () => {
    const now = new Date();
    const label = format(now, "MMMM yyyy");
    if (payPeriods.find(p => p.label === label)) { toast.error(`Pay period "${label}" already exists`); return; }
    await secureGateway.create("PayPeriod", {
      org_id: ORG_ID,
      label,
      period_start: format(startOfMonth(now), "yyyy-MM-dd"),
      period_end: format(endOfMonth(now), "yyyy-MM-dd"),
      frequency: "monthly",
      status: "open",
    });
    queryClient.invalidateQueries({ queryKey: ["pay-periods"] });
    toast.success(`Pay period "${label}" created`);
  };

  const generateTimesheets = async () => {
    const period = payPeriods.find(p => p.id === selectedPeriod);
    if (!period) { toast.error("Select a pay period first"); return; }
    const activeStaff = staff.filter(s => s.status === "active");
    setGenerating(true);
    let created = 0;
    for (const s of activeStaff) {
      // Skip if already exists
      const exists = timesheets.find(t => t.staff_id === s.id && t.pay_period_id === period.id);
      if (exists) continue;

      // Pre-calculate hours from AttendanceLog
      const logs = attendanceLogs.filter(l =>
        l.staff_id === s.id &&
        l.clock_in_time >= period.period_start &&
        l.clock_in_time <= period.period_end + "T23:59:59"
      );
      const totalHours = parseFloat(logs.reduce((sum, l) => sum + (l.total_hours || 0), 0).toFixed(2));
      const otThreshold = org?.hr_policy?.overtime_threshold_hours || 37.5;
      const otHours = parseFloat(Math.max(0, totalHours - otThreshold).toFixed(2));
      const rate = s.hourly_rate || 0;
      const otRate = (org?.hr_policy?.overtime_rate_multiplier || 1.5);
      const gross = parseFloat(((totalHours - otHours) * rate + otHours * rate * otRate).toFixed(2));

      await secureGateway.create("Timesheet", {
        org_id: ORG_ID,
        staff_id: s.id,
        staff_name: s.full_name,
        home_id: s.home_ids?.[0] || "",
        pay_period_id: period.id,
        pay_period_label: period.label,
        period_start: period.period_start,
        period_end: period.period_end,
        total_scheduled_hours: 0,
        total_actual_hours: totalHours,
        total_overtime_hours: otHours,
        hourly_rate: rate,
        gross_pay: gross,
        overtime_pay: parseFloat((otHours * rate * otRate).toFixed(2)),
        status: "draft",
      });
      created++;
    }
    queryClient.invalidateQueries({ queryKey: ["timesheets"] });
    setGenerating(false);
    toast.success(`Generated ${created} timesheets for ${period.label}`);
  };

  const scopedStaff = isAdmin ? staff : staff.filter(s => visibleStaffIds?.has(s.id));
  let filtered = visibleStaffIds === null ? timesheets : timesheets.filter(t => visibleStaffIds.has(t.staff_id));
  if (selectedStaffId !== "all") filtered = filtered.filter(t => t.staff_id === selectedStaffId);
  if (selectedPeriod) filtered = filtered.filter(t => t.pay_period_id === selectedPeriod);

  let filteredPayslips = visibleStaffIds === null ? payslips : payslips.filter(p => visibleStaffIds.has(p.staff_id));
  if (selectedStaffId !== "all") filteredPayslips = filteredPayslips.filter(p => p.staff_id === selectedStaffId);
  if (selectedPeriod) {
    const period = payPeriods.find(p => p.id === selectedPeriod);
    if (period) filteredPayslips = filteredPayslips.filter(p => p.pay_period_label === period.label);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold flex-1">Timesheets & Payroll</h2>
        {!isSW && (
          <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="All Staff" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Staff</SelectItem>
              {scopedStaff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Periods" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All Periods</SelectItem>
            {payPeriods.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && (
          <>
            <Button size="sm" variant="outline" onClick={createPayPeriod} className="gap-1"><Plus className="w-3.5 h-3.5" /> New Period</Button>
            <Button size="sm" onClick={generateTimesheets} disabled={!selectedPeriod || generating} className="gap-1">
              <Zap className="w-3.5 h-3.5" /> {generating ? "Generating…" : "Generate Timesheets"}
            </Button>
          </>
        )}
      </div>

      {payPeriods.length === 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          No pay periods yet. Click "New Period" to create one, then "Generate Timesheets".
        </div>
      )}

      {/* Sub tabs */}
      <div className="flex gap-0 border-b border-border">
        {["timesheets", "payslips", "ssp"].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors capitalize ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t === "timesheets" ? `Timesheets (${filtered.length})` : t === "payslips" ? `Payslips (${filteredPayslips.length})` : "SSP Records"}
          </button>
        ))}
      </div>

      {/* Timesheets */}
      {activeTab === "timesheets" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff Member</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Period</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Hours</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">OT Hours</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Gross Pay</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  {selectedPeriod ? "No timesheets for this period. Click 'Generate Timesheets'." : "No timesheets found."}
                </td></tr>
              ) : filtered.map(ts => {
                const hasPayslip = payslips.some(p => p.timesheet_id === ts.id);
                const staffMember = staff.find(s => s.id === ts.staff_id);
                return (
                  <tr key={ts.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => setViewDetail(ts)}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{ts.staff_name}</div>
                      {staffMember?.employee_id && <div className="text-[10px] font-mono text-muted-foreground">{staffMember.employee_id}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{ts.pay_period_label}</td>
                    <td className="px-4 py-3 text-right text-xs">{(ts.total_actual_hours || 0).toFixed(2)}h</td>
                    <td className="px-4 py-3 text-right text-xs">
                      {(ts.total_overtime_hours || 0) > 0
                        ? <span className="text-amber-600 font-medium">{ts.total_overtime_hours.toFixed(2)}h</span>
                        : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">£{(ts.gross_pay || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`text-xs ${STATUS_COLORS[ts.status]}`}>{ts.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {isAdmin && ts.status === "submitted" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            onClick={() => approveTimesheet.mutate(ts)}>
                            <CheckCircle className="w-3 h-3" /> Approve
                          </Button>
                        )}
                        {isAdmin && ts.status === "approved" && !hasPayslip && (
                          <Button size="sm" className="h-7 text-xs gap-1"
                            onClick={() => setShowPayslipForm(ts)}>
                            <FileText className="w-3 h-3" /> Payslip
                          </Button>
                        )}

                        {hasPayslip && (
                          <button className="text-xs text-green-600 flex items-center gap-1 hover:underline"
                            onClick={() => { const ps = payslips.find(p => p.timesheet_id === ts.id); if (ps) { setViewPayslip(ps); setActiveTab("payslips"); } }}>
                            <CheckCircle className="w-3 h-3" /> Payslip
                          </button>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Payslips */}
      {activeTab === "payslips" && isAdmin && filteredPayslips.length > 0 && (
        <div className="flex justify-end">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
            const period = payPeriods.find(p => p.id === selectedPeriod);
            setBulkEmailModal({ payslips: filteredPayslips, periodLabel: period?.label || "selected period" });
          }}>
            <Mail className="w-3.5 h-3.5" /> Email All Payslips
          </Button>
        </div>
      )}
      {activeTab === "payslips" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff Member</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Pay Period</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Gross Pay</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Deductions</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Net Pay</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Employer Cost</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Emailed</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">View</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayslips.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-muted-foreground text-xs">No payslips found.</td></tr>
              ) : filteredPayslips.map(ps => {
                const totalDed = (ps.ni_deduction || 0) + (ps.tax_deduction || 0) + (ps.pension_deduction || 0);
                const staffMember = staff.find(s => s.id === ps.staff_id);
                return (
                  <tr key={ps.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{ps.staff_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{ps.pay_period_label}</td>
                    <td className="px-4 py-3 text-right">£{(ps.gross_pay || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-red-600">-£{totalDed.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">£{(ps.net_pay || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {ps.total_employer_cost ? `£${ps.total_employer_cost.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {ps.emailed_at ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {format(new Date(ps.emailed_at), "dd MMM")}
                          </span>
                          {isAdmin && (
                            <button
                              className="text-[10px] text-primary hover:underline"
                              disabled={resendingId === ps.id}
                              onClick={() => handleResend(ps)}
                            >
                              {resendingId === ps.id ? "Sending…" : "Resend"}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs text-muted-foreground">Not Sent</span>
                          {isAdmin && (
                            <button
                              className="text-[10px] text-primary hover:underline"
                              disabled={resendingId === ps.id}
                              onClick={() => handleResend(ps)}
                            >
                              {resendingId === ps.id ? "Sending…" : "Send"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setViewPayslip(ps)}>
                        <FileText className="w-3 h-3" /> View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SSP Records Tab */}
      {activeTab === "ssp" && (() => {
        const sspRecords = leaveRequests.filter(r => r.ssp_calculated_at);
        const eligibleRecords = sspRecords.filter(r => r.ssp_eligible);
        const totalSSPPaid = eligibleRecords.reduce((sum, r) => sum + (r.ssp_amount || 0), 0);
        // Small Employers Relief: total employer NI < £45,000/year
        const totalEmployerNI = payslips.reduce((sum, p) => {
          const gross = p.gross_pay || 0;
          const ni = gross > 96.15 ? (gross - 96.15) * 0.138 : 0;
          return sum + ni;
        }, 0);
        const smallEmployerRelief = totalEmployerNI < 45000;

        return (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">Total SSP Paid (YTD)</p>
                <p className="text-2xl font-bold text-blue-600">£{totalSSPPaid.toFixed(2)}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">SSP Records</p>
                <p className="text-2xl font-bold">{sspRecords.length}</p>
              </div>
              <div className={`rounded-xl border p-4 ${smallEmployerRelief ? "bg-green-50 border-green-200" : "bg-card border-border"}`}>
                <p className="text-xs text-muted-foreground">Small Employers Relief</p>
                <p className={`text-sm font-bold mt-1 ${smallEmployerRelief ? "text-green-700" : "text-muted-foreground"}`}>
                  {smallEmployerRelief ? "✓ Eligible — reclaim 103% of SSP from HMRC" : "Not eligible (NI > £45k/yr)"}
                </p>
              </div>
            </div>

            {smallEmployerRelief && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-xs">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong>Small Employers Relief:</strong> Your annual NI bill is under £45,000. You can reclaim 103% of SSP paid from HMRC via your EPS submission. Total to reclaim: <strong>£{(totalSSPPaid * 1.03).toFixed(2)}</strong></span>
              </div>
            )}

            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff Member</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Sick Period</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Qualifying Days</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Waiting Days</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">SSP Amount</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sspRecords.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-xs">No SSP records yet. SSP is calculated automatically when sick leave is approved.</td></tr>
                  ) : sspRecords.map(r => {
                    const hasPayslip = payslips.some(p => {
                      const ps = p.period_start && p.period_end;
                      return ps && r.date_from >= p.period_start && r.date_from <= p.period_end && p.staff_id === r.staff_id;
                    });
                    const statusLabel = !r.ssp_eligible ? "Not Eligible" : hasPayslip ? "Included" : "Pending";
                    const statusClass = !r.ssp_eligible
                      ? "bg-gray-100 text-gray-600"
                      : hasPayslip
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700";
                    return (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{r.staff_name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.date_from} – {r.date_to}</td>
                        <td className="px-4 py-3 text-center text-xs">{r.ssp_qualifying_days ?? "—"}</td>
                        <td className="px-4 py-3 text-center text-xs">{r.ssp_waiting_days ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-medium">
                          {r.ssp_eligible ? `£${(r.ssp_amount || 0).toFixed(2)}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>{statusLabel}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* HMRC RTI Submissions — admin only */}
      {isAdmin && activeTab === "payslips" && (
        <HMRCExport
          user={user}
          payPeriods={payPeriods}
          payslips={payslips}
          staff={staff}
        />
      )}

      {/* Modals */}
      {showPayslipForm && (
        <PayslipModal
          timesheet={showPayslipForm}
          staffMember={staff.find(s => s.id === showPayslipForm.staff_id)}
          org={org}
          onClose={() => setShowPayslipForm(null)}
          onGenerate={(figures) => generatePayslip.mutate({ ts: showPayslipForm, ...figures, expenses: figures.expenses || [], total_expenses: figures.total_expenses || 0 })}
        />
      )}
      {viewPayslip && (
        <PayslipViewModal
          payslip={viewPayslip}
          orgName={orgName}
          user={user}
          onClose={() => setViewPayslip(null)}
        />
      )}
      {emailModal && (
        <PayslipEmailModal
          payslip={emailModal.payslip}
          staffEmail={emailModal.staffEmail}
          staffName={staff.find(s => s.id === emailModal.payslip?.staff_id)?.full_name || emailModal.payslip?.staff_name}
          org={org}
          onClose={() => { setEmailModal(null); setViewPayslip(emailModal.payslip); }}
          onEmailSent={() => queryClient.invalidateQueries({ queryKey: ["payslips"] })}
        />
      )}
      {bulkEmailModal && (
        <BulkEmailModal
          payslips={bulkEmailModal.payslips}
          staff={staff}
          org={org}
          periodLabel={bulkEmailModal.periodLabel}
          onClose={() => setBulkEmailModal(null)}
          onComplete={() => queryClient.invalidateQueries({ queryKey: ["payslips"] })}
        />
      )}
      {viewDetail && (
        <TimesheetCalendarPanel
          timesheet={viewDetail}
          attendanceLogs={attendanceLogs}
          onClose={() => setViewDetail(null)}
        />
      )}
    </div>
  );
}