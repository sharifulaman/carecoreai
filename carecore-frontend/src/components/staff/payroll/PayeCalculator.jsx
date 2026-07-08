/**
 * UK PAYE Calculation Engine — 2025/26
 * All figures are monthly.
 */

// Monthly thresholds (2025/26)
const NI_PRIMARY_THRESHOLD = 1048;   // £1,048/month
const NI_UPPER_EARNINGS = 4189;      // £4,189/month
const NI_RATE_MAIN = 0.08;           // 8%
const NI_RATE_UPPER = 0.02;          // 2%

const BASIC_RATE_MONTHLY_LIMIT = 3141.66; // 20% band ceiling per month
const BASIC_RATE = 0.20;
const HIGHER_RATE = 0.40;

/**
 * Parse a tax code into a monthly allowance.
 * Supports standard numeric codes (e.g. 1257L → £1,047.50/month).
 * Returns 0 for BR, D0, D1 etc.
 */
export function monthlyAllowanceFromCode(taxCode = "1257L") {
  const code = String(taxCode).toUpperCase().trim();
  if (!code || ["BR", "D0", "D1", "NT"].includes(code)) return 0;
  const numeric = parseInt(code.replace(/[A-Z]/g, ""), 10);
  if (isNaN(numeric)) return 1047.5; // fallback to 1257L
  return (numeric * 10) / 12; // annual allowance → monthly
}

/**
 * Calculate income tax for a given gross monthly pay and tax code.
 * Returns tax amount (£).
 */
export function calcTax(grossMonthly, taxCode = "1257L") {
  const allowance = monthlyAllowanceFromCode(taxCode);
  const taxable = Math.max(0, grossMonthly - allowance);
  if (taxable <= 0) return 0;
  if (taxable <= BASIC_RATE_MONTHLY_LIMIT) {
    return parseFloat((taxable * BASIC_RATE).toFixed(2));
  }
  const basicBand = BASIC_RATE_MONTHLY_LIMIT * BASIC_RATE;
  const higherBand = (taxable - BASIC_RATE_MONTHLY_LIMIT) * HIGHER_RATE;
  return parseFloat((basicBand + higherBand).toFixed(2));
}

/**
 * Calculate employee NI for a given gross monthly pay.
 * Returns NI amount (£).
 */
export function calcNI(grossMonthly) {
  if (grossMonthly <= NI_PRIMARY_THRESHOLD) return 0;
  if (grossMonthly <= NI_UPPER_EARNINGS) {
    return parseFloat(((grossMonthly - NI_PRIMARY_THRESHOLD) * NI_RATE_MAIN).toFixed(2));
  }
  const mainBand = (NI_UPPER_EARNINGS - NI_PRIMARY_THRESHOLD) * NI_RATE_MAIN;
  const upperBand = (grossMonthly - NI_UPPER_EARNINGS) * NI_RATE_UPPER;
  return parseFloat((mainBand + upperBand).toFixed(2));
}

/**
 * Calculate employer NI (secondary NI).
 * 2025/26: 15% above secondary threshold £758/month.
 */
export function calcEmployerNI(grossMonthly) {
  const SECONDARY_THRESHOLD = 758;
  const EMPLOYER_RATE = 0.15;
  if (grossMonthly <= SECONDARY_THRESHOLD) return 0;
  return parseFloat(((grossMonthly - SECONDARY_THRESHOLD) * EMPLOYER_RATE).toFixed(2));
}

/**
 * Full PAYE calculation.
 * @param {number} grossPay - Monthly gross pay
 * @param {string} taxCode - Staff tax code (default 1257L)
 * @param {number} employeePensionPct - Employee pension % (default 5)
 * @param {number} employerPensionPct - Employer pension % (default 3)
 * @returns {object} - All deduction figures
 */
export function calcPAYE(grossPay, taxCode = "1257L", employeePensionPct = 5, employerPensionPct = 3) {
  const gross = parseFloat(grossPay) || 0;
  const tax = calcTax(gross, taxCode);
  const ni = calcNI(gross);
  const employerNI = calcEmployerNI(gross);
  const employeePension = parseFloat((gross * (employeePensionPct / 100)).toFixed(2));
  const employerPension = parseFloat((gross * (employerPensionPct / 100)).toFixed(2));
  const totalDeductions = parseFloat((tax + ni + employeePension).toFixed(2));
  const netPay = parseFloat((gross - totalDeductions).toFixed(2));
  const totalEmployerCost = parseFloat((gross + employerNI + employerPension).toFixed(2));

  return {
    gross_pay: gross,
    tax_deduction: tax,
    ni_deduction: ni,
    pension_deduction: employeePension,
    employer_ni: employerNI,
    employer_pension: employerPension,
    total_deductions: totalDeductions,
    net_pay: netPay,
    total_employer_cost: totalEmployerCost,
    tax_code: taxCode,
    employee_pension_pct: employeePensionPct,
    employer_pension_pct: employerPensionPct,
  };
}