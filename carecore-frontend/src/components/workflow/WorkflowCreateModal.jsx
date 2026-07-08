import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// const WORKFLOW_TYPES = [
//   { value: "incident_report", label: "Incident Review" },
//   { value: "missing_episode", label: "Missing Episode Review" },
//   { value: "support_plan", label: "Support Plan Review" },
//   { value: "visit_report", label: "Visit Report Review" },
// ];

export default function WorkflowCreateModal({ onClose, onSuccess, homes, staffProfile }) {
  const [workflowType, setWorkflowType] = useState("");
  const [homeId, setHomeId] = useState("");
  const [priority, setPriority] = useState("routine");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState({});

  const { data: workflowTypes = [], isLoading: typesLoading } = useQuery({
    queryKey: ["workflow-types"],
    queryFn: () => base44.workflow.types(),
    staleTime: 5 * 60 * 1000,
  });

  const { triggerWorkflow, isLoading } = useWorkflowTrigger({
    staffProfile,
    onSuccess: () => onSuccess?.(),
  });

  const handleSubmit = async () => {
    const newErrors = {};
    if (!workflowType) newErrors.workflowType = "Workflow type required";
    if (!homeId) newErrors.homeId = "Home required";
    if (!description) newErrors.description = "Description required";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // const selectedHome = homes.find(h => h.id === homeId);
    // const typeLabel = WORKFLOW_TYPES.find(t => t.value === workflowType)?.label || workflowType;

   const selectedHome = homes.find(h => h.id === homeId);
    const typeLabel = workflowTypes.find(t => t.workflow_type === workflowType)?.module_name || workflowType;

    await triggerWorkflow({
      workflowType,
      homeId,
      homeName: selectedHome?.name || "",
      priority,
      description,
      title: typeLabel,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Create Workflow</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">
              Workflow Type *
            </label>
            
            <Select
              value={workflowType}
              onValueChange={(value) => { setWorkflowType(value); setErrors({ ...errors, workflowType: "" }); }}
              disabled={typesLoading}
            >
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder={typesLoading ? "Loading types..." : "Select type..."} />
              </SelectTrigger>
              {/* max-h-64 ≈ 7-8 rows visible, then scrolls. Adjust to taste. */}
              <SelectContent className="max-h-64 overflow-y-auto">
                {workflowTypes.map(t => (
                  <SelectItem key={t.workflow_type} value={t.workflow_type}>
                    {t.module_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* <select
              value={workflowType}
              onChange={(e) => { setWorkflowType(e.target.value); setErrors({ ...errors, workflowType: "" }); }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="">Select type...</option>
              {WORKFLOW_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select> */}

            {errors.workflowType && (
              <p className="text-xs text-red-600 mt-1">{errors.workflowType}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Home *</label>
            <select
              value={homeId}
              onChange={(e) => {
                setHomeId(e.target.value);
                setErrors({ ...errors, homeId: "" });
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="">Select home...</option>
              {homes.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            {errors.homeId && (
              <p className="text-xs text-red-600 mt-1">{errors.homeId}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">
              Description *
            </label>
            <Textarea
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setErrors({ ...errors, description: "" });
              }}
              placeholder="What is this workflow about?"
              className="h-24 text-sm"
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-1">{errors.description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-6 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? "Submitting..." : "Create Workflow"}
          </Button>
        </div>
      </div>
    </div>
  );
}
