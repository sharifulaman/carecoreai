import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, AlertTriangle, CheckCircle2, RefreshCw, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import PlacementPlanForm from "./PlacementPlanForm";
import PlacementPlanDetail from "./PlacementPlanDetail";

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

const STATUS_CFG = {
  active:   { cls: "bg-green-100 text-green-700 border-green-200",  label: "Active" },
  draft:    { cls: "bg-blue-100 text-blue-700 border-blue-200",     label: "Draft" },
  reviewed: { cls: "bg-purple-100 text-purple-700 border-purple-200", label: "Reviewed" },
  archived: { cls: "bg-gray-100 text-gray-500 border-gray-200",     label: "Archived" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.draft;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const PROGRESS_CFG = {
  achieved:     "bg-green-100 text-green-700",
  in_progress:  "bg-blue-100 text-blue-700",
  not_started:  "bg-gray-100 text-gray-500",
  not_achieved: "bg-red-100 text-red-700",
};

function GoalBadge({ progress }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${PROGRESS_CFG[progress] || PROGRESS_CFG.not_started}`}>
      {(progress || "not started").replace(/_/g, " ")}
    </span>
  );
}

export default function PlacementPlanTab({ residents, homes, staff, user, myStaffProfile, isAdminOrTL }) {
  const qc = useQueryClient();
  const [selectedResidentId, setSelectedResidentId] = useState(residents[0]?.id || null);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [viewingPlan, setViewingPlan] = useState(null);

  useEffect(() => {
    if (residents.length > 0) {
      if (!selectedResidentId || !residents.some(r => r.id === selectedResidentId)) {
        setSelectedResidentId(residents[0].id);
      }
    } else {
      setSelectedResidentId(null);
    }
  }, [residents, selectedResidentId]);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["placement-plans"],
    queryFn: () => secureGateway.filter("PlacementPlan", {}, "-version", 500),
  });

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const resident = residents.find(r => r.id === selectedResidentId) || residents[0] || null;
  const home = resident ? homeMap[resident.home_id] : null;

  const residentPlans = useMemo(
    () => plans.filter(p => p.resident_id === selectedResidentId).sort((a, b) => (b.version || 0) - (a.version || 0)),
    [plans, selectedResidentId]
  );
  const activePlan = residentPlans.find(p => p.status === "active") || residentPlans.find(p => p.status === "draft") || residentPlans[0] || null;
  const previousPlans = residentPlans.filter(p => p.id !== activePlan?.id);

  const daysUntilReview = activePlan ? daysUntil(activePlan.review_date) : null;
  const isReviewOverdue = daysUntilReview !== null && daysUntilReview < 0;
  const isReviewSoon = daysUntilReview !== null && daysUntilReview >= 0 && daysUntilReview <= 14;

  const activateMutation = useMutation({
    mutationFn: async (planId) => {
      await secureGateway.update("PlacementPlan", planId, { status: "active" });
    },
    onSuccess: () => {
      toast.success("Plan set to active");
      qc.invalidateQueries({ queryKey: ["placement-plans"] });
    },
    onError: e => toast.error("Error: " + e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: async (planId) => {
      await secureGateway.update("PlacementPlan", planId, { status: "archived" });
    },
    onSuccess: () => {
      toast.success("Plan archived");
      qc.invalidateQueries({ queryKey: ["placement-plans"] });
    },
    onError: e => toast.error("Error: " + e.message),
  });

  const newVersionMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan) return;
      if (activePlan.status === "active") {
        await secureGateway.update("PlacementPlan", activePlan.id, { status: "reviewed" });
      }
      const { id, created_at, updated_at, is_deleted, ...rest } = activePlan;
      await secureGateway.create("PlacementPlan", {
        ...rest,
        version: (activePlan.version || 1) + 1,
        status: "draft",
        created_by_id: myStaffProfile?.id || null,
        created_by_name: myStaffProfile?.full_name || null,
        updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      toast.success("New version created as draft");
      qc.invalidateQueries({ queryKey: ["placement-plans"] });
    },
    onError: e => toast.error("Error: " + e.message),
  });

  if (isLoading) return <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Placement Plan</h3>
        {residents.length > 1 && (
          <Select value={selectedResidentId || ""} onValueChange={setSelectedResidentId}>
            <SelectTrigger className="w-52 text-sm h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        {isAdminOrTL && (
          <Button onClick={() => { setEditingPlan(null); setShowForm(true); }} className="gap-1.5" size="sm">
            <Plus className="w-4 h-4" /> Create Plan
          </Button>
        )}
      </div>

      {/* Statutory notice */}
      {!activePlan && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">No Placement Plan on record</p>
            <p className="text-xs text-amber-700 mt-0.5">A Placement Plan is a statutory requirement and must be completed from day one of placement (Children Act 1989, Reg. 4).</p>
          </div>
        </div>
      )}

      {/* Review alerts */}
      {isReviewOverdue && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-300 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700 font-medium">Review overdue by {Math.abs(daysUntilReview)} day{Math.abs(daysUntilReview) !== 1 ? "s" : ""}</p>
        </div>
      )}
      {isReviewSoon && !isReviewOverdue && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">Review due in {daysUntilReview} day{daysUntilReview !== 1 ? "s" : ""} — {activePlan.review_date}</p>
        </div>
      )}

      {/* Active / current plan card */}
      {activePlan && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-border bg-muted/20">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <StatusBadge status={activePlan.status} />
                <span className="text-xs text-muted-foreground font-medium">Version {activePlan.version}</span>
                {activePlan.emergency_placement && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold border border-red-200">Emergency</span>
                )}
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                {activePlan.effective_date && <span>Effective: <strong className="text-foreground">{activePlan.effective_date}</strong></span>}
                {activePlan.review_date && <span>Review: <strong className={isReviewOverdue ? "text-red-600" : "text-foreground"}>{activePlan.review_date}</strong></span>}
                {activePlan.placement_type && <span>Type: <strong className="text-foreground">{activePlan.placement_type}</strong></span>}
                {activePlan.la_area && <span>LA: <strong className="text-foreground">{activePlan.la_area}</strong></span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap shrink-0 ml-4">
              <Button size="sm" variant="outline" onClick={() => setViewingPlan(activePlan)} className="gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" /> View Full
              </Button>
              {isAdminOrTL && (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setEditingPlan(activePlan); setShowForm(true); }} className="gap-1.5 text-xs">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </Button>
                  {activePlan.status === "draft" && (
                    <Button size="sm" variant="outline" onClick={() => activateMutation.mutate(activePlan.id)} disabled={activateMutation.isPending} className="gap-1.5 text-xs text-green-700 hover:text-green-800">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => newVersionMutation.mutate()} disabled={newVersionMutation.isPending} className="gap-1.5 text-xs">
                    <RefreshCw className="w-3.5 h-3.5" /> New Version
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {activePlan.reason_for_placement && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Reason for Placement</p>
                <p className="text-sm whitespace-pre-wrap">{activePlan.reason_for_placement}</p>
              </div>
            )}

            {/* Key people */}
            {(activePlan.social_worker_name || activePlan.iro_name) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activePlan.social_worker_name && (
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="text-xs text-muted-foreground font-medium">Social Worker</p>
                    <p className="text-sm font-medium mt-0.5">{activePlan.social_worker_name}</p>
                    {activePlan.social_worker_contact && <p className="text-xs text-muted-foreground mt-0.5">{activePlan.social_worker_contact}</p>}
                  </div>
                )}
                {activePlan.iro_name && (
                  <div className="p-3 rounded-lg border border-border bg-muted/10">
                    <p className="text-xs text-muted-foreground font-medium">Independent Reviewing Officer</p>
                    <p className="text-sm font-medium mt-0.5">{activePlan.iro_name}</p>
                    {activePlan.iro_contact && <p className="text-xs text-muted-foreground mt-0.5">{activePlan.iro_contact}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Goals */}
            {activePlan.goals && activePlan.goals.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Goals ({activePlan.goals.length})</p>
                <div className="space-y-2">
                  {activePlan.goals.map((g, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-muted/10">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide capitalize">{g.goal_area}</p>
                        <p className="text-sm mt-0.5">{g.description}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          {g.target_date && <span>Target: {g.target_date}</span>}
                          {g.responsible_person && <span>Owner: {g.responsible_person}</span>}
                        </div>
                        {g.progress_notes && <p className="text-xs text-muted-foreground italic mt-1">"{g.progress_notes}"</p>}
                      </div>
                      <GoalBadge progress={g.progress} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Risk of breakdown */}
            {activePlan.risk_of_breakdown && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Risk of Breakdown Flagged</p>
                  {activePlan.breakdown_risk_notes && <p className="text-xs text-amber-700 mt-0.5">{activePlan.breakdown_risk_notes}</p>}
                  {activePlan.contingency_plan && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-amber-800">Contingency</p>
                      <p className="text-xs text-amber-700">{activePlan.contingency_plan}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Created by */}
            {activePlan.created_by_name && (
              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                Created by {activePlan.created_by_name}
                {activePlan.updated_at ? ` · Last updated ${new Date(activePlan.updated_at).toLocaleDateString("en-GB")}` : ""}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Previous versions */}
      {previousPlans.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/20">
            <p className="text-sm font-semibold">Previous Versions ({previousPlans.length})</p>
          </div>
          <div className="divide-y divide-border">
            {previousPlans.map(p => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-3">
                  <StatusBadge status={p.status} />
                  <div>
                    <span className="text-sm font-medium">Version {p.version}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {p.effective_date}{p.review_date ? ` → reviewed ${p.review_date}` : ""}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setViewingPlan(p)} className="text-xs h-7 px-2 gap-1">
                    <FileText className="w-3 h-3" /> View
                  </Button>
                  {isAdminOrTL && p.status !== "archived" && (
                    <Button size="sm" variant="ghost" onClick={() => archiveMutation.mutate(p.id)} disabled={archiveMutation.isPending} className="text-xs h-7 px-2 gap-1 text-muted-foreground">
                      <Archive className="w-3 h-3" /> Archive
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <PlacementPlanForm
          plan={editingPlan}
          resident={resident}
          residents={residents}
          homes={homes}
          staff={staff}
          myStaffProfile={myStaffProfile}
          onClose={() => { setShowForm(false); setEditingPlan(null); }}
          onSave={() => { qc.invalidateQueries({ queryKey: ["placement-plans"] }); setShowForm(false); setEditingPlan(null); }}
        />
      )}
      {viewingPlan && (
        <PlacementPlanDetail
          plan={viewingPlan}
          resident={residents.find(r => r.id === viewingPlan.resident_id) || resident}
          onClose={() => setViewingPlan(null)}
        />
      )}
    </div>
  );
}
