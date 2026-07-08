import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, RefreshCw, ChevronDown, ChevronUp, Info, CheckCircle2, Lock, Unlock, Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { createNotification } from "@/lib/createNotification";
import AppraisalGoalForm from "./AppraisalGoalForm";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(v) { return v == null ? "—" : v; }
function fmtPct(v) { return v == null ? "—" : `${v}%`; }
function pctColor(v) {
  if (v == null) return "text-muted-foreground";
  if (v >= 80) return "text-green-600";
  if (v >= 60) return "text-amber-600";
  return "text-red-600";
}

const OUTCOME_LABELS = {
  excellent: "Excellent",
  good: "Good",
  satisfactory: "Satisfactory",
  below_expectations: "Below Expectations",
  improvement_plan: "Improvement Plan Required",
};

// ── Small evidence metric card ────────────────────────────────────────────────
function MetricPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center bg-muted/60 rounded-lg px-3 py-2 min-w-[80px]">
      <span className={`text-base font-bold ${color || "text-foreground"}`}>{value}</span>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}

// ── Star rating control ───────────────────────────────────────────────────────
function StarRating({ value, onChange, disabled }) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(r => (
        <button
          key={r}
          type="button"
          disabled={disabled}
          onClick={() => onChange && onChange(r)}
          className={`w-8 h-8 rounded-full text-xs font-bold transition-colors disabled:cursor-default ${
            value >= r ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, badge, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <span className="text-sm font-semibold flex items-center gap-2">
          {title}
          {badge != null && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{badge}</span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-4">{children}</div>}
    </div>
  );
}

// ── Improvement plan goal row ─────────────────────────────────────────────────
function ImprovementGoalRow({ goal, index, onChange, onRemove }) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 space-y-1.5">
        <Input
          value={goal.title || ""}
          onChange={e => onChange(index, "title", e.target.value)}
          placeholder="Goal / action required…"
          className="h-8 text-sm"
        />
        <Input
          type="date"
          value={goal.target_date || ""}
          onChange={e => onChange(index, "target_date", e.target.value)}
          className="h-7 text-xs"
        />
      </div>
      <button type="button" onClick={() => onRemove(index)} className="text-muted-foreground hover:text-red-500 mt-1.5">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AppraisalLogForm({ initialData, staff, myProfile, appraisals = [], isAdminOrHR = false, onClose, onSubmit }) {
  const today = new Date().toISOString().split("T")[0];

  // Derive default period_start from previous appraisal or 12 months ago
  function defaultPeriodStart(appraiseeId, appraisalDate) {
    const date = appraisalDate || today;
    const prev = [...(appraisals || [])]
      .filter(a => a.staff_id === appraiseeId)
      .sort((a, b) => (b.appraisal_date || "").localeCompare(a.appraisal_date || ""))[0];
    if (prev?.appraisal_date) return prev.appraisal_date;
    const d = new Date(date);
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  }

  const [form, setForm] = useState(() => {
    const base = initialData || {};
    return {
      staff_id: base.appraisee_id || base.staff_id || "",
      staff_name: base.appraisee_name || base.staff_name || "",
      appraisee_id: base.appraisee_id || base.staff_id || "",
      appraiser_id: base.appraiser_id || myProfile?.id || "",
      appraisal_date: base.appraisal_date || today,
      next_appraisal_date: base.next_appraisal_date || "",
      overall_rating: base.overall_rating || 3,
      performance_notes: base.performance_notes || "",
      strengths: base.strengths || "",
      areas_for_development: base.areas_for_development || "",
      goals: base.goals || [],
      outcome: base.outcome || "",
      employee_comments: base.employee_comments || "",
      status: base.status || "draft",
      // New fields
      appraisal_type: base.appraisal_type || "annual",
      period_start: base.period_start || "",
      period_end: base.period_end || base.appraisal_date || today,
      competency_scores: base.competency_scores || [],
      evidence_snapshot: base.evidence_snapshot || null,
      suggested_outcome: base.suggested_outcome || "",
      suggested_rating: base.suggested_rating || null,
      rolling_score: base.rolling_score || null,
      feedback_summary: base.feedback_summary || {},
      appraiser_signed: base.appraiser_signed || false,
      appraiser_signed_at: base.appraiser_signed_at || "",
      appraisee_signed: base.appraisee_signed || false,
      appraisee_signed_at: base.appraisee_signed_at || "",
      self_assessment: base.self_assessment || {},
      improvement_plan: base.improvement_plan || { required: false, goals: [], review_date: "" },
      reviewed_by: base.reviewed_by || "",
      reviewed_at: base.reviewed_at || "",
    };
  });

  const [errors, setErrors] = useState({});
  const f = useCallback((k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(e => ({ ...e, [k]: false }));
  }, []);

  const [evidenceData, setEvidenceData] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState(null);
  const [outcomeOverridden, setOutcomeOverridden] = useState(!!initialData?.outcome);
  const [ratingOverridden, setRatingOverridden] = useState(!!initialData?.overall_rating);
  const [requestingAssess, setRequestingAssess] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const isSignedOff = form.status === "signed_off" && !unlocked;
  const needsImprovementPlan = ["below_expectations", "improvement_plan"].includes(form.outcome);

  // Improvement plan helpers
  function addImprovementGoal() {
    const ip = form.improvement_plan || { required: true, goals: [], review_date: "" };
    f("improvement_plan", { ...ip, required: true, goals: [...(ip.goals || []), { id: `ip_${Date.now()}`, title: "", target_date: "", rag_status: "red" }] });
  }
  function updateImprovementGoal(idx, field, value) {
    const ip = { ...form.improvement_plan };
    const goals = [...(ip.goals || [])];
    goals[idx] = { ...goals[idx], [field]: value };
    f("improvement_plan", { ...ip, goals });
  }
  function removeImprovementGoal(idx) {
    const ip = { ...form.improvement_plan };
    const goals = [...(ip.goals || [])];
    goals.splice(idx, 1);
    f("improvement_plan", { ...ip, goals });
  }

  // Request self-assessment
  async function requestSelfAssessment() {
    if (!form.appraisee_id) return;
    setRequestingAssess(true);
    const appraisee = staff.find(s => s.id === form.appraisee_id);
    try {
      f("self_assessment", { ...form.self_assessment, requested: true });
      if (appraisee?.user_id) {
        createNotification({
          recipient_user_id: appraisee.user_id,
          recipient_staff_id: appraisee.id,
          title: "Self-assessment requested",
          body: `${myProfile?.full_name || "Your manager"} has requested you complete a self-assessment for your upcoming appraisal (${form.appraisal_date}). Please visit My HR > My Appraisals.`,
          type: "general",
          link: "/my-hr",
        });
      }
    } finally {
      setRequestingAssess(false);
    }
  }

  // Sign as appraiser
  function signAsAppraiser() {
    const now = new Date().toISOString();
    const newStatus = form.appraisee_signed ? "completed" : "draft";
    f("appraiser_signed", true);
    f("appraiser_signed_at", now);
    f("status", newStatus);
  }

  // Fetch org's active competencies
  const { data: competencies = [] } = useQuery({
    queryKey: ["appraisal-competencies"],
    queryFn: () => secureGateway.filter("AppraisalCompetency"),
    staleTime: 10 * 60 * 1000,
  });
  const activeCompetencies = competencies.filter(c => c.active !== false).sort((a, b) => (a.order || 99) - (b.order || 99));

  // Auto-calculate next appraisal date
  useEffect(() => {
    if (form.appraisal_date && !initialData?.next_appraisal_date) {
      const d = new Date(form.appraisal_date);
      d.setFullYear(d.getFullYear() + 1);
      f("next_appraisal_date", d.toISOString().split("T")[0]);
    }
  }, [form.appraisal_date]);

  // Set period_end = appraisal_date when appraisal_date changes
  useEffect(() => {
    if (!initialData?.period_end) f("period_end", form.appraisal_date);
  }, [form.appraisal_date]);

  // When appraisee changes, update period_start default
  useEffect(() => {
    if (form.appraisee_id && !initialData?.period_start) {
      f("period_start", defaultPeriodStart(form.appraisee_id, form.appraisal_date));
    }
  }, [form.appraisee_id]);

  // Init competency_scores from competencies when competencies load and no existing data
  useEffect(() => {
    if (activeCompetencies.length && !form.competency_scores?.length) {
      f("competency_scores", activeCompetencies.map(c => ({
        key: c.key,
        label: c.label,
        score: 3,
        comment: "",
        suggested_score: null,
        manager_overridden: false,
      })));
    }
  }, [activeCompetencies.length]);

  // ── Compile evidence ────────────────────────────────────────────────────────
  const compileEvidence = useCallback(async () => {
    if (!form.appraisee_id) return;
    const selectedStaff = staff.find(s => s.id === form.appraisee_id);
    setEvidenceLoading(true);
    setEvidenceError(null);
    try {
      const res = await base44.functions.invoke("compileAppraisalEvidence", {
        staff_id: form.appraisee_id,
        staff_email: selectedStaff?.email || "",
        period_start: form.period_start || defaultPeriodStart(form.appraisee_id, form.appraisal_date),
        period_end: form.period_end || form.appraisal_date,
      });
      const data = res?.data || res;
      setEvidenceData(data);

      // Pre-fill competency scores from suggestions
      if (data.competency_scores?.length) {
        const newScores = activeCompetencies.map(c => {
          const existing = form.competency_scores?.find(s => s.key === c.key);
          const suggested = data.competency_scores.find(s => s.key === c.key);
          return {
            key: c.key,
            label: c.label,
            score: existing?.manager_overridden ? existing.score : (suggested?.suggested_score || 3),
            comment: existing?.comment || "",
            suggested_score: suggested?.suggested_score || null,
            heuristic_notes: suggested?.heuristic_notes || "",
            manager_overridden: existing?.manager_overridden || false,
          };
        });
        f("competency_scores", newScores);
      }

      // Pre-fill outcome + rating (only if not yet overridden by manager)
      if (!outcomeOverridden && data.suggested_outcome) f("outcome", data.suggested_outcome);
      if (!ratingOverridden && data.suggested_rating) f("overall_rating", data.suggested_rating);
      f("rolling_score", data.rolling_score ?? null);
      f("suggested_outcome", data.suggested_outcome || "");
      f("suggested_rating", data.suggested_rating || null);
      if (data.evidence) {
        f("feedback_summary", {
          yp_feedback_count: data.evidence.yp_feedback_count,
          sw_feedback_count: data.evidence.swpa_feedback_count,
          highlights: data.evidence.feedback_highlights || [],
        });
      }
    } catch (err) {
      setEvidenceError(err?.response?.data?.error || err?.message || "Failed to compile evidence");
    } finally {
      setEvidenceLoading(false);
    }
  }, [form.appraisee_id, form.period_start, form.period_end, form.appraisal_date, outcomeOverridden, ratingOverridden, activeCompetencies, staff]);

  // Auto-compile when a staff member is selected (new appraisal only)
  useEffect(() => {
    if (form.appraisee_id && !initialData) {
      compileEvidence();
    }
  }, [form.appraisee_id]);

  // ── Competency score change ─────────────────────────────────────────────────
  function updateCompetencyScore(key, field, value) {
    f("competency_scores", form.competency_scores.map(c =>
      c.key === key
        ? { ...c, [field]: value, ...(field === "score" ? { manager_overridden: c.suggested_score != null && value !== c.suggested_score } : {}) }
        : c
    ));
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  function handleSubmit() {
    // Validation
    const errs = {};
    if (!form.appraisee_id) errs.appraisee_id = true;
    if (!form.appraisal_type) errs.appraisal_type = true;
    if (!form.appraisal_date) errs.appraisal_date = true;
    if (!form.period_start) errs.period_start = true;
    if (!form.period_end) errs.period_end = true;
    if (!form.overall_rating) errs.overall_rating = true;
    if (!form.outcome) errs.outcome = true;
    if (needsImprovementPlan && !form.improvement_plan?.review_date) errs.improvement_plan_review_date = true;

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return toast.error("Please fill in all required fields.");
    }

    // Merge improvement plan goals into main goals (avoid duplicates by id)
    let mergedGoals = [...(form.goals || [])];
    if (needsImprovementPlan && form.improvement_plan?.goals?.length) {
      for (const ipGoal of form.improvement_plan.goals) {
        if (!mergedGoals.find(g => g.id === ipGoal.id)) {
          mergedGoals.push({ ...ipGoal, source: "improvement_plan" });
        }
      }
    }
    const saveData = {
      ...form,
      goals: mergedGoals,
      improvement_plan: {
        ...(form.improvement_plan || {}),
        required: needsImprovementPlan,
      },
      evidence_snapshot: evidenceData?.evidence || form.evidence_snapshot || {},
    };
    onSubmit(saveData);
  }

  // Fallback to saved evidence_snapshot if it has keys (for existing records)
  const evidence = evidenceData?.evidence || (form.evidence_snapshot && Object.keys(form.evidence_snapshot).length > 0 ? form.evidence_snapshot : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-3xl rounded-xl shadow-xl max-h-[92vh] overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">{initialData ? "Edit Appraisal" : "Log Appraisal"}</h3>
              {isSignedOff && (
                <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  <Lock className="w-3 h-3" /> Signed Off
                </span>
              )}
            </div>
            {form.rolling_score != null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Rolling score: <span className="font-bold text-foreground">{form.rolling_score}/100</span>
                <span className="ml-2 text-[10px] italic">Evidence-informed — manager judgement decides</span>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdminOrHR && form.status === "signed_off" && (
              <button onClick={() => setUnlocked(u => !u)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                {unlocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                {unlocked ? "Lock" : "Unlock"}
              </button>
            )}
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── 1. Core details ── */}
          <Section title="Appraisal Details" defaultOpen>
            {/* Appraisee */}
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Appraisee *</label>
              <Select value={form.appraisee_id} onValueChange={v => {
                const sel = staff.find(s => s.id === v);
                f("appraisee_id", v);
                f("staff_name", sel?.full_name || "");
                setErrors(e => ({ ...e, appraisee_id: false }));
              }}>
                <SelectTrigger className={errors.appraisee_id ? "border-destructive" : ""}><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staff.filter(s => s.status === "active").map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Appraisal type */}
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Appraisal Type *</label>
              <Select value={form.appraisal_type} onValueChange={v => f("appraisal_type", v)}>
                <SelectTrigger className={errors.appraisal_type ? "border-destructive" : ""}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="probation">Probation Review</SelectItem>
                  <SelectItem value="mid_year">Mid-Year</SelectItem>
                  <SelectItem value="improvement_review">Improvement Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date + period */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">Appraisal Date *</label>
                <Input type="date" value={form.appraisal_date} onChange={e => f("appraisal_date", e.target.value)} className={errors.appraisal_date ? "border-destructive" : ""} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">Period Start *</label>
                <Input type="date" value={form.period_start} onChange={e => f("period_start", e.target.value)} className={errors.period_start ? "border-destructive" : ""} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">Period End *</label>
                <Input type="date" value={form.period_end} onChange={e => f("period_end", e.target.value)} className={errors.period_end ? "border-destructive" : ""} />
              </div>
            </div>

            {/* Next appraisal */}
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Next Appraisal Due</label>
              <Input type="date" value={form.next_appraisal_date} onChange={e => f("next_appraisal_date", e.target.value)} />
              <p className="text-[10px] text-muted-foreground mt-1">Auto-calculated as 12 months from appraisal date</p>
            </div>
          </Section>

          {/* ── 2. Evidence pane ── */}
          <Section title="Evidence Snapshot" badge={evidence ? "Compiled" : "Not yet compiled"} defaultOpen={false}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="text-xs text-muted-foreground">
                Evidence is compiled from the system record for the selected period. It <strong>informs</strong> but does not set any rating — the manager's judgement always decides.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!form.appraisee_id || evidenceLoading}
                onClick={compileEvidence}
                className="gap-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${evidenceLoading ? "animate-spin" : ""}`} />
                {evidenceLoading ? "Compiling…" : "Compile evidence"}
              </Button>
            </div>

            {evidenceError && (
              <p className="text-xs text-red-600 bg-red-50 rounded px-3 py-2">{evidenceError}</p>
            )}

            {evidence && (
              <div className="space-y-4">
                {/* YP Engagement */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">YP Engagement</p>
                  <div className="flex flex-wrap gap-2">
                    <MetricPill label="Hours w/ YP" value={fmt(evidence.hours_with_yp?.toFixed(1))} />
                    <MetricPill label="Key-work sessions" value={fmt(evidence.key_work_sessions)} />
                    <MetricPill label="Engagement mode" value={fmt(evidence.engagement_level_mode)} />
                    <MetricPill label="Independence avg" value={fmt(evidence.independence_progress_avg)} />
                    <MetricPill label="Achievements" value={fmt(evidence.achievements_count)} />
                    <MetricPill label="Life skills" value={fmt(evidence.life_skills_worked?.length)} />
                  </div>
                </div>
                {/* Training */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Training</p>
                  <div className="flex flex-wrap gap-2">
                    <MetricPill label="Completion" value={fmtPct(evidence.training_complete_pct)} color={pctColor(evidence.training_complete_pct)} />
                    <MetricPill label="Overdue" value={fmt(evidence.training_overdue_count)} color={evidence.training_overdue_count > 0 ? "text-red-600" : "text-green-600"} />
                    <MetricPill label="Expiring soon" value={fmt(evidence.training_expiring_soon_count)} />
                    <MetricPill label="Avg quiz score" value={evidence.avg_quiz_score != null ? `${evidence.avg_quiz_score}%` : "—"} />
                  </div>
                </div>
                {/* Supervision & Reliability */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Supervision & Reliability</p>
                  <div className="flex flex-wrap gap-2">
                    <MetricPill label="Supervisions" value={fmt(evidence.supervision_count)} />
                    <MetricPill label="Missed" value={fmt(evidence.supervision_missed)} color={evidence.supervision_missed > 0 ? "text-red-600" : "text-green-600"} />
                    <MetricPill label="Bradford Factor" value={fmt(evidence.bradford_factor)} color={evidence.bradford_factor > 40 ? "text-amber-600" : "text-green-600"} />
                    <MetricPill label="Late clock-ins" value={fmt(evidence.late_clock_ins)} />
                    <MetricPill label="Disciplinary" value={fmt(evidence.disciplinary_count)} color={evidence.disciplinary_count > 0 ? "text-red-600" : undefined} />
                    <MetricPill label="Allegations" value={fmt(evidence.allegations_against)} color={evidence.allegations_against > 0 ? "text-red-600" : "text-green-600"} />
                  </div>
                </div>
                {/* Record quality + feedback */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Record Quality & Feedback</p>
                  <div className="flex flex-wrap gap-2">
                    <MetricPill label="Incomplete records" value={fmt(evidence.incomplete_records)} color={evidence.incomplete_records > 0 ? "text-amber-600" : undefined} />
                    <MetricPill label="Data alerts" value={fmt(evidence.open_data_quality_alerts)} />
                    <MetricPill label="YP feedback" value={fmt(evidence.yp_feedback_count)} />
                    <MetricPill label="SW/PA feedback" value={fmt(evidence.swpa_feedback_count)} />
                  </div>
                </div>
                {/* Feedback highlights */}
                {evidence.feedback_highlights?.filter(Boolean).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Feedback Highlights</p>
                    <ul className="space-y-1">
                      {evidence.feedback_highlights.filter(Boolean).map((h, i) => (
                        <li key={i} className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-1.5">{h}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!evidence && !evidenceLoading && (
              <p className="text-xs text-muted-foreground italic">Select a staff member and click "Compile evidence" to load metrics.</p>
            )}
          </Section>

          {/* ── 3. Competency scoring ── */}
          {activeCompetencies.length > 0 && (
            <Section title="Competency Scores" badge={form.competency_scores?.length || 0} defaultOpen={false}>
              <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 rounded px-3 py-2 mb-1">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Scores are pre-filled from the evidence analysis. They are <strong>suggestions only</strong> — amend any score to reflect your professional judgement.</span>
              </div>
              <div className="space-y-4">
                {activeCompetencies.map(comp => {
                  const cs = form.competency_scores?.find(s => s.key === comp.key) || { score: 3, comment: "", suggested_score: null, manager_overridden: false };
                  const evidComp = evidenceData?.competency_scores?.find(s => s.key === comp.key);
                  return (
                    <div key={comp.key} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <p className="text-sm font-semibold">{comp.label}</p>
                          {comp.description && <p className="text-xs text-muted-foreground">{comp.description}</p>}
                        </div>
                        {cs.suggested_score != null && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cs.manager_overridden ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                            {cs.manager_overridden ? `Overridden (suggested ${cs.suggested_score})` : `Suggested ${cs.suggested_score}`}
                          </span>
                        )}
                      </div>
                      {evidComp?.heuristic_notes && (
                        <p className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1">{evidComp.heuristic_notes}</p>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-muted-foreground shrink-0">Score:</span>
                        <StarRating value={cs.score} onChange={v => updateCompetencyScore(comp.key, "score", v)} />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={cs.comment || ""}
                          onChange={e => updateCompetencyScore(comp.key, "comment", e.target.value)}
                          placeholder="Optional comment…"
                          className="w-full text-xs border border-input rounded px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ── 4. Suggested outcome ── */}
          <Section title="Rating & Outcome" defaultOpen>
            {(form.suggested_outcome || form.rolling_score != null) && (
              <div className="flex items-center gap-3 flex-wrap text-xs bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
                <span className="text-muted-foreground">System suggestion:</span>
                {form.rolling_score != null && (
                  <span className="font-semibold text-blue-700">Score {form.rolling_score}/100</span>
                )}
                {form.suggested_outcome && (
                  <span className="font-semibold text-blue-700">→ {OUTCOME_LABELS[form.suggested_outcome] || form.suggested_outcome}</span>
                )}
                {form.suggested_rating != null && (
                  <span className="font-semibold text-blue-700">({form.suggested_rating}★)</span>
                )}
                <span className="italic text-muted-foreground">Manager's choice below takes precedence.</span>
              </div>
            )}

            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Overall Rating (1–5 stars) *</label>
              <div className={errors.overall_rating ? "p-1 border border-destructive rounded-md" : ""}>
                <StarRating
                  value={form.overall_rating}
                  onChange={v => { f("overall_rating", v); setRatingOverridden(true); }}
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Appraisal Outcome *</label>
              <Select value={form.outcome} onValueChange={v => { f("outcome", v); setOutcomeOverridden(true); }}>
                <SelectTrigger className={errors.outcome ? "border-destructive" : ""}><SelectValue placeholder="Select outcome" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_LABELS).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          {/* ── 5. Narrative fields ── */}
          <Section title="Narrative & Goals" defaultOpen>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Performance Feedback</label>
              <textarea
                value={form.performance_notes}
                onChange={e => f("performance_notes", e.target.value)}
                placeholder="Overall observations and feedback…"
                className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[80px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Key Strengths</label>
              <textarea
                value={form.strengths}
                onChange={e => f("strengths", e.target.value)}
                placeholder="What does this person do well?"
                className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Areas for Development</label>
              <textarea
                value={form.areas_for_development}
                onChange={e => f("areas_for_development", e.target.value)}
                placeholder="What could they improve?"
                className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">Employee Comments</label>
              <textarea
                value={form.employee_comments}
                onChange={e => f("employee_comments", e.target.value)}
                placeholder="Employee response to the appraisal…"
                className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <AppraisalGoalForm goals={form.goals || []} onChange={goals => f("goals", goals)} disabled={isSignedOff} />
          </Section>

          {/* ── 6. Self-assessment ── */}
          <Section title="Self-Assessment" badge={form.self_assessment?.submitted ? "Submitted" : form.self_assessment?.requested ? "Requested" : null} defaultOpen={!!form.self_assessment?.submitted}>
            <div className="flex items-center gap-3 flex-wrap">
              {!form.self_assessment?.requested && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!form.appraisee_id || requestingAssess || isSignedOff}
                  onClick={requestSelfAssessment}
                  className="gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {requestingAssess ? "Sending…" : "Request self-assessment"}
                </Button>
              )}
              {form.self_assessment?.requested && !form.self_assessment?.submitted && (
                <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded">
                  Requested — awaiting completion by appraisee
                </span>
              )}
              {form.self_assessment?.submitted && (
                <span className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Submitted {form.self_assessment.submitted_at ? new Date(form.self_assessment.submitted_at).toLocaleDateString("en-GB") : ""}
                </span>
              )}
            </div>

            {/* Show self-assessment responses read-only */}
            {form.self_assessment?.submitted && form.self_assessment?.responses && (
              <div className="space-y-3 mt-2">
                {activeCompetencies.map(comp => {
                  const score = form.self_assessment.responses[comp.key];
                  const comment = form.self_assessment.responses[`${comp.key}__comment`];
                  if (score == null && !comment) return null;
                  return (
                    <div key={comp.key} className="bg-muted/40 rounded-lg p-3">
                      <p className="text-xs font-semibold">{comp.label}</p>
                      {score != null && (
                        <div className="flex gap-1 mt-1">
                          {[1,2,3,4,5].map(r => (
                            <div key={r} className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center ${score >= r ? "bg-amber-300 text-white" : "bg-muted text-muted-foreground"}`}>{r}</div>
                          ))}
                          <span className="text-xs text-muted-foreground ml-1 self-center">(self-rated)</span>
                        </div>
                      )}
                      {comment && <p className="text-xs text-muted-foreground mt-1 italic">"{comment}"</p>}
                    </div>
                  );
                })}
                {form.self_assessment.responses.__reflection && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">Reflective statement</p>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{form.self_assessment.responses.__reflection}</p>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── 7. Improvement plan (shown when outcome requires it) ── */}
          {needsImprovementPlan && (
            <Section title="Improvement Plan" badge="Required" defaultOpen>
              <p className="text-xs text-red-700 bg-red-50 border border-red-100 rounded px-3 py-2">
                An improvement plan is required for this outcome. Add specific goals with target dates and set a review date.
              </p>
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">Review Date</label>
                <Input
                  type="date"
                  value={form.improvement_plan?.review_date || ""}
                  onChange={e => {
                    f("improvement_plan", { ...form.improvement_plan, review_date: e.target.value });
                    setErrors(er => ({ ...er, improvement_plan_review_date: false }));
                  }}
                  disabled={isSignedOff}
                  className={`max-w-[200px] ${errors.improvement_plan_review_date ? "border-destructive" : ""}`}
                />
              </div>
              <div className="space-y-3">
                {(form.improvement_plan?.goals || []).map((goal, idx) => (
                  <ImprovementGoalRow
                    key={goal.id || idx}
                    goal={goal}
                    index={idx}
                    onChange={updateImprovementGoal}
                    onRemove={removeImprovementGoal}
                  />
                ))}
              </div>
              {!isSignedOff && (
                <Button type="button" size="sm" variant="outline" onClick={addImprovementGoal} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Add improvement goal
                </Button>
              )}
            </Section>
          )}

          {/* ── 8. Sign-off bar ── */}
          <Section title="Sign-off" defaultOpen={form.appraiser_signed || form.appraisee_signed}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Appraiser */}
              <div className={`rounded-lg border p-3 space-y-1.5 ${form.appraiser_signed ? "border-green-300 bg-green-50" : "border-border"}`}>
                <p className="text-xs font-semibold">Appraiser</p>
                {form.appraiser_signed ? (
                  <>
                    <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Signed</p>
                    {form.appraiser_signed_at && <p className="text-[10px] text-muted-foreground">{new Date(form.appraiser_signed_at).toLocaleString("en-GB")}</p>}
                  </>
                ) : (
                  <Button type="button" size="sm" onClick={signAsAppraiser} disabled={isSignedOff}>
                    Sign as appraiser
                  </Button>
                )}
              </div>
              {/* Appraisee */}
              <div className={`rounded-lg border p-3 space-y-1.5 ${form.appraisee_signed ? "border-green-300 bg-green-50" : "border-border"}`}>
                <p className="text-xs font-semibold">Appraisee</p>
                {form.appraisee_signed ? (
                  <>
                    <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Signed</p>
                    {form.appraisee_signed_at && <p className="text-[10px] text-muted-foreground">{new Date(form.appraisee_signed_at).toLocaleString("en-GB")}</p>}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Awaiting — available in My HR</p>
                )}
              </div>
              {/* Senior approval */}
              <div className={`rounded-lg border p-3 space-y-1.5 ${form.reviewed_by ? "border-green-300 bg-green-50" : "border-border"}`}>
                <p className="text-xs font-semibold">Senior Approval</p>
                {form.reviewed_by ? (
                  <>
                    <p className="text-xs text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</p>
                    <p className="text-[10px] text-muted-foreground">{form.reviewed_by}</p>
                  </>
                ) : isAdminOrHR && form.appraiser_signed && form.appraisee_signed ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const now = new Date().toISOString();
                      f("reviewed_by", myProfile?.full_name || "Senior Manager");
                      f("reviewed_at", now);
                      f("status", "signed_off");
                    }}
                    disabled={isSignedOff}
                  >
                    Approve & sign off
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    {form.appraiser_signed && form.appraisee_signed ? "Ready for senior approval" : "Awaiting signatures"}
                  </p>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Status: <span className="font-medium capitalize">{form.status || "draft"}</span>
              {form.status === "signed_off" && " · Record is locked. Admins/HR can unlock for amendments."}
            </p>
          </Section>

        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-4 border-t border-border bg-card sticky bottom-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSignedOff}>
            {isSignedOff ? "Locked" : "Save Appraisal"}
          </Button>
        </div>
      </div>
    </div>
  );
}