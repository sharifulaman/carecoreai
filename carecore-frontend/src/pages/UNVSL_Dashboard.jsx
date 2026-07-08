import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useIsFetching } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID, ROLE_LABELS } from "@/lib/roleConfig";
import { getMyHomeIds, resolveEffectiveHomeIds, scopeHomesList } from "@/lib/managerHomeScope";
import { format } from "date-fns";
import { RefreshCw, Calendar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useMobile } from "@/lib/MobileContext";
import PullToRefresh from "@/components/mobile/PullToRefresh";

import ManagerKPIBanner from "@/components/manager-dashboard/ManagerKPIBanner";
import HomeHealthTable from "@/components/manager-dashboard/HomeHealthTable";
import YoungPeopleStatusWidget from "@/components/manager-dashboard/YoungPeopleStatusWidget";
import TeamShiftWidget from "@/components/manager-dashboard/TeamShiftWidget";
import ApprovalQueueWidget from "@/components/manager-dashboard/ApprovalQueueWidget";
import MissedChecksWidget from "@/components/manager-dashboard/MissedChecksWidget";
import ComplianceSnapshotWidget from "@/components/manager-dashboard/ComplianceSnapshotWidget";
import DashboardActionsTable from "@/components/manager-dashboard/DashboardActionsTable";

// Previously a clickable "Team Leader / Team Manager / Regional Manager" switcher that
// didn't actually change any data (JIRA: TL/TM/RM Dashboard — make functional, subtask
// "make the role switch actually work"). Letting someone click into a broader role than
// their own would mean a Team Leader could see a Regional Manager's full region, which
// is a data-privacy problem for this kind of safeguarding data. Until we model a real
// team/region ownership hierarchy (which team homes report to which manager), the safe
// and honest fix is to show the viewer's OWN role, not a togglable impersonation control.
// const VIEW_ROLES = ["Team Leader", "Team Manager", "Regional Manager"];

// All query keys used across all direct-connect widgets
const ALL_QUERY_KEYS = [
  "mgr-homes-direct", "mgr-residents-direct", "mgr-staff-direct",
  "mgr-attendance-today-direct", "mgr-workflows-direct", "mgr-safeguarding-direct",
  "mgr-missing-active-direct", "mgr-homechecks-direct", "mgr-dailylogs-direct",
  "mgr-risks-direct", "mgr-supportplans-direct", "mgr-appointments-direct",
  "mgr-maintenance-direct",
];

export default function UNVSL_Dashboard() {
  const { staffProfile } = useOutletContext();
  const { isMobile } = useMobile();
  const queryClient = useQueryClient();
  const [homeFilter, setHomeFilter] = useState("all");

  // orgId: use the logged-in person's real organisation, falling back to the default
  // only for the brief moment before their profile has loaded. Never hard-code a
  // single organisation's ID here — this product is sold to more than one care
  // provider, and each one must only ever see their own data.
  const orgId = staffProfile?.org_id || ORG_ID;

  const { data: homes = [] } = useQuery({
    queryKey: ["mgr-homes-direct", orgId],
    queryFn: () => base44.entities.Home.filter({ org_id: orgId, status: "active" }),
    staleTime: 2 * 60 * 1000,
  });

  // myHomeIds: null = unrestricted (admin/rsm see every home). Otherwise, the list of
  // homes this Team Leader / Team Manager / Regional Manager is actually assigned to —
  // via either the legacy home_ids field or an active StaffServiceAssignment (the
  // backend folds the latter into each Home's assigned_staff_ids for us).
  const myHomeIds = useMemo(() => getMyHomeIds(staffProfile, homes), [staffProfile, homes]);

  // homeIds: myHomeIds narrowed further by whatever the "Home" dropdown has selected.
  // Passed to every widget below so the filter applies to the WHOLE dashboard, not
  // just the Home Health table.
  const homeIds = useMemo(() => resolveEffectiveHomeIds(myHomeIds, homeFilter), [myHomeIds, homeFilter]);

  // Only ever list homes the viewer is actually allowed to pick from.
  const visibleHomes = useMemo(() => scopeHomesList(homes, myHomeIds), [homes, myHomeIds]);

  const handleRefresh = () => {
    ALL_QUERY_KEYS.forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  // Real fetch state, not a fake timer: the icon spins and the button disables for
  // as long as any of this dashboard's own queries are actually in flight, so
  // clicking Refresh has visible feedback instead of silently appearing to do nothing.
  const isRefreshing = useIsFetching({
    predicate: (query) => ALL_QUERY_KEYS.includes(query.queryKey[0]),
  }) > 0;

  const roleLabel = ROLE_LABELS[staffProfile?.role] || "Manager";

  const content = (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">Manager Dashboard</h1>
            <p className="text-xs text-slate-500 mt-0.5">Live oversight of homes, young people, staff, checks, approvals and compliance.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap w-full sm:w-auto">
            {/* Viewer's own role — informational only, see note above about why this
                isn't a togglable "view as" control. */}
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg px-3 py-1.5 bg-white">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Viewing as: {roleLabel}
            </span>
            {/* Home filter — scoped to the homes this viewer is actually assigned to */}
            <select
              value={homeFilter}
              onChange={e => setHomeFilter(e.target.value)}
              aria-label="Filter dashboard by home"
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white flex-1 sm:flex-none min-w-0"
            >
              <option value="all">{myHomeIds === null ? "All homes" : "All my homes"}</option>
              {visibleHomes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            {/* Date */}
            <span className="text-xs text-slate-500 border border-slate-200 rounded-lg px-2 py-1.5 bg-white flex items-center gap-1.5 whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              {format(new Date(), "d MMM yyyy")}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? "Refreshing dashboard data" : "Refresh dashboard data"}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Banner */}
      <ManagerKPIBanner orgId={orgId} homeIds={homeIds} viewerId={staffProfile?.id} viewerName={staffProfile?.full_name} />

      {/* Main 3-column grid */}
      <div className="px-4 sm:px-6 py-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1">
          <HomeHealthTable orgId={orgId} homeIds={homeIds} />
        </div>
        <div className="xl:col-span-1 space-y-4">
          <YoungPeopleStatusWidget orgId={orgId} homeIds={homeIds} viewerId={staffProfile?.id} viewerName={staffProfile?.full_name} />
        </div>
        <div className="xl:col-span-1">
          <TeamShiftWidget orgId={orgId} homeIds={homeIds} />
        </div>
      </div>

      {/* Second row */}
      <div className="px-4 sm:px-6 pb-4 grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-1">
          <ApprovalQueueWidget orgId={orgId} homeIds={homeIds} />
        </div>
        <div className="xl:col-span-1">
          <MissedChecksWidget orgId={orgId} homeIds={homeIds} />
        </div>
        <div className="xl:col-span-1">
          <ComplianceSnapshotWidget orgId={orgId} homeIds={homeIds} />
        </div>
      </div>

      {/* Bottom action table */}
      <div className="px-4 sm:px-6 pb-6">
        <DashboardActionsTable orgId={orgId} homeIds={homeIds} />
      </div>
    </div>
  );

  if (isMobile) {
    return <PullToRefresh onRefresh={() => queryClient.refetchQueries()}>{content}</PullToRefresh>;
  }
  return content;
}
