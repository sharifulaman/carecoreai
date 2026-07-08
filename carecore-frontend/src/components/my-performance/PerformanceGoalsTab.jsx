// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import {
  Target, Plus, CheckCircle2, Clock, PauseCircle, XCircle,
  CalendarDays, Tag, ChevronUp, ChevronDown, X,
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

const STATUS_FILTERS = [
  { value: "all",         label: "All" },
  { value: "active",      label: "Active" },
  { value: "completed",   label: "Completed" },
  { value: "on_hold",     label: "On Hold" },
];

const CATEGORIES = [
  { value: "personal_development", label: "Personal Development" },
  { value: "clinical_skills",      label: "Clinical Skills" },
  { value: "communication",        label: "Communication" },
  { value: "leadership",           label: "Leadership" },
  { value: "compliance",           label: "Compliance" },
  { value: "wellbeing",            label: "Wellbeing" },
  { value: "other",                label: "Other" },
];

// Statuses must match backend PerformanceGoal.status enum:
// not_started | in_progress | achieved | deferred | cancelled
const STATUS_CONFIG = {
  not_started: { label: "Not Started", icon: Clock,        cls: "bg-slate-100 text-slate-600",     bar: "bg-slate-400" },
  in_progress: { label: "In Progress", icon: Target,       cls: "bg-blue-100 text-blue-700",       bar: "bg-blue-500" },
  achieved:    { label: "Achieved",    icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500" },
  deferred:    { label: "On Hold",     icon: PauseCircle,  cls: "bg-amber-100 text-amber-700",     bar: "bg-amber-400" },
  cancelled:   { label: "Cancelled",   icon: XCircle,      cls: "bg-red-100 text-red-700",         bar: "bg-red-400" },
};

const CATEGORY_COLORS = {
  personal_development: "bg-purple-100 text-purple-700",
  clinical_skills:      "bg-blue-100 text-blue-700",
  communication:        "bg-cyan-100 text-cyan-700",
  leadership:           "bg-indigo-100 text-indigo-700",
  compliance:           "bg-amber-100 text-amber-700",
  wellbeing:            "bg-green-100 text-green-700",
  other:                "bg-slate-100 text-slate-600",
};

const ACTIVE_STATUSES = ["not_started", "in_progress"];

// ── Component ──────────────────────────────────────────────────────────────────

export default function PerformanceGoalsTab({ staffProfile }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreate, setShowCreate]     = useState(false);
  const [editGoal, setEditGoal]         = useState(null);

  const staffId = staffProfile?.id;

  // ── Fetch all goals ─────────────────────────────────────────────────────────
  const { data: goals = [], isLoading } = useQuery({
    queryKey: ["performance-goals", staffId],
    queryFn: () => secureGateway.filter(
      "PerformanceGoal",
      { staff_id: staffId },
      "-created_date",
      200,
    ),
    enabled: !!staffId,
    staleTime: 60 * 1000,
  });

  // ── Filter ──────────────────────────────────────────────────────────────────
  const filtered = goals.filter(g => {
    if (statusFilter === "all")       return true;
    if (statusFilter === "active")    return ACTIVE_STATUSES.includes(g.status);
    if (statusFilter === "completed") return g.status === "achieved";
    if (statusFilter === "on_hold")   return g.status === "deferred";
    return true;
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalActive    = goals.filter(g => ACTIVE_STATUSES.includes(g.status)).length;
  const totalCompleted = goals.filter(g => g.status === "achieved").length;
  const avgProgress    = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + (g.progress ?? 0), 0) / goals.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
              {f.value === "active" && totalActive > 0 && (
                <span className="ml-1.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {totalActive}
                </span>
              )}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => setShowCreate(true)}
          disabled={!staffId}
        >
          <Plus className="w-4 h-4" /> Add Goal
        </Button>
      </div>

      {/* Stats mini-bar */}
      {!isLoading && goals.length > 0 && (
        <div className="flex items-center gap-6 text-sm text-muted-foreground border-b border-border pb-4">
          <span><span className="font-semibold text-foreground">{totalActive}</span> active</span>
          <span><span className="font-semibold text-foreground">{totalCompleted}</span> completed</span>
          <span><span className="font-semibold text-foreground">{avgProgress}%</span> avg progress</span>
        </div>
      )}

      {/* Goal cards */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasGoals={goals.length > 0}
          onAdd={() => setShowCreate(true)}
          disabled={!staffId}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => setEditGoal(g)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <GoalFormDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        staffProfile={staffProfile}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ["performance-goals", staffId] });
          setShowCreate(false);
        }}
      />

      {/* Edit / update progress modal */}
      {editGoal && (
        <GoalFormDialog
          open={!!editGoal}
          onClose={() => setEditGoal(null)}
          staffProfile={staffProfile}
          existingGoal={editGoal}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["performance-goals", staffId] });
            setEditGoal(null);
          }}
        />
      )}
    </div>
  );
}

// ── GoalCard ───────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit }) {
  const cfg     = STATUS_CONFIG[goal.status] ?? STATUS_CONFIG.not_started;
  const StatusIcon = cfg.icon;
  const catCls  = CATEGORY_COLORS[goal.category] ?? CATEGORY_COLORS.other;
  const catLabel = CATEGORIES.find(c => c.value === goal.category)?.label ?? goal.category;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-sm leading-snug flex-1">{goal.title}</h4>
        <span className={cn(
          "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold",
          cfg.cls,
        )}>
          <StatusIcon className="w-3 h-3" />
          {cfg.label}
        </span>
      </div>

      {/* Description */}
      {goal.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{goal.description}</p>
      )}

      {/* Category badge */}
      <div className="flex items-center gap-1.5">
        <Tag className="w-3 h-3 text-muted-foreground" />
        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", catCls)}>
          {catLabel}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-semibold">{goal.progress ?? 0}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", cfg.bar)}
            style={{ width: `${goal.progress ?? 0}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {goal.target_date ? (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-3 h-3" /> {goal.target_date}
          </p>
        ) : (
          <span />
        )}
        <button
          onClick={onEdit}
          className="text-xs text-primary font-medium hover:underline"
        >
          Update
        </button>
      </div>
    </div>
  );
}

// ── GoalFormDialog ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "personal_development",
  target_date: "",
  status: "not_started",
  progress: 0,
};

function GoalFormDialog({ open, onClose, staffProfile, existingGoal = null, onSaved }) {
  const isEdit = !!existingGoal;
  const [form, setForm] = useState(isEdit ? {
    title:       existingGoal.title       ?? "",
    description: existingGoal.description ?? "",
    category:    existingGoal.category    ?? "personal_development",
    target_date: existingGoal.target_date ?? "",
    status:      existingGoal.status      ?? "not_started",
    progress:    existingGoal.progress    ?? 0,
  } : EMPTY_FORM);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const createMutation = useMutation({
    mutationFn: (data) => secureGateway.create("PerformanceGoal", data),
    onSuccess: () => { toast.success("Goal created"); onSaved(); },
    onError: () => toast.error("Failed to create goal"),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => secureGateway.update("PerformanceGoal", existingGoal?.id, data),
    onSuccess: () => { toast.success("Goal updated"); onSaved(); },
    onError: () => toast.error("Failed to update goal"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("Title is required"); return; }

    if (isEdit) {
      updateMutation.mutate({
        status:      form.status,
        progress:    Number(form.progress),
        description: form.description,
        target_date: form.target_date,
        achieved_date: form.status === "achieved" ? new Date().toISOString().slice(0, 10) : "",
      });
    } else {
      createMutation.mutate({
        org_id:      ORG_ID,
        staff_id:    staffProfile?.id    ?? "",
        staff_name:  staffProfile?.full_name ?? "",
        title:       form.title.trim(),
        description: form.description,
        category:    form.category,
        target_date: form.target_date,
        status:      "not_started",
        progress:    0,
        set_by:      "self",
        set_by_id:   staffProfile?.id    ?? "",
        set_by_name: staffProfile?.full_name ?? "",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Update Goal" : "Add New Goal"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Title — create only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Goal Title *</label>
              <Input
                value={form.title}
                onChange={e => set("title", e.target.value)}
                placeholder="e.g. Complete advanced safeguarding training"
                required
              />
            </div>
          )}

          {isEdit && (
            <p className="text-sm font-semibold">{existingGoal?.title}</p>
          )}

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="What does achieving this goal look like?"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>

          {/* Category — create only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Category</label>
              <Select value={form.category} onValueChange={v => set("category", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Target date */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Target Date</label>
            <Input
              type="date"
              value={form.target_date}
              onChange={e => set("target_date", e.target.value)}
            />
          </div>

          {/* Status — edit only */}
          {isEdit && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Status</label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Progress — edit only */}
          {isEdit && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">Progress</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => set("progress", Math.max(0, Number(form.progress) - 10))}
                    className="p-0.5 rounded border border-border hover:bg-muted transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold w-10 text-center">{form.progress}%</span>
                  <button
                    type="button"
                    onClick={() => set("progress", Math.min(100, Number(form.progress) + 10))}
                    className="p-0.5 rounded border border-border hover:bg-muted transition-colors"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={form.progress}
                onChange={e => set("progress", Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${form.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ hasGoals, onAdd, disabled }) {
  return (
    <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Target className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-semibold text-base mb-1">
        {hasGoals ? "No goals match this filter" : "No goals yet"}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
        {hasGoals
          ? "Try switching to a different status filter."
          : "Set your first performance goal to start tracking your professional development."}
      </p>
      {!hasGoals && (
        <Button className="mt-5 gap-2" onClick={onAdd} disabled={disabled}>
          <Plus className="w-4 h-4" /> Add Your First Goal
        </Button>
      )}
    </div>
  );
}
