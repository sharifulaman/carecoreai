import jsPDF from "npm:jspdf";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";

export async function generateAppraisalPDF(appraisal, staff, org, user) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper to add a new page if needed
  const checkNewPage = (height) => {
    if (yPos + height > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Header
  doc.setFontSize(14);
  doc.setTextColor(31, 41, 55); // navy
  doc.text("APPRAISAL RECORD", margin, yPos);
  yPos += 8;

  if (org?.logo_url) {
    try {
      doc.addImage(org.logo_url, "PNG", pageWidth - margin - 20, margin, 20, 20);
    } catch (e) {
      // Logo failed to load
    }
  }

  doc.setFontSize(10);
  doc.setTextColor(75, 85, 99);
  doc.text(org?.name || "Organisation", margin, yPos);
  yPos += 5;

  // Staff and appraisal details
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);

  const details = [
    ["Staff Name:", appraisal.staff_name],
    ["Job Title:", staff?.job_title || "—"],
    ["Home:", staff?.home_ids?.[0] ? `Home ${staff.home_ids[0]}` : "—"],
    ["Appraiser:", appraisal.appraiser_name || "—"],
    ["Appraisal Date:", appraisal.appraisal_date || "—"],
    ["Next Appraisal Due:", appraisal.next_appraisal_date || "—"],
  ];

  details.forEach(([label, value]) => {
    doc.setFont(undefined, "bold");
    doc.text(label, margin, yPos);
    doc.setFont(undefined, "normal");
    doc.text(value, margin + 45, yPos);
    yPos += 5;
  });

  yPos += 3;

  // Overall Rating (stars)
  if (appraisal.overall_rating) {
    checkNewPage(8);
    doc.setFont(undefined, "bold");
    doc.text("Overall Rating:", margin, yPos);
    const stars = "★".repeat(appraisal.overall_rating) + "☆".repeat(5 - appraisal.overall_rating);
    doc.setTextColor(255, 193, 7); // gold
    doc.text(stars, margin + 45, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 7;
  }

  // Performance Notes
  if (appraisal.performance_notes) {
    checkNewPage(10);
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text("Performance & Feedback:", margin, yPos);
    yPos += 5;
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    const splitNotes = doc.splitTextToSize(appraisal.performance_notes, contentWidth);
    splitNotes.forEach(line => {
      checkNewPage(4);
      doc.text(line, margin, yPos);
      yPos += 4;
    });
    yPos += 2;
  }

  // Strengths
  if (appraisal.strengths) {
    checkNewPage(10);
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text("Key Strengths:", margin, yPos);
    yPos += 5;
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    const splitStrengths = doc.splitTextToSize(appraisal.strengths, contentWidth);
    splitStrengths.forEach(line => {
      checkNewPage(4);
      doc.text(line, margin, yPos);
      yPos += 4;
    });
    yPos += 2;
  }

  // Development Areas
  if (appraisal.areas_for_development) {
    checkNewPage(10);
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text("Areas for Development:", margin, yPos);
    yPos += 5;
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);
    const splitDev = doc.splitTextToSize(appraisal.areas_for_development, contentWidth);
    splitDev.forEach(line => {
      checkNewPage(4);
      doc.text(line, margin, yPos);
      yPos += 4;
    });
    yPos += 3;
  }

  // Development Goals Table
  if (appraisal.goals && appraisal.goals.length > 0) {
    checkNewPage(15);
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.text("Development Goals", margin, yPos);
    yPos += 6;

    const tableData = appraisal.goals.map(g => [
      g.title,
      g.target_date || "—",
      (g.rag_status || "—").toUpperCase(),
      g.progress_notes || "—",
    ]);

    doc.autoTable({
      startY: yPos,
      head: [["Goal", "Target Date", "Status", "Progress Notes"]],
      body: tableData,
      headStyles: { fillColor: [31, 41, 55], textColor: 255, fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: contentWidth - 100 },
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        yPos = data.cursor.y + 2;
      },
    });
  }

  // Outcome
  if (appraisal.outcome) {
    checkNewPage(6);
    doc.setFont(undefined, "bold");
    doc.text("Appraisal Outcome:", margin, yPos);
    doc.setFont(undefined, "normal");
    doc.text(appraisal.outcome.replace(/_/g, " "), margin + 50, yPos);
    yPos += 7;
  }

  // Signature section
  checkNewPage(20);
  yPos += 5;
  doc.setFont(undefined, "bold");
  doc.setFontSize(9);
  doc.text("Acknowledgements & Signatures", margin, yPos);
  yPos += 8;

  doc.setFont(undefined, "normal");
  doc.setFontSize(8);
  doc.text("Employee Signature: ________________________   Date: _______________", margin, yPos);
  yPos += 8;
  doc.text("Manager Signature: ___________________________   Date: _______________", margin, yPos);
  yPos += 8;
  doc.text("Senior Manager Approval: ___________________   Date: _______________", margin, yPos);

  // Generate PDF blob and upload
  const pdfBlob = doc.output("blob");
  const fileName = `Appraisal_${appraisal.staff_name}_${appraisal.appraisal_date}.pdf`;

  try {
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfBlob });

    // Create StaffDocument record
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

    // Update AppraisalRecord with PDF document ID
    // Note: PDF document ID would be returned from StaffDocument creation
    return { success: true, file_url };
  } catch (error) {
    throw new Error(`Failed to export appraisal PDF: ${error.message}`);
  }
}