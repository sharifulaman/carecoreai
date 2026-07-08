import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Eye } from "lucide-react";
import { toast } from "sonner";

export default function PendingAuditsList({ pendingAudits, homes, onView, onApproved }) {
  const qc = useQueryClient();

  const handleApprove = async (audit) => {
    try {
      await base44.entities.InternalAuditSubmission.update(audit.id, {
        workflow_status: "checker_approved",
        status: "approved"
      });
      toast.success("Audit approved successfully");
      qc.invalidateQueries({ queryKey: ["internal-audits"] });
      if (onApproved) onApproved();
    } catch (err) {
      toast.error("Error approving audit: " + err.message);
    }
  };

  if (!pendingAudits || pendingAudits.length === 0) {
    return (
      <div className="bg-card border border-border/30 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-500" /> Pending Audits
        </h3>
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No pending audits</p>
          <p className="text-xs text-muted-foreground mt-1">Audits requiring approval will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/30 rounded-xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-amber-500" /> Pending Audits
        <span className="ml-1 text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">{pendingAudits.length}</span>
      </h3>
      <div className="space-y-2">
        {pendingAudits.map(audit => {
          const home = homes.find(h => h.id === audit.home_id);
          return (
            <div
              key={audit.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/20 hover:bg-muted/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{audit.home_name || home?.name || "Unknown Home"}</p>
                  <span className="text-[10px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-semibold shrink-0">PENDING APPROVAL</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Submitted: {audit.submitted_at ? new Date(audit.submitted_at).toLocaleDateString() : new Date(audit.audit_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    By: {audit.submitted_by_name || audit.auditor_name || "Unknown"}
                  </p>
                  <p className={`text-xs font-semibold ${audit.overall_score >= 80 ? 'text-green-500' : audit.overall_score >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                    Score: {audit.overall_score}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onView(audit)}
                  className="gap-1.5 h-8 text-xs"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleApprove(audit)}
                  className="gap-1.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 h-8 text-xs text-white"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
