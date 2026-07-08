import { useState } from "react";
import { CheckCircle, AlertTriangle, XCircle, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { differenceInDays, parseISO, format } from "date-fns";
import RTWCheckModal from "./RTWCheckModal";

const DOC_LABELS = {
  uk_passport: "UK Passport",
  irish_passport: "Irish Passport",
  biometric_card: "Biometric Residence Permit",
  settled_status_share_code: "Settled Status (Share Code)",
  pre_settled_share_code: "Pre-Settled Status (Share Code)",
  birth_certificate_plus_ni: "Birth Certificate + NI Letter",
  certificate_of_naturalisation: "Certificate of Naturalisation",
  other: "Other Document",
};

function getRTWStatus(member) {
  if (!member.rtw_checked) return { type: "not_checked", label: "Not Verified", color: "red" };
  if (member.rtw_expiry_date) {
    const days = differenceInDays(parseISO(member.rtw_expiry_date), new Date());
    if (days < 0) return { type: "expired", label: `EXPIRED ${member.rtw_expiry_date}`, color: "red", critical: true };
    if (days <= 60) return { type: "expiring", label: `Expires ${member.rtw_expiry_date} (${days}d)`, color: "amber" };
  }
  if (member.rtw_follow_up_date) {
    const days = differenceInDays(parseISO(member.rtw_follow_up_date), new Date());
    if (days <= 30) return { type: "recheck", label: `Recheck due ${member.rtw_follow_up_date}`, color: "amber" };
  }
  return { type: "verified", label: member.rtw_expiry_date ? `Valid until ${member.rtw_expiry_date}` : "Indefinite", color: "green" };
}

export default function RTWStatusCard({ member, user, allStaff, onSave }) {
  const [showModal, setShowModal] = useState(false);
  const status = getRTWStatus(member);
  const checkerStaff = allStaff.find(s => s.id === member.rtw_checked_by);
  const checkedByName = user?.full_name || user?.email || "Unknown";

  const colorMap = {
    green: { bg: "bg-green-50 border-green-200", icon: CheckCircle, iconColor: "text-green-600", labelColor: "text-green-700", badgeBg: "bg-green-100 text-green-700" },
    amber: { bg: "bg-amber-50 border-amber-200", icon: AlertTriangle, iconColor: "text-amber-500", labelColor: "text-amber-700", badgeBg: "bg-amber-100 text-amber-700" },
    red: { bg: "bg-red-50 border-red-200", icon: XCircle, iconColor: "text-red-500", labelColor: "text-red-700", badgeBg: "bg-red-100 text-red-700" },
  };
  const c = colorMap[status.color];
  const Icon = c.icon;

  return (
    <>
      <div className={`rounded-xl border p-4 ${c.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center shrink-0`}>
              <Shield className={`w-4 h-4 ${c.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Right to Work</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.badgeBg}`}>
                  <Icon className="inline w-3 h-3 mr-0.5" />
                  {status.type === "not_checked" ? "NOT VERIFIED" :
                   status.type === "expired" ? "EXPIRED" :
                   status.type === "expiring" ? "EXPIRING SOON" :
                   status.type === "recheck" ? "RECHECK DUE" : "VERIFIED"}
                </span>
              </div>

              {member.rtw_checked ? (
                <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <p><span className="font-medium text-foreground">Document:</span> {DOC_LABELS[member.rtw_document_type] || member.rtw_document_type || "—"}</p>
                  <p><span className="font-medium text-foreground">Checked:</span> {member.rtw_check_date ? format(parseISO(member.rtw_check_date), "dd MMM yyyy") : "—"}{checkerStaff || member.rtw_checked_by ? ` by ${checkerStaff?.full_name || member.rtw_checked_by}` : ""}</p>
                  <p><span className="font-medium text-foreground">Expires:</span> <span className={c.labelColor}>{member.rtw_expiry_date ? format(parseISO(member.rtw_expiry_date), "dd MMM yyyy") : "Never (indefinite)"}</span></p>
                  {member.rtw_follow_up_date && (
                    <p><span className="font-medium text-foreground">Recheck:</span> {format(parseISO(member.rtw_follow_up_date), "dd MMM yyyy")}</p>
                  )}
                  {status.critical && (
                    <p className="font-semibold text-red-700 mt-1">⚠ Employment must be suspended pending recheck.</p>
                  )}
                </div>
              ) : (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p>No right to work check recorded.</p>
                  <p className="text-red-600 font-medium mt-1">This is required before employment begins.</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            {member.rtw_document_url && (
              <a href={member.rtw_document_url} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 w-full">
                  <ExternalLink className="w-3 h-3" /> View Doc
                </Button>
              </a>
            )}
            <Button
              size="sm"
              variant={member.rtw_checked ? "outline" : "default"}
              className={`h-7 text-xs ${!member.rtw_checked ? "bg-red-600 hover:bg-red-700 text-white border-0" : ""}`}
              onClick={() => setShowModal(true)}
            >
              {member.rtw_checked ? "Update Check" : "Record RTW Check"}
            </Button>
          </div>
        </div>
      </div>

      {showModal && (
        <RTWCheckModal
          member={member}
          checkedByName={checkedByName}
          onSave={onSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}