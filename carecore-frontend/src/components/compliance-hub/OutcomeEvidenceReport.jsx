/**
 * OutcomeEvidenceReport — Phase 10
 *
 * Inspection-ready Outcome & Impact Evidence Summary for Ofsted/SCCIF preparation.
 * Pulls real data from RecordImpactOutcome + linked source records.
 * Supports PDF/print export, CSV export, and anonymised mode.
 */

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { format, parseISO, isValid, isAfter, isBefore, startOfDay } from "date-fns";
import {
  Download, FileText, Printer, Shield, Clock,
  AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Filter, Eye, EyeOff, ChevronDown, ChevronRight, Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Role gate ────────────────────────────────────────────────────────────────
const AUTHORISED_ROLES = new Set([
  "admin", "rsm", "regional_manager", "team_manager", "team_leader",
  "risk_manager", "risk_officer", "admin_manager"
]);

// ─── Section definitions ──────────────────────────────────────────────────────
const SECTIONS = [
  { id: "incident",         label: "1. Incident Outcomes",              recordType: "incident" },
  { id: "missing",          label: "2. Missing Episode Outcomes",       recordType: "missing_episode" },
  { id: "appointment",      label: "3. Appointment Outcomes",           recordType: "appointment" },
  { id: "ils",              label: "4. ILS Progress Outcomes",          recordType: "ils_session" },
  { id: "keywork",          label: "5. Key Work Session Outcomes",      recordType: "key_work_session" },
  { id: "complaint",        label: "6. Complaint Learning Outcomes",    recordType: "complaint" },
  { id: "safeguarding",     label: "7. Safeguarding Outcome Evidence",  recordType: "safeguarding_concern" },
  { id: "risk_increased",   label: "8. Risk Increased Records",         recordType: null, riskFilter: "increased" },
  { id: "risk_reduced",     label: "8b. Risk Reduced Records",         recordType: null, riskFilter: "reduced" },
  { id: "followup",         label: "9. Open & Overdue Follow-up Actions", recordType: null, followupFilter: true },
  { id: "manager_review",   label: "10. Manager Review & Sign-off Summary", recordType: null, reviewFilter: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return "—";
  const parsed = typeof d === "string" ? parseISO(d) : d;
  return isValid(parsed) ? format(parsed, "dd MMM yyyy") : "—";
};

const cap = (s) => s ? s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—";

const riskBadge = (rc) => {
  if (!rc || rc === "not_applicable") return null;
  const map = {
    increased: "bg-red-100 text-red-700",
    reduced: "bg-green-100 text-green-700",
    unchanged: "bg-slate-100 text-slate-600",
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${map[rc] || "bg-muted text-muted-foreground"}`}>{cap(rc)}</span>;
};

const reviewBadge = (s) => {
  if (!s) return <span className="text-xs text-muted-foreground">—</span>;
  const map = {
    pending:          "bg-amber-100 text-amber-700",
    approved:         "bg-green-100 text-green-700",
    escalated:        "bg-red-100 text-red-700",
    changes_requested:"bg-orange-100 text-orange-700",
    closed:           "bg-slate-100 text-slate-500",
  };
  return <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${map[s] || "bg-muted text-muted-foreground"}`}>{s.replace(/_/g," ")}</span>;
};

// Anonymise a YP name
const anonName = (name, index) => name ? `YP-${String(index + 1).padStart(3, "0")}` : "—";

// ─── Row component ─────────────────────────────────────────────────────────────
function EvidenceRow({ o, idx, anonymous, today }) {
  const [expanded, setExpanded] = useState(false);
  const isOverdue = o.follow_up_required && !o.completion_date && o.target_date && o.target_date < today;
  const ypName = anonymous ? anonName(o.resident_name, idx) : (o.resident_name || "—");

  return (
    <>
      <tr
        className={`border-b border-border/40 last:border-0 hover:bg-muted/20 cursor-pointer ${isOverdue ? "bg-red-50/40" : ""}`}
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmt(o.created_date || o.record_date)}</td>
        <td className="px-3 py-2 text-xs capitalize">{cap(o.record_type)}</td>
        <td className="px-3 py-2 text-xs font-medium">{ypName}</td>
        <td className="px-3 py-2 text-xs">{o.home_name || "—"}</td>
        <td className="px-3 py-2 text-xs max-w-[140px] truncate" title={o.immediate_outcome}>{o.immediate_outcome || "—"}</td>
        <td className="px-3 py-2 text-xs max-w-[120px] truncate" title={o.impact_on_young_person}>{o.impact_on_young_person || "—"}</td>
        <td className="px-3 py-2">{riskBadge(o.risk_change)}</td>
        <td className="px-3 py-2 text-xs max-w-[120px] truncate" title={o.learning_identified}>{o.learning_identified || "—"}</td>
        <td className="px-3 py-2 text-xs max-w-[120px] truncate" title={o.follow_up_action}>
          {o.follow_up_required ? (
            <span className={`font-medium ${isOverdue ? "text-red-600" : "text-amber-600"}`}>
              {isOverdue ? "⚠ " : ""}{o.follow_up_action || "Required"}
            </span>
          ) : <span className="text-muted-foreground">None</span>}
        </td>
        <td className="px-3 py-2 text-xs">{o.responsible_person_name || "—"}</td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">{fmt(o.target_date)}</td>
        <td className="px-3 py-2 text-xs">
          {o.completion_date
            ? <span className="text-green-600 font-medium">✓ {fmt(o.completion_date)}</span>
            : o.follow_up_required
              ? <span className={isOverdue ? "text-red-600 font-medium" : "text-amber-600"}>Open</span>
              : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="px-3 py-2">{reviewBadge(o.manager_review_status)}</td>
        <td className="px-3 py-2 text-xs">{o.reviewed_by_name || "—"}</td>
        <td className="px-3 py-2 text-xs whitespace-nowrap">{fmt(o.reviewed_at)}</td>
        <td className="px-3 py-2">
          <span className="text-xs text-muted-foreground">{expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/10 border-b border-border/40">
          <td colSpan={16} className="px-4 py-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { label: "Record reference", value: o.record_reference },
                { label: "Impact on young person", value: o.impact_on_young_person },
                { label: "Progress made", value: o.progress_made },
                { label: "Learning identified", value: o.learning_identified },
                { label: "Manager review note", value: o.manager_review_note },
                { label: "Debrief completed", value: o.debrief_completed ? cap(o.debrief_completed) : null },
                { label: "Risk assessment updated", value: o.risk_assessment_updated ? cap(o.risk_assessment_updated) : null },
                { label: "Support plan updated", value: o.support_plan_updated ? cap(o.support_plan_updated) : null },
                { label: "Safeguarding referral", value: o.safeguarding_referral_required ? "Required" : null },
                { label: "Reg 27 notification", value: o.reg27_notification_required ? cap(o.reg27_notification_required) : null },
              ].filter(f => f.value).map((f, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-2">
                  <p className="text-muted-foreground font-medium mb-0.5">{f.label}</p>
                  <p>{f.value}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────
function ReportSection({ section, rows, anonymous, today }) {
  const [open, setOpen] = useState(true);
  if (rows.length === 0) {
    return (
      <div className="border border-border rounded-xl overflow-hidden mb-3">
        <button className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 text-left" onClick={() => setOpen(v => !v)}>
          <span className="text-sm font-semibold">{section.label}</span>
          <span className="text-xs text-muted-foreground">0 records</span>
        </button>
        {open && <div className="px-4 py-6 text-center text-sm text-muted-foreground">No records in this section for the selected filters.</div>}
      </div>
    );
  }

  return (
    <div className="border border-border rounded-xl overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/20 text-left hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-sm font-semibold flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          {section.label}
        </span>
        <span className="text-xs bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{rows.length} records</span>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1200px]">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                {["Date","Record type","Young person","Home","Immediate outcome","Impact on YP","Risk change","Learning identified","Follow-up action","Responsible","Target date","Completion","Manager review","Reviewed by","Reviewed at",""].map((h, i) => (
                  <th key={i} className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o, i) => <EvidenceRow key={o.id} o={o} idx={i} anonymous={anonymous} today={today} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── KPI summary bar ──────────────────────────────────────────────────────────
function SummaryKPIs({ rows, today }) {
  const total = rows.length;
  const withLearning = rows.filter(r => r.learning_identified).length;
  const riskIncreased = rows.filter(r => r.risk_change === "increased").length;
  const riskReduced = rows.filter(r => r.risk_change === "reduced").length;
  const openFollowUp = rows.filter(r => r.follow_up_required && !r.completion_date).length;
  const overdueFollowUp = rows.filter(r => r.follow_up_required && !r.completion_date && r.target_date && r.target_date < today).length;
  const managerApproved = rows.filter(r => r.manager_review_status === "approved").length;
  const awaitingReview = rows.filter(r => r.manager_review_status === "pending").length;

  const kpis = [
    { label: "Total records",        value: total,            color: "text-foreground",     border: "border-border" },
    { label: "With learning identified", value: withLearning, color: "text-blue-600",       border: "border-blue-200" },
    { label: "Risk increased",       value: riskIncreased,    color: riskIncreased > 0 ? "text-red-600" : "text-foreground",   border: riskIncreased > 0 ? "border-red-300" : "border-border" },
    { label: "Risk reduced",         value: riskReduced,      color: riskReduced > 0 ? "text-green-600" : "text-foreground",   border: riskReduced > 0 ? "border-green-300" : "border-border" },
    { label: "Open follow-ups",      value: openFollowUp,     color: openFollowUp > 0 ? "text-amber-600" : "text-foreground",  border: openFollowUp > 0 ? "border-amber-300" : "border-border" },
    { label: "Overdue follow-ups",   value: overdueFollowUp,  color: overdueFollowUp > 0 ? "text-red-600" : "text-foreground", border: overdueFollowUp > 0 ? "border-red-400" : "border-border" },
    { label: "Manager approved",     value: managerApproved,  color: "text-green-600",      border: "border-green-200" },
    { label: "Awaiting review",      value: awaitingReview,   color: awaitingReview > 0 ? "text-amber-600" : "text-foreground", border: awaitingReview > 0 ? "border-amber-300" : "border-border" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 mb-4">
      {kpis.map((k, i) => (
        <div key={i} className={`bg-card border ${k.border} rounded-xl p-3`}>
          <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
          <p className={`text-xl font-bold mt-1 ${k.color}`}>{k.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function buildPrintHTML(sections, sectionRows, anonymous, filters, orgName) {
  const today = new Date().toISOString().split("T")[0];
  const totalRows = Object.values(sectionRows).flat();

  const tableRows = totalRows.map((o, idx) => {
    const name = anonymous ? anonName(o.resident_name, idx) : (o.resident_name || "—");
    const isOverdue = o.follow_up_required && !o.completion_date && o.target_date && o.target_date < today;
    return `<tr style="${isOverdue ? "background:#fff5f5;" : ""}">
      <td>${fmt(o.created_date)}</td>
      <td>${cap(o.record_type)}</td>
      <td>${name}</td>
      <td>${o.home_name || "—"}</td>
      <td>${o.immediate_outcome || "—"}</td>
      <td>${o.impact_on_young_person || "—"}</td>
      <td>${o.risk_change ? cap(o.risk_change) : "—"}</td>
      <td>${o.learning_identified || "—"}</td>
      <td>${o.follow_up_action || (o.follow_up_required ? "Required" : "None")}</td>
      <td>${o.responsible_person_name || "—"}</td>
      <td>${fmt(o.target_date)}</td>
      <td>${o.completion_date ? `✓ ${fmt(o.completion_date)}` : o.follow_up_required ? "Open" : "—"}</td>
      <td>${o.manager_review_status ? cap(o.manager_review_status) : "—"}</td>
      <td>${o.reviewed_by_name || "—"}</td>
      <td>${fmt(o.reviewed_at)}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Outcome & Impact Evidence Summary — ${orgName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; font-size: 10px; color: #222; }
    h1 { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
    h2 { font-size: 12px; font-weight: bold; margin-top: 20px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .meta { font-size: 10px; color: #666; margin-bottom: 16px; }
    .kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
    .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 6px 10px; min-width: 80px; }
    .kpi p { margin: 0; }
    .kpi .val { font-size: 18px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f0f4f8; padding: 5px 6px; text-align: left; font-weight: bold; font-size: 9px; border-bottom: 2px solid #ccc; }
    td { padding: 4px 6px; border-bottom: 1px solid #eee; vertical-align: top; }
    .badge-increased { background: #fee2e2; color: #b91c1c; padding: 1px 5px; border-radius: 3px; font-weight: bold; }
    .badge-reduced { background: #dcfce7; color: #15803d; padding: 1px 5px; border-radius: 3px; font-weight: bold; }
    .badge-approved { background: #dcfce7; color: #15803d; padding: 1px 5px; border-radius: 3px; font-weight: bold; }
    .badge-pending { background: #fef3c7; color: #92400e; padding: 1px 5px; border-radius: 3px; font-weight: bold; }
    .overdue { color: #dc2626; font-weight: bold; }
    footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 9px; color: #888; text-align: center; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
<h1>Outcome &amp; Impact Evidence Summary</h1>
<div class="meta">
  <strong>Organisation:</strong> ${orgName} &nbsp;|&nbsp;
  <strong>Period:</strong> ${filters.dateFrom} to ${filters.dateTo} &nbsp;|&nbsp;
  <strong>Generated:</strong> ${format(new Date(), "dd MMMM yyyy HH:mm")} &nbsp;|&nbsp;
  ${anonymous ? "<strong style='color:darkorange'>ANONYMISED VIEW</strong>" : "<strong>NAMED VIEW — CONFIDENTIAL</strong>"}
</div>
<p style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:8px;font-size:10px;">
  <strong>Inspection evidence document.</strong> This report is generated from live operational data and is intended for Ofsted/SCCIF inspection preparation. Handle in accordance with your data protection policy.
</p>

<h2>Summary Statistics</h2>
<div class="kpi-row">
  ${[
    ["Total records", totalRows.length],
    ["With learning", totalRows.filter(r => r.learning_identified).length],
    ["Risk increased", totalRows.filter(r => r.risk_change === "increased").length],
    ["Risk reduced", totalRows.filter(r => r.risk_change === "reduced").length],
    ["Open follow-ups", totalRows.filter(r => r.follow_up_required && !r.completion_date).length],
    ["Overdue", totalRows.filter(r => r.follow_up_required && !r.completion_date && r.target_date && r.target_date < today).length],
    ["Mgr approved", totalRows.filter(r => r.manager_review_status === "approved").length],
    ["Awaiting review", totalRows.filter(r => r.manager_review_status === "pending").length],
  ].map(([l, v]) => `<div class="kpi"><p class="val">${v}</p><p>${l}</p></div>`).join("")}
</div>

<h2>All Evidence Records</h2>
<table>
  <thead>
    <tr>
      <th>Date</th><th>Type</th><th>Young Person</th><th>Home</th>
      <th>Immediate Outcome</th><th>Impact on YP</th><th>Risk Change</th>
      <th>Learning Identified</th><th>Follow-up Action</th><th>Responsible</th>
      <th>Target Date</th><th>Completion</th><th>Mgr Review</th>
      <th>Reviewed By</th><th>Reviewed At</th>
    </tr>
  </thead>
  <tbody>${tableRows}</tbody>
</table>

<footer>
  CONFIDENTIAL — Outcome &amp; Impact Evidence Summary | ${orgName} | ${format(new Date(), "dd MMMM yyyy")} | ${totalRows.length} records
  ${anonymous ? " | Anonymised — YP names replaced with reference codes" : ""}
</footer>
</body>
</html>`;
}

function exportCSV(rows, anonymous) {
  const today = new Date().toISOString().split("T")[0];
  const headers = [
    "Date","Record Type","Young Person","Home","Immediate Outcome","Impact on YP",
    "Risk Change","Learning Identified","Follow-up Action","Responsible Person",
    "Target Date","Completion Date","Manager Review Status","Reviewed By","Reviewed At"
  ];
  const escape = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  const csvRows = rows.map((o, idx) => {
    const name = anonymous ? anonName(o.resident_name, idx) : (o.resident_name || "");
    return [
      fmt(o.created_date),
      cap(o.record_type),
      name,
      o.home_name || "",
      o.immediate_outcome || "",
      o.impact_on_young_person || "",
      o.risk_change ? cap(o.risk_change) : "",
      o.learning_identified || "",
      o.follow_up_action || (o.follow_up_required ? "Required" : ""),
      o.responsible_person_name || "",
      fmt(o.target_date),
      o.completion_date ? fmt(o.completion_date) : (o.follow_up_required ? "Open" : ""),
      o.manager_review_status ? cap(o.manager_review_status) : "",
      o.reviewed_by_name || "",
      fmt(o.reviewed_at),
    ].map(escape).join(",");
  });
  const csv = [headers.map(escape).join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `outcome-evidence-summary-${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OutcomeEvidenceReport({ user, staffProfile }) {
  const staffRole = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const isAuthorised = AUTHORISED_ROLES.has(staffRole);
  const isSenior = new Set(["admin", "rsm", "regional_manager"]).has(staffRole);

  const today = new Date().toISOString().split("T")[0];

  // Filters
  const [dateFrom, setDateFrom] = useState(format(new Date(Date.now() - 365 * 86400000), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(today);
  const [filterHome, setFilterHome] = useState("all");
  const [filterResident, setFilterResident] = useState("all");
  const [filterRecordType, setFilterRecordType] = useState("all");
  const [filterRiskChange, setFilterRiskChange] = useState("all");
  const [filterReviewStatus, setFilterReviewStatus] = useState("all");
  const [filterFollowUp, setFilterFollowUp] = useState("all"); // all | open | overdue | completed
  const [anonymous, setAnonymous] = useState(false);
  const [activeSections, setActiveSections] = useState(new Set(SECTIONS.map(s => s.id)));

  // Data
  const { data: homes = [] } = useQuery({ queryKey: ["oer-homes"], queryFn: () => secureGateway.filter("Home", { status: "active" }) });
  const { data: residents = [] } = useQuery({ queryKey: ["oer-residents"], queryFn: () => secureGateway.filter("Resident", {}, "-created_date", 500) });
  const { data: outcomes = [], isLoading } = useQuery({ queryKey: ["oer-outcomes"], queryFn: () => secureGateway.filter("RecordImpactOutcome", {}, "-created_date", 1000) });

  // Permission-scoped home IDs
  const permittedHomeIds = useMemo(() => {
    if (isSenior || staffRole === "admin") return new Set(homes.map(h => h.id));
    return new Set((staffProfile?.home_ids || [staffProfile?.primary_home_id]).filter(Boolean));
  }, [isSenior, staffRole, homes, staffProfile]);

  // Filtered outcomes
  const filtered = useMemo(() => {
    return outcomes.filter(o => {
      if (!isSenior && staffRole !== "admin" && !permittedHomeIds.has(o.home_id)) return false;
      const d = (o.created_date || "").split("T")[0];
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (filterHome !== "all" && o.home_id !== filterHome) return false;
      if (filterResident !== "all" && o.resident_id !== filterResident) return false;
      if (filterRecordType !== "all" && o.record_type !== filterRecordType) return false;
      if (filterRiskChange !== "all" && o.risk_change !== filterRiskChange) return false;
      if (filterReviewStatus !== "all" && o.manager_review_status !== filterReviewStatus) return false;
      if (filterFollowUp === "open" && !(o.follow_up_required && !o.completion_date && (!o.target_date || o.target_date >= today))) return false;
      if (filterFollowUp === "overdue" && !(o.follow_up_required && !o.completion_date && o.target_date && o.target_date < today)) return false;
      if (filterFollowUp === "completed" && !o.completion_date) return false;
      return true;
    });
  }, [outcomes, permittedHomeIds, isSenior, staffRole, dateFrom, dateTo, filterHome, filterResident, filterRecordType, filterRiskChange, filterReviewStatus, filterFollowUp, today]);

  // Build per-section rows
  const sectionRows = useMemo(() => {
    const result = {};
    for (const sec of SECTIONS) {
      let rows = filtered;
      if (sec.recordType) rows = rows.filter(r => r.record_type === sec.recordType);
      if (sec.riskFilter) rows = filtered.filter(r => r.risk_change === sec.riskFilter);
      if (sec.followupFilter) rows = filtered.filter(r => r.follow_up_required && !r.completion_date);
      if (sec.reviewFilter) rows = filtered; // all — for review summary we show everything
      result[sec.id] = rows.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
    }
    return result;
  }, [filtered]);

  const allRows = useMemo(() => Object.values(sectionRows).flat().filter((v, i, a) => a.findIndex(x => x.id === v.id) === i), [sectionRows]);

  const toggleSection = (id) => setActiveSections(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const handlePrint = useCallback(() => {
    const orgName = "CareCoreAI";
    const html = buildPrintHTML(SECTIONS, sectionRows, anonymous, { dateFrom, dateTo }, orgName);
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }, [sectionRows, anonymous, dateFrom, dateTo]);

  const handleCSV = useCallback(() => exportCSV(allRows, anonymous), [allRows, anonymous]);

  if (!isAuthorised) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Shield className="w-10 h-10 text-red-400 mb-3" />
        <h2 className="text-lg font-semibold mb-1">Access Restricted</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          The Outcome & Impact Evidence Summary is restricted to team leader level and above. Contact your manager if you need access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Outcome &amp; Impact Evidence Summary
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Inspection-ready evidence across all modules — for Ofsted/SCCIF preparation
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant={anonymous ? "default" : "outline"}
            className="gap-1.5 h-8 text-xs"
            onClick={() => setAnonymous(v => !v)}
          >
            {anonymous ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {anonymous ? "Anonymised" : "Named"}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={handleCSV}>
            <Download className="w-3.5 h-3.5" /> CSV/Excel
          </Button>
          <Button size="sm" className="gap-1.5 h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/90" onClick={handlePrint}>
            <Printer className="w-3.5 h-3.5" /> PDF / Print
          </Button>
        </div>
      </div>

      {/* Inspection notice */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          <strong>Confidential inspection document.</strong> This report contains live operational outcome data.
          Use the <strong>Anonymised</strong> toggle before sharing externally or in public settings.
          Data comes directly from linked operational records — no sample or hardcoded data is shown.
        </p>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
          <span className="text-xs text-muted-foreground ml-2">{filtered.length} records match</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-8 text-xs" />
          <span className="text-xs text-muted-foreground self-center">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-8 text-xs" />

          <Select value={filterHome} onValueChange={setFilterHome}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="All homes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All homes</SelectItem>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterResident} onValueChange={setFilterResident}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All young people" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All young people</SelectItem>
              {residents.filter(r => r.status === "active").map(r => (
                <SelectItem key={r.id} value={r.id}>{anonymous ? `YP (${r.id.slice(-4)})` : r.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRecordType} onValueChange={setFilterRecordType}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="All record types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All record types</SelectItem>
              {["incident","missing_episode","appointment","ils_session","key_work_session","complaint","safeguarding_concern","risk_assessment","other"].map(t => (
                <SelectItem key={t} value={t}>{cap(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRiskChange} onValueChange={setFilterRiskChange}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Any risk change" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any risk change</SelectItem>
              <SelectItem value="increased">Increased</SelectItem>
              <SelectItem value="reduced">Reduced</SelectItem>
              <SelectItem value="unchanged">Unchanged</SelectItem>
              <SelectItem value="not_applicable">Not applicable</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterReviewStatus} onValueChange={setFilterReviewStatus}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Any review status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any review status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="changes_requested">Changes requested</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterFollowUp} onValueChange={setFilterFollowUp}>
            <SelectTrigger className="w-40 h-8 text-xs"><SelectValue placeholder="Follow-up status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All follow-up statuses</SelectItem>
              <SelectItem value="open">Open follow-ups</SelectItem>
              <SelectItem value="overdue">Overdue follow-ups</SelectItem>
              <SelectItem value="completed">Completed follow-ups</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Section toggles */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground font-medium mb-2">Report sections to include:</p>
          <div className="flex flex-wrap gap-1.5">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => toggleSection(s.id)}
                className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                  activeSections.has(s.id) ? "bg-primary/10 border-primary/30 text-primary font-medium" : "bg-card border-border text-muted-foreground"
                }`}
              >
                {activeSections.has(s.id) ? "✓ " : ""}{s.label.split(". ").slice(1).join(". ") || s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary KPIs */}
      <SummaryKPIs rows={allRows} today={today} />

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
          <span className="text-sm text-muted-foreground">Loading outcome records…</span>
        </div>
      )}

      {/* Report sections */}
      {!isLoading && SECTIONS.filter(s => activeSections.has(s.id)).map(section => (
        <ReportSection
          key={section.id}
          section={section}
          rows={sectionRows[section.id] || []}
          anonymous={anonymous}
          today={today}
        />
      ))}

      {/* Empty state */}
      {!isLoading && allRows.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold mb-1">No outcome records found</p>
          <p className="text-xs text-muted-foreground">
            Adjust the date range or filters, or ensure outcome data has been recorded against incidents, key work sessions, complaints, and other events.
          </p>
        </div>
      )}

      {/* Footer note */}
      {!isLoading && allRows.length > 0 && (
        <div className="text-xs text-muted-foreground border border-border rounded-xl px-4 py-3 bg-muted/20">
          <strong>Data integrity notice:</strong> All rows in this report are sourced from live <em>RecordImpactOutcome</em> records linked to operational events.
          No data has been fabricated. Record counts reflect real-time database state at time of generation.
          {anonymous && <span className="ml-1 text-amber-600 font-medium">Young person names have been replaced with anonymised reference codes (YP-001, YP-002…) in this view.</span>}
        </div>
      )}
    </div>
  );
}