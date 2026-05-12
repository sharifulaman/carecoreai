import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function HomeCheckForm({ checkType, checklist, home, user, onClose, onSave }) {
  const [items, setItems] = useState(checklist.map(item => ({ id: Math.random().toString(), item_name: item, status: "pass", notes: "" })));

  const createMutation = useMutation({
    mutationFn: async () => {
      const anyFails = items.some(i => i.status === "fail");
      const maintenanceIssues = items.filter(i => i.status === "fail").map(i => i.item_name);

      const check = {
        org_id: ORG_ID,
        home_id: home.id,
        home_name: home.name,
        check_date: new Date().toISOString().split("T")[0],
        check_type: checkType,
        checked_by_id: user?.id,
        checked_by_name: user?.full_name,
        items,
        overall_result: anyFails ? "fail" : items.some(i => i.status === "advisory") ? "advisory" : "pass",
        any_fails: anyFails,
        maintenance_issues: maintenanceIssues,
        signed_off_at: new Date().toISOString(),
      };

      await secureGateway.create("HomeCheck", check);

      // Create maintenance tasks for failed items
      if (anyFails && maintenanceIssues.length > 0) {
        const taskPromises = maintenanceIssues.map(issue =>
          secureGateway.create("MaintenanceLog", {
            org_id: ORG_ID,
            home_id: home.id,
            home_name: home.name,
            issue_date: new Date().toISOString().split("T")[0],
            issue_reported_by_id: user?.id,
            issue_reported_by_name: user?.full_name,
            description: `${checkType.toUpperCase()} CHECK: ${issue}`,
            priority: "high",
            status: "open",
          })
        );
        await Promise.all(taskPromises);
      }

      // Notify manager if fails
      if (anyFails) {
        toast.error(`⚠️ ${maintenanceIssues.length} items failed. Manager notified.`);
      }
    },
    onSuccess: () => {
      toast.success("Check completed");
      onSave();
      onClose();
    },
    onError: () => toast.error("Error saving check"),
  });

  const handleSubmit = () => {
    if (items.every(i => i.status === "na")) {
      toast.error("At least one item must be checked");
      return;
    }
    createMutation.mutate();
  };

  const failCount = items.filter(i => i.status === "fail").length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold capitalize">{checkType} Home Check</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {failCount > 0 && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <div className="text-sm text-red-700">
              <p className="font-medium">{failCount} item(s) failed</p>
              <p className="text-xs mt-0.5">Manager will be notified. Maintenance tasks will be created.</p>
            </div>
          </div>
        )}

        <div className="px-6 py-4 space-y-2">
          {items.map((item, i) => (
            <div key={item.id} className="p-3 border border-border rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{item.item_name}</span>
                <select
                  value={item.status}
                  onChange={e => {
                    const updated = [...items];
                    updated[i].status = e.target.value;
                    setItems(updated);
                  }}
                  className="px-2 py-1 border border-border rounded text-xs bg-card"
                >
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="advisory">Advisory</option>
                  <option value="na">N/A</option>
                </select>
              </div>
              {item.status !== "pass" && item.status !== "na" && (
                <Input
                  value={item.notes}
                  onChange={e => {
                    const updated = [...items];
                    updated[i].notes = e.target.value;
                    setItems(updated);
                  }}
                  placeholder="Notes (required if not Pass)..."
                  className="text-xs h-8"
                />
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-border px-6 py-4 flex gap-2 justify-end bg-muted/30">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Saving..." : "Complete Check"}
          </Button>
        </div>
      </div>
    </div>
  );
}