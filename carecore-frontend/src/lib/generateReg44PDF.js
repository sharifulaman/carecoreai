import { jsPDF } from "jspdf";

export function generateReg44PDF(report) {
  const doc = new jsPDF();
  let yPosition = 10;

  // Header
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text("REGULATION 44 INDEPENDENT MONITORING VISIT REPORT", 105, yPosition, { align: "center" });
  yPosition += 10;

  doc.setFontSize(11);
  doc.text(`${report.home_name}`, 105, yPosition, { align: "center" });
  yPosition += 6;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Visit Date: ${report.visit_date} | Month: ${report.visit_month}`, 105, yPosition, { align: "center" });
  yPosition += 10;

  // Summary Box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(240, 240, 240);
  doc.rect(10, yPosition - 5, 190, 30, "F");

  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("VISIT SUMMARY", 15, yPosition);
  yPosition += 6;

  doc.setFontSize(10);
  doc.text(`Inspector: ${report.inspector_name} (${report.inspector_organisation || "N/A"})`, 15, yPosition);
  yPosition += 5;
  doc.text(`Visit Duration: ${report.visit_duration_hours || "N/A"} hours | Residents: ${report.residents_spoken_to || "N/A"} | Staff: ${report.staff_spoken_to || "N/A"}`, 15, yPosition);
  yPosition += 10;

  // Overall Rating
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text("OVERALL RATING", 15, yPosition);
  yPosition += 6;

  const ratingColor = {
    outstanding: [0, 128, 0],
    good: [0, 100, 200],
    requires_improvement: [255, 128, 0],
    inadequate: [200, 0, 0],
  };
  const color = ratingColor[report.overall_rating] || [0, 0, 0];
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setFontSize(14);
  doc.setFont(undefined, "bold");
  doc.text(report.overall_rating.toUpperCase(), 15, yPosition);
  yPosition += 10;

  // Quality Standards
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("QUALITY STANDARDS ASSESSMENT", 15, yPosition);
  yPosition += 8;

  doc.setFont(undefined, "normal");
  doc.setFontSize(9);

  // Manual table for standards
  report.quality_standards.forEach((s, idx) => {
    const itemText = `Standard ${s.standard_number}: ${s.standard_name} — Rating: ${s.rating}`;
    const wrapped = doc.splitTextToSize(itemText, 180);
    if (yPosition + wrapped.length * 3 > 280) {
      doc.addPage();
      yPosition = 10;
    }
    doc.text(wrapped, 15, yPosition);
    yPosition += wrapped.length * 3 + 2;
    if (s.evidence) {
      const evText = doc.splitTextToSize(`Evidence: ${s.evidence}`, 170);
      doc.text(evText, 20, yPosition);
      yPosition += evText.length * 2.5 + 1;
    }
  });

  yPosition += 5;

  // Findings
  if (report.strengths || report.areas_for_improvement || report.serious_concerns) {
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("KEY FINDINGS", 15, yPosition);
    yPosition += 6;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    if (report.strengths) {
      doc.setTextColor(0, 128, 0);
      doc.text("STRENGTHS:", 15, yPosition);
      yPosition += 4;
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(report.strengths, 180);
      doc.text(splitText, 15, yPosition);
      yPosition += splitText.length * 4 + 4;
    }

    if (report.areas_for_improvement) {
      doc.setTextColor(0, 0, 200);
      doc.text("AREAS FOR IMPROVEMENT:", 15, yPosition);
      yPosition += 4;
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(report.areas_for_improvement, 180);
      doc.text(splitText, 15, yPosition);
      yPosition += splitText.length * 4 + 4;
    }

    if (report.serious_concerns) {
      doc.setTextColor(200, 0, 0);
      doc.text("SERIOUS CONCERNS:", 15, yPosition);
      yPosition += 4;
      doc.setTextColor(0, 0, 0);
      const splitText = doc.splitTextToSize(report.serious_concern_detail || "None recorded", 180);
      doc.text(splitText, 15, yPosition);
      yPosition += splitText.length * 4 + 4;
    }
  }

  yPosition += 5;

  // Recommendations
  if (report.new_recommendations && report.new_recommendations.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 15;
    }
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("NEW RECOMMENDATIONS", 15, yPosition);
    yPosition += 10;

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    report.new_recommendations.forEach((rec, idx) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 15;
      }
      const recText = `${idx + 1}. ${rec.recommendation}`;
      const wrapped = doc.splitTextToSize(recText, 180);
      doc.text(wrapped, 15, yPosition);
      yPosition += wrapped.length * 2.5;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Priority: ${rec.priority} | Due: ${rec.target_date} | Responsible: ${rec.responsible_person}`, 20, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      yPosition += 4;
    });
  }

  // Manager Response (if exists)
  if (report.manager_response || report.action_plan) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("REGISTERED MANAGER RESPONSE", 15, yPosition);
    yPosition += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);

    if (report.manager_response) {
      doc.text("Response to Findings:", 15, yPosition);
      yPosition += 5;
      const splitText = doc.splitTextToSize(report.manager_response, 175);
      doc.text(splitText, 15, yPosition);
      yPosition += splitText.length * 3;
    }

    if (report.action_plan) {
      doc.text("Action Plan:", 15, yPosition);
      yPosition += 5;
      const splitText = doc.splitTextToSize(report.action_plan, 175);
      doc.text(splitText, 15, yPosition);
      yPosition += splitText.length * 3;
    }
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")} | CareCore AI Regulation 44 Module`, 105, doc.internal.pageSize.getHeight() - 10, {
    align: "center",
  });

  // Download
  doc.save(`Reg44-${report.home_name}-${report.visit_month}.pdf`);
}