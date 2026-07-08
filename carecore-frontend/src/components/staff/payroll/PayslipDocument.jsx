import { format, parseISO } from "date-fns";

export default function PayslipDocument({ payslip, orgName = "CareCore AI" }) {
  const totalDeductions = (payslip.ni_deduction || 0) + (payslip.tax_deduction || 0) + (payslip.pension_deduction || 0);
  const periodDate = payslip.period_end ? format(parseISO(payslip.period_end), "dd-MMM-yyyy") : "";
  const periodLabel = payslip.pay_period_label || "";
  const sspAmount = payslip.ssp_amount || 0;
  const hasSSP = sspAmount > 0;
  const basicPay = hasSSP ? (payslip.gross_pay || 0) - sspAmount : (payslip.gross_pay || 0);
  // Expenses reimbursement (non-taxable)
  const expenseLines = payslip.expense_lines || [];
  const totalExpenses = payslip.total_expenses || 0;
  const hasExpenses = totalExpenses > 0;

  return (
    <div style={{ fontFamily: "Arial, sans-serif", fontSize: 12, border: "2px solid #1a3a8f", width: "100%", maxWidth: 680, background: "#fff" }}>
      
      {/* Row 1: Employee No | Employee | Date | NI No */}
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 140px 160px", borderBottom: "1px solid #1a3a8f" }}>
        <div style={{ background: "#1a3a8f", color: "#fff", padding: "4px 8px", fontWeight: "bold", fontSize: 11, borderRight: "1px solid #1a3a8f" }}>Employee No.</div>
        <div style={{ background: "#1a3a8f", color: "#fff", padding: "4px 8px", fontWeight: "bold", fontSize: 11, borderRight: "1px solid #1a3a8f", textAlign: "center" }}>Employee</div>
        <div style={{ background: "#1a3a8f", color: "#fff", padding: "4px 8px", fontWeight: "bold", fontSize: 11, borderRight: "1px solid #1a3a8f", textAlign: "center" }}>Date</div>
        <div style={{ background: "#1a3a8f", color: "#fff", padding: "4px 8px", fontWeight: "bold", fontSize: 11, textAlign: "center" }}>National Insurance No.</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "100px 1fr 140px 160px", borderBottom: "2px solid #1a3a8f" }}>
        <div style={{ padding: "4px 8px", borderRight: "1px solid #ccc" }}>{payslip.employee_id || "—"}</div>
        <div style={{ padding: "4px 8px", fontWeight: "bold", borderRight: "1px solid #ccc", textAlign: "center" }}>{payslip.staff_name}</div>
        <div style={{ padding: "4px 8px", borderRight: "1px solid #ccc", textAlign: "center" }}>{periodDate}</div>
        <div style={{ padding: "4px 8px", textAlign: "center" }}>{payslip.ni_number || "—"}</div>
      </div>

      {/* Row 2: Column Headers */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 1fr 100px", background: "#1a3a8f", color: "#fff", fontWeight: "bold", fontSize: 11 }}>
        <div style={{ padding: "4px 8px", borderRight: "1px solid #3a5abf" }}>Payments</div>
        <div style={{ padding: "4px 8px", borderRight: "1px solid #3a5abf", textAlign: "center" }}>Units</div>
        <div style={{ padding: "4px 8px", borderRight: "1px solid #3a5abf", textAlign: "right" }}>Rate</div>
        <div style={{ padding: "4px 8px", borderRight: "2px solid #fff", textAlign: "right" }}>Amount</div>
        <div style={{ padding: "4px 8px", borderRight: "1px solid #3a5abf" }}>Deductions</div>
        <div style={{ padding: "4px 8px", textAlign: "right" }}>Amount</div>
      </div>

      {/* Row 3: Data rows */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 100px 1fr 100px", minHeight: 120 }}>
        {/* Payments side */}
        <div style={{ borderRight: "1px solid #ccc" }}>
          <div style={{ padding: "6px 8px" }}>Basic Pay</div>
          {hasSSP && <div style={{ padding: "2px 8px", color: "#1a6b1a" }}>Statutory Sick Pay</div>}
          <div style={{ padding: "2px 8px 6px", fontWeight: "bold" }}>Total Payments</div>
        </div>
        <div style={{ borderRight: "1px solid #ccc", textAlign: "center" }}>
          <div style={{ padding: "6px 8px" }}></div>
          {hasSSP && <div style={{ padding: "2px 8px" }}></div>}
        </div>
        <div style={{ borderRight: "1px solid #ccc", textAlign: "right" }}>
          <div style={{ padding: "6px 8px" }}></div>
          {hasSSP && <div style={{ padding: "2px 8px" }}>SSP</div>}
        </div>
        <div style={{ borderRight: "2px solid #1a3a8f", textAlign: "right" }}>
          <div style={{ padding: "6px 8px" }}>{basicPay.toFixed(2)}</div>
          {hasSSP && <div style={{ padding: "2px 8px", color: "#1a6b1a" }}>{sspAmount.toFixed(2)}</div>}
          <div style={{ padding: "2px 8px 6px", fontWeight: "bold" }}>{(payslip.gross_pay || 0).toFixed(2)}</div>
        </div>
        {/* Deductions side */}
        <div style={{ borderRight: "1px solid #ccc" }}>
          <div style={{ padding: "6px 8px" }}>Income Tax</div>
          <div style={{ padding: "2px 8px" }}>National Insurance</div>
          <div style={{ padding: "2px 8px" }}>Pension</div>
          <div style={{ padding: "2px 8px 6px", fontWeight: "bold" }}>Total Deductions</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ padding: "6px 8px" }}>{(payslip.tax_deduction || 0).toFixed(2)}</div>
          <div style={{ padding: "2px 8px" }}>{(payslip.ni_deduction || 0).toFixed(2)}</div>
          <div style={{ padding: "2px 8px" }}>{(payslip.pension_deduction || 0).toFixed(2)}</div>
          <div style={{ padding: "2px 8px 6px", fontWeight: "bold" }}>{totalDeductions.toFixed(2)}</div>
        </div>
      </div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderTop: "2px solid #1a3a8f", borderBottom: "2px solid #1a3a8f" }}>
        {/* Staff name */}
        <div style={{ padding: "8px", borderRight: "1px solid #1a3a8f" }}>
          <div style={{ fontWeight: "bold" }}>{payslip.staff_name}</div>
          {payslip.employee_id && <div style={{ fontSize: 11, color: "#555" }}>Emp: {payslip.employee_id}</div>}
        </div>
        {/* Totals this period */}
        <div style={{ borderRight: "1px solid #1a3a8f" }}>
          <div style={{ background: "#1a3a8f", color: "#fff", padding: "3px 8px", fontWeight: "bold", fontSize: 11, textAlign: "center" }}>Totals This Period</div>
          <div style={{ padding: "4px 8px", display: "flex", justifyContent: "space-between" }}>
            <span>Total Payments</span><span>{(payslip.gross_pay || 0).toFixed(2)}</span>
          </div>
          <div style={{ padding: "2px 8px 4px", display: "flex", justifyContent: "space-between" }}>
            <span>Total Deductions</span><span>{totalDeductions.toFixed(2)}</span>
          </div>
        </div>
        {/* Year to date placeholder */}
        <div>
          <div style={{ background: "#1a3a8f", color: "#fff", padding: "3px 8px", fontWeight: "bold", fontSize: 11, textAlign: "center" }}>Pay Period</div>
          <div style={{ padding: "4px 8px", fontSize: 11, color: "#444" }}>{periodLabel}</div>
          <div style={{ padding: "2px 8px 4px", fontSize: 11, color: "#444" }}>
            {payslip.period_start} – {payslip.period_end}
          </div>
        </div>
      </div>

      {/* Expenses section — non-taxable reimbursement */}
      {hasExpenses && (
        <div style={{ borderTop: "2px solid #1a3a8f", padding: "6px 8px", background: "#f0f7ff" }}>
          <div style={{ fontWeight: "bold", fontSize: 11, color: "#1a3a8f", marginBottom: 4 }}>
            EXPENSES REIMBURSEMENT <span style={{ fontSize: 10, fontWeight: "normal", color: "#555" }}>(Non-taxable reimbursement)</span>
          </div>
          {expenseLines.map((exp, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "1px 0" }}>
              <span style={{ color: "#444" }}>{exp.expense_date} — {exp.description}</span>
              <span>£{(exp.amount || 0).toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", borderTop: "1px solid #ccc", paddingTop: 4, marginTop: 4, fontSize: 11 }}>
            <span>Total Expenses</span>
            <span>£{totalExpenses.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Footer row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", borderTop: "1px solid #ccc" }}>
        <div style={{ padding: "8px" }}>
          <div style={{ fontWeight: "bold", fontSize: 13 }}>{orgName}</div>
          <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
            Tax Code: {payslip.tax_code || "1257L"} &nbsp;|&nbsp; NI Table: A &nbsp;|&nbsp; Tax Period: {periodDate} &nbsp;|&nbsp; Payment Method: BACS
          </div>
          {hasSSP && (
            <div style={{ fontSize: 10, color: "#1a6b1a", marginTop: 3 }}>
              SSP paid at £116.75/week (2025/26 rate)
            </div>
          )}
        </div>
        <div style={{ border: "2px solid #1a3a8f", margin: 6, padding: "8px 16px", display: "flex", alignItems: "center", gap: 8, fontWeight: "bold", fontSize: 15 }}>
          <span style={{ color: "#1a3a8f" }}>NET PAY £</span>
          <span style={{ fontSize: 18 }}>{(payslip.net_pay || 0).toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}