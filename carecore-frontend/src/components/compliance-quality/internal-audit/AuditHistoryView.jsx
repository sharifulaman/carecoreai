import { useMemo } from "react";
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from "lucide-react";

export default function AuditHistoryView({ audits, selectedAudit, actions }) {
  const audit = selectedAudit || audits[0];

  if (!audit) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <p>No audit selected</p>
      </div>
    );
  }

  // Calculate trends
  const homeAudits = audits.filter(a => a.home_id === audit.home_id).sort((a, b) => new Date(b.audit_date) - new Date(a.audit_date));
  const previousAudit = homeAudits[1];
  const trend = previousAudit ? audit.overall_score - previousAudit.overall_score : 0;

  const auditActions = actions.filter(a => a.audit_submission_id === audit.id);
  const completedActions = auditActions.filter(a => a.status === "completed").length;
  const recurringCount = auditActions.filter(a => a.issue_previously_identified).length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Audit Details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold">{audit.home_name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Audited on {new Date(audit.audit_date).toLocaleDateString()} by {audit.auditor_name}
              </p>
            </div>
            <div className="text-right">
              <div className={`text-4xl font-bold ${
                audit.overall_score >= 80 ? "text-green-500" :
                audit.overall_score >= 60 ? "text-amber-500" :
                "text-red-500"
              }`}>
                {audit.overall_score}%
              </div>
              <p className="text-xs text-muted-foreground capitalize mt-1">{audit.compliance_rating}</p>
            </div>
          </div>

          {/* Score Trend */}
          {previousAudit && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
              <span className="text-sm text-muted-foreground">vs. previous audit:</span>
              <div className="flex items-center gap-1">
                {trend > 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-semibold text-green-500">+{trend}%</span>
                  </>
                ) : trend < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-500">{trend}%</span>
                  </>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground">No change</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Summary Sections */}
        {[
          { title: "Strengths Identified", content: audit.overall_strengths, icon: CheckCircle, color: "green" },
          { title: "Areas Requiring Improvement", content: audit.areas_improvement, icon: AlertCircle, color: "amber" },
          { title: "Immediate Concerns", content: audit.immediate_concerns, icon: AlertCircle, color: "red" },
        ].map((section, i) => (
          <div key={i} className={`bg-${section.color}-500/10 border border-${section.color}-500/30 rounded-xl p-6`}>
            <h4 className={`font-semibold flex items-center gap-2 mb-3 text-${section.color}-400`}>
              <section.icon className="w-4 h-4" /> {section.title}
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {section.content || "No information recorded"}
            </p>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Audit Info */}
        <div className="bg-card border border-border/30 rounded-xl p-4 backdrop-blur">
          <h4 className="font-semibold text-sm mb-3">Audit Details</h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Visit Type:</span> <span className="capitalize font-medium">{audit.visit_type}</span></div>
            <div><span className="text-muted-foreground">Young People:</span> <span className="font-medium">{audit.young_people_present}</span></div>
            <div><span className="text-muted-foreground">Workflow Status:</span> <span className="capitalize font-medium text-cyan-400">{audit.workflow_status}</span></div>
            <div><span className="text-muted-foreground">Ofsted Impact:</span> <span className={`font-medium ${audit.ofsted_impact > 0 ? "text-green-400" : "text-red-400"}`}>{audit.ofsted_impact > 0 ? "+" : ""}{audit.ofsted_impact} points</span></div>
          </div>
        </div>

        {/* Actions Summary */}
        <div className="bg-card border border-border/30 rounded-xl p-4 backdrop-blur">
          <h4 className="font-semibold text-sm mb-3">Actions from this Audit</h4>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Total Actions:</span> <span className="font-bold">{auditActions.length}</span></div>
            <div><span className="text-muted-foreground">Completed:</span> <span className="font-bold text-green-400">{completedActions}</span></div>
            <div><span className="text-muted-foreground">Pending:</span> <span className="font-bold text-amber-400">{auditActions.filter(a => a.status === "pending").length}</span></div>
            {recurringCount > 0 && (
              <div className="pt-2 border-t border-border/30">
                <span className="text-muted-foreground">Recurring Issues:</span> <span className="font-bold text-red-400">{recurringCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Previous Audits Timeline */}
        {homeAudits.length > 1 && (
          <div className="bg-card border border-border/30 rounded-xl p-4 backdrop-blur">
            <h4 className="font-semibold text-sm mb-3">Audit History</h4>
            <div className="space-y-2">
              {homeAudits.slice(0, 5).map((a, i) => (
                <div key={a.id} className="text-xs flex items-center justify-between p-2 rounded bg-muted/20">
                  <span className="text-muted-foreground">{new Date(a.audit_date).toLocaleDateString()}</span>
                  <span className={`font-bold ${a.overall_score >= 80 ? "text-green-400" : a.overall_score >= 60 ? "text-amber-400" : "text-red-400"}`}>
                    {a.overall_score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}