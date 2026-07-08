import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { createNotification } from "@/lib/createNotification";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Users, CheckCircle, Clock, Hourglass, Shield, AlertTriangle, Filter, X,
} from "lucide-react";
import { differenceInDays, parseISO, format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTrainingData } from "../training/useTrainingData";
import TrainingCharts from "../training/TrainingCharts";
import TrainingMatrix from "../training/TrainingMatrix";
import StatCardDetailModal from "../training/StatCardDetailModal";
import WorkingTimeComplianceSection from "../wtr/WorkingTimeComplianceSection";
import RTWAlertsPanel from "../rtw/RTWAlertsPanel";
import { ORG_ID } from "@/lib/roleConfig";

const ROLE_COLORS = {
  admin: "#ef4444", admin_officer: "#f97316", team_leader: "#8b5cf6", support_worker: "#3b82f6",
};

function StatCard({ icon: Icon, label, value, sub, color = "text-primary", iconBg = "bg-primary/10", iconColor = "text-primary", alert, onClick }) {
  return (
    <div
      className={`bg-card rounded-xl border p-4 transition-all ${alert ? "border-red-300 bg-red-50/30" : "border-border"} ${onClick ? "cursor-pointer hover:shadow-md hover:border-primary/40" : ""}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

export default function HRDashboardTab({ user, onNavigate, staffProfile: propStaffProfile }) {
  const today = new Date();

  const { data: myProfile } = useQuery({
    queryKey: ["my-staff-profile", user?.email],
    queryFn: () => secureGateway.filter("StaffProfile", { email: user?.email }),
    select: d => d[0] || null,
    enabled: !!user?.email && !propStaffProfile,
    staleTime: 10 * 60 * 1000,
  });
  const staffProfile = propStaffProfile || myProfile;

  // Filters state
  const [filterHome, setFilterHome] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  // Multi-select filter state for the panel
  const [panelFilters, setPanelFilters] = useState({
    homes: [],
    roles: [],
    overallStatuses: [],
    trainingStatuses: [],
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes", "active"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const [statModal, setStatModal] = useState(null);

  // Training data
  const {
    filteredStaff, staffWithStatus, scopedStaff, activeCourses, recordMap,
    isLoading, stats, charts, allTrainingForScope,
  } = useTrainingData({ filterHome, filterRole, filterStatus, staffProfile, panelFilters });

  // Legacy data
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: () => secureGateway.filter("StaffProfile"), staleTime: 5 * 60 * 1000 });

  // Trigger 1 — DBS expiring within 90 days
  useEffect(() => {
    if (!staff.length || !homes.length) return;
    const today = new Date();
    const cutoff90 = new Date(); cutoff90.setDate(today.getDate() + 90);
    const cutoff7ago = new Date(); cutoff7ago.setDate(today.getDate() - 7);
    const activeStaffList = staff.filter(s => s.status === "active" && s.dbs_expiry);
    if (!activeStaffList.length) return;
    // Get recent notifications to dedupe
    secureGateway.filter("Notification", { type: "certification" }, "-created_date", 200).then(existingNotifs => {
      activeStaffList.forEach(s => {
        const expiry = new Date(s.dbs_expiry);
        if (expiry < today || expiry > cutoff90) return;
        // Dedupe: check if a dbs_expiry notification for this staff was created in last 7 days
        const alreadySent = existingNotifs.some(n =>
          n.related_module === "DBS Expiring Soon" &&
          n.message?.includes(s.full_name) &&
          new Date(n.created_date) > cutoff7ago
        );
        if (alreadySent) return;
        // Find TL or admin to notify
        const tlId = s.team_leader_id;
        const recipient = tlId ? staff.find(x => x.id === tlId) : staff.find(x => x.role === "admin");
        if (recipient?.user_id) {
          createNotification({
            recipient_user_id: recipient.user_id,
            recipient_staff_id: recipient.id,
            title: "DBS Expiring Soon",
            body: `${s.full_name}'s DBS certificate expires on ${s.dbs_expiry}. Please arrange renewal.`,
            type: "dbs_expiry",
            link: "/staff?tab=active",
            priority: "high",
          });
        }
      });
    }).catch(() => {});
  }, [staff.length]); // eslint-disable-line
  const { data: requirements = [] } = useQuery({
    queryKey: ["training-requirements"],
    queryFn: () => secureGateway.filter("TrainingRequirement", { is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  // Trigger 2 — Training expiring within 60 days
  useEffect(() => {
    if (!allTrainingForScope?.length || !staff.length) return;
    const today = new Date();
    const cutoff60 = new Date(); cutoff60.setDate(today.getDate() + 60);
    const cutoff7ago = new Date(); cutoff7ago.setDate(today.getDate() - 7);
    const expiring = allTrainingForScope.filter(r => {
      if (!r.expiry_date) return false;
      const exp = new Date(r.expiry_date);
      return exp > today && exp <= cutoff60 && r.status !== "expired";
    });
    if (!expiring.length) return;
    secureGateway.filter("Notification", { type: "certification" }, "-created_date", 200).then(existingNotifs => {
      expiring.forEach(r => {
        const alreadySent = existingNotifs.some(n =>
          n.related_module === "Training Expiring Soon" &&
          n.message?.includes(r.course_name) &&
          n.message?.includes(r.staff_name || "") &&
          new Date(n.created_date) > cutoff7ago
        );
        if (alreadySent) return;
        const staffMember = staff.find(s => s.id === r.staff_id);
        const tlId = staffMember?.team_leader_id;
        const recipient = tlId ? staff.find(x => x.id === tlId) : staff.find(x => x.role === "admin");
        if (recipient?.user_id) {
          createNotification({
            recipient_user_id: recipient.user_id,
            recipient_staff_id: recipient.id,
            title: "Training Expiring Soon",
            body: `${r.staff_name || staffMember?.full_name || "A staff member"}'s ${r.course_name} training expires on ${r.expiry_date}. Please arrange renewal.`,
            type: "training_expiry",
            link: "/staff?tab=training",
            priority: "normal",
          });
        }
      });
    }).catch(() => {});
  }, [allTrainingForScope?.length]); // eslint-disable-line

  const activeStaff = staff.filter(s => s.status === "active");

  // Appraisal check using next_appraisal_date
  const { data: appraisals = [] } = useQuery({
    queryKey: ["appraisals-dashboard"],
    queryFn: () => secureGateway.filter("AppraisalRecord"),
    staleTime: 5 * 60 * 1000,
  });

  const overdueAppraisalsCount = activeStaff.filter(s => {
    const last = appraisals
      .filter(a => a.staff_id === s.id)
      .sort((a, b) => b.appraisal_date?.localeCompare(a.appraisal_date))[0];
    if (!last || !last.next_appraisal_date) return false;
    return differenceInDays(today, parseISO(last.next_appraisal_date)) > 0;
  }).length;

  const dbsExpiring = activeStaff.filter(s => {
    if (!s.dbs_expiry) return false;
    const diff = differenceInDays(parseISO(s.dbs_expiry), today);
    return diff >= 0 && diff <= 90;
  });

  const roleBreakdown = Object.entries(
    activeStaff.reduce((acc, s) => { acc[s.role] = (acc[s.role] || 0) + 1; return acc; }, {})
  ).map(([role, count]) => ({ role: role.replace(/_/g, " "), count, color: ROLE_COLORS[role] || "#94a3b8" }));

  const headcountTrend = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(today, 5 - i);
    const monthEnd = endOfMonth(m);
    const label = format(m, "MMM");
    const count = staff.filter(s => {
      const start = s.start_date ? parseISO(s.start_date) : null;
      const end = s.end_date ? parseISO(s.end_date) : null;
      if (!start || start > monthEnd) return false;
      if (end && end < startOfMonth(m)) return false;
      return true;
    }).length;
    return { label, count };
  });

  // Panel filter helpers
  const togglePanelFilter = (key, value) => {
    setPanelFilters(prev => {
      const arr = prev[key];
      return { ...prev, [key]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });
  };

  const clearPanelFilters = () => {
    setPanelFilters({ homes: [], roles: [], overallStatuses: [], trainingStatuses: [] });
    setFilterHome("all");
    setFilterRole("all");
    setFilterStatus("all");
  };

  const activePanelFilterCount = Object.values(panelFilters).flat().length
    + (filterHome !== "all" ? 1 : 0)
    + (filterRole !== "all" ? 1 : 0)
    + (filterStatus !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      {statModal && (
        <StatCardDetailModal
          type={statModal}
          stats={stats}
          staffWithStatus={staffWithStatus}
          allTrainingForScope={allTrainingForScope}
          activeCourses={activeCourses}
          recordMap={recordMap}
          homes={homes}
          onClose={() => setStatModal(null)}
        />
      )}
      {/* Header + filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Training & Compliance Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track staff training, competence and compliance in real time.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={filterHome} onValueChange={setFilterHome}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Homes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Homes</SelectItem>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Roles" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="admin_officer">Admin Officer</SelectItem>
              <SelectItem value="team_leader">Team Leader</SelectItem>
              <SelectItem value="support_worker">Support Worker</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Compliant">Compliant</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
              <SelectItem value="Non-Compliant">Non-Compliant</SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(v => !v)}
            className="h-8 text-xs gap-1.5"
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {activePanelFilterCount > 0 && (
              <span className="bg-primary text-primary-foreground rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">{activePanelFilterCount}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Advanced Filters</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearPanelFilters}>Clear All</Button>
              <button onClick={() => setShowFilters(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Home filter */}
            <div>
              <p className="text-xs font-medium mb-2">Home</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {homes.map(h => (
                  <label key={h.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                    <input type="checkbox" checked={panelFilters.homes.includes(h.id)} onChange={() => togglePanelFilter("homes", h.id)} className="rounded w-3 h-3" />
                    {h.name}
                  </label>
                ))}
              </div>
            </div>
            {/* Role filter */}
            <div>
              <p className="text-xs font-medium mb-2">Role</p>
              <div className="space-y-1">
                {["admin", "team_leader", "support_worker"].map(r => (
                  <label key={r} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                    <input type="checkbox" checked={panelFilters.roles.includes(r)} onChange={() => togglePanelFilter("roles", r)} className="rounded w-3 h-3" />
                    {r.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
            {/* Overall Status */}
            <div>
              <p className="text-xs font-medium mb-2">Overall Status</p>
              <div className="space-y-1">
                {["Compliant", "At Risk", "Non-Compliant"].map(s => (
                  <label key={s} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                    <input type="checkbox" checked={panelFilters.overallStatuses.includes(s)} onChange={() => togglePanelFilter("overallStatuses", s)} className="rounded w-3 h-3" />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            {/* Training Status */}
            <div>
              <p className="text-xs font-medium mb-2">Training Status</p>
              <div className="space-y-1">
                {["completed", "in_progress", "not_started", "expiring_soon", "expired"].map(s => (
                  <label key={s} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                    <input type="checkbox" checked={panelFilters.trainingStatuses.includes(s)} onChange={() => togglePanelFilter("trainingStatuses", s)} className="rounded w-3 h-3" />
                    {s.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard icon={Users} label="Total Staff" value={stats.totalStaff} sub="active in scope" iconBg="bg-blue-500/10" iconColor="text-blue-500"
          onClick={() => setStatModal("total")}
        />
        <StatCard
          icon={CheckCircle} label="Training Completion" value={`${stats.completionPct}%`} sub="of required courses"
          iconBg="bg-green-500/10" iconColor="text-green-500"
          color={stats.completionPct >= 80 ? "text-green-600" : stats.completionPct >= 60 ? "text-amber-600" : "text-red-600"}
          onClick={() => setStatModal("compliant")}
        />
        <StatCard
          icon={Clock} label="Overdue Training" value={stats.overdueCount} sub="expired records"
          iconBg={stats.overdueCount > 0 ? "bg-red-500/10" : "bg-muted"}
          iconColor={stats.overdueCount > 0 ? "text-red-500" : "text-muted-foreground"}
          color={stats.overdueCount > 0 ? "text-red-600" : "text-foreground"}
          alert={stats.overdueCount > 0}
          onClick={() => setStatModal("overdue")}
        />
        <StatCard
          icon={Hourglass} label="Expiring Soon" value={stats.expiringSoonCount} sub="within 60 days"
          iconBg={stats.expiringSoonCount > 0 ? "bg-amber-500/10" : "bg-muted"}
          iconColor={stats.expiringSoonCount > 0 ? "text-amber-500" : "text-muted-foreground"}
          color={stats.expiringSoonCount > 0 ? "text-amber-600" : "text-foreground"}
          onClick={() => setStatModal("expiring")}
        />
        <StatCard
          icon={Shield} label="Avg Compliance" value={`${stats.avgCompliance}%`} sub={`${stats.compliantStaff} compliant`}
          iconBg="bg-purple-500/10" iconColor="text-purple-500"
          color={stats.avgCompliance >= 80 ? "text-purple-600" : stats.avgCompliance >= 60 ? "text-amber-600" : "text-red-600"}
          onClick={() => setStatModal("avgCompliance")}
        />
      </div>

      {/* Training Charts */}
      <TrainingCharts
        donutData={charts.donutData}
        homeCompletion={charts.homeCompletion}
        monthlyData={charts.monthlyData}
        totalStaff={stats.totalStaff}
      />

      {/* Training Matrix */}
      <TrainingMatrix
        filteredStaff={filteredStaff}
        activeCourses={activeCourses}
        recordMap={recordMap}
        requirements={requirements}
        staffProfile={staffProfile}
        homes={homes}
        panelFilters={panelFilters}
      />

      {/* Legacy charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Staff by Role</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={roleBreakdown} dataKey="count" nameKey="role" cx="50%" cy="50%" outerRadius={60}
                label={({ role, count }) => `${role}: ${count}`} labelLine={false}>
                {roleBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 col-span-2">
          <h3 className="text-sm font-semibold mb-3">Headcount Trend (6 months)</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={headcountTrend}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Working Time Regulations Compliance */}
      <WorkingTimeComplianceSection staff={staff} homes={homes} />

      {/* RTW Alerts */}
      <RTWAlertsPanel staff={staff} />

      {/* DBS Expiry */}
      {dbsExpiring.length > 0 && (
        <div className="bg-card rounded-xl border border-amber-200 p-4">
          <h3 className="text-sm font-semibold text-amber-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> DBS Expiring in Next 90 Days
          </h3>
          <div className="space-y-2">
            {dbsExpiring.map(s => {
              const days = differenceInDays(parseISO(s.dbs_expiry), today);
              return (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.full_name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{s.dbs_expiry}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${days <= 30 ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"}`}>
                      {days} days
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Overdue Appraisals */}
      {overdueAppraisalsCount > 0 && (
        <div className="bg-card rounded-xl border border-red-200 p-4">
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Overdue Appraisals ({overdueAppraisalsCount})
          </h3>
          <p className="text-sm text-muted-foreground">Staff members who are overdue for appraisal. Review in the Appraisals tab.</p>
        </div>
      )}
    </div>
  );
}