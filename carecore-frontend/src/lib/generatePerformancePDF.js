import { jsPDF } from "jspdf";

const W       = 210;    // A4 width mm
const MARGIN  = 15;
const CW      = W - MARGIN * 2;   // content width = 180mm
const BLUE    = [30, 64, 175];
const SLATE8  = [30, 41, 59];
const SLATE5  = [100, 116, 139];
const SLATE1  = [248, 250, 252];
const BORDER  = [226, 232, 240];

function rule(doc, y) {
  doc.setDrawColor(...BORDER);
  doc.line(MARGIN, y, W - MARGIN, y);
}

function sectionHead(doc, y, text) {
  doc.setFontSize(8);
  doc.setFont(undefined, "bold");
  doc.setTextColor(...SLATE5);
  doc.text(text, MARGIN, y);
  return y + 5;
}

function bullet(doc, x, y, color) {
  doc.setFillColor(...(color ?? SLATE5));
  doc.circle(x + 1.5, y - 1.5, 1, "F");
}

/** @param {import("jspdf").jsPDF} doc */
function checkPage(doc, y, needed = 15) {
  if (y + needed > 280) {
    doc.addPage();
    return 15;
  }
  return y;
}

export function generatePerformancePDF(summary, staffProfile) {
  const doc  = new jsPDF("p", "mm", "a4");
  const m    = summary?.metrics ?? {};
  const period     = summary?.period ?? {};
  const staffName  = summary?.staff_name ?? staffProfile?.full_name ?? "Staff Member";
  const role       = (staffProfile?.job_title ?? staffProfile?.role ?? "").replace(/_/g, " ");
  const home       = staffProfile?.home_names?.[0] ?? "";
  const empId      = staffProfile?.employee_id ?? "";

  let y = 0;

  // ── Header bar ──────────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, "bold");
  doc.text("CareCore AI", MARGIN, 10);

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text("PERFORMANCE SUMMARY", W - MARGIN, 10, { align: "right" });

  doc.setFontSize(7);
  doc.text(
    `Confidential  •  Generated ${new Date().toLocaleDateString("en-GB")}`,
    MARGIN, 17,
  );

  y = 30;

  // ── Staff block ─────────────────────────────────────────────────────────────
  doc.setTextColor(...SLATE8);
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text(staffName, MARGIN, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(...SLATE5);

  const line1 = [
    role   && `Role: ${role}`,
    empId  && `Employee ID: ${empId}`,
  ].filter(Boolean).join("   |   ");

  const line2 = [
    home          && `Home: ${home}`,
    period?.label && `Period: ${period.label}`,
  ].filter(Boolean).join("   |   ");

  if (line1) { doc.text(line1, MARGIN, y); y += 5; }
  if (line2) { doc.text(line2, MARGIN, y); y += 5; }

  y += 3;
  rule(doc, y);
  y += 8;

  // ── Metric cards (2 rows × 3 cols) ─────────────────────────────────────────
  y = sectionHead(doc, y, "KEY METRICS");

  const BOX_W   = (CW - 8) / 3;
  const BOX_H   = 23;
  const BOX_GAP = 4;

  const cards = [
    {
      label: "Activities Completed",
      value: String(m.activities_completed ?? 0),
      sub: m.activities_trend_pct != null
        ? `${m.activities_trend_pct > 0 ? "+" : ""}${m.activities_trend_pct}% vs prev`
        : null,
      accent: [59, 130, 246],
    },
    {
      label: "Hours with Young People",
      value: `${m.hours_with_yp ?? 0}h`,
      sub: m.hours_trend_pct != null
        ? `${m.hours_trend_pct > 0 ? "+" : ""}${m.hours_trend_pct}% vs prev`
        : null,
      accent: [168, 85, 247],
    },
    {
      label: "Training Compliance",
      value: `${m.training_compliance_pct ?? 0}%`,
      sub: (m.training_expiring_soon ?? 0) > 0
        ? `${m.training_expiring_soon} expiring soon`
        : "All up to date",
      accent: (m.training_compliance_pct ?? 0) >= 80 ? [34, 197, 94] : [245, 158, 11],
    },
    {
      label: "Active Goals",
      value: String(m.active_goals_count ?? 0),
      sub: (m.goals_achieved_this_period ?? 0) > 0
        ? `${m.goals_achieved_this_period} achieved this period`
        : null,
      accent: [20, 184, 166],
    },
    {
      label: "Supervision Status",
      value: (m.supervision_status ?? "No Record")
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase()),
      sub: m.last_supervision_date ? `Last: ${m.last_supervision_date}` : null,
      accent: m.supervision_status === "on_track" ? [34, 197, 94]
        : m.supervision_status === "overdue" ? [239, 68, 68]
        : [245, 158, 11],
    },
    {
      label: "Attendance",
      value: `${m.attendance_pct ?? 0}%`,
      sub: (m.shifts_worked ?? 0) > 0 ? `${m.shifts_worked} shifts worked` : null,
      accent: [249, 115, 22],
    },
  ];

  cards.forEach((card, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const bx  = MARGIN + col * (BOX_W + BOX_GAP);
    const by  = y + row * (BOX_H + BOX_GAP);

    doc.setFillColor(...SLATE1);
    doc.roundedRect(bx, by, BOX_W, BOX_H, 2, 2, "F");
    doc.setFillColor(...card.accent);
    doc.rect(bx, by, 2, BOX_H, "F");

    doc.setFontSize(6.5);
    doc.setFont(undefined, "normal");
    doc.setTextColor(...SLATE5);
    doc.text(card.label.toUpperCase(), bx + 5, by + 5.5);

    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.setTextColor(...SLATE8);
    doc.text(card.value, bx + 5, by + 14);

    if (card.sub) {
      doc.setFontSize(7);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...SLATE5);
      doc.text(card.sub, bx + 5, by + 20);
    }
  });

  y += 2 * (BOX_H + BOX_GAP) + 4;

  rule(doc, y);
  y += 8;

  // ── Active Goals ────────────────────────────────────────────────────────────
  const activeGoals = summary?.active_goals ?? [];
  if (activeGoals.length > 0) {
    y = checkPage(doc, y, 10 + activeGoals.length * 5);
    y = sectionHead(doc, y, "ACTIVE GOALS");

    activeGoals.slice(0, 6).forEach(g => {
      const title  = typeof g === "string" ? g : (g.title ?? "Goal");
      const status = typeof g === "object"
        ? `  (${(g.status ?? "").replace(/_/g, " ")} — ${g.progress ?? 0}%)`
        : "";

      doc.setFontSize(8.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...SLATE8);
      bullet(doc, MARGIN, y, [59, 130, 246]);
      doc.text(`${title}${status}`, MARGIN + 5, y);
      y += 5;
    });

    if (activeGoals.length > 6) {
      doc.setFontSize(7.5);
      doc.setTextColor(...SLATE5);
      doc.text(`+ ${activeGoals.length - 6} more goals`, MARGIN + 5, y);
      y += 5;
    }

    y += 3;
    rule(doc, y);
    y += 8;
  }

  // ── Recent Activities ────────────────────────────────────────────────────────
  const recentActivities = summary?.recent_activities ?? [];
  if (recentActivities.length > 0) {
    y = checkPage(doc, y, 10 + Math.min(recentActivities.length, 8) * 5);
    y = sectionHead(doc, y, "RECENT ACTIVITIES");

    recentActivities.slice(0, 8).forEach(a => {
      const type  = (a.type ?? "Activity").replace(/_/g, " ");
      const yp    = a.resident_name ? ` with ${a.resident_name}` : "";
      const loc   = a.home_name     ? ` at ${a.home_name}` : "";
      const hrs   = (a.hours_with_yp ?? 0) > 0 ? `  (${a.hours_with_yp}h)` : "";
      const date  = a.date ? `${a.date}  ` : "";

      doc.setFontSize(8.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...SLATE8);
      bullet(doc, MARGIN, y, SLATE5);
      doc.text(`${date}${type}${yp}${loc}${hrs}`, MARGIN + 5, y);
      y += 5;
    });

    y += 3;
  }

  // ── Upcoming Supervisions ────────────────────────────────────────────────────
  const upcoming = summary?.upcoming_supervisions ?? [];
  if (upcoming.length > 0) {
    y = checkPage(doc, y, 10 + upcoming.length * 5);
    rule(doc, y);
    y += 8;
    y = sectionHead(doc, y, "UPCOMING SUPERVISIONS");

    upcoming.forEach(s => {
      const type       = (s.type ?? "Supervision").replace(/_/g, " ");
      const supervisor = s.supervisor_name ? ` with ${s.supervisor_name}` : "";
      const date       = s.date ? `${s.date}  ` : "";

      doc.setFontSize(8.5);
      doc.setFont(undefined, "normal");
      doc.setTextColor(...SLATE8);
      bullet(doc, MARGIN, y, [59, 130, 246]);
      doc.text(`${date}${type}${supervisor}`, MARGIN + 5, y);
      y += 5;
    });
  }

  // ── Footer ───────────────────────────────────────────────────────────────────
  const PH = 297;
  doc.setFillColor(...SLATE1);
  doc.rect(0, PH - 11, W, 11, "F");
  doc.setDrawColor(...BORDER);
  doc.line(0, PH - 11, W, PH - 11);

  doc.setFontSize(7);
  doc.setFont(undefined, "normal");
  doc.setTextColor(...SLATE5);
  doc.text("CareCore AI — Confidential", MARGIN, PH - 4);
  doc.text(
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    W - MARGIN, PH - 4, { align: "right" },
  );

  // ── Save ─────────────────────────────────────────────────────────────────────
  const safeName   = staffName.replace(/[^a-z0-9]/gi, "-").toLowerCase();
  const safePeriod = (period?.label ?? "report").replace(/[^a-z0-9]/gi, "-").toLowerCase();
  doc.save(`performance-summary-${safeName}-${safePeriod}.pdf`);
}
