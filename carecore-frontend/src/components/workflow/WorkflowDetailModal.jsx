import { useState, useEffect } from "react";
import { format } from "date-fns";
import { X, ExternalLink, AlertCircle, CheckCircle2, Clock, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { WORKFLOW_META, getPriorityBadge, getStatusBadge } from "./workflowConfig";

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(val) {
  if (!val) return "—";
  try { return format(new Date(val), "d MMM yyyy, h:mm a"); } catch { return val; }
}

function fmtValue(val, isBool) {
  if (val === null || val === undefined || val === "") return "—";
  if (isBool) return val === true || val === "true" || val === 1 ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  // Looks like a date/timestamp?
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val)) return fmtDate(val);
  return String(val);
}

function StatusPill({ value }) {
  const colors = {
    open:       "bg-blue-100 text-blue-700",
    submitted:  "bg-amber-100 text-amber-700",
    reviewed:   "bg-purple-100 text-purple-700",
    approved:   "bg-green-100 text-green-700",
    closed:     "bg-slate-100 text-slate-600",
    rejected:   "bg-red-100 text-red-700",
    draft:      "bg-slate-100 text-slate-500",
    escalated:  "bg-orange-100 text-orange-700",
  };
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const cls = colors[value?.toLowerCase()] || "bg-slate-100 text-slate-600";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${cls}`}>
      {value}
    </span>
  );
}

// ── Field renderer ────────────────────────────────────────────────────────────

function FieldCell({ fieldDef, entity }) {
  const raw = entity?.[fieldDef.key];
  const display = fmtValue(raw, fieldDef.is_bool);
  const isStatus = fieldDef.key === "status";

  return (
    <div className={fieldDef.wide ? "col-span-2" : ""}>
      <p className="text-xs text-muted-foreground mb-0.5">{fieldDef.label}</p>
      {isStatus ? (
        <StatusPill value={raw} />
      ) : fieldDef.is_bool ? (
        <span className={`text-xs font-semibold ${raw ? "text-green-600" : "text-slate-500"}`}>
          {raw ? "✓ Yes" : "✗ No"}
        </span>
      ) : (
        <p className="text-xs font-semibold text-foreground break-words whitespace-pre-wrap">
          {display}
        </p>
      )}
    </div>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────

function FieldGroupCard({ group, entity }) {
  // Filter out fields where the entity has no value — keeps the popup clean
  const visibleFields = group.fields.filter(f => {
    const v = entity?.[f.key];
    return v !== null && v !== undefined && v !== "" && v !== false;
  });
  if (!visibleFields.length) return null;

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <h4 className="text-xs font-bold text-foreground mb-3 uppercase tracking-wide text-muted-foreground">
        {group.label}
      </h4>
      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
        {visibleFields.map(f => (
          <FieldCell key={f.key} fieldDef={f} entity={entity} />
        ))}
      </div>
    </div>
  );
}

// ── Workflow summary strip ────────────────────────────────────────────────────

function WorkflowSummaryStrip({ workflowItem, matrix }) {
  return (
    <div className="bg-slate-50 border border-border rounded-xl p-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-0.5">Workflow Type</p>
          <p className="text-xs font-semibold text-foreground">
            {matrix?.module_name || workflowItem?.workflow_type || "—"}
          </p>
          {matrix?.category && (
            <p className="text-xs text-muted-foreground">{matrix.category}</p>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Status</p>
          <StatusPill value={workflowItem?.status} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Priority</p>
          {getPriorityBadge(workflowItem?.priority)}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Submitted By</p>
          <p className="text-xs font-semibold text-foreground">
            {workflowItem?.maker_name || "—"}
          </p>
          <p className="text-xs text-muted-foreground">{workflowItem?.maker_role}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Current Reviewer</p>
          <p className="text-xs font-semibold text-foreground">
            {workflowItem?.assigned_to_name || workflowItem?.reviewer_role || "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Home</p>
          <p className="text-xs font-semibold text-foreground">
            {workflowItem?.home_name || "—"}
          </p>
        </div>
        {workflowItem?.submitted_at && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Submitted At</p>
            <p className="text-xs font-semibold text-foreground">
              {fmtDate(workflowItem.submitted_at)}
            </p>
          </div>
        )}
      </div>
      {matrix?.logical_flow && (
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-xs text-muted-foreground mb-1">Process Flow</p>
          <p className="text-xs text-foreground">{matrix.logical_flow}</p>
        </div>
      )}
    </div>
  );
}

// ── Governance strip ──────────────────────────────────────────────────────────

function GovernanceStrip({ matrix }) {
  if (!matrix) return null;
  const roles = [
    { label: "Who can Make", value: matrix.maker_roles_raw },
    { label: "Who must Check", value: matrix.checker_roles_raw },
    { label: "Escalation", value: matrix.escalation_roles_raw },
  ].filter(r => r.value);

  if (!roles.length) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <h4 className="text-xs font-bold text-amber-800 mb-3 uppercase tracking-wide">
        Governance Rules
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {roles.map(r => (
          <div key={r.label}>
            <p className="text-xs text-amber-700 font-medium mb-0.5">{r.label}</p>
            <p className="text-xs text-amber-900">{r.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function WorkflowDetailModal({ workflowId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [data, setData]       = useState(null);

  useEffect(() => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);

    base44.workflow.entity(workflowId)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err?.message || "Failed to load entity details");
        setLoading(false);
      });
  }, [workflowId]);

  const entity       = data?.entity;
  const entityMeta   = data?.entity_meta;
  const matrix       = data?.matrix;
  const workflowItem = data?.workflow_item;

  const wType = workflowItem?.entity_type || workflowItem?.workflow_type;
  const uiMeta = WORKFLOW_META[wType] || WORKFLOW_META._default;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${uiMeta.iconBg}`}>
              <uiMeta.icon className={`w-4 h-4 ${uiMeta.iconColor}`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {entityMeta?.display_name || uiMeta.label || "Record Details"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {workflowItem?.entity_ref || "—"}
                {matrix?.category ? ` · ${matrix.category}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading record details…</span>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">Failed to load details</p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* No entity linked */}
          {!loading && !error && !entity && data?.message && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <FileText className="w-5 h-5 text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">No linked record</p>
                <p className="text-xs text-amber-600 mt-0.5">{data.message}</p>
              </div>
            </div>
          )}

          {/* Loaded successfully */}
          {!loading && !error && workflowItem && (
            <>
              {/* Workflow summary */}
              <WorkflowSummaryStrip workflowItem={workflowItem} matrix={matrix} />

              {/* Entity field groups */}
              {entity && entityMeta?.field_groups?.map((group, i) => (
                <FieldGroupCard key={i} group={group} entity={entity} />
              ))}

              {/* If entity exists but no field groups configured, show raw data */}
              {entity && !entityMeta?.field_groups?.length && (
                <div className="bg-white border border-border rounded-xl p-4">
                  <h4 className="text-xs font-bold text-foreground mb-3">Record Data</h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {Object.entries(entity)
                      .filter(([k]) => !["id","org_id","created_by","updated_at","__v"].includes(k))
                      .map(([k, v]) => (
                        <div key={k} className={typeof v === "string" && v.length > 60 ? "col-span-2" : ""}>
                          <p className="text-xs text-muted-foreground mb-0.5 capitalize">
                            {k.replace(/_/g, " ")}
                          </p>
                          <p className="text-xs font-semibold text-foreground break-words">
                            {fmtValue(v, false)}
                          </p>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Governance rules */}
              <GovernanceStrip matrix={matrix} />
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-3 border-t border-border shrink-0 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
