import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { differenceInDays, parseISO } from "date-fns";
import { FileText, Download, Shield, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const DOC_TYPE_LABELS = {
  dbs_certificate: "DBS Certificate",
  right_to_work: "Right to Work",
  contract: "Employment Contract",
  qualification: "Qualification / Certificate",
  id: "ID Document",
  training_certificate: "Training Certificate",
  supervision_record: "Supervision Record",
  appraisal_form: "Appraisal Form",
  disciplinary_letter: "Disciplinary Letter",
  other: "Other",
};

function getDocStatus(expiryDate) {
  if (!expiryDate) return { label: "Permanent", className: "bg-muted text-muted-foreground" };
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return { label: "Expired", className: "bg-red-100 text-red-700" };
  if (days <= 90) return { label: "Expiring Soon", className: "bg-amber-100 text-amber-700" };
  return { label: "Valid", className: "bg-green-100 text-green-700" };
}

function DBSCard({ profile }) {
  const [showNumber, setShowNumber] = useState(false);
  if (!profile?.dbs_number && !profile?.dbs_expiry) return null;

  const status = profile.dbs_expiry ? getDocStatus(profile.dbs_expiry) : null;
  const days = profile.dbs_expiry ? differenceInDays(parseISO(profile.dbs_expiry), new Date()) : null;
  const maskedNumber = profile.dbs_number
    ? "••••••" + profile.dbs_number.slice(-4)
    : null;

  return (
    <div className={`rounded-xl border p-4 mb-4 ${days !== null && days <= 90 ? "bg-amber-50 border-amber-300" : "bg-card border-border"}`}>
      <div className="flex items-start gap-3">
        <Shield className={`w-5 h-5 shrink-0 mt-0.5 ${days !== null && days <= 0 ? "text-red-500" : days !== null && days <= 90 ? "text-amber-500" : "text-green-600"}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">DBS Certificate</p>
            {status && <Badge className={`text-xs ${status.className}`}>{status.label}</Badge>}
          </div>
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Type</span>
              <span className="font-medium capitalize">{profile.dbs_type?.replace(/_/g, " ") || "—"}</span>
            </div>
            {maskedNumber && (
              <div className="flex justify-between items-center">
                <span>Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{showNumber ? profile.dbs_number : maskedNumber}</span>
                  <button onClick={() => setShowNumber(s => !s)} className="text-primary hover:opacity-70">
                    {showNumber ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
            {profile.dbs_expiry && (
              <div className="flex justify-between">
                <span>Expires</span>
                <span className={`font-medium ${days !== null && days <= 90 ? "text-amber-600" : ""}`}>
                  {profile.dbs_expiry} {days !== null && days <= 90 && days >= 0 ? `⚠️ (${days} days)` : days !== null && days < 0 ? "⛔ Expired" : ""}
                </span>
              </div>
            )}
            {profile.dbs_issue_date && (
              <div className="flex justify-between">
                <span>Issued</span>
                <span className="font-medium">{profile.dbs_issue_date}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyDocumentsSection({ myProfile }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["my-staff-docs", myProfile?.id],
    queryFn: () => secureGateway.filter("StaffDocument", { staff_id: myProfile.id }),
    enabled: !!myProfile?.id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return <div className="py-10 text-center text-muted-foreground text-sm">Loading documents…</div>;

  const groupedDocs = docs.reduce((acc, d) => {
    const key = d.document_type || "other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* DBS Card */}
      <DBSCard profile={myProfile} />

      <p className="text-xs text-muted-foreground">{docs.length} document{docs.length !== 1 ? "s" : ""} on file — contact your administrator to upload or remove documents</p>

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedDocs).map(([type, typeDocs]) => (
            <div key={type}>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{DOC_TYPE_LABELS[type] || type}</p>
              <div className="space-y-2">
                {typeDocs.map(doc => {
                  const status = getDocStatus(doc.expiry_date);
                  return (
                    <div key={doc.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/20 transition-colors">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {doc.issue_date && <span className="text-[10px] text-muted-foreground">Issued: {doc.issue_date}</span>}
                          {doc.expiry_date && <span className="text-[10px] text-muted-foreground">Expires: {doc.expiry_date}</span>}
                        </div>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${status.className}`}>{status.label}</Badge>
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noreferrer" title="Download">
                          <Download className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}