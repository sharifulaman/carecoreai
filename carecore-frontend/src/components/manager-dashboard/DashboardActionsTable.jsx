import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { format, parseISO, isPast } from "date-fns";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { scopeHomesList, scopeStaffToHomes, scopeToHomes } from "@/lib/managerHomeScope";
import { WORKFLOW_META } from "@/components/workflow/workflowConfig";
import { WidgetErrorRow, WidgetLoadingRow } from "./WidgetStatus";

const TABS = ["Overview", "Homes", "Young People", "Staff", "Checks", "Approvals", "Incidents", "Compliance"];

function PriorityBadge({ priority }) {
  const map = { High: "bg-red-100 text-red-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-slate-100 text-slate-600" };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[priority] || map.Low}`}>{priority}</span>;
}

function StatusBadge({ status }) {
  const map = {
    Overdue: "bg-red-100 text-red-700",
    "Due Today": "bg-amber-100 text-amber-700",
    Escalated: "bg-orange-100 text-orange-700",
    "In Review": "bg-blue-100 text-blue-700",
    Completed: "bg-green-100 text-green-700",
    Active: "bg-red-100 text-red-700",
  };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-slate-100 text-slate-600"}`}>{status}</span>;
}

function buildRows(tab, { homes, residents, staff, workflows, incidents, missingFromHome, dailyLogs, maintenanceLogs }) {
  const rows = [];

  if (tab === "Overview" || tab === "Approvals") {
    workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)).slice(0, 5).forEach(w => {
      const meta = WORKFLOW_META[w.entity_type] || WORKFLOW_META._default;
      const overdue = w.deadline_datetime && isPast(parseISO(w.deadline_datetime));
      rows.push({
        id: w.id, priority: w.priority === "critical" || w.priority === "high" ? "High" : "Medium",
        item: meta.label, home: w.home_name || "—", personYP: "—",
        owner: w.submitted_by_name || "—",
        due: w.deadline_datetime ? format(parseISO(w.deadline_datetime), "d MMM yyyy") : "—",
        status: overdue ? "Overdue" : "In Review",
        link: "/workflow-command-centre",
      });
    });
  }

  if (tab === "Overview" || tab === "Incidents") {
    incidents.filter(i => i.status === "under_investigation").slice(0, 3).forEach(i => {
      const resident = residents.find(r => r.id === i.resident_id);
      const home = homes.find(h => h.id === i.home_id);
      rows.push({
        id: i.id, priority: i.immediate_risk === "critical" || i.immediate_risk === "high" ? "High" : "Medium",
        item: "Safeguarding follow-up",
        home: home?.name?.split(" - ")[0] || i.home_name || "—",
        personYP: resident?.display_name || resident?.full_name || "—",
        owner: i.reported_by_name || "—",
        due: i.review_date ? format(parseISO(i.review_date), "d MMM yyyy") : "—",
        status: "Escalated", link: "/residents",
      });
    });
  }

  if (tab === "Overview" || tab === "Young People") {
    missingFromHome.filter(m => m.status === "active").slice(0, 2).forEach(m => {
      const home = homes.find(h => h.id === m.home_id);
      rows.push({
        id: m.id, priority: "High", item: "Missing episode follow-up",
        home: home?.name?.split(" - ")[0] || m.home_name || "—",
        personYP: m.resident_name || "—",
        owner: m.reported_by_name || "—",
        due: "Overdue", status: "Overdue", link: "/residents",
      });
    });
  }

  if (tab === "Overview" || tab === "Staff") {
    staff.filter(s => s.status === "active" && !s.dbs_expiry).slice(0, 2).forEach(s => {
      rows.push({
        id: s.id, priority: "Medium", item: "Staff supervision due",
        home: "—", personYP: "—", owner: s.full_name || "—",
        due: "Tomorrow", status: "In Review", link: "/staff",
      });
    });
  }

  if (tab === "Overview" || tab === "Checks") {
    dailyLogs.filter(l => l.flagged && !l.acknowledged_by).slice(0, 2).forEach(l => {
      const home = homes.find(h => h.id === l.home_id);
      rows.push({
        id: l.id, priority: "Medium", item: "Daily log sign-off",
        home: home?.name?.split(" - ")[0] || l.home_name || "—",
        personYP: l.resident_name || "—",
        owner: l.worker_name || "—",
        due: "Due today", status: "Due Today", link: "/daily-logs",
      });
    });
  }

  if (tab === "Overview" || tab === "Compliance") {
    maintenanceLogs.filter(m => m.status === "overdue" || m.status === "pending").slice(0, 2).forEach(m => {
      rows.push({
        id: m.id, priority: m.priority === "high" ? "High" : "Low",
        item: "Maintenance — " + (m.issue_title || "pending task"),
        home: m.home_name || "—", personYP: "—",
        owner: m.assigned_to_name || "—",
        due: m.due_date ? format(parseISO(m.due_date), "d MMM yyyy") : "—",
        status: m.status === "overdue" ? "Overdue" : "In Review",
        link: "/care",
      });
    });
  }

  return rows.slice(0, 10);
}

export default function DashboardActionsTable({ orgId = ORG_ID, homeIds = null }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const qHomes = useQuery({ queryKey: ["mgr-homes-direct", orgId], queryFn: () => base44.entities.Home.filter({ org_id: orgId, status: "active" }), staleTime: 2 * 60 * 1000 });
  const qResidents = useQuery({ queryKey: ["mgr-residents-direct", orgId], queryFn: () => base44.entities.Resident.filter({ org_id: orgId, status: "active" }), staleTime: 2 * 60 * 1000 });
  const qStaff = useQuery({ queryKey: ["mgr-staff-direct", orgId], queryFn: () => base44.entities.StaffProfile.filter({ org_id: orgId }), staleTime: 2 * 60 * 1000 });
  const qWorkflows = useQuery({ queryKey: ["mgr-workflows-direct", orgId], queryFn: () => base44.entities.ApprovalWorkflow.filter({ org_id: orgId }, "-created_date", 100), staleTime: 60 * 1000 });
  const qIncidents = useQuery({ queryKey: ["mgr-safeguarding-direct", orgId], queryFn: () => base44.entities.SafeguardingRecord.filter({ org_id: orgId }), staleTime: 2 * 60 * 1000 });
  // Only active episodes are ever shown here, so filter server-side rather than
  // fetching the full historical/closed set (which grows unbounded over time).
  const qMissing = useQuery({ queryKey: ["mgr-missing-active-direct", orgId], queryFn: () => base44.entities.MissingFromHome.filter({ org_id: orgId, status: "active" }), staleTime: 2 * 60 * 1000 });
  const qDailyLogs = useQuery({ queryKey: ["mgr-dailylogs-direct", orgId], queryFn: () => base44.entities.DailyLog.filter({ org_id: orgId, date: todayStr }, "-created_date", 200), staleTime: 60 * 1000 });
  const qMaintenance = useQuery({ queryKey: ["mgr-maintenance-direct", orgId], queryFn: () => base44.entities.PropertyMaintenance.filter({ org_id: orgId }), staleTime: 2 * 60 * 1000 });

  const queries = [qHomes, qResidents, qStaff, qWorkflows, qIncidents, qMissing, qDailyLogs, qMaintenance];
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  const retryAll = () => queries.forEach(q => q.refetch());

  const homes = scopeHomesList(qHomes.data || [], homeIds);
  const residents = scopeToHomes(qResidents.data || [], homeIds);
  const staff = scopeStaffToHomes(qStaff.data || [], homeIds);
  const workflows = scopeToHomes(qWorkflows.data || [], homeIds);
  const incidents = scopeToHomes(qIncidents.data || [], homeIds);
  const missingFromHome = scopeToHomes(qMissing.data || [], homeIds);
  const dailyLogs = scopeToHomes(qDailyLogs.data || [], homeIds);
  const maintenanceLogs = scopeToHomes(qMaintenance.data || [], homeIds);

  const rows = useMemo(() => buildRows(activeTab, { homes, residents, staff, workflows, incidents, missingFromHome, dailyLogs, maintenanceLogs }), [activeTab, homes, residents, staff, workflows, incidents, missingFromHome, dailyLogs, maintenanceLogs]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none" role="tablist" aria-label="Action Centre view">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            role="tab"
            aria-selected={activeTab === t}
            className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${activeTab === t ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Priority</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Item</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Person / YP</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Owner</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Due</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Status</th>
              <th className="text-left px-2 py-2.5 text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <WidgetLoadingRow colSpan={8} />}
            {isError && <WidgetErrorRow colSpan={8} onRetry={retryAll} />}
            {!isLoading && !isError && rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5"><PriorityBadge priority={row.priority} /></td>
                <td className="px-2 py-2.5 font-medium text-slate-800 max-w-[180px] truncate">{row.item}</td>
                <td className="px-2 py-2.5 text-slate-500 max-w-[100px] truncate">{row.home}</td>
                <td className="px-2 py-2.5 text-slate-500 max-w-[100px] truncate">{row.personYP}</td>
                <td className="px-2 py-2.5 text-slate-500 max-w-[100px] truncate">{row.owner}</td>
                <td className="px-2 py-2.5 text-slate-500">{row.due}</td>
                <td className="px-2 py-2.5"><StatusBadge status={row.status} /></td>
                <td className="px-2 py-2.5">
                  <Link to={row.link} className="text-[10px] font-semibold text-blue-600 hover:underline flex items-center gap-0.5">
                    Open <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </td>
              </tr>
            ))}
            {!isLoading && !isError && rows.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-slate-400">No items for this view</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {rows.length} items</span>
        <div className="flex items-center gap-1">
          <button className="p-1 rounded hover:bg-slate-100 disabled:opacity-40" disabled>
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px]">1</span>
          <button className="p-1 rounded hover:bg-slate-100 disabled:opacity-40" disabled>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
