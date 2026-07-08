import { useMemo } from "react";
import { differenceInDays, parseISO, format } from "date-fns";
import { Download, CheckCircle, AlertTriangle, XCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const DOC_LABELS = {
  uk_passport: "UK Passport",
  irish_passport: "Irish Passport",
  biometric_card: "Biometric Residence Permit",
  settled_status_share_code: "Settled Status (Share Code)",
  pre_settled_share_code: "Pre-Settled (Share Code)",
  birth_certificate_plus_ni: "Birth Cert + NI",
  certificate_of_naturalisation: "Certificate of Naturalisation",
  other: "Other",
};

function getRTWStatus(s) {
  if (!s.rtw_checked) return { label: "Not Checked", color: "red", sort: 0 };
  if (s.rtw_expiry_date) {
    const days = differenceInDays(parseISO(s.rtw_expiry_date), new Date());
    if (days < 0) return { label: "Expired", color: "red", sort: 1 };
    if (days <= 60) return { label: `Expiring Soon (${days}d)`, color: "amber", sort: 2 };
    return { label: `Valid until ${format(parseISO(s.rtw_expiry_date), "dd MMM yyyy")}`, color: "green", sort: 4 };
  }
  if (s.rtw_follow_up_date) {
    const days = differenceInDays(parseISO(s.rtw_follow_up_date), new Date());
    if (days <= 30) return { label: `Recheck Due (${days}d)`, color: "amber", sort: 3 };
  }
  return { label: "Verified — Indefinite", color: "green", sort: 5 };
}

const STATUS_STYLE = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

function exportRTWPDF(staff) {
  // Build a simple HTML page and print it
  const rows = staff.map(s => {
    const status = getRTWStatus(s);
    return `<tr>
      <td>${s.full_name}</td>
      <td>${s.employee_id || "—"}</td>
      <td>${DOC_LABELS[s.rtw_document_type] || "—"}</td>
      <td>${s.rtw_check_date ? format(parseISO(s.rtw_check_date), "dd MMM yyyy") : "—"}</td>
      <td>${s.rtw_checked_by || "—"}</td>
      <td>${s.rtw_expiry_date ? format(parseISO(s.rtw_expiry_date), "dd MMM yyyy") : (s.rtw_checked ? "Indefinite" : "—")}</td>
      <td>${status.label}</td>
      <td>${s.rtw_follow_up_date ? format(parseISO(s.rtw_follow_up_date), "dd MMM yyyy") : "—"}</td>
    </tr>`;
  }).join("");
  const win = window.open("", "_blank");
  win.document.write(`<html><head><title>RTW Compliance Report</title>
    <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}
    table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
    th{background:#1a3a8f;color:#fff}tr:nth-child(even){background:#f5f5f5}
    h2{color:#1a3a8f}p{color:#555;font-size:10px}</style></head>
    <body>
    <h2>Right to Work Compliance Report</h2>
    <p>Generated: ${format(new Date(), "dd MMM yyyy HH:mm")} — CareCore AI</p>
    <table><thead><tr>
      <th>Staff Member</th><th>Emp ID</th><th>Document Type</th><th>Check Date</th>
      <th>Checked By</th><th>Expiry</th><th>Status</th><th>Next Recheck</th>
    </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`);
  win.document.close();
  win.print();
}

export default function RTWComplianceReport({ staff = [] }) {
  const activeStaff = staff.filter(s => s.status === "active");

  const rows = useMemo(() =>
    [...activeStaff]
      .map(s => ({ ...s, _status: getRTWStatus(s) }))
      .sort((a, b) => a._status.sort - b._status.sort),
    [activeStaff]
  );

  const verified = rows.filter(s => s._status.color === "green").length;
  const needAttention = rows.filter(s => s._status.color !== "green").length;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Right to Work Compliance Report</h3>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => exportRTWPDF(activeStaff)}>
          <Download className="w-3 h-3" /> Export PDF
        </Button>
      </div>

      {/* Summary */}
      <div className={`flex items-start gap-2 p-3 rounded-lg text-sm ${needAttention > 0 ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-green-50 border border-green-200 text-green-800"}`}>
        {needAttention > 0
          ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          : <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
        <span>
          <strong>{verified} of {activeStaff.length}</strong> active staff have verified right to work.
          {needAttention > 0 && <span className="font-semibold"> {needAttention} require attention.</span>}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Staff Member</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Document Type</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Check Date</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Checked By</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Expiry</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-3 py-2 font-medium text-muted-foreground">Next Recheck</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(s => (
              <tr key={s.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2.5 font-medium">{s.full_name}</td>
                <td className="px-3 py-2.5 text-muted-foreground">{DOC_LABELS[s.rtw_document_type] || "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {s.rtw_check_date ? format(parseISO(s.rtw_check_date), "dd MMM yyyy") : "—"}
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{s.rtw_checked_by || "—"}</td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {s.rtw_expiry_date ? format(parseISO(s.rtw_expiry_date), "dd MMM yyyy") : (s.rtw_checked ? "Indefinite" : "—")}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_STYLE[s._status.color]}`}>
                    {s._status.label}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">
                  {s.rtw_follow_up_date ? format(parseISO(s.rtw_follow_up_date), "dd MMM yyyy") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}