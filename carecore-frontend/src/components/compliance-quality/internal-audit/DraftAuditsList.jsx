import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { FileEdit, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function DraftAuditsList({ homes, onResume }) {
  const qc = useQueryClient();

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["audit-drafts"],
    queryFn: () => base44.entities.InternalAuditSubmission.filter({ org_id: ORG_ID, status: "draft" }, "-updated_date", 50),
  });

  const handleDelete = async (draftId) => {
    if (!confirm("Delete this draft audit? This cannot be undone.")) return;
    try {
      await base44.entities.InternalAuditSubmission.delete(draftId);
      toast.success("Draft deleted");
      qc.invalidateQueries({ queryKey: ["audit-drafts"] });
    } catch (err) {
      toast.error("Error deleting draft: " + err.message);
    }
  };

  const getProgress = (draft) => {
    let total = 0;
    let completed = 0;
    const sections = ["section_1_environment", "section_2_health_safety", "section_3_yp_records", "section_4_staff_compliance", "section_5_safeguarding"];
    sections.forEach(s => {
      const responses = draft[s] || {};
      Object.values(responses).forEach(val => {
        total++;
        if (val) completed++;
      });
    });
    return { completed, total: 54, percent: total > 0 ? Math.round((completed / 54) * 100) : 0 };
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border/30 rounded-xl p-6">
        <p className="text-sm text-muted-foreground text-center py-8">Loading drafts...</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="bg-card border border-border/30 rounded-xl p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-cyan-500" /> Draft Audits
        </h3>
        <div className="text-center py-12">
          <FileEdit className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No saved drafts</p>
          <p className="text-xs text-muted-foreground mt-1">Start a new audit and click "Save Draft" to continue later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border/30 rounded-xl p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FileEdit className="w-4 h-4 text-cyan-500" /> Draft Audits
        <span className="ml-1 text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">{drafts.length}</span>
      </h3>
      <div className="space-y-2">
        {drafts.map(draft => {
          const progress = getProgress(draft);
          const home = homes.find(h => h.id === draft.home_id);
          return (
            <div
              key={draft.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/20 hover:bg-muted/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{draft.home_name || home?.name || "Unknown Home"}</p>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-semibold shrink-0">DRAFT</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {draft.updated_date ? new Date(draft.updated_date).toLocaleDateString() : new Date(draft.audit_date).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${progress.percent}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{progress.completed}/54</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  onClick={() => onResume(draft)}
                  className="gap-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 h-8 text-xs"
                >
                  <FileEdit className="w-3.5 h-3.5" /> Resume
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(draft.id)}
                  className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}