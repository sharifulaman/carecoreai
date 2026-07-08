import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Download, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORG_ID } from "@/lib/roleConfig";
import Reg26StorageAuditModal from "./Reg26StorageAuditModal";

const ITEM_LABELS = {
  item1: "Statement of Purpose (Reg 9)",
  item2: "Written Guide for Children",
  item3: "Safeguarding Policy (Reg 20)",
  item4: "Missing Child Policy (Reg 21)",
  item5: "Behaviour Management Policy (Reg 22)",
  item6: "Records of Restraint Use (Reg 22(2))",
  item7: "Children's Case Records (Reg 24)",
  item8: "Children's Register and Staff Register (Reg 25)",
  item9: "Complaints Procedure (Reg 31)",
  item10: "Complaints Records (Reg 31)",
  item11: "Quality of Support Review Reports (Reg 32)",
  item12: "Location Assessment Records (Reg 6(2)(a))",
};

export default function Reg26StorageRecords({ staffProfile }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  // Fetch audits
  const { data: audits = [] } = useQuery({
    queryKey: ["reg26-audits"],
    queryFn: () => base44.entities.StorageAudit.filter({ org_id: ORG_ID }, "-audit_date", 50),
    staleTime: 5 * 60 * 1000,
  });

  const latestAudit = audits[0];

  // Stats
  const stats = useMemo(() => {
    if (!latestAudit) return { compliant: 0, issues: 0, date: null, overdue: true };
    const overdue = new Date(latestAudit.next_audit_due) < new Date();
    return {
      compliant: latestAudit.items_fully_compliant || 0,
      issues: latestAudit.items_with_issues || 0,
      date: latestAudit.audit_date,
      overdue,
      compliance: latestAudit.overall_compliance_percentage || 0,
    };
  }, [latestAudit]);

  // Status banner
  const getStatusBanner = () => {
    if (!latestAudit) {
      return { type: "error", title: "No Storage Audit", text: "No audit has been conducted. Regulation 26 requires all specified records to be stored accessibly. Conduct an audit to confirm compliance." };
    }
    const daysOld = Math.floor((new Date() - new Date(latestAudit.audit_date)) / (1000 * 60 * 60 * 24));
    if (daysOld > 365) {
      return { type: "warning", title: "Audit Overdue", text: `Your last audit was ${daysOld} days ago. An annual review is recommended.` };
    }
    if (stats.issues > 0) {
      return { type: "warning", title: "Issues Identified", text: `Audit completed ${format(new Date(stats.date), "d MMM yyyy")}. ${stats.issues} item(s) have issues requiring attention.` };
    }
    return { type: "success", title: "Compliant", text: `Audit completed ${format(new Date(stats.date), "d MMM yyyy")}. All 12 items are accessible and compliant.` };
  };

  const banner = getStatusBanner();

  const downloadReport = (audit) => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reg 26 Storage Audit Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 5px; }
    .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
    .meta { font-size: 13px; color: #666; margin-bottom: 30px; }
    .summary { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
    .summary p { margin: 5px 0; }
    .item { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #ddd; }
    .item h3 { margin: 0 0 10px 0; }
    .item p { margin: 3px 0; font-size: 13px; }
    .status-pass { color: #156724; font-weight: bold; }
    .status-fail { color: #721c24; font-weight: bold; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; font-size: 12px; }
  </style>
</head>
<body>

<div class="header">
  <h1>RECORD STORAGE AUDIT</h1>
  <p style="margin: 0;">Regulation 26 — Supported Accommodation (England) Regulations 2023</p>
</div>

<div class="meta">
  <p><strong>Audit Date:</strong> ${format(new Date(audit.audit_date), "d MMMM yyyy")}</p>
  <p><strong>Conducted by:</strong> ${audit.conducted_by_name}, RSM</p>
  <p><strong>Audit Period:</strong> ${audit.audit_year}</p>
</div>

<div class="summary">
  <p><strong>Items reviewed:</strong> 12</p>
  <p><strong>Items fully compliant:</strong> ${audit.items_fully_compliant}</p>
  <p><strong>Items with issues:</strong> ${audit.items_with_issues}</p>
  <p><strong>Overall compliance:</strong> ${audit.overall_compliance_percentage.toFixed(1)}%</p>
</div>

<h2>ITEM BY ITEM REVIEW</h2>

${Object.entries(ITEM_LABELS).map(([key, label], idx) => {
  const itemExists = audit[`${key}_exists`];
  const itemAccessible = audit[`${key}_accessible`];
  const itemUpToDate = audit[`${key}_up_to_date`];
  const itemNotes = audit[`${key}_notes`];
  const isPass = itemExists && itemAccessible && (itemUpToDate !== undefined ? itemUpToDate : true);
  const statusClass = isPass ? "status-pass" : "status-fail";
  return `<div class="item">
    <h3>${idx + 1}. ${label}</h3>
    <p class="${statusClass}">${isPass ? "✓ COMPLIANT" : "✗ ISSUE IDENTIFIED"}</p>
    ${itemNotes ? `<p><strong>Notes:</strong> ${itemNotes}</p>` : ""}
  </div>`;
}).join("")}

<footer>
  <p><strong>DECLARATION</strong></p>
  <p>I confirm that I have reviewed all 12 items required by Regulation 26 of the Supported Accommodation (England) Regulations 2023 and that to the best of my knowledge all records are stored in an accessible manner and can be produced on demand.</p>
  <p style="margin-top: 20px;"><strong>Signed:</strong> ${audit.conducted_by_name}</p>
  <p><strong>Date:</strong> ${format(new Date(audit.audit_date), "d MMMM yyyy")}</p>
  ${audit.approved_by_name ? `<p style="margin-top: 20px;"><strong>Approved by:</strong> ${audit.approved_by_name}</p><p><strong>Date:</strong> ${audit.approved_at ? format(new Date(audit.approved_at), "d MMMM yyyy") : "—"}</p>` : ""}
</footer>

</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Regulation 26 — Storage of Records</h2>
        <p className="text-sm text-muted-foreground mt-1">All specified records must be stored in an accessible manner and may be kept in electronic form. An annual audit confirms that all 12 categories required by Regulation 26 can be produced on demand.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Items Fully Compliant" value={stats.compliant} color="bg-green-100 text-green-700" />
        <StatCard label="Items With Issues" value={stats.issues} color="bg-red-100 text-red-700" />
        <StatCard label="Last Audit Date" value={stats.date ? format(new Date(stats.date), "d MMM yyyy") : "Never"} color={stats.overdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"} />
      </div>

      {/* Status Banner */}
      <div className={`rounded-lg p-4 border-l-4 ${
        banner.type === "success" ? "bg-green-50 border-green-500 text-green-900" :
        banner.type === "warning" ? "bg-amber-50 border-amber-500 text-amber-900" :
        "bg-red-50 border-red-500 text-red-900"
      }`}>
        <p className="font-semibold text-sm">{banner.title}</p>
        <p className="text-xs mt-1">{banner.text}</p>
      </div>

      {/* Run Audit Button */}
      <Button onClick={() => setModalOpen(true)} className="w-full">
        Run Storage Audit
      </Button>

      {/* Audit History */}
      {audits.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Audit History</h3>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 font-semibold text-xs">Year</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Conducted By</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Compliant</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Compliance %</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {audits.map(audit => (
                  <tr key={audit.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-mono text-xs">{audit.audit_year}</td>
                    <td className="px-4 py-3 text-xs">{format(new Date(audit.audit_date), "d MMM yyyy")}</td>
                    <td className="px-4 py-3 text-xs">{audit.conducted_by_name}</td>
                    <td className="px-4 py-3 text-xs font-semibold">{audit.items_fully_compliant} of 12</td>
                    <td className="px-4 py-3 text-xs font-semibold">{audit.overall_compliance_percentage.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                        audit.status === "approved" ? "bg-green-100 text-green-700" :
                        audit.status === "completed" ? "bg-blue-100 text-blue-700" :
                        "bg-amber-100 text-amber-700"
                      }`}>{audit.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs space-x-1">
                      <Button variant="ghost" size="sm" onClick={() => setExpandedAuditId(expandedAuditId === audit.id ? null : audit.id)}>
                        {expandedAuditId === audit.id ? "Hide" : "View"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => downloadReport(audit)} className="gap-1">
                        <Download className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expanded Audit Detail */}
      {expandedAuditId && audits.find(a => a.id === expandedAuditId) && (
        <Reg26AuditDetail audit={audits.find(a => a.id === expandedAuditId)} />
      )}

      {/* Modal */}
      <Reg26StorageAuditModal isOpen={modalOpen} onClose={() => setModalOpen(false)} staffProfile={staffProfile} />
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <p className="text-xs opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function Reg26AuditDetail({ audit }) {
  return (
    <div className="bg-muted/10 rounded-lg p-6 space-y-4">
      <h3 className="font-semibold">Audit Detail</h3>
      <div className="space-y-3">
        {Object.entries(ITEM_LABELS).map(([key, label], idx) => {
          const exists = audit[`${key}_exists`];
          const notes = audit[`${key}_notes`];
          return (
            <div key={key} className="border border-border rounded-lg p-3">
              <div className="flex items-start gap-2">
                {exists ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium">{idx + 1}. {label}</p>
                  {notes && <p className="text-xs text-muted-foreground mt-1">{notes}</p>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {audit.audit_summary_notes && (
        <div className="border border-border rounded-lg p-3 bg-white">
          <p className="text-xs font-medium">Audit Summary Notes</p>
          <p className="text-xs text-muted-foreground mt-1">{audit.audit_summary_notes}</p>
        </div>
      )}
    </div>
  );
}