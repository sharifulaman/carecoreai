import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";

const TABS = ["Overview", "Changes", "Related"];

const SYSTEM_KEYS = new Set([
  "id", "created_date", "updated_date", "created_by", "org_id", "is_deleted",
]);

// Returns [{ field, before, after }] for every key that changed between two snapshots.
function computeDiff(before, after) {
  if (!before && !after) return [];
  const b = before || {};
  const a = after || {};
  const allKeys = new Set([...Object.keys(b), ...Object.keys(a)]);
  const changed = [];
  for (const key of allKeys) {
    if (SYSTEM_KEYS.has(key)) continue;
    if (JSON.stringify(b[key]) !== JSON.stringify(a[key])) {
      changed.push({ field: key, before: b[key] ?? null, after: a[key] ?? null });
    }
  }
  return changed;
}

function ValueCell({ value }) {
  if (value === null || value === undefined) {
    return <span className="italic text-muted-foreground">—</span>;
  }
  const display = typeof value === "object" ? JSON.stringify(value, null, 2) : String(value);
  return (
    <pre className="whitespace-pre-wrap break-all font-mono text-xs bg-background p-1 rounded">
      {display}
    </pre>
  );
}

export default function AuditEventDetails({ event, onClose }) {
  const [activeTab, setActiveTab] = useState("Overview");

  // Reuses the "homes-picker-list" cache populated by the header's HomesPicker,
  // so this lookup is typically instant rather than a fresh request.
  const { data: homes = [] } = useQuery({
    queryKey: ["homes-picker-list"],
    queryFn: () => base44.entities.Home.list("name", 500),
    staleTime: 5 * 60 * 1000,
  });
  const homeName = event.home_id
    ? homes.find((h) => h.id === event.home_id)?.name
    : null;

  const year = event.created_date
    ? new Date(event.created_date).getFullYear()
    : new Date().getFullYear();
  const refSuffix = String(event.id ?? "").slice(-5).padStart(5, "0");
  const eventRef = `EVENT-${year}-${refSuffix}`;

  const diff = computeDiff(event.before_data, event.after_data);

  return (
    <div className="w-96 bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-320px)]">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-medium">EVENT REFERENCE</p>
          <p className="text-lg font-bold text-foreground">{eventRef}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="p-4 grid grid-cols-2 gap-2 border-b border-border bg-muted/10">
        <div className="p-2 bg-background rounded border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Date / Time</p>
          <p className="text-xs font-semibold text-foreground">
            {event.created_date
              ? format(new Date(event.created_date), "dd MMM yyyy HH:mm")
              : "—"}
          </p>
        </div>
        <div className="p-2 bg-background rounded border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Severity</p>
          <p className="text-xs font-semibold text-foreground capitalize">{event.severity ?? "—"}</p>
        </div>
        <div className="p-2 bg-background rounded border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Module</p>
          <p className="text-xs font-semibold text-foreground">{event.module_name ?? "—"}</p>
        </div>
        <div className="p-2 bg-background rounded border border-border">
          <p className="text-xs text-muted-foreground font-medium mb-1">Action</p>
          <p className="text-xs font-semibold text-foreground capitalize">
            {event.action_type?.replace(/_/g, " ") ?? "—"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border px-4 bg-muted/30">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {/* min-h-0 is required so this flex child actually respects flex-1 and
          scrolls internally, instead of growing to fit all content and having
          the overflow silently clipped by the panel's overflow-hidden. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
        {activeTab === "Overview" && (
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">User</p>
              <p className="text-sm font-semibold">{event.actor_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">User Role</p>
              <p className="text-sm font-semibold capitalize">
                {event.actor_role?.replace(/_/g, " ") ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Record Reference</p>
              <p className="text-sm font-semibold">{event.record_reference ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Record Title</p>
              <p className="text-sm font-semibold">{event.record_title ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium mb-1">Entity Type</p>
              <p className="text-sm font-semibold">{event.entity_name ?? "—"}</p>
            </div>
            {event.ip_address && (
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">IP Address</p>
                <p className="text-sm font-semibold font-mono">{event.ip_address}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Changes" && (
          <div className="space-y-3">
            {diff.length > 0 ? (
              diff.map(({ field, before, after }) => (
                <div key={field} className="p-2 bg-muted rounded border border-border">
                  <p className="text-xs font-semibold text-foreground mb-2 capitalize">
                    {field.replace(/_/g, " ")}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">Before</p>
                      <ValueCell value={before} />
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">After</p>
                      <ValueCell value={after} />
                    </div>
                  </div>
                </div>
              ))
            ) : event.action_type === "created" ? (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Initial record data:</p>
                <pre className="text-xs font-mono bg-muted/50 p-3 rounded border border-border overflow-auto max-h-64 whitespace-pre-wrap break-all">
                  {event.after_data
                    ? JSON.stringify(event.after_data, null, 2)
                    : "No data captured."}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No field changes recorded.</p>
            )}
          </div>
        )}

        {activeTab === "Related" && (
          <div className="space-y-3 text-xs">
            {event.home_id && (
              <div>
                <p className="text-muted-foreground font-medium mb-1">Home</p>
                <p className="text-sm font-semibold">{homeName ?? event.home_id}</p>
              </div>
            )}
            {event.entity_id && (
              <div>
                <p className="text-muted-foreground font-medium mb-1">Record</p>
                <p className="text-sm font-semibold">
                  {event.record_title || event.record_reference || event.entity_name}
                </p>
              </div>
            )}
            {!event.home_id && !event.entity_id && (
              <p className="text-muted-foreground">No related items.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
