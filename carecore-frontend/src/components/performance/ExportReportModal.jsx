// @ts-nocheck
import { useState } from "react";
import { X, FileText, Download, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { performanceApi } from "@/lib/performanceApi";

// ── Section definitions ───────────────────────────────────────────────────────

const SECTIONS = [
  {
    key:     "kpi_summary",
    label:   "KPI Summary",
    desc:    "Organisation-wide headline numbers (avg score, compliance, alerts, etc.)",
    default: true,
  },
  {
    key:     "employee_table",
    label:   "Employee Performance Table",
    desc:    "Full list of staff with scores, training %, supervision status, and attendance",
    default: true,
  },
  {
    key:     "top_performers",
    label:   "Top Performers",
    desc:    "Staff ranked in the top tier for this period",
    default: true,
  },
  {
    key:     "needs_attention",
    label:   "Needs Attention",
    desc:    "Staff with the lowest scores who may need support",
    default: true,
  },
  {
    key:     "alerts",
    label:   "Active Alerts",
    desc:    "Supervision overdue, expired training, no activity, and other alerts",
    default: false,
  },
];

// ── CSV helpers ───────────────────────────────────────────────────────────────

function escapeCell(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowToCSV(cells) {
  return cells.map(escapeCell).join(",");
}

function buildCSV(sections, kpiData, allRows) {
  const lines = [];
  const today = new Date().toLocaleDateString("en-GB");

  lines.push(`Employee Performance Report`);
  lines.push(`Generated: ${today}`);
  lines.push(`Period: ${kpiData?.period?.label ?? "—"}`);
  lines.push("");

  if (sections.kpi_summary) {
    lines.push("KPI SUMMARY");
    lines.push(rowToCSV(["Metric", "Value"]));
    lines.push(rowToCSV(["Total Employees", kpiData?.total_employees ?? "—"]));
    lines.push(rowToCSV(["Avg Performance Score", kpiData?.avg_score > 0 ? `${kpiData.avg_score}%` : "—"]));
    lines.push(rowToCSV(["Tasks Completed", kpiData?.tasks_completed ?? "—"]));
    lines.push(rowToCSV(["Avg Hours Logged", kpiData?.avg_hours_logged > 0 ? `${kpiData.avg_hours_logged}h` : "—"]));
    lines.push(rowToCSV(["Training Compliance", `${kpiData?.training_compliance_pct ?? 0}%`]));
    lines.push(rowToCSV(["Active Alerts", kpiData?.alerts_count ?? 0]));
    lines.push("");
  }

  if (sections.employee_table && allRows.length > 0) {
    lines.push("EMPLOYEE PERFORMANCE TABLE");
    lines.push(rowToCSV([
      "Rank", "Name", "Role", "Home", "Score (%)",
      "Training Compliance (%)", "Supervision Status",
      "Activities", "Attendance (%)", "Avg Hours/Week", "Goals Count",
    ]));
    allRows.forEach((row, idx) => {
      lines.push(rowToCSV([
        idx + 1,
        row.staff_name,
        row.role?.replace(/_/g, " "),
        row.home_name || "",
        row.score >= 0 ? row.score : "N/A",
        row.training_compliance_pct,
        row.supervision_status?.replace(/_/g, " "),
        row.activities_count,
        row.attendance_pct > 0 ? row.attendance_pct : "",
        row.avg_hours_per_week > 0 ? row.avg_hours_per_week : "",
        row.goals_count ?? 0,
      ]));
    });
    lines.push("");
  }

  if (sections.top_performers) {
    const top = kpiData?.top_performers ?? [];
    if (top.length > 0) {
      lines.push("TOP PERFORMERS");
      lines.push(rowToCSV(["Name", "Role", "Home", "Score (%)"]));
      top.forEach((row) => {
        lines.push(rowToCSV([
          row.staff_name,
          row.role?.replace(/_/g, " "),
          row.home_name || "",
          row.score >= 0 ? row.score : "N/A",
        ]));
      });
      lines.push("");
    }
  }

  if (sections.needs_attention) {
    const bottom = kpiData?.needs_review ?? [];
    if (bottom.length > 0) {
      lines.push("NEEDS ATTENTION");
      lines.push(rowToCSV(["Name", "Role", "Home", "Score (%)", "Training (%)"]));
      bottom.forEach((row) => {
        lines.push(rowToCSV([
          row.staff_name,
          row.role?.replace(/_/g, " "),
          row.home_name || "",
          row.score >= 0 ? row.score : "N/A",
          row.training_compliance_pct,
        ]));
      });
      lines.push("");
    }
  }

  if (sections.alerts) {
    const alerts = kpiData?.alerts_list ?? [];
    if (alerts.length > 0) {
      lines.push("ACTIVE ALERTS");
      lines.push(rowToCSV(["Staff Member", "Role", "Alert Type", "Severity", "Detail"]));
      alerts.forEach((a) => {
        lines.push(rowToCSV([
          a.staff_name,
          a.staff_role?.replace(/_/g, " "),
          a.alert_type?.replace(/_/g, " "),
          a.severity,
          a.detail || "",
        ]));
      });
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * ExportReportModal
 *
 * Generates a multi-section CSV report from real backend data.
 * For the employee table, fetches all rows (up to 500) so the export is not
 * limited to the current page shown in the table.
 *
 * All data comes from the backend — no client-side score calculation.
 *
 * Props:
 *   kpiData  TeamKPIs — provides KPI summary, top performers, alerts
 *   filters  { role, homeId, periodFilter } — mirrors the active dashboard filters
 *   onClose  fn
 */
export default function ExportReportModal({ kpiData, filters, onClose }) {
  const initSelected = Object.fromEntries(SECTIONS.map((s) => [s.key, s.default]));
  const [selected, setSelected] = useState(initSelected);
  const [status, setStatus]     = useState("idle"); // idle | fetching | done | error
  const [errorMsg, setErrorMsg] = useState("");

  const toggle = (key) => setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  const anySelected = Object.values(selected).some(Boolean);

  async function handleExport() {
    setStatus("fetching");
    setErrorMsg("");

    try {
      let allRows = [];

      if (selected.employee_table) {
        const result = await performanceApi.teamSummary({
          periodFilter: filters.periodFilter,
          homeId:       filters.homeId,
          role:         filters.role,
          page:         1,
          pageSize:     500,
          sortBy:       "score",
        });
        allRows = result?.data ?? [];
      }

      const csv      = buildCSV(selected, kpiData, allRows);
      const blob     = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url      = URL.createObjectURL(blob);
      const anchor   = document.createElement("a");
      const dateStr  = new Date().toISOString().split("T")[0];
      anchor.href     = url;
      anchor.download = `carecore-performance-${dateStr}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);

      setStatus("done");
    } catch (err) {
      setErrorMsg(err?.message || "Export failed. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl border border-border w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-primary/10 rounded-full">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <h2 className="font-semibold text-sm">Export Performance Report</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Success state ── */}
        {status === "done" ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="font-semibold text-sm">Report downloaded</p>
            <p className="text-xs text-muted-foreground">
              The CSV file has been saved to your downloads folder. Open it with Excel or Google Sheets.
            </p>
            <Button size="sm" onClick={onClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* Format note */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-muted/30 rounded-lg border border-border">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs font-medium">CSV format</p>
                <p className="text-[10px] text-muted-foreground">Opens in Excel, Google Sheets, or any spreadsheet tool</p>
              </div>
            </div>

            {/* Section selection */}
            <div>
              <p className="text-xs font-semibold mb-2">Sections to include</p>
              <div className="space-y-1.5">
                {SECTIONS.map((s) => (
                  <label
                    key={s.key}
                    className="flex items-start gap-3 px-3 py-2.5 hover:bg-muted/20 rounded-lg cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selected[s.key]}
                      onCheckedChange={() => toggle(s.key)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-medium">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter summary */}
            <div className="bg-muted/20 rounded-lg px-3 py-2.5 space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Export scope</p>
              <p className="text-xs text-muted-foreground">
                Period: <span className="text-foreground font-medium">{kpiData?.period?.label ?? filters.periodFilter ?? "—"}</span>
              </p>
              {filters.role && (
                <p className="text-xs text-muted-foreground">
                  Role filter: <span className="text-foreground font-medium capitalize">{filters.role.replace(/_/g, " ")}</span>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Total employees: <span className="text-foreground font-medium">{kpiData?.total_employees ?? "—"}</span>
              </p>
            </div>

            {/* Error */}
            {status === "error" && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{errorMsg}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={!anySelected || status === "fetching"}
                className="gap-2 min-w-[120px]"
              >
                {status === "fetching" ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing…</>
                ) : (
                  <><Download className="w-3.5 h-3.5" /> Export CSV</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
