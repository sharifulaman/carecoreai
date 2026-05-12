import { Button } from "@/components/ui/button";

const STATUS_LABELS = {
  enrolled_college: "Enrolled — College",
  enrolled_school: "Enrolled — School",
  neet: "NEET",
  employed: "Employed",
  training: "Training / Apprenticeship",
  unknown: "Unknown",
};

const STATUS_COLOURS = {
  enrolled_college: "bg-green-100 text-green-700",
  enrolled_school: "bg-green-100 text-green-700",
  neet: "bg-red-100 text-red-700",
  employed: "bg-teal-100 text-teal-700",
  training: "bg-blue-100 text-blue-700",
  unknown: "bg-gray-100 text-gray-500",
};

export function getEducationStatus(resident) {
  if (!resident) return "not_started";
  if (resident.education_provider?.trim()) return "completed";
  if (resident.education_status && resident.education_status !== "unknown") return "in_progress";
  return "not_started";
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

export default function S4EducationSummary({ resident, onNavigateToTab }) {
  if (!resident) return null;

  const status = resident.education_status || "unknown";
  const label = STATUS_LABELS[status] || "Unknown";
  const colour = STATUS_COLOURS[status] || "bg-gray-100 text-gray-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${colour}`}>{label}</span>
      </div>

      {(resident.education_provider || resident.education_course) && (
        <div className="rounded-lg border border-border p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Provider</p>
          <InfoRow label="School / College" value={resident.education_provider} />
          <InfoRow label="Course / Year" value={resident.education_course} />
          <InfoRow label="Enrolled" value={resident.education_enrolment_date} />
          <InfoRow label="Expected end" value={resident.education_expected_end_date} />
          {resident.education_days_attended?.length > 0 && (
            <InfoRow label="Days" value={resident.education_days_attended.join(", ")} />
          )}
        </div>
      )}

      {resident.education_contact_name && (
        <div className="rounded-lg border border-border p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Provider Contact</p>
          <InfoRow label="Contact" value={resident.education_contact_name} />
          <InfoRow label="Phone" value={resident.education_contact_phone} />
          <InfoRow label="Email" value={resident.education_contact_email} />
        </div>
      )}

      {resident.education_notes && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
          <p className="text-xs text-foreground whitespace-pre-wrap">{resident.education_notes}</p>
        </div>
      )}

      {!resident.education_provider && !resident.education_course && (
        <p className="text-xs text-muted-foreground italic">No provider details recorded.</p>
      )}

      {resident.education_updated_at && (
        <p className="text-xs text-muted-foreground">Last updated: {new Date(resident.education_updated_at).toLocaleDateString("en-GB")}</p>
      )}

      <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("education")}>
        Go to Education tab →
      </Button>
    </div>
  );
}