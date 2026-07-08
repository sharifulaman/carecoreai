import { Button } from "@/components/ui/button";

export function getActivitiesStatus(resident) {
  if (!resident) return "not_started";
  const hasAny = resident.leisure_gym_enrolled || resident.leisure_leisure_centre_enrolled ||
    resident.leisure_football_enrolled || (resident.leisure_other_clubs || []).length > 0 ||
    resident.leisure_interests?.trim();
  return hasAny ? "completed" : "not_started";
}

export default function S9ActivitiesSummary({ resident, onNavigateToTab }) {
  if (!resident) return null;

  const clubs = resident.leisure_other_clubs || [];
  const hasActivities = resident.leisure_gym_enrolled || resident.leisure_leisure_centre_enrolled ||
    resident.leisure_football_enrolled || clubs.length > 0;

  return (
    <div className="space-y-4">
      {/* Enrolled activities */}
      <div className="flex flex-wrap gap-2">
        {resident.leisure_gym_enrolled && (
          <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
            🏋️ Gym{resident.leisure_gym_name ? `: ${resident.leisure_gym_name}` : ""}
          </span>
        )}
        {resident.leisure_leisure_centre_enrolled && (
          <span className="text-xs px-3 py-1 rounded-full bg-teal-100 text-teal-700 font-medium">
            🏊 Leisure Centre{resident.leisure_leisure_centre ? `: ${resident.leisure_leisure_centre}` : ""}
          </span>
        )}
        {resident.leisure_football_enrolled && (
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-medium">
            ⚽ Football{resident.leisure_football_club ? `: ${resident.leisure_football_club}` : ""}
          </span>
        )}
        {clubs.map((c, i) => (
          <span key={i} className="text-xs px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-medium">
            🎯 {c.name}{c.type ? ` (${c.type})` : ""}{c.day ? ` · ${c.day}` : ""}
          </span>
        ))}
        {!hasActivities && (
          <span className="text-xs text-muted-foreground italic">No activities recorded.</span>
        )}
      </div>

      {/* Interests */}
      {resident.leisure_interests && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Interests & hobbies</p>
          <p className="text-sm">{resident.leisure_interests}</p>
        </div>
      )}
      {resident.leisure_notes && (
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Notes</p>
          <p className="text-sm text-muted-foreground">{resident.leisure_notes}</p>
        </div>
      )}

      {resident.leisure_updated_at && (
        <p className="text-xs text-muted-foreground">
          Last updated: {new Date(resident.leisure_updated_at).toLocaleDateString("en-GB")}
        </p>
      )}

      <Button size="sm" variant="outline" onClick={() => onNavigateToTab?.("leisure")}>
        Go to Activities & Leisure tab →
      </Button>
    </div>
  );
}