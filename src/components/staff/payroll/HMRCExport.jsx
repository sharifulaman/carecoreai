import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileDown, AlertTriangle, CheckCircle, Clock, Info, ShieldAlert } from "lucide-react";
import { logAudit } from "@/lib/logAudit";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────
function getTaxYear(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return month >= 4 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
}

function getMonthPeriodNumber(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const month = d.getMonth() + 1;
  return ((month - 4 + 12) % 12) + 1;
}

function calcEmployerNI(grossPay) {
  const secondaryThreshold = 758;
  const employerRate = 0.138;
  if (grossPay <= secondaryThreshold) return 0;
  return parseFloat(((grossPay - secondaryThreshold) * employerRate).toFixed(2));
}

function genderCode(gender) {
  if (!gender) return "N";
  const g = gender.toLowerCase();
  if (g === "male" || g === "m") return "M";
  if (g === "female" || g === "f") return "F";
  return "N";
}

function firstName(fullName) {
  if (!fullName) return "";
  return fullName.split(" ")[0];
}

function lastName(fullName) {
  if (!fullName) return "";
  const parts = fullName.split(" ");
  return parts.slice(1).join(" ") || parts[0];
}

function freqCode(frequency) {
  const map = { monthly: "M1", weekly: "W1", fortnightly: "F" };
  return map[frequency] || "M1";
}

// ─── FPS XML Generator ────────────────────────────────────
function generateFPSXml(org, payPeriod, payslips, staffMap) {
  const payeRef = org.paye_reference || "";
  const [taxOfficeNum, taxOfficeRef] = payeRef.includes("/")
    ? payeRef.split("/")
    : [payeRef, ""];
  const accountsOfficeRef = org.accounts_office_ref || "";
  const periodEnd = payPeriod.period_end;
  const taxYear = getTaxYear(periodEnd);
  const periodNum = getMonthPeriodNumber(periodEnd);
  const frequency = payPeriod.frequency || "monthly";

  const employeeBlocks = payslips.map(ps => {
    const sp = staffMap[ps.staff_id] || {};
    const taxablePay = parseFloat(((ps.gross_pay || 0) - (ps.pension_deduction || 0)).toFixed(2));
    const employerNI = calcEmployerNI(ps.gross_pay || 0);
    const niCat = sp.ni_category || "A";

    return `        <Employee>
          <EmployeeDetails>
            <NiNumber>${sp.ni_number || ""}</NiNumber>
            <Name>
              <Forename>${firstName(ps.staff_name)}</Forename>
              <Surname>${lastName(ps.staff_name)}</Surname>
            </Name>
            <BirthDate>${sp.dob || ""}</BirthDate>
            <Gender>${genderCode(sp.gender)}</Gender>
            <PayId>${ps.employee_id || sp.employee_id || ""}</PayId>
          </EmployeeDetails>
          <Employment>
            <StartDate>${sp.start_date || ""}</StartDate>
            <PayFreq>${freqCode(frequency)}</PayFreq>
            <MonthlyPeriodNumber>${periodNum}</MonthlyPeriodNumber>
            <TaxCode>${sp.tax_code || "1257L"}</TaxCode>
            <TaxablePay>${taxablePay.toFixed(2)}</TaxablePay>
            <TaxDeducted>${(ps.tax_deduction || 0).toFixed(2)}</TaxDeducted>
            <NICable>
              <NIcat>${niCat}</NIcat>
              <GrossEarningsForNICsInPeriod>${(ps.gross_pay || 0).toFixed(2)}</GrossEarningsForNICsInPeriod>
              <EmployeeContributionsInPeriod>${(ps.ni_deduction || 0).toFixed(2)}</EmployeeContributionsInPeriod>
              <EmployerContributionsInPeriod>${employerNI.toFixed(2)}</EmployerContributionsInPeriod>
            </NICable>
            <GrossPay>${(ps.gross_pay || 0).toFixed(2)}</GrossPay>
            <NetPay>${(ps.net_pay || 0).toFixed(2)}</NetPay>
            ${(ps.ssp_amount || 0) > 0 ? `<StatutorySickPay>${(ps.ssp_amount || 0).toFixed(2)}</StatutorySickPay>` : ""}
            <PaymentDate>${periodEnd}</PaymentDate>
            <PaymentMethod>BACS</PaymentMethod>
          </Employment>
        </Employee>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage>
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-FPS</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
    </MessageDetails>
  </Header>
  <Body>
    <IRenvelope>
      <IRheader>
        <Keys>
          <Key Type="TaxOfficeNumber">${taxOfficeNum}</Key>
          <Key Type="TaxOfficeReference">${taxOfficeRef}</Key>
        </Keys>
        <PeriodEnd>${periodEnd}</PeriodEnd>
        <DefaultCurrency>GBP</DefaultCurrency>
      </IRheader>
      <FPS>
        <EmployerDetails>
          <AccountsOfficeRef>${accountsOfficeRef}</AccountsOfficeRef>
          <TaxOfficeNum>${taxOfficeNum}</TaxOfficeNum>
          <TaxOfficeRef>${taxOfficeRef}</TaxOfficeRef>
          <TaxYear>${taxYear}</TaxYear>
          <EmployerName>${org.name || ""}</EmployerName>
        </EmployerDetails>
${employeeBlocks}
      </FPS>
    </IRenvelope>
  </Body>
</GovTalkMessage>`;
}

// ─── EPS XML Generator ────────────────────────────────────
function generateEPSXml(org, payPeriod, periodPayslips = []) {
  const totalSSP = periodPayslips.reduce((sum, p) => sum + (p.ssp_amount || 0), 0);
  const smallEmployerRelief = true;
  const payeRef = org.paye_reference || "";
  const [taxOfficeNum, taxOfficeRef] = payeRef.includes("/")
    ? payeRef.split("/")
    : [payeRef, ""];
  const accountsOfficeRef = org.accounts_office_ref || "";
  const periodEnd = payPeriod.period_end;
  const taxYear = getTaxYear(periodEnd);
  const periodNum = getMonthPeriodNumber(periodEnd);

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage>
  <Header>
    <MessageDetails>
      <Class>HMRC-PAYE-RTI-EPS</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
    </MessageDetails>
  </Header>
  <Body>
    <IRenvelope>
      <IRheader>
        <Keys>
          <Key Type="TaxOfficeNumber">${taxOfficeNum}</Key>
          <Key Type="TaxOfficeReference">${taxOfficeRef}</Key>
        </Keys>
        <PeriodEnd>${periodEnd}</PeriodEnd>
        <DefaultCurrency>GBP</DefaultCurrency>
      </IRheader>
      <EPS>
        <EmployerDetails>
          <AccountsOfficeRef>${accountsOfficeRef}</AccountsOfficeRef>
          <TaxOfficeNum>${taxOfficeNum}</TaxOfficeNum>
          <TaxOfficeRef>${taxOfficeRef}</TaxOfficeRef>
          <TaxYear>${taxYear}</TaxYear>
        </EmployerDetails>
        <PeriodData>
          <TaxMonth>${periodNum}</TaxMonth>
          <NoPaymentForPeriod>yes</NoPaymentForPeriod>
          <EmploymentAllowanceIndicator>no</EmploymentAllowanceIndicator>
          <SSPRecovered>${(totalSSP * (smallEmployerRelief ? 1.03 : 1)).toFixed(2)}</SSPRecovered>
        </PeriodData>
      </EPS>
    </IRenvelope>
  </Body>
</GovTalkMessage>`;
}

function downloadXml(content, filename) {
  const blob = new Blob([content], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitiseFilename(s) {
  return (s || "").replace(/[^a-zA-Z0-9_-]/g, "_");
}

// ─── Main Component ───────────────────────────────────────
export default function HMRCExport({ user, payPeriods = [], payslips = [], staff = [] }) {
  const queryClient = useQueryClient();
  const [confirmState, setConfirmState] = useState(null);

  const { data: org = null } = useQuery({
    queryKey: ["organisation"],
    queryFn: () => secureGateway.filter("Organisation"),
    select: d => d?.[0] || null,
    staleTime: 10 * 60 * 1000,
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["hmrc-audit-logs"],
    queryFn: () => secureGateway.filter("AuditTrail", { record_type: "HMRC_RTI" }),
    staleTime: 0,
  });

  const logExport = useMutation({
    mutationFn: (data) => secureGateway.create("AuditTrail", {
      org_id: ORG_ID,
      user_id: user?.id,
      username: user?.full_name || user?.email,
      role: user?.role,
      action: "export",
      module: "HMRC RTI",
      record_type: "HMRC_RTI",
      description: data.description,
      new_value: data.meta,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["hmrc-audit-logs"] }),
  });

  const payeOk = org?.paye_reference && org?.accounts_office_ref;
  const staffMap = Object.fromEntries(staff.map(s => [s.id, s]));

  const handleExport = async (period, type, force = false) => {
    if (!payeOk) {
      toast.error("Please add your PAYE Reference and Accounts Office Reference in Settings before exporting to HMRC.");
      return;
    }

    const existing = auditLogs.find(l =>
      l.new_value?.period === period.label && l.new_value?.type === type
    );
    if (existing && !force) {
      const exportedOn = existing.created_date
        ? format(new Date(existing.created_date), "dd MMM yyyy HH:mm")
        : "a previous date";
      setConfirmState({ period, type, exportedOn });
      return;
    }

    setConfirmState(null);

    const ts = format(new Date(), "yyyyMMdd_HHmmss");
    const orgSlug = sanitiseFilename(org?.name);
    const periodSlug = sanitiseFilename(period.label);

    if (type === "FPS") {
      const periodPayslips = payslips.filter(p => p.pay_period_label === period.label);
      const xml = generateFPSXml(org, period, periodPayslips, staffMap);
      const filename = `FPS_${orgSlug}_${periodSlug}_${ts}.xml`;
      downloadXml(xml, filename);
      logExport.mutate({
        description: `FPS exported for ${period.label} — ${periodPayslips.length} employees`,
        meta: { period: period.label, type: "FPS", file_name: filename, employee_count: periodPayslips.length },
      });
      await logAudit({
        entity_name: "HMRC_RTI", entity_id: period.id, action: "export",
        changed_by: user?.id, changed_by_name: user?.full_name || "",
        old_values: null,
        new_values: { period: period.label, type: "FPS", file_name: filename, employee_count: periodPayslips.length, exported_by: user?.full_name },
        org_id: ORG_ID,
        description: `FPS exported for ${period.label} — ${periodPayslips.length} employees`,
        retention_category: "payroll",
      });
      toast.success(`FPS file downloaded: ${filename}`);
    } else {
      const periodPayslipsForEPS = payslips.filter(p => p.pay_period_label === period.label);
      const xml = generateEPSXml(org, period, periodPayslipsForEPS);
      const filename = `EPS_${orgSlug}_${periodSlug}_${ts}.xml`;
      downloadXml(xml, filename);
      logExport.mutate({
        description: `EPS exported for ${period.label} — no payment period`,
        meta: { period: period.label, type: "EPS", file_name: filename, employee_count: 0 },
      });
      await logAudit({
        entity_name: "HMRC_RTI", entity_id: period.id, action: "export",
        changed_by: user?.id, changed_by_name: user?.full_name || "",
        old_values: null,
        new_values: { period: period.label, type: "EPS", file_name: filename, exported_by: user?.full_name },
        org_id: ORG_ID,
        description: `EPS exported for ${period.label}`,
        retention_category: "payroll",
      });
      toast.success(`EPS file downloaded: ${filename}`);
    }
  };

  const submissionRows = payPeriods.map(period => {
    const periodPayslips = payslips.filter(p => p.pay_period_label === period.label);
    const fpsLog = auditLogs.find(l => l.new_value?.period === period.label && l.new_value?.type === "FPS");
    const epsLog = auditLogs.find(l => l.new_value?.period === period.label && l.new_value?.type === "EPS");
    const hasPayslips = periodPayslips.length > 0;
    return { period, periodPayslips, fpsLog, epsLog, hasPayslips };
  });

  if (!payPeriods.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-sm">HMRC RTI Submissions</h3>
        {!payeOk && (
          <Badge className="bg-amber-100 text-amber-700 text-xs gap-1">
            <ShieldAlert className="w-3 h-3" /> PAYE details missing in Settings
          </Badge>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Period</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Employees</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">FPS Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">EPS Status</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Exported By</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissionRows.map(({ period, periodPayslips, fpsLog, epsLog, hasPayslips }) => (
              <tr key={period.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium text-xs">{period.label}</td>
                <td className="px-4 py-3 text-center text-xs">{periodPayslips.length}</td>
                <td className="px-4 py-3">
                  {fpsLog ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Exported {fpsLog.created_date ? format(new Date(fpsLog.created_date), "dd MMM") : ""}
                    </span>
                  ) : hasPayslips ? (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="w-3.5 h-3.5" /> Not Yet Exported
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">No payslips</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {epsLog ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Exported {epsLog.created_date ? format(new Date(epsLog.created_date), "dd MMM") : ""}
                    </span>
                  ) : !hasPayslips ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" /> No Payment
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {fpsLog?.username || epsLog?.username || "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-1.5">
                    {hasPayslips && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleExport(period, "FPS")}
                        disabled={!payeOk}
                      >
                        <FileDown className="w-3 h-3" /> FPS
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      onClick={() => handleExport(period, "EPS")}
                      disabled={!payeOk}
                    >
                      <FileDown className="w-3 h-3" /> EPS
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong>Important:</strong> CareCore AI generates RTI-compatible export files. You are responsible for submitting
          these to HMRC via the Government Gateway or your payroll bureau. CareCore AI does not submit directly to HMRC.
        </span>
      </div>

      {confirmState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Duplicate Export Warning</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {confirmState.type} already exported for <strong>{confirmState.period.label}</strong> on {confirmState.exportedOn}. Export again?
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmState(null)}>Cancel</Button>
              <Button className="flex-1" onClick={() => handleExport(confirmState.period, confirmState.type, true)}>
                Export Again
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}