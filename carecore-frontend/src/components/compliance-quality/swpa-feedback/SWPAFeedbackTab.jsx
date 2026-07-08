import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, Send, Settings } from "lucide-react";
import { toast } from "sonner";
import SWPAFeedbackTemplateManager from "./SWPAFeedbackTemplateManager";
import SWPAFeedbackDistributionModal from "./SWPAFeedbackDistributionModal";

export default function SWPAFeedbackTab({ user }) {
  const qc = useQueryClient();
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [showDistribution, setShowDistribution] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["swpa-templates"],
    queryFn: () => base44.entities.SWPAFeedbackTemplate.filter({ org_id: ORG_ID }),
  });

  // Fetch staff list for distribution
  const { data: staff = [] } = useQuery({
    queryKey: ["staff-for-distribution"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID }),
  });

  // Fetch submissions for this template
  const { data: submissions = [] } = useQuery({
    queryKey: ["swpa-submissions", selectedTemplate?.id],
    enabled: !!selectedTemplate,
    queryFn: () => 
      base44.entities.SWPAFeedbackSubmission.filter({ 
        org_id: ORG_ID,
        template_id: selectedTemplate?.id 
      }),
  });

  const activeTemplate = templates.find(t => t.status === "active");

  const handleDistribute = (template) => {
    setSelectedTemplate(template);
    setShowDistribution(true);
  };

  const stats = {
    total: submissions.length,
    submitted: submissions.filter(s => s.status === "submitted" || s.status === "reviewed").length,
    pending: submissions.filter(s => s.status === "draft").length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Social Worker/PA Feedback</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gather structured feedback from social workers and personal advisers
          </p>
        </div>
        <Button onClick={() => setShowTemplateManager(true)} className="gap-2">
          <Settings className="w-4 h-4" /> Manage Templates
        </Button>
      </div>

      {/* Stats */}
      {activeTemplate && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Sent</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600">{stats.submitted}</p>
            <p className="text-xs text-muted-foreground">Submitted</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Completion Rate</p>
          </div>
        </div>
      )}

      {/* Active Template Card */}
      {activeTemplate ? (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{activeTemplate.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{activeTemplate.description}</p>
              <p className="text-xs text-muted-foreground mt-2">v{activeTemplate.version_number || activeTemplate.active_version_number || "1.0"}</p>
            </div>
            <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
              Active
            </span>
          </div>

          {/* Sections Preview */}
          <div className="mb-6 space-y-3 bg-muted/30 p-4 rounded-lg">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Sections ({activeTemplate.sections?.length || 0})</p>
            {activeTemplate.sections?.map(section => (
              <div key={section.section_id} className="text-sm">
                <p className="font-medium">{section.title}</p>
                <p className="text-xs text-muted-foreground">{section.questions?.length || 0} questions</p>
              </div>
            ))}
          </div>

          <Button
            onClick={() => handleDistribute(activeTemplate)}
            className="gap-2 w-full"
          >
            <Send className="w-4 h-4" /> Send Feedback Form
          </Button>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
          <p className="text-sm font-medium text-amber-900 mb-3">No active template found</p>
          <Button onClick={() => setShowTemplateManager(true)} variant="outline" size="sm">
            Create Template
          </Button>
        </div>
      )}

      {/* Recent Submissions */}
      {submissions.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-4">Recent Submissions</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {submissions.slice(0, 10).map(sub => (
              <div key={sub.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg text-sm">
                <div>
                  <p className="font-medium">{sub.social_worker_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : "Not submitted"}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  sub.status === "submitted" || sub.status === "reviewed"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {sub.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {showTemplateManager && (
        <SWPAFeedbackTemplateManager
          orgId={ORG_ID}
          user={user}
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      {showDistribution && selectedTemplate && (
        <SWPAFeedbackDistributionModal
          orgId={ORG_ID}
          template={selectedTemplate}
          staffList={staff}
          onClose={() => setShowDistribution(false)}
        />
      )}
    </div>
  );
}