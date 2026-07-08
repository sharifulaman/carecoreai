// @ts-nocheck
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  X, Plus, CheckCircle2, AlertCircle, Clock, XCircle, TrendingUp,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { performanceApi } from "@/lib/performanceApi";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  active:    { cls: "bg-amber-100 text-amber-700 border-amber-200",  icon: Clock,        label: "Active" },
  completed: { cls: "bg-green-100 text-green-700 border-green-100",  icon: CheckCircle2, label: "Completed" },
  escalated: { cls: "bg-red-100 text-red-700 border-red-200",        icon: TrendingUp,   label: "Escalated" },
  withdrawn: { cls: "bg-slate-100 text-slate-600 border-slate-200",  icon: XCircle,      label: "Withdrawn" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.active;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── PIP card (expandable) ─────────────────────────────────────────────────────

function PIPCard({ pip, staffId, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState(pip.status);
  const [outcome, setOutcome]     = useState(pip.outcome ?? "");
  const [endDate, setEndDate]     = useState(pip.end_date ?? "");
  const [error, setError]         = useState("");

  const targets    = safeParseArray(pip.targets);
  const milestones = safeParseArray(pip.milestones);
  const isClosed   = pip.status !== "active";

  async function handleUpdate() {
    if (newStatus === pip.status && outcome === (pip.outcome ?? "") && endDate === (pip.end_date ?? "")) return;
    setUpdating(true);
    setError("");
    try {
      await performanceApi.updatePIP(staffId, pip.id, {
        status:   newStatus,
        outcome:  outcome || undefined,
        end_date: endDate || undefined,
      });
      onUpdated();
    } catch (e) {
      setError(e?.message || "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* ── Card header ── */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={pip.status} />
          <div className="min-w-0">
            <p className="text-xs font-medium truncate">{pip.reason?.split(".")[0] ?? "PIP"}</p>
            <p className="text-[10px] text-muted-foreground">
              Started {pip.start_date}
              {pip.review_date ? ` · Review ${pip.review_date}` : ""}
              {pip.created_by_name ? ` · By ${pip.created_by_name}` : ""}
            </p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Reason</p>
            <p className="text-xs">{pip.reason}</p>
          </div>

          {pip.support_offered && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Support Offered</p>
              <p className="text-xs">{pip.support_offered}</p>
            </div>
          )}

          {targets.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Targets</p>
              <ul className="space-y-1">
                {targets.map((t, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {milestones.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Milestones</p>
              <ul className="space-y-1">
                {milestones.map((m, i) => (
                  <li key={i} className="text-xs flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">◇</span> {m}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pip.outcome && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Outcome</p>
              <p className="text-xs">{pip.outcome}</p>
            </div>
          )}

          {/* Update section — only for active PIPs */}
          {!isClosed && (
            <div className="border-t border-border pt-3 space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Update Status</p>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">New Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-input rounded-md bg-background focus:outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="escalated">Escalated</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-8 px-2 text-xs border border-input rounded-md bg-background focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Outcome / Notes</label>
                <textarea
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value)}
                  rows={2}
                  placeholder="Describe the outcome or any notes..."
                  className="w-full px-2 py-1.5 text-xs border border-input rounded-md bg-background resize-none focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {error}
                </p>
              )}

              <Button size="sm" onClick={handleUpdate} disabled={updating} className="w-full">
                {updating ? "Saving…" : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create PIP form ───────────────────────────────────────────────────────────

function CreatePIPForm({ staffId, staffName, onCreated, onCancel }) {
  const [startDate, setStartDate]       = useState("");
  const [reviewDate, setReviewDate]     = useState("");
  const [reason, setReason]             = useState("");
  const [support, setSupport]           = useState("");
  const [targetsText, setTargetsText]   = useState("");
  const [milestonesText, setMilestonesText] = useState("");
  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!startDate || !reason.trim()) return;

    setSubmitting(true);
    setError("");

    const targets    = targetsText.split("\n").map((s) => s.trim()).filter(Boolean);
    const milestones = milestonesText.split("\n").map((s) => s.trim()).filter(Boolean);

    try {
      await performanceApi.createPIP(staffId, {
        start_date:      startDate,
        review_date:     reviewDate || undefined,
        reason:          reason.trim(),
        support_offered: support.trim() || undefined,
        targets,
        milestones,
      });
      onCreated();
    } catch (e) {
      setError(e?.message || "Failed to create PIP. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Start Date <span className="text-red-500">*</span></label>
          <input
            type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            required
            className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Review Date <span className="text-muted-foreground font-normal">(optional)</span></label>
          <input
            type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)}
            className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Reason for PIP <span className="text-red-500">*</span></label>
        <textarea
          value={reason} onChange={(e) => setReason(e.target.value)}
          rows={3} required maxLength={1000}
          placeholder="Describe the performance concern that triggered this plan..."
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium">Support Offered <span className="text-muted-foreground font-normal">(optional)</span></label>
        <textarea
          value={support} onChange={(e) => setSupport(e.target.value)}
          rows={2} maxLength={500}
          placeholder="Training, mentoring, supervision arrangements, etc."
          className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium">Targets <span className="text-muted-foreground font-normal">(one per line)</span></label>
          <textarea
            value={targetsText} onChange={(e) => setTargetsText(e.target.value)}
            rows={3}
            placeholder={"Attend all scheduled supervisions\nComplete mandatory training by review date"}
            className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Milestones <span className="text-muted-foreground font-normal">(one per line)</span></label>
          <textarea
            value={milestonesText} onChange={(e) => setMilestonesText(e.target.value)}
            rows={3}
            placeholder={"Week 2 check-in with line manager\nMid-point review at week 4"}
            className="w-full px-3 py-2 text-xs border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        <Button type="submit" size="sm" disabled={submitting || !startDate || !reason.trim()} className="min-w-[120px]">
          {submitting ? "Creating…" : "Create PIP"}
        </Button>
      </div>
    </form>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function safeParseArray(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Main modal ────────────────────────────────────────────────────────────────

/**
 * PIPModal
 *
 * Opened from EmployeeRowDetail — shows all existing PIPs for a staff member
 * and allows a manager to create a new one or update the status of an active one.
 *
 * All data fetched from /business/staff-performance/:staffId/pips (backend-computed).
 * PIPs are confidential — only managers, HR, and Admin can access this screen.
 *
 * Props: staffId, staffName, staffRole, onClose
 */
export default function PIPModal({ staffId, staffName, staffRole, onClose }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  const { data: pips = [], isLoading, refetch } = useQuery({
    queryKey: ["staff-pips", staffId],
    queryFn:  () => performanceApi.getStaffPIPs(staffId),
    staleTime: 60 * 1000,
    enabled:  !!staffId,
  });

  function handleCreated() {
    setCreateSuccess(true);
    refetch();
    setTimeout(() => {
      setShowCreate(false);
      setCreateSuccess(false);
    }, 1800);
  }

  function handleUpdated() {
    refetch();
    queryClient.invalidateQueries({ queryKey: ["perf-team"] });
  }

  const activePIPs   = pips.filter((p) => p.status === "active");
  const closedPIPs   = pips.filter((p) => p.status !== "active");

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border border-border w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-sm">Performance Improvement Plans — {staffName}</h2>
            <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
              {staffRole?.replace(/_/g, " ")}
              {pips.length > 0 && ` · ${pips.length} record${pips.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Create form / button */}
          {showCreate ? (
            <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-4">
              <h3 className="text-xs font-semibold mb-3">New Performance Improvement Plan</h3>
              {createSuccess ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <p className="text-sm font-medium">PIP created successfully</p>
                </div>
              ) : (
                <CreatePIPForm
                  staffId={staffId}
                  staffName={staffName}
                  onCreated={handleCreated}
                  onCancel={() => setShowCreate(false)}
                />
              )}
            </div>
          ) : (
            <Button
              size="sm" variant="outline"
              onClick={() => setShowCreate(true)}
              className="w-full border-dashed gap-2"
            >
              <Plus className="w-4 h-4" /> Create New PIP
            </Button>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {/* Active PIPs */}
          {!isLoading && activePIPs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Active Plans</p>
              {activePIPs.map((pip) => (
                <PIPCard key={pip.id} pip={pip} staffId={staffId} onUpdated={handleUpdated} />
              ))}
            </div>
          )}

          {/* Closed PIPs */}
          {!isLoading && closedPIPs.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Closed Plans</p>
              {closedPIPs.map((pip) => (
                <PIPCard key={pip.id} pip={pip} staffId={staffId} onUpdated={handleUpdated} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!isLoading && pips.length === 0 && !showCreate && (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">No performance improvement plans on record for {staffName}.</p>
              <p className="text-xs text-muted-foreground mt-1">Use the button above to create one if needed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
