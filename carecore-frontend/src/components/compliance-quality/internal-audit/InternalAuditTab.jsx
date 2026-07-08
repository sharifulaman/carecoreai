import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Plus, Eye, History, TrendingUp, AlertCircle, CheckCircle, FileEdit } from "lucide-react";
import AuditForm from "./AuditForm";
import AuditHistoryView from "./AuditHistoryView";
import DraftAuditsList from "./DraftAuditsList";
import PendingAuditsList from "./PendingAuditsList";

export default function InternalAuditTab({ user, staffProfile, homes = [] }) {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeView, setActiveView] = useState(() => searchParams.get("view") || "dashboard");
  const [showForm, setShowForm] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const { data: drafts = [] } = useQuery({
    queryKey: ["audit-drafts"],
    queryFn: () => base44.entities.InternalAuditSubmission.filter({ org_id: ORG_ID, status: "draft" }, "-updated_date", 50),
  });

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["internal-audits"],
    queryFn: () => base44.entities.InternalAuditSubmission.filter({ org_id: ORG_ID }, "-audit_date", 100),
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["audit-actions"],
    queryFn: () => base44.entities.AuditAction.filter({ org_id: ORG_ID }),
  });

  useEffect(() => {
    const view = searchParams.get("view");
    if (view) {
      setActiveView(view);
      searchParams.delete("view");
      setSearchParams(searchParams, { replace: true });
    }

    const homeId = searchParams.get("homeId");
    if (homeId && audits.length > 0) {
      const homeAudits = audits.filter(a => String(a.home_id) === String(homeId)).sort((a, b) => new Date(b.audit_date) - new Date(a.audit_date));
      if (homeAudits.length > 0) {
        setSelectedAudit(homeAudits[0]);
      } else {
        setSelectedAudit(null);
      }
      searchParams.delete("homeId");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, audits, setSearchParams]);

  const pendingAudits = audits.filter(a => a.workflow_status === "maker_submitted" || a.status === "pending");

  // Calculate metrics
  const metrics = {
    totalAudits: audits.length,
    thisMonth: audits.filter(a => {
      const date = new Date(a.audit_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    pendingActions: actions.filter(a => a.status === "pending").length + pendingAudits.length,
    overdueActions: actions.filter(a => a.status === "overdue").length,
    avgScore: audits.length > 0 ? Math.round(audits.reduce((sum, a) => sum + (a.overall_score || 0), 0) / audits.length) : 0,
  };

  const recentAudits = audits.slice(0, 5);
  const recurringIssues = actions.filter(a => a.issue_previously_identified).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Internal Audit Manager
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive home audits with workflow, evidence tracking, and Ofsted readiness
          </p>
        </div>
        <Button onClick={() => { setEditDraft(null); setShowForm(true); }} className="gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
          <Plus className="w-4 h-4" /> New Audit
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Audits", value: metrics.totalAudits, icon: "📋", color: "from-blue-500 to-cyan-500" },
          { label: "This Month", value: metrics.thisMonth, icon: "📅", color: "from-purple-500 to-pink-500" },
          { label: "Avg Score", value: `${metrics.avgScore}%`, icon: "📊", color: "from-green-500 to-emerald-500" },
          { label: "Pending Actions", value: metrics.pendingActions, icon: "⏳", color: "from-amber-500 to-orange-500", badge: metrics.pendingActions > 0 },
          { label: "Recurring Issues", value: recurringIssues, icon: "🔁", color: "from-red-500 to-rose-500", badge: recurringIssues > 0 },
        ].map((metric, i) => (
          <div key={i} className={`bg-gradient-to-br ${metric.color} p-4 rounded-xl text-white shadow-lg relative overflow-hidden`}>
            <div className="absolute -right-8 -top-8 text-6xl opacity-20">{metric.icon}</div>
            <p className="text-xs font-medium opacity-90">{metric.label}</p>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
            {metric.badge && (
              <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/30 overflow-x-auto scrollbar-none">
        {[
          { key: "dashboard", label: "Dashboard", icon: "📊", badge: null },
          { key: "drafts", label: "Draft Audits", icon: "📝", badge: drafts.length, highlight: true },
          { key: "pending", label: "Pending Audits", icon: "⏳", badge: pendingAudits.length, highlight: pendingAudits.length > 0 },
          { key: "history", label: "Audit History", icon: "📜", badge: null },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveView(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              activeView === tab.key
                ? "border-cyan-500 text-cyan-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
            {tab.badge !== null && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                tab.badge > 0
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  : "bg-muted text-muted-foreground"
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard View */}
      {activeView === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Audits */}
          <div className="lg:col-span-2 bg-card border border-border/30 rounded-xl p-6 backdrop-blur">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-500" /> Recent Audits
            </h3>
            {recentAudits.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No audits yet</p>
            ) : (
              <div className="space-y-2">
                {recentAudits.map(audit => (
                  <div
                    key={audit.id}
                    onClick={() => { setSelectedAudit(audit); setActiveView("history"); }}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/60 cursor-pointer transition-colors border border-border/20"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{audit.home_name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(audit.audit_date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${audit.overall_score >= 80 ? "text-green-500" : audit.overall_score >= 60 ? "text-amber-500" : "text-red-500"}`}>
                          {audit.overall_score}%
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{audit.compliance_rating}</p>
                      </div>
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="space-y-4">
            {/* Ofsted Impact */}
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">Ofsted Impact</p>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-lg font-bold text-purple-400">+{audits.length > 0 ? Math.min(audits[0].ofsted_impact || 0, 10) : 0} points</p>
                  <p className="text-xs text-muted-foreground">Latest audit estimate</p>
                </div>
              </div>
            </div>

            {/* Top Issues */}
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Open Issues</p>
              <p className="text-2xl font-bold text-red-400">{metrics.pendingActions}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.overdueActions > 0 && <span className="text-red-500 font-semibold">{metrics.overdueActions} overdue</span>}
              </p>
            </div>

            {/* Workflow Status */}
            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-500 uppercase tracking-wider mb-2">Workflow Ready</p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <p className="text-sm text-green-400">Maker/Checker Enabled</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drafts View */}
      {activeView === "drafts" && (
        <DraftAuditsList
          homes={homes}
          onResume={(draft) => {
            setEditDraft(draft);
            setShowForm(true);
          }}
        />
      )}

      {/* Pending Audits View */}
      {activeView === "pending" && (
        <PendingAuditsList
          homes={homes}
          pendingAudits={pendingAudits}
          onView={(audit) => {
            setSelectedAudit(audit);
            setActiveView("history");
          }}
          onApproved={() => setActiveView("dashboard")}
        />
      )}

      {/* History View */}
      {activeView === "history" && (
        <AuditHistoryView audits={audits} selectedAudit={selectedAudit} actions={actions} />
      )}



      {/* Audit Form Modal */}
      {showForm && (
        <AuditForm
          orgId={ORG_ID}
          user={user}
          homes={homes}
          editDraft={editDraft}
          onClose={() => { setShowForm(false); setEditDraft(null); }}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["internal-audits"] });
            qc.invalidateQueries({ queryKey: ["audit-drafts"] });
            setShowForm(false);
            setEditDraft(null);
          }}
        />
      )}
    </div>
  );
}