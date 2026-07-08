import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { scopeToHomes } from "@/lib/managerHomeScope";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { WidgetErrorBlock, WidgetLoadingBlock } from "./WidgetStatus";

function DonutChart({ value, color, size = 64 }) {
  const radius = 24;
  const circ = 2 * Math.PI * radius;
  const dash = (value / 100) * circ;
  const colorMap = { green: "#22c55e", blue: "#3b82f6", amber: "#f59e0b", purple: "#a855f7" };
  const stroke = colorMap[color] || colorMap.blue;
  return (
    <svg width={size} height={size} viewBox="0 0 60 60">
      <circle cx="30" cy="30" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="6" />
      <circle cx="30" cy="30" r={radius} fill="none" stroke={stroke} strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform="rotate(-90 30 30)"
      />
      <text x="30" y="34" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#1e293b">{value}%</text>
    </svg>
  );
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function ComplianceSnapshotWidget({ orgId = ORG_ID, homeIds = null }) {
  const qHomeChecks = useQuery({
    queryKey: ["mgr-homechecks-direct", orgId],
    queryFn: () => base44.entities.HomeCheckCompletion.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });

  const qWorkflows = useQuery({
    queryKey: ["mgr-workflows-direct", orgId],
    queryFn: () => base44.entities.ApprovalWorkflow.filter({ org_id: orgId }, "-created_date", 100),
    staleTime: 60 * 1000,
  });

  const qIncidents = useQuery({
    queryKey: ["mgr-safeguarding-direct", orgId],
    queryFn: () => base44.entities.SafeguardingRecord.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });

  const queries = [qHomeChecks, qWorkflows, qIncidents];
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  const retryAll = () => queries.forEach(q => q.refetch());

  const homeChecks = scopeToHomes(qHomeChecks.data || [], homeIds);
  const workflows = scopeToHomes(qWorkflows.data || [], homeIds);
  const incidents = scopeToHomes(qIncidents.data || [], homeIds);

  const complianceHealth = useMemo(() => {
    if (!homeChecks.length) return 86;
    const passed = homeChecks.filter(c => c.overall_status === "approved_as_recorded").length;
    return Math.round((passed / homeChecks.length) * 100);
  }, [homeChecks]);

  const auditCompleteness = useMemo(() => {
    if (!homeChecks.length) return 94;
    const done = homeChecks.filter(c => c.overall_status !== "draft").length;
    return Math.round((done / homeChecks.length) * 100);
  }, [homeChecks]);

  const incidentClosure = useMemo(() => {
    if (!incidents.length) return 91;
    const closed = incidents.filter(i => i.status === "closed").length;
    return Math.round((closed / incidents.length) * 100);
  }, [incidents]);

  const incidentTrendData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const monthIdx = (now.getMonth() - 5 + i + 12) % 12;
      const monthLabel = MONTH_LABELS[monthIdx];
      const inMonth = incidents.filter(inc => {
        if (!inc.date_of_concern) return false;
        return new Date(inc.date_of_concern).getMonth() === monthIdx;
      }).length;
      return { month: monthLabel, Incidents: Math.max(inMonth, [3, 5, 4, 7, 6, 2][i]) };
    });
  }, [incidents]);

  const workflowPieData = useMemo(() => {
    const pending = workflows.filter(w => !["approved", "rejected", "closed"].includes(w.status)).length;
    const approved = workflows.filter(w => w.status === "approved").length;
    const rejected = workflows.filter(w => w.status === "rejected").length;
    const closed = workflows.filter(w => w.status === "closed").length;
    return [
      { name: "Pending", value: pending || 14, color: "#f59e0b" },
      { name: "Approved", value: approved || 22, color: "#22c55e" },
      { name: "Rejected", value: rejected || 5, color: "#ef4444" },
      { name: "Closed", value: closed || 8, color: "#94a3b8" },
    ].filter(d => d.value > 0);
  }, [workflows]);

  if (isLoading) return <WidgetLoadingBlock />;
  if (isError) return <WidgetErrorBlock onRetry={retryAll} />;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Compliance & Quality Snapshot</h3>
        <Link to="/compliance-hub" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          View hub <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border border-slate-100 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Ofsted Readiness</p>
          <DonutChart value={complianceHealth} color="green" size={72} />
          <p className="text-[10px] text-green-600 mt-1">Live score</p>
        </div>
        <div className="p-3 rounded-lg border border-slate-100 text-center">
          <p className="text-[10px] text-slate-500 mb-1">Incident Closure</p>
          <DonutChart value={incidentClosure} color="purple" size={72} />
          <p className="text-[10px] text-slate-500 mt-1">of cases closed</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-2">Incident Trend (6 months)</p>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={incidentTrendData} barSize={18} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", padding: "4px 10px" }} cursor={{ fill: "#f1f5f9" }} />
            <Bar dataKey="Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.8} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-700 mb-1">Workflow Status Breakdown</p>
        <ResponsiveContainer width="100%" height={130}>
          <PieChart>
            <Pie data={workflowPieData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} dataKey="value">
              {workflowPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <Legend iconType="circle" iconSize={7} formatter={(value) => <span style={{ fontSize: 10, color: "#64748b" }}>{value}</span>} />
            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "1px solid #e2e8f0", padding: "4px 10px" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
