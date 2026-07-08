import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";

const STATUS_LABELS = { completed: "✅ Completed", in_progress: "🔄 In Progress", not_started: "⭕ Not Started" };

export default function S12Signoff({ residentId, homeId, homeName,staffProfile, sectionStatuses, readOnly = false }) {
  const qc = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });

  const { data: signoffs = [] } = useQuery({
    queryKey: ["support-plan-signoff", residentId],
    queryFn: () => secureGateway.filter("SupportPlanSignoff", { resident_id: residentId }, "-signed_off_at", 10),
    enabled: !!residentId,
  });

  const latestSignoff = signoffs[0] || null;
  const isSignedOff = !!latestSignoff?.signed_off_at;

  const [managerNotes, setManagerNotes] = useState(latestSignoff?.manager_notes || "");
  const [nextReviewDate, setNextReviewDate] = useState(latestSignoff?.next_review_date || "");

  const signoffMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const prevCount = signoffs.length;
      const payload = {
        org_id: ORG_ID,
        resident_id: residentId,
        home_id: homeId,
        signed_off_by: staffProfile?.id || null,
        signed_off_by_name: staffProfile?.full_name || null,
        signed_off_at: now,
        next_review_date: nextReviewDate,
        manager_notes: managerNotes,
        plan_version: prevCount + 1,
      };
      return secureGateway.create("SupportPlanSignoff", payload);
    },
    onSuccess: (created) => {
      toast.success("Support plan signed off");
      qc.invalidateQueries({ queryKey: ["support-plan-signoff", residentId] });

      triggerWorkflow({
        workflowType: "support_plan",
        entityId:     created?.id,
        entityRef:    created?.id ? `SP-${created.id.slice(0, 8)}` : "",
        title:        "Support plan ready for sign-off",
        description:  `All 11 sections complete, submitted for RSM sign-off. Next review: ${nextReviewDate}.`,
        homeId:       homeId,
        homeName:     homeName,
        priority:     "routine",
      });
    },

    onError: e => toast.error("Error: " + e.message),
  });

  // Attachments are optional and must not block sign-off, even though its
  // displayed status correctly shows "not_started" with zero uploads.
  const incompleteSections = sectionStatuses
    ? Object.entries(sectionStatuses).filter(([key, s]) => s !== "completed" && key !== "11. Attachments")
    : [];

  if (isSignedOff && readOnly) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Plan signed off</p>
            <p className="text-xs">
              Signed off by {latestSignoff.signed_off_by_name || "—"} on{" "}
              {new Date(latestSignoff.signed_off_at).toLocaleDateString("en-GB")}
              {latestSignoff.next_review_date ? ` · Review: ${new Date(latestSignoff.next_review_date).toLocaleDateString("en-GB")}` : ""}
            </p>
          </div>
        </div>
        {latestSignoff.manager_notes && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Manager notes</p>
            <p className="text-sm">{latestSignoff.manager_notes}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Incomplete sections warning — shown when sign-off is not yet possible */}
      {incompleteSections.length > 0 && !isSignedOff && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-amber-800">
              {incompleteSections.length} section{incompleteSections.length > 1 ? "s" : ""} still need{incompleteSections.length === 1 ? "s" : ""} to be completed before signing off
            </p>
          </div>
          <div className="space-y-1">
            {incompleteSections.map(([key, status]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-amber-700">{key}</span>
                <span className="text-amber-600">{STATUS_LABELS[status] || status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full checklist */}
      {sectionStatuses && (
        <div className="rounded-lg border border-border p-3 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Section completion checklist</p>
          {Object.entries(sectionStatuses).map(([key, status]) => (
            <div key={key} className="flex items-center justify-between text-xs py-0.5">
              <span className="text-muted-foreground">{key}</span>
              <span>{STATUS_LABELS[status] || status}</span>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Manager notes</p>
        <Textarea
          value={managerNotes}
          onChange={e => setManagerNotes(e.target.value)}
          rows={4}
          placeholder="Any notes before signoff..."
          disabled={readOnly}
          className="resize-y"
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Next review date</p>
        <Input type="date" value={nextReviewDate} onChange={e => setNextReviewDate(e.target.value)} disabled={readOnly} className="w-48 h-9" />
      </div>

      {!readOnly && (
        <div className="flex justify-end pt-1">
          <Button
            onClick={() => signoffMutation.mutate()}
            disabled={signoffMutation.isPending || !nextReviewDate || incompleteSections.length > 0}
            className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            size="sm"
            title={incompleteSections.length > 0 ? "Complete all sections before signing off" : undefined}
          >
            {signoffMutation.isPending ? "Signing off..." : "Sign Off Support Plan"}
          </Button>
        </div>
      )}
    </div>
  );
}