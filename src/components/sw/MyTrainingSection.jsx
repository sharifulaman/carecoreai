import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { differenceInDays, parseISO } from "date-fns";
import { CheckCircle, AlertTriangle, XCircle, Download, BookOpen } from "lucide-react";

function getTrainingStatus(record) {
  if (!record) return "not_started";
  if (!record.expiry_date) return "completed";
  const days = differenceInDays(parseISO(record.expiry_date), new Date());
  if (days < 0) return "expired";
  if (days <= 60) return "expiring_soon";
  return "completed";
}

function TrainingCard({ record }) {
  const status = getTrainingStatus(record);

  const statusConfig = {
    completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 border-green-200", label: "Valid" },
    expiring_soon: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Expiring Soon" },
    expired: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 border-red-200", label: "Expired" },
    not_started: { icon: XCircle, color: "text-muted-foreground", bg: "bg-muted/30 border-border", label: "Not Started" },
  }[status] || {};

  const Icon = statusConfig.icon;
  const daysUntilExpiry = record?.expiry_date
    ? differenceInDays(parseISO(record.expiry_date), new Date())
    : null;

  const validMonths = daysUntilExpiry !== null && daysUntilExpiry > 0
    ? `Valid for ${Math.floor(daysUntilExpiry / 30)} more month${Math.floor(daysUntilExpiry / 30) !== 1 ? "s" : ""}`
    : null;

  return (
    <div className={`rounded-xl border p-4 ${statusConfig.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${statusConfig.color}`} />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{record?.course_name}</p>
            {record?.category && <p className="text-xs text-muted-foreground mt-0.5">{record.category}</p>}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {record?.completion_date && <span>Completed: {record.completion_date}</span>}
              {record?.expiry_date && <span>Expires: {record.expiry_date}</span>}
              {validMonths && <span className={statusConfig.color}>{validMonths}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusConfig.color} ${statusConfig.bg}`}>
            {statusConfig.label}
          </span>
          {record?.certificate_url && (
            <a href={record.certificate_url} target="_blank" rel="noreferrer" title="Download certificate">
              <Download className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyTrainingSection({ myProfile }) {
  const { data: records = [], isLoading } = useQuery({
    queryKey: ["my-training", myProfile?.id],
    queryFn: () => secureGateway.filter("TrainingRecord", { staff_id: myProfile.id }, "-completion_date"),
    enabled: !!myProfile?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["training-requirements-sw"],
    queryFn: () => secureGateway.filter("TrainingRequirement", { is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return <div className="py-10 text-center text-muted-foreground text-sm">Loading training records…</div>;

  // Compliance check: mandatory courses
  const mandatoryCourses = requirements.filter(r => r.is_mandatory !== false);
  const needsAttention = records.filter(r => {
    const status = getTrainingStatus(r);
    return status === "expired" || status === "expiring_soon";
  });
  const isCompliant = needsAttention.length === 0;

  // Sort: expired first, then expiring_soon, then completed
  const sortOrder = { expired: 0, expiring_soon: 1, completed: 2, not_started: 3 };
  const sorted = [...records].sort((a, b) => sortOrder[getTrainingStatus(a)] - sortOrder[getTrainingStatus(b)]);

  return (
    <div className="space-y-5">
      {/* Compliance banner */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${isCompliant ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
        {isCompliant ? (
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        )}
        <div>
          <p className={`font-semibold text-sm ${isCompliant ? "text-green-700" : "text-amber-700"}`}>
            {isCompliant ? "You are COMPLIANT ✓" : `Action Required ⚠️ — ${needsAttention.length} course${needsAttention.length !== 1 ? "s" : ""} need${needsAttention.length === 1 ? "s" : ""} attention`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">{records.length} training record{records.length !== 1 ? "s" : ""} on file</p>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <BookOpen className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No training records yet.</p>
          <p className="text-xs mt-1">Your training records will appear here once added by your manager.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(r => <TrainingCard key={r.id} record={r} />)}
        </div>
      )}
    </div>
  );
}