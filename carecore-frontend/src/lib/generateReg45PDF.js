import { jsPDF } from "jspdf";

export function generateReg45PDF(review, home) {
  const doc = new jsPDF();
  let yPosition = 10;

  // Header
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text("REGULATION 45 ANNUAL REVIEW", 105, yPosition, { align: "center" });
  yPosition += 10;

  doc.setFontSize(12);
  doc.text(home.name, 105, yPosition, { align: "center" });
  yPosition += 6;

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Review Period: ${review.review_year} (${review.period_start} to ${review.period_end})`, 105, yPosition, { align: "center" });
  yPosition += 8;

  // Summary Statistics
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("SUMMARY STATISTICS", 15, yPosition);
  yPosition += 8;

  doc.setFont(undefined, "normal");
  doc.setFontSize(10);
  const stats = [
    ["Regulation 44 Reports Completed", String(review.reg44_reports_completed || 0)],
    ["Total Recommendations Made", String(review.total_recommendations_made || 0)],
    ["Recommendations Actioned", String(review.recommendations_actioned || 0)],
    ["Total Complaints Received", String(review.total_complaints || 0)],
    ["Complaints Upheld", String(review.upheld_complaints || 0)],
    ["Missing from Home Episodes", String(review.missing_from_home_episodes || 0)],
    ["Ofsted Notifications Made", String(review.ofsted_notifications_made || 0)],
  ];

  stats.forEach((stat, i) => {
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 15;
    }
    doc.setTextColor(0, 0, 0);
    doc.text(stat[0], 15, yPosition);
    doc.setFont(undefined, "bold");
    doc.text(stat[1], 180, yPosition, { align: "right" });
    doc.setFont(undefined, "normal");
    yPosition += 6;
  });

  yPosition += 8;

  // Regulation 44 Ratings
  if (review.overall_ratings_breakdown) {
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("REGULATION 44 OVERALL RATINGS", 15, yPosition);
    yPosition += 8;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    const bd = review.overall_ratings_breakdown;
    const ratings = [
      ["Outstanding", String(bd.outstanding || 0)],
      ["Good", String(bd.good || 0)],
      ["Requires Improvement", String(bd.requires_improvement || 0)],
      ["Inadequate", String(bd.inadequate || 0)],
    ];

    ratings.forEach(r => {
      doc.text(r[0], 20, yPosition);
      doc.setFont(undefined, "bold");
      doc.text(r[1], 180, yPosition, { align: "right" });
      doc.setFont(undefined, "normal");
      yPosition += 6;
    });

    yPosition += 6;
  }

  // Qualitative sections
  const sections = [
    { title: "Quality of Care Assessment", content: review.quality_of_care_assessment },
    { title: "Children's Outcomes & Development", content: review.children_outcomes_assessment },
    { title: "Safeguarding Effectiveness", content: review.safeguarding_effectiveness },
    { title: "Leadership & Management", content: review.leadership_assessment },
    { title: "Improvements Made This Year", content: review.improvements_made_this_year },
    { title: "Areas for Development", content: review.areas_for_development },
    { title: "Priorities for Next Year", content: review.priorities_for_next_year },
  ];

  sections.forEach((section) => {
    if (!section.content) return;

    if (yPosition > 220) {
      doc.addPage();
      yPosition = 15;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(section.title, 15, yPosition);
    yPosition += 6;

    doc.setFont(undefined, "normal");
    doc.setFontSize(10);
    const wrapped = doc.splitTextToSize(section.content, 175);
    doc.text(wrapped, 15, yPosition);
    yPosition += wrapped.length * 3 + 4;
  });

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")} | CareCore AI Regulation 45 Module`, 105, doc.internal.pageSize.getHeight() - 10, {
    align: "center",
  });

  doc.save(`Reg45-${home.name}-${review.review_year}.pdf`);
}