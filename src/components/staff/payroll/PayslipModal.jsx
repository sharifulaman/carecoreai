import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Calculator, AlertCircle, Receipt } from "lucide-react";
import { calcPAYE } from "./PayeCalculator";

function DeductionRow({ label, auto, value, onChange, overrideReason, onReasonChange, isOverride }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <span className="text-xs font-medium">{label}</span>
          {isOverride && <span className="ml-2 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Overridden</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {!isOverride && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Auto: £{auto.toFixed(2)}</span>
          )}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
            <Input
              type="number"
              step="0.01"
              value={value}
              onChange={e => onChange(parseFloat(e.target.value) || 0)}
              className="h-7 text-xs w-28 pl-6 text-right"
            />
          </div>
        </div>
      </div>
      {isOverride && (
        <Input
          placeholder="Reason for override…"
          value={overrideReason}
          onChange={e => onReasonChange(e.target.value)}
          className="h-6 text-xs"
        />
      )}
    </div>
  );
}

export default function PayslipModal({ timesheet, staffMember, org, onClose, onGenerate }) {
  const gross = timesheet.gross_pay || 0;
  const taxCode = staffMember?.tax_code || "1257L";
  const empPct = org?.hr_policy?.pension_employee_pct ?? 5;
  const erPct = org?.hr_policy?.pension_employer_pct ?? 3;

  const auto = calcPAYE(gross, taxCode, empPct, erPct);

  // Fetch approved expenses for this staff member within the pay period
  const { data: periodExpenses = [] } = useQuery({
    queryKey: ["payslip-expenses", timesheet.staff_id, timesheet.period_start, timesheet.period_end],
    queryFn: async () => {
      const all = await secureGateway.filter("StaffExpense", { staff_id: timesheet.staff_id });
      return all.filter(e =>
        e.status === "approved" &&
        !e.payslip_id &&
        e.expense_date >= timesheet.period_start &&
        e.expense_date <= timesheet.period_end
      );
    },
    enabled: !!timesheet.staff_id && !!timesheet.period_start,
    staleTime: 0,
  });

  const totalExpenses = periodExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const [tax, setTax] = useState(auto.tax_deduction);
  const [ni, setNi] = useState(auto.ni_deduction);
  const [pension, setPension] = useState(auto.pension_deduction);
  const [taxReason, setTaxReason] = useState("");
  const [niReason, setNiReason] = useState("");
  const [pensionReason, setPensionReason] = useState("");

  useEffect(() => {
    setTax(auto.tax_deduction);
    setNi(auto.ni_deduction);
    setPension(auto.pension_deduction);
  }, [gross]);

  const net = parseFloat((gross - tax - ni - pension).toFixed(2));
  const totalDed = parseFloat((tax + ni + pension).toFixed(2));
  const employerCost = parseFloat((gross + auto.employer_ni + auto.employer_pension).toFixed(2));

  const taxOverride = Math.abs(tax - auto.tax_deduction) > 0.01;
  const niOverride = Math.abs(ni - auto.ni_deduction) > 0.01;
  const pensionOverride = Math.abs(pension - auto.pension_deduction) > 0.01;
  const hasUnjustifiedOverride = (taxOverride && !taxReason) || (niOverride && !niReason) || (pensionOverride && !pensionReason);

  const handleGenerate = () => {
    onGenerate({
      ni, tax, pension, net,
      ssp_amount: timesheet.ssp_amount || 0,
      employer_ni: auto.employer_ni,
      employer_pension: auto.employer_pension,
      total_employer_cost: employerCost,
      tax_code: taxCode,
      expenses: periodExpenses,
      total_expenses: totalExpenses,
      overrides: {
        tax: taxOverride ? { original: auto.tax_deduction, reason: taxReason } : null,
        ni: niOverride ? { original: auto.ni_deduction, reason: niReason } : null,
        pension: pensionOverride ? { original: auto.pension_deduction, reason: pensionReason } : null,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-base">Generate Payslip</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{timesheet.staff_name} · {timesheet.pay_period_label}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
              <Calculator className="w-3 h-3" /> Auto PAYE 2025/26
            </span>
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Gross */}
          <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Gross Pay</p>
              <p className="font-bold text-lg">£{gross.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Tax Code: {taxCode}</p>
              <p className="text-xs text-muted-foreground">Pension: Ee {empPct}% / Er {erPct}%</p>
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee Deductions</p>
            <DeductionRow
              label="Income Tax"
              auto={auto.tax_deduction}
              value={tax}
              onChange={setTax}
              isOverride={taxOverride}
              overrideReason={taxReason}
              onReasonChange={setTaxReason}
            />
            <DeductionRow
              label="National Insurance (Ee)"
              auto={auto.ni_deduction}
              value={ni}
              onChange={setNi}
              isOverride={niOverride}
              overrideReason={niReason}
              onReasonChange={setNiReason}
            />
            <DeductionRow
              label="Pension (Employee)"
              auto={auto.pension_deduction}
              value={pension}
              onChange={setPension}
              isOverride={pensionOverride}
              overrideReason={pensionReason}
              onReasonChange={setPensionReason}
            />
          </div>

          {/* Net pay */}
          <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 rounded-lg">
            <span className="font-semibold text-sm">Net Pay</span>
            <span className="font-bold text-lg text-green-600">£{net.toFixed(2)}</span>
          </div>

          {/* Employer cost breakdown */}
          <div className="p-3 bg-muted/20 rounded-lg text-xs space-y-1.5">
            <p className="font-semibold text-muted-foreground">Employer Cost Summary</p>
            <div className="flex justify-between"><span>Gross Pay</span><span>£{gross.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Employer NI (15%)</span><span>£{auto.employer_ni.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Employer Pension ({erPct}%)</span><span>£{auto.employer_pension.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold border-t border-border pt-1.5 mt-1">
              <span>Total Employer Cost</span><span>£{employerCost.toFixed(2)}</span>
            </div>
          </div>

          {/* Expenses reimbursement — non-taxable */}
          {periodExpenses.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-blue-800">
                <Receipt className="w-3.5 h-3.5" />
                Expenses Reimbursement
                <span className="text-[10px] font-normal text-blue-600">(Non-taxable)</span>
              </div>
              {periodExpenses.map(exp => (
                <div key={exp.id} className="flex justify-between text-muted-foreground">
                  <span>{exp.expense_date} — {exp.description}</span>
                  <span className="font-medium">£{(exp.amount || 0).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t border-blue-200 pt-1.5 text-blue-800">
                <span>Total Expenses</span>
                <span>£{totalExpenses.toFixed(2)}</span>
              </div>
            </div>
          )}

          {hasUnjustifiedOverride && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>You have overridden auto-calculated figures. Please provide a reason for each override before generating.</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={hasUnjustifiedOverride}
            onClick={handleGenerate}
          >
            Generate & Save Payslip
          </Button>
        </div>
      </div>
    </div>
  );
}