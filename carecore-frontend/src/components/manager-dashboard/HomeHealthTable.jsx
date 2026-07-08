import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { scopeHomesList, scopeToHomes } from "@/lib/managerHomeScope";
import { WidgetErrorRow, WidgetLoadingRow } from "./WidgetStatus";

function OccupancyBar({ pct }) {
  const color = pct >= 90 ? "bg-green-500" : pct >= 70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs text-slate-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    Healthy: "bg-green-100 text-green-700",
    Watch: "bg-amber-100 text-amber-700",
    "At Risk": "bg-red-100 text-red-700",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

// orgId: the viewer's own organisation. homeIds: null = every home in the org
// (admin/rsm); otherwise the homes this viewer may see, already narrowed by the
// dashboard's "Home" filter (see UNVSL_Dashboard.jsx).
export default function HomeHealthTable({ orgId = ORG_ID, homeIds = null }) {
  const qHomes = useQuery({
    queryKey: ["mgr-homes-direct", orgId],
    queryFn: () => base44.entities.Home.filter({ org_id: orgId, status: "active" }),
    staleTime: 2 * 60 * 1000,
  });

  const qResidents = useQuery({
    queryKey: ["mgr-residents-direct", orgId],
    queryFn: () => base44.entities.Resident.filter({ org_id: orgId, status: "active" }),
    staleTime: 2 * 60 * 1000,
  });

  const qIncidents = useQuery({
    queryKey: ["mgr-safeguarding-direct", orgId],
    queryFn: () => base44.entities.SafeguardingRecord.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });

  // Only active episodes are ever shown here, so filter server-side rather than
  // fetching the full historical/closed set (which grows unbounded over time).
  const qMissing = useQuery({
    queryKey: ["mgr-missing-active-direct", orgId],
    queryFn: () => base44.entities.MissingFromHome.filter({ org_id: orgId, status: "active" }),
    staleTime: 2 * 60 * 1000,
  });

  const qHomeChecks = useQuery({
    queryKey: ["mgr-homechecks-direct", orgId],
    queryFn: () => base44.entities.HomeCheckCompletion.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });

  const queries = [qHomes, qResidents, qIncidents, qMissing, qHomeChecks];
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  const retryAll = () => queries.forEach(q => q.refetch());

  const homes = scopeHomesList(qHomes.data || [], homeIds);
  const residents = scopeToHomes(qResidents.data || [], homeIds);
  const incidents = scopeToHomes(qIncidents.data || [], homeIds);
  const missingFromHome = scopeToHomes(qMissing.data || [], homeIds);
  const homeChecks = scopeToHomes(qHomeChecks.data || [], homeIds);

  const filteredHomes = useMemo(() => {
    return homes.slice(0, 8).map(home => {
      const homeResidents = residents.filter(r => r.home_id === home.id);
      const capacity = home.number_of_beds_capacity || homeResidents.length || 4;
      const occupancyPct = capacity > 0 ? Math.round((homeResidents.length / capacity) * 100) : 0;
      const homeIncidents = incidents.filter(i => i.home_id === home.id && (i.status === "under_investigation" || i.status === "open")).length;
      const homeMissing = missingFromHome.filter(m => m.home_id === home.id && m.status === "active").length;
      const homeChecksPending = homeChecks.filter(c => c.home_id === home.id && c.manager_review_status === "pending").length;
      const compliancePct = homeChecksPending > 2 ? 76 : homeChecksPending > 0 ? 84 : 92;
      const status = homeIncidents > 0 || homeMissing > 0 ? "At Risk" : homeChecksPending > 1 ? "Watch" : "Healthy";
      return { home, homeResidents, capacity, occupancyPct, homeIncidents, homeMissing, homeChecksPending, compliancePct, status };
    });
  }, [homes, residents, incidents, missingFromHome, homeChecks]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Home Health</h3>
        <Link to="/homes-hub" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          View all homes <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-2 text-slate-500 font-medium w-8">#</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Occupancy</th>
              <th className="text-center px-2 py-2 text-slate-500 font-medium">Incidents</th>
              <th className="text-center px-2 py-2 text-slate-500 font-medium">Missing</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Compliance</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <WidgetLoadingRow colSpan={7} />}
            {isError && <WidgetErrorRow colSpan={7} onRetry={retryAll} />}
            {!isLoading && !isError && filteredHomes.map(({ home, homeResidents, capacity, occupancyPct, homeIncidents, homeMissing, compliancePct, status }, idx) => (
              <tr key={home.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                <td className="px-2 py-2.5">
                  <p className="font-medium text-slate-800 leading-tight truncate max-w-[120px]">{home.name.split(" - ")[0]}</p>
                  <p className="text-slate-400">{homeResidents.length} / {capacity}</p>
                </td>
                <td className="px-2 py-2.5 min-w-[80px]"><OccupancyBar pct={occupancyPct} /></td>
                <td className="px-2 py-2.5 text-center">
                  {homeIncidents > 0 ? <span className="text-red-600 font-semibold">{homeIncidents}</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-2 py-2.5 text-center">
                  {homeMissing > 0 ? <span className="text-amber-600 font-semibold">{homeMissing}</span> : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-2 py-2.5 min-w-[80px]"><OccupancyBar pct={compliancePct} /></td>
                <td className="px-2 py-2.5"><StatusBadge status={status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && !isError && filteredHomes.length === 0 && (
          <div className="text-center py-8 text-slate-400 text-xs">No homes found</div>
        )}
      </div>
    </div>
  );
}
