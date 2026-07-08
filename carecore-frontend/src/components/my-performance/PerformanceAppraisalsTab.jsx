// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import {
  ClipboardList, Star, Plus, ChevronDown, ChevronUp,
  CalendarDays, User, Edit3, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ── Config ─────────────────────────────────────────────────────────────────────

const SELF_RATING_OPTIONS = [
  { value: "outstanding",           label: "Outstanding" },
  { value: "good",                  label: "Good" },
  { value: "requires_improvement",  label: "Requires Improvement" },
];

const SELF_RATING_STYLE = {
  outstanding:          "bg-green-100 text-green-700",
  good:                 "bg-blue-100 text-blue-700",
  requires_improvement: "bg-amber-100 text-amber-700",
};

const REVIEW_TYPE_LABEL = {
  probation_3m: "3-Month Probation",
  probation_6m: "6-Month Probation",
  annual:       "Annual Review",
  informal:     "Informal Review",
};

const APPRAISAL_STATUS_STYLE = {
  draft:       "bg-slate-100 text-slate-600",
  completed:   "bg-green-100 text-green-700",
  acknowledged:"bg-blue-100 text-blue-700",
};

const SA_STATUS_STYLE = {
  draft:     "bg-amber-100 text-amber-700",
  submitted: "bg-green-100 text-green-700",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StarRating({ value }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "w-3.5 h-3.5",
            i < value ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PerformanceAppraisalsTab({ summary, staffProfile }) {
  const qc = useQueryClient();
  const [editSA, setEditSA]       = useState(null);   // null = closed, {} = new, {...} = existing draft
  const [expandedAppraisalId, setExpandedAppraisalId] = useState(null);

  const staffId  = staffProfile?.id;
  const metrics  = summary?.metrics ?? {};

  // ── Fetch self-assessments ──────────────────────────────────────────────────
  const { data: selfAssessments = [], isLoading: saLoading } = useQuery({
    queryKey: ["self-assessments", staffId],
    queryFn: () => secureGateway.filter("SelfAssessment", { staff_id: staffId }, "-created_date", 50),
    enabled: !!staffId,
    staleTime: 60 * 1000,
  });

  // ── Fetch formal appraisal records ─────────────────────────────────────────
  const { data: appraisals = [], isLoading: appraisalLoading } = useQuery({
    queryKey: ["appraisal-records", staffId],
    queryFn: () => secureGateway.filter("AppraisalRecord", { appraisee_id: staffId }, "-appraisal_date", 50),
    enabled: !!staffId,
    staleTime: 60 * 1000,
  });

  const draftSA = selfAssessments.find(s => s.status === "draft");

  return (
    <div className="space-y-6">

      {/* Latest appraisal summary banner */}
      {metrics.appraisal_date && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Most Recent Appraisal</p>
              <p className="font-semibold text-sm">{formatDate(metrics.appraisal_date)}</p>
            </div>
          </div>
          {metrics.appraisal_overall_rating && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-medium capitalize text-muted-foreground">
                Overall Rating:
              </span>
              <span className="font-semibold capitalize">{metrics.appraisal_overall_rating}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Self-Assessments ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Your Self-Assessments</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Reflections submitted ahead of formal appraisals.
            </p>
          </div>
          <Button
            size="sm"
            variant={draftSA ? "outline" : "default"}
            className="gap-2 shrink-0"
            onClick={() => setEditSA(draftSA ?? {})}
            disabled={!staffId}
          >
            {draftSA
              ? <><Edit3 className="w-3.5 h-3.5" /> Continue Draft</>
              : <><Plus className="w-3.5 h-3.5" /> New Self-Assessment</>
            }
          </Button>
        </div>

        {saLoading && (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!saLoading && selfAssessments.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <p className="text-sm text-muted-foreground">No self-assessments yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start a reflection to share with your manager before your next appraisal.
            </p>
          </div>
        )}

        {!saLoading && selfAssessments.length > 0 && (
          <div className="space-y-2">
            {selfAssessments.map(sa => (
              <SelfAssessmentCard
                key={sa.id}
                sa={sa}
                onEdit={() => setEditSA(sa)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Formal Appraisal Records ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold text-sm">Formal Appraisals</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Scheduled by your manager — read-only.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {appraisalLoading && (
            <div className="divide-y divide-border">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="px-4 py-3 animate-pulse flex gap-4">
                  <div className="h-3 bg-muted rounded w-24" />
                  <div className="h-3 bg-muted rounded w-20" />
                  <div className="h-3 bg-muted rounded w-16 ml-auto" />
                </div>
              ))}
            </div>
          )}

          {!appraisalLoading && appraisals.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">No appraisal records found.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Formal appraisals will appear here once your manager creates them.
              </p>
            </div>
          )}

          {!appraisalLoading && appraisals.length > 0 && (
            <div className="divide-y divide-border">
              {appraisals.map(a => {
                const isExpanded = expandedAppraisalId === a.id;
                const statusCls  = APPRAISAL_STATUS_STYLE[a.status] ?? "bg-muted text-muted-foreground";

                return (
                  <div key={a.id}>
                    <button
                      className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-3"
                      onClick={() => setExpandedAppraisalId(isExpanded ? null : a.id)}
                    >
                      {/* Date */}
                      <div className="w-28 shrink-0">
                        <p className="text-sm font-medium">{formatDate(a.appraisal_date)}</p>
                      </div>

                      {/* Type */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          {REVIEW_TYPE_LABEL[a.review_type] ?? a.review_type ?? "Appraisal"}
                        </p>
                        {a.appraiser_name && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                            <User className="w-3 h-3 shrink-0" /> {a.appraiser_name}
                          </p>
                        )}
                      </div>

                      {/* Rating */}
                      {a.rating > 0 && (
                        <StarRating value={a.rating} />
                      )}

                      {/* Status */}
                      <span className={cn(
                        "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize",
                        statusCls,
                      )}>
                        {a.status ?? "—"}
                      </span>

                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      }
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border space-y-3 text-sm">
                        {a.review_period_start && a.review_period_end && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Review period: {formatDate(a.review_period_start)} – {formatDate(a.review_period_end)}
                          </p>
                        )}
                        {a.development_goals && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Development Goals</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{a.development_goals}</p>
                          </div>
                        )}
                        {a.reviewer_comments && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Manager Comments</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{a.reviewer_comments}</p>
                          </div>
                        )}
                        {a.staff_comments && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Your Comments</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{a.staff_comments}</p>
                          </div>
                        )}
                        {a.outcome && (
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold">Outcome: </span>{a.outcome}
                          </p>
                        )}
                        {a.next_appraisal_date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            Next appraisal: {formatDate(a.next_appraisal_date)}
                          </p>
                        )}
                        {a.acknowledged_date && (
                          <p className="text-xs text-green-600 font-medium">
                            ✓ Acknowledged {formatDate(a.acknowledged_date)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Self-Assessment form dialog */}
      {editSA !== null && (
        <SelfAssessmentDialog
          open={editSA !== null}
          onClose={() => setEditSA(null)}
          staffProfile={staffProfile}
          existing={editSA && editSA.id ? editSA : null}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["self-assessments", staffId] });
            setEditSA(null);
          }}
        />
      )}
    </div>
  );
}

// ── SelfAssessmentCard ─────────────────────────────────────────────────────────

function SelfAssessmentCard({ sa, onEdit }) {
  const ratingCls = SELF_RATING_STYLE[sa.overall_self_rating] ?? "bg-muted text-muted-foreground";
  const statusCls = SA_STATUS_STYLE[sa.status] ?? "bg-muted text-muted-foreground";

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {sa.period_start && (
            <p className="text-sm font-medium">
              {formatDate(sa.period_start)}
              {sa.period_end && <> – {formatDate(sa.period_end)}</>}
            </p>
          )}
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize", statusCls)}>
            {sa.status}
          </span>
        </div>
        {sa.achievements && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{sa.achievements}</p>
        )}
        {sa.submitted_date && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Submitted {formatDate(sa.submitted_date)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {sa.overall_self_rating && (
          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize", ratingCls)}>
            {sa.overall_self_rating?.replace(/_/g, " ")}
          </span>
        )}
        {sa.status === "draft" && (
          <button
            onClick={onEdit}
            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
          >
            <Edit3 className="w-3 h-3" /> Edit
          </button>
        )}
      </div>
    </div>
  );
}

// ── SelfAssessmentDialog ───────────────────────────────────────────────────────

const EMPTY_SA = {
  period_start:         "",
  period_end:           "",
  achievements:         "",
  strengths:            "",
  areas_for_development:"",
  training_requests:    "",
  support_needed:       "",
  overall_self_rating:  "good",
};

function SelfAssessmentDialog({ open, onClose, staffProfile, existing, onSaved }) {
  const isEdit = !!existing;
  const [form, setForm] = useState(isEdit ? {
    period_start:          existing.period_start          ?? "",
    period_end:            existing.period_end            ?? "",
    achievements:          existing.achievements          ?? "",
    strengths:             existing.strengths             ?? "",
    areas_for_development: existing.areas_for_development ?? "",
    training_requests:     existing.training_requests     ?? "",
    support_needed:        existing.support_needed        ?? "",
    overall_self_rating:   existing.overall_self_rating   ?? "good",
  } : EMPTY_SA);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: (data) => secureGateway.create("SelfAssessment", data),
    onSuccess: () => { toast.success("Self-assessment saved"); onSaved(); },
    onError: () => toast.error("Failed to save"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => secureGateway.update("SelfAssessment", existing?.id, data),
    onSuccess: () => { toast.success("Self-assessment updated"); onSaved(); },
    onError: () => toast.error("Failed to update"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function save(status) {
    const payload = {
      ...form,
      status,
      ...(status === "submitted" ? { submitted_date: new Date().toISOString().slice(0, 10) } : {}),
    };

    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate({
        org_id:     ORG_ID,
        staff_id:   staffProfile?.id        ?? "",
        staff_name: staffProfile?.full_name  ?? "",
        home_id:    staffProfile?.home_id    ?? "",
        ...payload,
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Self-Assessment" : "New Self-Assessment"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={e => { e.preventDefault(); save("draft"); }}
          className="space-y-4 mt-2"
        >
          {/* Period */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Period Start</label>
              <Input type="date" value={form.period_start} onChange={e => set("period_start", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Period End</label>
              <Input type="date" value={form.period_end} onChange={e => set("period_end", e.target.value)} />
            </div>
          </div>

          {/* Achievements */}
          <TextareaField
            label="Achievements"
            value={form.achievements}
            onChange={v => set("achievements", v)}
            placeholder="What have you achieved during this period?"
          />

          {/* Strengths */}
          <TextareaField
            label="Strengths"
            value={form.strengths}
            onChange={v => set("strengths", v)}
            placeholder="What do you feel you do well?"
          />

          {/* Areas for development */}
          <TextareaField
            label="Areas for Development"
            value={form.areas_for_development}
            onChange={v => set("areas_for_development", v)}
            placeholder="Where would you like to improve?"
          />

          {/* Training requests */}
          <TextareaField
            label="Training Requests"
            value={form.training_requests}
            onChange={v => set("training_requests", v)}
            placeholder="Any training or qualifications you'd like to pursue?"
          />

          {/* Support needed */}
          <TextareaField
            label="Support Needed"
            value={form.support_needed}
            onChange={v => set("support_needed", v)}
            placeholder="What support do you need from your manager?"
          />

          {/* Overall self-rating */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Overall Self-Rating</label>
            <Select value={form.overall_self_rating} onValueChange={v => set("overall_self_rating", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SELF_RATING_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="outline" disabled={isPending}>
              Save Draft
            </Button>
            <Button
              type="button"
              className="gap-2"
              onClick={() => save("submitted")}
              disabled={isPending || existing?.status === "submitted"}
            >
              <Send className="w-3.5 h-3.5" />
              {existing?.status === "submitted" ? "Submitted" : "Submit"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── TextareaField ──────────────────────────────────────────────────────────────

function TextareaField({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
      />
    </div>
  );
}
