import { format } from "date-fns";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

// ── Column definitions ────────────────────────────────────────────────────────
// `w` is the proportional weight used to distribute PDF table width.

const COLUMNS = [
  { header: "Date & Time",      key: "created_date",    w: 38, fmt: v => v ? format(new Date(v), "dd/MM/yyyy HH:mm") : "" },
  { header: "User",             key: "actor_name",       w: 32 },
  { header: "Role",             key: "actor_role",       w: 26, fmt: v => v?.replace(/_/g, " ") ?? "" },
  { header: "Module",           key: "module_name",      w: 22 },
  { header: "Reference",        key: "record_reference", w: 35 },
  { header: "Record Title",     key: "record_title",     w: 44 },
  { header: "Action",           key: "action_type",      w: 22, fmt: v => v?.replace(/_/g, " ") ?? "" },
  { header: "Severity",         key: "severity",         w: 20, fmt: v => v ? v[0].toUpperCase() + v.slice(1) : "" },
  { header: "IP Address",       key: "ip_address",       w: 30 },
];

const TOTAL_W = COLUMNS.reduce((s, c) => s + c.w, 0); // 269

function cellValue(entry, col) {
  const raw = entry[col.key] ?? "";
  return col.fmt ? col.fmt(raw) : String(raw);
}

function filenameWithDate(prefix) {
  return `${prefix}-${format(new Date(), "yyyy-MM-dd")}`;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function csvQuote(v) {
  const s = String(v ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export function exportCSV(entries) {
  const header = COLUMNS.map(c => c.header).join(",");
  const rows = entries.map(e =>
    COLUMNS.map(c => csvQuote(cellValue(e, c))).join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  triggerDownload(blob, `${filenameWithDate("audit-trail")}.csv`);
}

// ── Excel ─────────────────────────────────────────────────────────────────────

export function exportExcel(entries) {
  const rows = [
    COLUMNS.map(c => c.header),
    ...entries.map(e => COLUMNS.map(c => cellValue(e, c))),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto-fit column widths (characters)
  ws["!cols"] = COLUMNS.map(col => ({
    wch: Math.max(col.header.length, 14),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit Trail");
  XLSX.writeFile(wb, `${filenameWithDate("audit-trail")}.xlsx`);
}

// ── PDF ───────────────────────────────────────────────────────────────────────

const PDF_MARGIN = 14;   // mm
const PDF_HDR_H  = 18;   // title bar + column header combined height
const PDF_COL_H  = 8;    // column header row height (within HDR_H)
const PDF_ROW_H  = 6.5;  // data row height
const PDF_FONT_DATA = 6.5;
const PDF_FONT_COL  = 7;

const SEVERITY_COLORS = {
  low:      [21,  128,  61],
  medium:   [161,  98,   7],
  high:     [185,  28,  28],
  critical: [127,  29,  29],
};

export function exportPDF(entries) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();   // 297mm
  const pageH = doc.internal.pageSize.getHeight();  // 210mm
  const tableW = pageW - PDF_MARGIN * 2;            // 269mm

  // Scale column widths to exactly fill tableW
  const scale = tableW / TOTAL_W;
  const cols = COLUMNS.map(c => ({ ...c, w: c.w * scale }));

  const generated = format(new Date(), "dd/MM/yyyy HH:mm");
  let y = PDF_MARGIN;
  let pageNum = 1;

  function drawPageHeader() {
    // ── Blue title bar ─────────────────────────────────────────────
    doc.setFillColor(30, 64, 175);
    doc.rect(PDF_MARGIN, y, tableW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("CareCoreAI — Audit Trail Report", PDF_MARGIN + 2, y + 5.5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Generated: ${generated}  |  ${entries.length.toLocaleString()} records`,
      pageW - PDF_MARGIN - 2,
      y + 5.5,
      { align: "right" }
    );

    // ── Column header row ─────────────────────────────────────────
    const colY = y + 9;
    doc.setFillColor(241, 245, 249);
    doc.rect(PDF_MARGIN, colY, tableW, PDF_COL_H, "F");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(PDF_FONT_COL);
    doc.setFont("helvetica", "bold");
    let x = PDF_MARGIN;
    for (const col of cols) {
      doc.text(col.header, x + 1.5, colY + 5.5);
      x += col.w;
    }
    doc.setDrawColor(203, 213, 225);
    doc.line(PDF_MARGIN, colY + PDF_COL_H, PDF_MARGIN + tableW, colY + PDF_COL_H);

    y = colY + PDF_COL_H;
  }

  function drawPageFooter() {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(
      `CareCoreAI — Confidential  |  Page ${pageNum}`,
      pageW / 2,
      pageH - 5,
      { align: "center" }
    );
  }

  drawPageHeader();

  for (let i = 0; i < entries.length; i++) {
    // ── Page break ─────────────────────────────────────────────────
    if (y + PDF_ROW_H > pageH - PDF_MARGIN - 8) {
      drawPageFooter();
      doc.addPage();
      pageNum++;
      y = PDF_MARGIN;
      drawPageHeader();
    }

    const entry = entries[i];

    // Alternating row background
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(PDF_MARGIN, y, tableW, PDF_ROW_H, "F");
    }

    doc.setFontSize(PDF_FONT_DATA);
    doc.setFont("helvetica", "normal");

    let x = PDF_MARGIN;
    for (const col of cols) {
      const text = cellValue(entry, col);

      if (col.key === "severity" && text) {
        const rgb = SEVERITY_COLORS[text.toLowerCase()] ?? [30, 41, 59];
        doc.setTextColor(...rgb);
        doc.setFont("helvetica", "bold");
      } else {
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
      }

      // Clip to column width so text never overflows into the next column.
      const clipped = doc.splitTextToSize(text, col.w - 2)[0] ?? "";
      doc.text(clipped, x + 1.5, y + 4.2);
      x += col.w;
    }

    // Row divider
    doc.setDrawColor(226, 232, 240);
    doc.line(PDF_MARGIN, y + PDF_ROW_H, PDF_MARGIN + tableW, y + PDF_ROW_H);

    y += PDF_ROW_H;
  }

  drawPageFooter();
  doc.save(`${filenameWithDate("audit-trail")}.pdf`);
}

// ── Shared helper ─────────────────────────────────────────────────────────────

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
