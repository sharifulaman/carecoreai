import { Button } from "@/components/ui/button";

export function getHealthStatus(resident) {
  if (!resident) return "not_started";
  const hasHealth = resident.gp_name || (resident.medical_conditions || []).length > 0 || resident.health_notes;
  if (hasHealth && resident.gp_name) return "completed";
  if (hasHealth) return "in_progress";
  return "not_started";
}

const SEVERITY_BADGE = {
  mild: "bg-yellow-100 text-yellow-700",
  moderate: "bg-orange-100 text-orange-700",
  severe: "bg-red-100 text-red-700",
  anaphylactic: "bg-red-600 text-white",
};

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 py-1 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground w-32 shrink-0">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

export default function S3HealthSummary({ resident, onNavigateToTab }) {
  if (!resident) return null;

  const conditions = resident.medical_conditions || [];
  const allergies = resident.allergies || [];

  return (
    <div className="space-y-4">
      {/* GP */}
      <div className="rounded-lg border border-border p-3 space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">GP / Doctor</p>
        <InfoRow label="NHS Number" value={resident.nhs_number} />
        <InfoRow label="GP Name" value={resident.gp_name} />
        <InfoRow label="Practice" value={resident.gp_practice} />
        <InfoRow label="Phone" value={resident.gp_phone} />
        <InfoRow label="Registered since" value={resident.gp_registered_date} />
        {!resident.gp_name && <p className="text-xs text-muted-foreground italic">No GP details recorded.</p>}
      </div>

      {/* Dentist */}
      {(resident.dentist_name || resident.dentist_next_appointment) && (
        <div className="rounded-lg border border-border p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Dentist</p>
          <InfoRow label="Dentist Name" value={resident.dentist_name} />
          <InfoRow label="Practice" value={resident.dentist_practice} />
          <InfoRow label="Last appointment" value={resident.dentist_last_appointment} />
          <InfoRow label="Next appointment" value={resident.dentist_next_appointment} />
        </div>
      )}

      {/* Allergies */}
      {allergies.length > 0 && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Allergies ({allergies.length})</p>
          <div className="flex flex-wrap gap-2">
            {allergies.map((a, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_BADGE[a.severity] || "bg-gray-100 text-gray-600"}`}>
                {a.allergen} ({a.severity})
              </span>
            ))}
          </div>
        </div>
      )}
      {allergies.length === 0 && (
        <p className="text-xs text-green-700 font-medium">✓ No known allergies</p>
      )}

      {/* Medical conditions */}
      {conditions.length > 0 && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Medical Conditions ({conditions.length})</p>
          <div className="space-y-1">
            {conditions.map((c, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium">{c.condition}</span>
                {c.diagnosed_date && <span className="text-muted-foreground"> · diagnosed {c.diagnosed_date}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health notes */}
      {resident.health_notes && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Health Notes</p>
          <p className="text-xs text-foreground whitespace-pre-wrap">{resident.health_notes}</p>
        </div>
      )}

      {resident.health_updated_at && (
        <p className="text-xs text-muted-foreground">Last updated: {new Date(resident.health_updated_at).toLocaleDateString("en-GB")}</p>
      )}

      <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("health")}>
        Go to Health tab →
      </Button>
    </div>
  );
}