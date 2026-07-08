import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { scopeHomesList, scopeToHomes } from "@/lib/managerHomeScope";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { WidgetErrorRow, WidgetLoadingRow } from "./WidgetStatus";

function SeverityBadge({ severity }) {
  const map = { High: "bg-red-100 text-red-700", Medium: "bg-amber-100 text-amber-700", Low: "bg-slate-100 text-slate-600" };
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${map[severity] || map.Low}`}>{severity}</span>;
}

export default function MissedChecksWidget({ orgId = ORG_ID, homeIds = null }) {
  const qHomeChecks = useQuery({
    queryKey: ["mgr-homechecks-direct", orgId],
    queryFn: () => base44.entities.HomeCheckCompletion.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });

  const qHomes = useQuery({
    queryKey: ["mgr-homes-direct", orgId],
    queryFn: () => base44.entities.Home.filter({ org_id: orgId, status: "active" }),
    staleTime: 2 * 60 * 1000,
  });

  const qMaintenance = useQuery({
    queryKey: ["mgr-maintenance-direct", orgId],
    queryFn: () => base44.entities.PropertyMaintenance.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });

  const queries = [qHomeChecks, qHomes, qMaintenance];
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  const retryAll = () => queries.forEach(q => q.refetch());

  const homeChecks = scopeToHomes(qHomeChecks.data || [], homeIds);
  const homes = scopeHomesList(qHomes.data || [], homeIds);
  const maintenanceLogs = scopeToHomes(qMaintenance.data || [], homeIds);

  const pendingChecks = useMemo(() => {
    const fromChecks = homeChecks
      .filter(c => c.manager_review_status === "pending")
      .map(c => {
        const home = homes.find(h => h.id === c.home_id);
        const daysOld = Math.floor((new Date() - new Date(c.submitted_at)) / (1000 * 60 * 60 * 24));
        return {
          id: c.id,
          type: "Home Check",
          owner: c.submitted_by_name || "—",
          home: home?.name?.split(" - ")[0] || "—",
          missed: daysOld === 0 ? "Today" : daysOld === 1 ? "Yesterday" : `${daysOld} days ago`,
          severity: daysOld >= 3 ? "High" : daysOld >= 1 ? "Medium" : "Low",
          link: "/homes-hub",
        };
      });

    const fromMaintenance = maintenanceLogs
      .filter(m => m.status === "pending" || m.status === "overdue")
      .slice(0, 3)
      .map(m => ({
        id: m.id,
        type: "Maintenance",
        owner: m.assigned_to_name || "—",
        home: m.home_name || "—",
        missed: m.status === "overdue" ? "Overdue" : "Pending",
        severity: m.priority === "high" ? "High" : m.priority === "medium" ? "Medium" : "Low",
        link: "/care",
      }));

    return [...fromChecks, ...fromMaintenance].slice(0, 8);
  }, [homeChecks, homes, maintenanceLogs]);

  const radarData = useMemo(() => [
    { subject: "Home Checks", A: Math.max(100 - pendingChecks.filter(c => c.type === "Home Check").length * 15, 30) },
    { subject: "Maintenance", A: Math.max(100 - pendingChecks.filter(c => c.type === "Maintenance").length * 20, 30) },
    { subject: "Approvals", A: 68 },
    { subject: "Compliance", A: 82 },
    { subject: "Staff Reviews", A: 74 },
    { subject: "YP Safety", A: 79 },
  ], [pendingChecks]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">
          Missed Checklists & Tasks{" "}
          <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">{pendingChecks.length}</span>
        </h3>
        <Link to="/homes-hub" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-3 py-2 text-slate-500 font-medium">Checklist / Task</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Owner</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Missed</th>
              <th className="text-center px-2 py-2 text-slate-500 font-medium">Severity</th>
              <th className="text-left px-2 py-2 text-slate-500 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {isLoading && <WidgetLoadingRow colSpan={6} />}
            {isError && <WidgetErrorRow colSpan={6} onRetry={retryAll} />}
            {!isLoading && !isError && pendingChecks.map(c => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-3 py-2.5 font-medium text-slate-800">{c.type}</td>
                <td className="px-2 py-2.5 text-slate-600">{c.owner}</td>
                <td className="px-2 py-2.5 text-slate-500 truncate max-w-[80px]">{c.home}</td>
                <td className="px-2 py-2.5 text-slate-600">{c.missed}</td>
                <td className="px-2 py-2.5 text-center"><SeverityBadge severity={c.severity} /></td>
                <td className="px-2 py-2.5">
                  <Link to={c.link} className="text-[10px] font-semibold text-orange-600 hover:underline">Chase</Link>
                </td>
              </tr>
            ))}
            {!isLoading && !isError && pendingChecks.length === 0 && (
              <tr><td colSpan={6} className="text-center py-6 text-slate-400">No missed checks</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-xs font-semibold text-slate-700 mb-1">Management Coverage Score</p>
        <ResponsiveContainer width="100%" height={170}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={60}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: "#94a3b8" }} />
            <Radar name="Coverage" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", padding: "4px 10px" }}
              formatter={(v) => [`${v}%`, "Coverage"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
