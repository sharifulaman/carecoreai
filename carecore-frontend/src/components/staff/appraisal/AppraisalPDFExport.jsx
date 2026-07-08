import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";

const OUTCOME_LABELS = {
  excellent: "Excellent",
  good: "Good",
  satisfactory: "Satisfactory",
  below_expectations: "Below Expectations",
  improvement_plan: "Improvement Plan Required",
};

export async function generateAppraisalPDF(appraisal, staff, org, user) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  const checkNewPage = (height) => {
    if (yPos + height > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55);
  doc.text("APPRAISAL RECORD", margin, yPos);
  yPos += 8;

  if (org?.logo_url) {
    try { doc.addImage(org.logo_url, "PNG", pageWidth - margin - 20, margin, 20, 20); } catch (_) {}
  }

  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(org?.name || "Organisation", margin, yPos);
  yPos += 5;

  // ── Details grid ──────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const typeLabel = {
    annual: "Annual", probation: "Probation", mid_year: "Mid-Year", improvement_review: "Improvement Review"
  }[appraisal.appraisal_type] || "—";

  const details = [
    ["Staff Name:", appraisal.appraisee_name || appraisal.staff_name || "—"],
    ["Job Title:", (staff?.role ? staff.role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()) : staff?.job_title) || "—"],
    ["Appraiser:", appraisal.appraiser_name || "—"],
    ["Appraisal Type:", typeLabel],
    ["Appraisal Date:", appraisal.appraisal_date || "—"],
    ["Evidence Period:", appraisal.period_start ? `${appraisal.period_start} to ${appraisal.period_end || appraisal.appraisal_date}` : "—"],
    ["Next Appraisal Due:", appraisal.next_appraisal_date || "—"],
  ];

  details.forEach(([label, value]) => {
    doc.setFont(undefined, "bold"); doc.text(label, margin, yPos);
    doc.setFont(undefined, "normal"); doc.text(value, margin + 50, yPos);
    yPos += 5;
  });
  yPos += 3;

  // ── Rolling score (if present) ────────────────────────────────────────────
  if (appraisal.rolling_score != null) {
    checkNewPage(8);
    doc.setFont(undefined, "bold");
    doc.text("Evidence-Based Score:", margin, yPos);
    doc.setFont(undefined, "normal");
    doc.text(`${appraisal.rolling_score}/100  (evidence-informed — manager's judgement determines the final outcome)`, margin + 50, yPos);
    yPos += 7;
  }

  // ── Overall Rating ────────────────────────────────────────────────────────
  if (appraisal.overall_rating) {
    checkNewPage(8);
    doc.setFont(undefined, "bold"); doc.text("Overall Rating:", margin, yPos);
    const stars = `${appraisal.overall_rating} / 5`;
    doc.setTextColor(0, 0, 0);
    doc.text(stars, margin + 45, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 7;
  }

  // ── Narrative sections ────────────────────────────────────────────────────
  const narSections = [
    ["Performance & Feedback:", appraisal.performance_notes],
    ["Key Strengths:", appraisal.strengths],
    ["Areas for Development:", appraisal.areas_for_development],
    ["Employee Comments:", appraisal.employee_comments],
  ];
  narSections.forEach(([title, text]) => {
    if (!text) return;
    checkNewPage(10);
    doc.setFont(undefined, "bold"); doc.setFontSize(10); doc.text(title, margin, yPos); yPos += 5;
    doc.setFont(undefined, "normal"); doc.setFontSize(9);
    doc.splitTextToSize(text, contentWidth).forEach(line => { checkNewPage(4); doc.text(line, margin, yPos); yPos += 4; });
    yPos += 2;
  });

  // ── Development Goals ─────────────────────────────────────────────────────
  if (appraisal.goals?.length) {
    checkNewPage(15);
    doc.setFont(undefined, "bold"); doc.setFontSize(10); doc.text("Development Goals", margin, yPos); yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [["Goal", "Target Date", "Status", "Progress Notes"]],
      body: appraisal.goals.map(g => [g.title || "—", g.target_date || "—", (g.rag_status || "—").toUpperCase(), g.progress_notes || "—"]),
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 45 }, 1: { cellWidth: 30 }, 2: { cellWidth: 25 }, 3: { cellWidth: contentWidth - 100 } },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { yPos = data.cursor.y + 2; },
    });
  }

  // ── Competency Scores (new — skipped gracefully for legacy appraisals) ────
  if (appraisal.competency_scores?.length) {
    checkNewPage(15);
    doc.setFont(undefined, "bold"); doc.setFontSize(10); doc.text("Competency Scores", margin, yPos); yPos += 6;
    autoTable(doc, {
      startY: yPos,
      head: [["Competency", "Score (1-5)", "Overridden?", "Comment"]],
      body: appraisal.competency_scores.map(c => [
        c.label || c.key || "—",
        `${c.score || "—"}${c.suggested_score ? ` (suggested: ${c.suggested_score})` : ""}`,
        c.manager_overridden ? "Yes" : "No",
        c.comment || "—",
      ]),
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: contentWidth - 120 } },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { yPos = data.cursor.y + 2; },
    });
  }

  // ── Key evidence metrics (from evidence_snapshot) ─────────────────────────
  const snap = appraisal.evidence_snapshot;
  if (snap && typeof snap === "object" && Object.keys(snap).length > 0) {
    checkNewPage(15);
    doc.setFont(undefined, "bold"); doc.setFontSize(10); doc.text("Key Evidence Metrics", margin, yPos); yPos += 6;

    const evidRows = [
      ["Hours with YP", snap.hours_with_yp != null ? snap.hours_with_yp.toFixed(1) : "—"],
      ["Key-work sessions", snap.key_work_sessions ?? "—"],
      ["Training completion", snap.training_complete_pct != null ? `${snap.training_complete_pct}%` : "—"],
      ["Training overdue", snap.training_overdue_count ?? "—"],
      ["Supervisions in period", snap.supervision_count ?? "—"],
      ["Supervision missed", snap.supervision_missed ?? "—"],
      ["Bradford Factor", snap.bradford_factor ?? "—"],
      ["Allegations against", snap.allegations_against ?? "—"],
      ["Incomplete records", snap.incomplete_records ?? "—"],
      ["YP feedback submissions", snap.yp_feedback_count ?? "—"],
      ["SW/PA feedback submissions", snap.swpa_feedback_count ?? "—"],
    ].filter(([, v]) => v !== "—" && v !== null && v !== undefined);

    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Value"]],
      body: evidRows,
      headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: { 0: { cellWidth: contentWidth * 0.65 }, 1: { cellWidth: contentWidth * 0.35 } },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { yPos = data.cursor.y + 2; },
    });
  }

  // ── Outcome ───────────────────────────────────────────────────────────────
  if (appraisal.outcome) {
    checkNewPage(6);
    doc.setFont(undefined, "bold"); doc.text("Appraisal Outcome:", margin, yPos);
    doc.setFont(undefined, "normal");
    doc.text(OUTCOME_LABELS[appraisal.outcome] || appraisal.outcome.replace(/_/g, " "), margin + 50, yPos);
    yPos += 7;
  }

  // ── Signatures ────────────────────────────────────────────────────────────
  checkNewPage(30);
  yPos += 5;
  doc.setFont(undefined, "bold"); doc.setFontSize(9); doc.text("Acknowledgements & Signatures", margin, yPos); yPos += 8;
  doc.setFont(undefined, "normal"); doc.setFontSize(8);
  doc.text("Employee Signature: ________________________   Date: _______________", margin, yPos); yPos += 8;
  doc.text("Manager Signature: ___________________________   Date: _______________", margin, yPos); yPos += 8;
  doc.text("Senior Manager Approval: ___________________   Date: _______________", margin, yPos);

  // ── Upload & Download ─────────────────────────────────────────────────────
  const fileName = `Appraisal_${appraisal.staff_name}_${appraisal.appraisal_date}.pdf`;
  
  // Trigger browser download
  doc.save(fileName);

  const pdfBlob = doc.output("blob");

  try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfBlob });
    await secureGateway.create("StaffDocument", {
      org_id: appraisal.org_id,
      staff_id: appraisal.staff_id,
      staff_name: appraisal.staff_name,
      document_type: "appraisal",
      document_name: fileName,
      file_url,
      uploaded_by: user?.id,
      uploaded_at: new Date().toISOString(),
    });
    return { success: true, file_url };
  } catch (error) {
    throw new Error(`Failed to export appraisal PDF: ${error.message}`);
  }
}