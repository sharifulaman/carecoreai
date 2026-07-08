import { useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { RefreshCw, Filter, Search, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { rankOf } from "@/lib/roleConfig";
import WorkflowQueuePanel from "@/components/workflow/WorkflowQueuePanel";
import WorkflowInspectorPanel from "@/components/workflow/WorkflowInspectorPanel";
import WorkflowCreateModal from "@/components/workflow/WorkflowCreateModal";

const ACTIVE_STATUSES = new Set(["submitted", "under_review", "resubmitted", "changes_requested", "escalated", "pending_tl", "pending_tm", "pending_rm", "pending_rsm", "pending_admin", "pending_finance", "pending_fo", "pending_fm", "pending_ho", "pending_hm"]);
const TERMINAL_STATUSES = new Set(["approved", "rejected", "closed"]);
// Statuses where the checker (reviewer) needs to act. Excludes changes_requested
// because that status means the ball is back with the maker — not the checker.
const CHECKER_STATUSES = new Set(["submitted", "under_review", "resubmitted", "escalated"]);

const canSeeTeamView = (role) => rankOf(role) >= 15;

export default function WorkflowCommandCentre() {
  const { user, staffProfile } = useOutletContext();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("my-pending-actions");
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [filters, setFilters] = useState({
    workflowType: "all",
    status: "all",
    home: "all",
    priority: "all",
    category: "all",
  });

  const role = staffProfile?.role || (user?.role === "admin" ? "admin" : "support_worker");
  const userId = staffProfile?.user_id || staffProfile?.id;
  const myHomeIds = staffProfile?.home_ids || [];

  const { data: workflows = [], isLoading, isError } = useQuery({
    queryKey: ["workflow-items", workflowFilter],
    queryFn: () =>
      base44.workflow.list(
        workflowFilter
          ? { workflow_type: workflowFilter }
          : {}
      ),
    staleTime: 30 * 1000,
  });

  // Server-side query for "My Pending Actions" — filters to items where
  // reviewer_role = caller's role and status is active (submitted/under_review/resubmitted).
  const { data: myPendingItems = [] } = useQuery({
    queryKey: ["workflow-items-mine"],
    queryFn: () => base44.workflow.list({ queue: "mine" }),
    staleTime: 30 * 1000,
  });

  // Server-side query for "Submitted by Me" — the server filters by maker_id = caller's
  // UserID (from JWT), so the match is always correct regardless of how the frontend
  // derives the userId from staffProfile.
  const { data: mySubmittedItems = [] } = useQuery({
    queryKey: ["workflow-items-submitted"],
    queryFn: () => base44.workflow.list({ queue: "submitted" }),
    staleTime: 30 * 1000,
  });

  // Server-side query for "Team / Department View" — the server filters to submissions
  // from staff with a rank strictly lower than the caller's rank, scoped to their homes.
  const { data: teamItems = [] } = useQuery({
    queryKey: ["workflow-items-team"],
    queryFn: () => base44.workflow.list({ queue: "team" }),
    staleTime: 30 * 1000,
    enabled: canSeeTeamView(role),
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-wcc"],
    queryFn: () => base44.entities.Home.filter({ status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff-wcc"],
    queryFn: () => base44.entities.StaffProfile.filter({}),
    staleTime: 5 * 60 * 1000,
  });

  const scopedWorkflows = useMemo(() => {
    if (role === "admin" || role === "rsm") return workflows;
    if (role === "finance_manager" || role === "finance_officer") {
      return workflows.filter(w =>
        ["bill", "expense_claim"].includes(w.workflow_type) &&
        (myHomeIds.includes(w.home_id) || w.maker_id === userId || (ACTIVE_STATUSES.has(w.status) && w.reviewer_role === role))
      );
    }
    if (role === "team_leader" || role === "team_manager" || role === "hr_manager" || role === "admin_manager" || role === "risk_manager") {
      return workflows.filter(w =>
        myHomeIds.includes(w.home_id) ||
        w.maker_id === userId ||
        (ACTIVE_STATUSES.has(w.status) && w.reviewer_role === role)
      );
    }
    return workflows.filter(w => w.maker_id === userId);
  }, [workflows, role, userId, myHomeIds]);

  const filteredWorkflows = useMemo(() => {
    return scopedWorkflows.filter(w => {
      if (filters.workflowType !== "all" && w.workflow_type !== filters.workflowType && w.entity_type !== filters.workflowType) return false;
      if (filters.status !== "all" && w.status !== filters.status) return false;
      if (filters.home !== "all" && w.home_id !== filters.home) return false;
      if (filters.priority !== "all" && w.priority !== filters.priority) return false;
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        w.reference?.toLowerCase().includes(s) ||
        w.entity_ref?.toLowerCase().includes(s) ||
        w.workflow_type?.toLowerCase().includes(s) ||
        w.home_name?.toLowerCase().includes(s) ||
        w.submitted_by_name?.toLowerCase().includes(s) ||
        w.assigned_to_name?.toLowerCase().includes(s) ||
        w.title?.toLowerCase().includes(s)
      );
    });
  }, [scopedWorkflows, filters, searchTerm]);

  const sortedWorkflows = useMemo(() => {
    const PRIORITY_ORDER = { critical: 0, urgent: 1, high: 2, important: 3, routine: 4 };
    return [...filteredWorkflows].sort((a, b) => {
      if (sortBy === "priority") return (PRIORITY_ORDER[a.priority] ?? 5) - (PRIORITY_ORDER[b.priority] ?? 5);
      if (sortBy === "sla") {
        const aDate = a.deadline_datetime || a.due_date ? new Date(a.deadline_datetime || a.due_date) : new Date(9999, 0);
        const bDate = b.deadline_datetime || b.due_date ? new Date(b.deadline_datetime || b.due_date) : new Date(9999, 0);
        return aDate - bDate;
      }
      if (sortBy === "newest") return new Date(b.created_date || b.submitted_at || 0) - new Date(a.created_date || a.submitted_at || 0);
      if (sortBy === "oldest") return new Date(a.created_date || a.submitted_at || 0) - new Date(b.created_date || b.submitted_at || 0);
      if (sortBy === "type") return (a.workflow_type || "").localeCompare(b.workflow_type || "");
      if (sortBy === "home") return (a.home_name || "").localeCompare(b.home_name || "");
      if (sortBy === "reviewer") return (a.assigned_to_name || "").localeCompare(b.assigned_to_name || "");
      return 0;
    });
  }, [filteredWorkflows, sortBy]);

  const counts = useMemo(() => ({
    // Use server-scoped queries for accurate badge counts — avoids client-side ID matching.
    myPendingActions: myPendingItems.length,
    submittedByMe: mySubmittedItems.length,
    teamView: canSeeTeamView(role) ? teamItems.filter(w => ACTIVE_STATUSES.has(w.status)).length : 0,
    escalated: scopedWorkflows.filter(w => w.status === "escalated" || w.escalated === true).length,
    completed: scopedWorkflows.filter(w => TERMINAL_STATUSES.has(w.status)).length,
  }), [myPendingItems, mySubmittedItems, teamItems, scopedWorkflows, role, userId]);

  const tabWorkflows = useMemo(() => {
    if (activeTab === "my-pending-actions") {
      // Use the server-fetched mine list (already scoped server-side) and apply
      // CHECKER_STATUSES to exclude changes_requested items where the maker must
      // act first — those should not appear in the checker's action queue.
      return myPendingItems.filter(w => CHECKER_STATUSES.has(w.status));
    }
    if (activeTab === "submitted-by-me") {
      // Use the server-fetched submitted list so matching is done against the
      // caller's JWT UserID — not the staffProfile ID which may differ.
      return mySubmittedItems;
    }
    if (activeTab === "team-view") {
      if (!canSeeTeamView(role)) return [];
      // Use the server-fetched team list — already scoped to lower-ranked makers.
      // Filter to active statuses only so completed items don't clutter the view.
      return teamItems.filter(w => ACTIVE_STATUSES.has(w.status));
    }
    if (activeTab === "escalations") {
      return sortedWorkflows.filter(w => w.status === "escalated" || w.escalated === true);
    }
    if (activeTab === "completed") {
      return sortedWorkflows.filter(w => TERMINAL_STATUSES.has(w.status));
    }
    return sortedWorkflows;
  }, [sortedWorkflows, activeTab, role, userId]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["workflow-items"] });
    queryClient.invalidateQueries({ queryKey: ["workflow-items-mine"] });
    queryClient.invalidateQueries({ queryKey: ["workflow-items-submitted"] });
    queryClient.invalidateQueries({ queryKey: ["workflow-items-team"] });
    toast.success("Refreshed");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Page Header */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0 border-b border-border bg-card">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Workflow Command Centre</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Review, approve and manage all pending workflows</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background h-9 w-60 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={() => setShowFilters(v => !v)}>
                <Filter className="w-3.5 h-3.5" /> Filters
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-9" onClick={handleRefresh}>
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
              <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 h-9" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-3.5 h-3.5" /> New Submission
              </Button>
            </div>
          </div>

          {/* Mobile search */}
          <div className="mt-3 md:hidden">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background h-9 w-full focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Filter bar */}
          {showFilters && (
            <div className="mt-3 p-4 bg-background border border-border rounded-xl grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <select value={filters.workflowType} onChange={e => setFilters(p => ({ ...p, workflowType: e.target.value }))}
                className="h-8 text-xs border border-border rounded-lg px-2 bg-card">
                <option value="all">All Types</option>
                <option value="bill">Bill Approval</option>
                <option value="expense_claim">Expense Claim</option>
                <option value="incident_report">Incident Review</option>
                <option value="missing_episode">Missing Episode</option>
                <option value="support_plan">Support Plan</option>
                <option value="leave_request">Leave Request</option>
                <option value="staff_onboarding">Staff Onboarding</option>
                <option value="risk_assessment">Risk Assessment</option>
                <option value="maintenance_quote">Maintenance Quote</option>
                <option value="reg_32">Reg 32 Report</option>
              </select>
              <select value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                className="h-8 text-xs border border-border rounded-lg px-2 bg-card">
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="changes_requested">Changes Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="escalated">Escalated</option>
                <option value="closed">Closed</option>
              </select>
              <select value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
                className="h-8 text-xs border border-border rounded-lg px-2 bg-card">
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="important">Important</option>
                <option value="routine">Routine</option>
              </select>
              <select value={filters.home} onChange={e => setFilters(p => ({ ...p, home: e.target.value }))}
                className="h-8 text-xs border border-border rounded-lg px-2 bg-card">
                <option value="all">All Homes</option>
                {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="h-8 text-xs border border-border rounded-lg px-2 bg-card">
                <option value="priority">Sort: Priority</option>
                <option value="sla">Sort: SLA</option>
                <option value="newest">Sort: Newest</option>
                <option value="oldest">Sort: Oldest</option>
                <option value="type">Sort: Type</option>
                <option value="home">Sort: Home</option>
                <option value="reviewer">Sort: Reviewer</option>
              </select>
            </div>
          )}

          {/* Queue Tabs */}
          <div className="mt-4 flex items-center gap-0 overflow-x-auto">
            {[
              { key: "my-pending-actions", label: "My Pending Actions", count: counts.myPendingActions },
              { key: "submitted-by-me", label: "Submitted by Me", count: counts.submittedByMe },
              canSeeTeamView(role) && { key: "team-view", label: "Team / Department View", count: counts.teamView },
              { key: "escalations", label: "Escalations", count: counts.escalated },
              { key: "completed", label: "Completed / Audit Trail", count: counts.completed },
            ].filter(Boolean).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 -mb-[1px] ${activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === tab.key ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
                  }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 bg-muted/20 px-6 pt-4 pb-6 flex gap-4 min-h-0 overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex gap-4">
          {/* Left: Queue */}
          <div className="w-full lg:w-[38%] flex-shrink-0 overflow-y-auto pr-1 pb-4">
            <WorkflowQueuePanel
              workflows={tabWorkflows}
              selectedWorkflow={selectedWorkflow}
              onSelect={setSelectedWorkflow}
              sortBy={sortBy}
              setSortBy={setSortBy}
              isError={isError}
            />
          </div>

          {/* Right: Inspector */}
          <div className="hidden lg:flex flex-1 overflow-y-auto pb-4">
            <WorkflowInspectorPanel
              workflow={selectedWorkflow}
              staffProfile={staffProfile}
              user={user}
              homes={homes}
              staff={staff}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["workflow-items"] })}
              onClose={() => setSelectedWorkflow(null)}
              onFilterWorkflow={(type) => {
                setWorkflowFilter(type);
                setSelectedWorkflow(null);
              }}
            />
          </div>
        </div>
      </div>

      {/* Mobile: inspector as bottom sheet */}
      {selectedWorkflow && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-black/40" onClick={() => setSelectedWorkflow(null)} />
          <div className="bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <WorkflowInspectorPanel
              workflow={selectedWorkflow}
              staffProfile={staffProfile}
              user={user}
              homes={homes}
              staff={staff}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["workflow-items"] })}
              onClose={() => setSelectedWorkflow(null)}
              onFilterWorkflow={(type) => {
                setWorkflowFilter(type);
                setSelectedWorkflow(null);
              }}
              isMobile
            />
          </div>
        </div>
      )}

      {showCreateModal && (
        <WorkflowCreateModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["workflow-items"] });
            setShowCreateModal(false);
          }}
          homes={homes}
          staffProfile={staffProfile}
        />
      )}
    </div>
  );
}
