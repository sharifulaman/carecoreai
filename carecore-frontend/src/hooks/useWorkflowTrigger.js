import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * Provides a single `triggerWorkflow` function that any form in the app can call
 * after a successful submission to create and immediately submit a maker-checker
 * workflow item. Handles the two-step create → submit sequence, cache invalidation,
 * and user feedback automatically.
 *
 * Usage:
 *   const { triggerWorkflow, isLoading } = useWorkflowTrigger({ staffProfile });
 *
 *   // Inside your form's onSuccess handler:
 *   await triggerWorkflow({
 *     workflowType: "leave_request",
 *     entityId:     createdRecord.id,
 *     entityRef:    "LR-2026-001",          // human-readable reference (optional)
 *     title:        "Leave Request – John",
 *     description:  "Annual leave 5 days",
 *     homeId:       staffProfile.home_ids?.[0],
 *     homeName:     "Sunrise House",
 *     priority:     "routine",              // critical|urgent|important|routine
 *   });
 *
 * @param {object} options
 * @param {object} options.staffProfile  - The logged-in user's staff profile record.
 * @param {function} [options.onSuccess] - Optional callback called after successful submission.
 * @param {function} [options.onError]   - Optional callback called on failure.
 */
export function useWorkflowTrigger({ staffProfile, onSuccess, onError } = {}) {
  const qc = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const actorName = staffProfile?.full_name || staffProfile?.email || "Unknown";

  /**
  * @param {{
  *   workflowType?: string,
  *   entityId?: string,
  *   entityRef?: string,
  *   title?: string,
  *   description?: string,
  *   homeId?: string,
  *   homeName?: string,
  *   priority?: string,
  * }} params
  */
  const triggerWorkflow = async ({
    workflowType,
    entityId = "",
    entityRef = "",
    title = "",
    description = "",
    homeId = "",
    homeName = "",
    priority = "routine",
  } = {}) => {
    if (!workflowType) {
      toast.error("Workflow type is required");
      return null;
    }

    setIsLoading(true);
    try {
      // Step 1: create draft
      const created = await base44.workflow.create({
        workflow_type: workflowType,
        entity_id: entityId,
        entity_ref: entityRef,
        title,
        description,
        home_id: homeId,
        home_name: homeName,
        priority,
        maker_name: actorName,
      });

      if (!created?.id) throw new Error("Workflow creation returned no ID");

      // Step 2: submit (draft → submitted, assigns first reviewer, locks narrative)
      await base44.workflow.action(created.id, {
        action: "submit",
        actor_name: actorName,
        comment: "",
      });

      // Refresh all three workflow queues so every WCC tab reflects the new item.
      qc.invalidateQueries({ queryKey: ["workflow-items"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-submitted"] });
      qc.invalidateQueries({ queryKey: ["workflow-items-team"] });

      toast.success("Submitted for approval");
      onSuccess?.(created);
      return created;
    } catch (err) {
      const message = err?.message || "Failed to submit for approval";
      toast.error(message);
      onError?.(err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { triggerWorkflow, isLoading };
}
