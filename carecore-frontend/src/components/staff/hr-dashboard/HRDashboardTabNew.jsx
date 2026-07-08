import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Filter, X, Search, Download } from "lucide-react";
import { differenceInDays, parseISO, format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import HRDashboardKPICards from "./HRDashboardKPICards";
import HRDashboardCharts from "./HRDashboardCharts";
import HRDashboardTrainingMatrix from "./HRDashboardTrainingMatrix";
import HRDashboardComplianceInsights from "./HRDashboardComplianceInsights";
import StatCardDetailModal from "../training/StatCardDetailModal";
import { useTrainingData } from "../training/useTrainingData";

const ROLE_COLORS = {
  admin: "#ef4444",
  admin_officer: "#f97316",
  team_leader: "#8b5cf6",
  support_worker: "#3b82f6",
};

export default function HRDashboardTabNew({ user, staffProfile: propStaffProfile, onNavigate }) {
  const today = new Date();

  // Query staff and homes
  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes", "active"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ["training-requirements"],
    queryFn: () => secureGateway.filter("TrainingRequirement", { is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  // Filter state
  const [filterHome, setFilterHome] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [panelFilters, setPanelFilters] = useState({
    homes: [],
    roles: [],
    overallStatuses: [],
    trainingStatuses: [],
  });
  const [statModal, setStatModal] = useState(null);

  // Training data hook (refetch key changes on modal close to force refresh)
  const trainingDataKey = [
    "training-data",
    filterHome,
    filterRole,
    filterStatus,
    panelFilters,
  ];

  const {
    filteredStaff,
    staffWithStatus,
    scopedStaff,
    activeCourses,
    recordMap,
    stats,
    charts,
    allTrainingForScope,
  } = useTrainingData({ filterHome, filterRole, filterStatus, staffProfile: propStaffProfile, panelFilters });

  const activeStaff = staff.filter(s => s.status === "active");
  const totalStaff = activeStaff.length;

  // Calculate KPI stats
  const kpiStats = {
    totalStaff,
    completionPct: stats.completionPct || 0,
    completeCount: stats.completeCount || 0,
    overdueCount: stats.overdueCount || 0,
    overduePercent: totalStaff > 0 ? Math.round((stats.overdueCount / totalStaff) * 100) : 0,
    expiringSoonCount: stats.expiringSoonCount || 0,
    rtwCompliance: 98,
    rtwCompliantCount: Math.round((totalStaff * 98) / 100),
  };

  // Prepare chart data
  const trainingCompletionData = charts.donutData || [
    { name: "Complete", value: 65, color: "#10b981" },
    { name: "In Progress", value: 6, color: "#3b82f6" },
    { name: "Overdue", value: 5, color: "#ef4444" },
  ];

  const homeCompletionData = charts.homeCompletion || homes.map(h => ({
    name: h.name,
    completion: Math.random() * 40 + 60,
  }));

  const monthlyProgressData = charts.monthlyData || [
    { month: "Dec '25", completion: 72 },
    { month: "Jan '26", completion: 75 },
    { month: "Feb '26", completion: 78 },
    { month: "Mar '26", completion: 81 },
    { month: "Apr '26", completion: 84 },
    { month: "May '26", completion: 85 },
  ];

  const roleBreakdownData = Object.entries(
    activeStaff.reduce((acc, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1;
      return acc;
    }, {})
  ).map(([role, count]) => ({
    role: role.replace(/_/g, " "),
    count,
    color: ROLE_COLORS[role] || "#94a3b8",
  }));

  // DBS expiring
  const dbsExpiring = activeStaff
    .filter(s => s.dbs_expiry)
    .map(s => ({
      ...s,
      daysRemaining: differenceInDays(parseISO(s.dbs_expiry), today),
    }))
    .filter(s => s.daysRemaining >= 0 && s.daysRemaining <= 90)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);

  const dbsExpiringTop5 = dbsExpiring.slice(0, 5).map(s => ({
    id: s.id,
    name: s.full_name,
    expiryDate: s.dbs_expiry,
    daysRemaining: s.daysRemaining,
  }));

  // RTW alerts summary
  const rtwAlerts = [
    { severity: "Critical", count: 2, description: "Immediate action required" },
    { severity: "High", count: 2, description: "Action required within 7 days" },
    { severity: "Medium", count: 2, description: "Action required within 30 days" },
    { severity: "Low", count: 0, description: "For information only" },
  ].filter(a => a.count > 0);

  // Working time compliance
  const workingTimeCompliance = {
    complianceScore: 98,
    compliantCount: Math.round((totalStaff * 98) / 100),
    totalStaff,
  };

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

  const activePanelFilterCount =
    Object.values(panelFilters).flat().length +
    (filterHome !== "all" ? 1 : 0) +
    (filterRole !== "all" ? 1 : 0) +
    (filterStatus !== "all" ? 1 : 0);

  const queryClient = useQueryClient();

  const handleModalClose = () => {
    setStatModal(null);
    // Force immediate refetch
    queryClient.refetchQueries({ queryKey: ["training-records"] });
    queryClient.refetchQueries({ queryKey: ["staff"] });
  };

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
          onClose={handleModalClose}
        />
      )}

      {/* Header and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Staff & HR</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Training & compliance overview across your workforce</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Select value={filterHome} onValueChange={setFilterHome}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All Homes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Homes</SelectItem>
              {homes.map(h => (
                <SelectItem key={h.id} value={h.id}>
                  {h.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterRole} onValueChange={setFilterRole}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="admin_officer">Admin Officer</SelectItem>
              <SelectItem value="team_leader">Team Leader</SelectItem>
              <SelectItem value="support_worker">Support Worker</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Complete">Complete</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Due Soon">Due Soon</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
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
              <span className="bg-primary text-primary-foreground rounded-full text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                {activePanelFilterCount}
              </span>
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
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearPanelFilters}>
                Clear All
              </Button>
              <button onClick={() => setShowFilters(false)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Home filter */}
            <div>
              <p className="text-xs font-medium mb-2">Home</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {homes.map(h => (
                  <label key={h.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={panelFilters.homes.includes(h.id)}
                      onChange={() => togglePanelFilter("homes", h.id)}
                      className="rounded w-3 h-3"
                    />
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
                    <input
                      type="checkbox"
                      checked={panelFilters.roles.includes(r)}
                      onChange={() => togglePanelFilter("roles", r)}
                      className="rounded w-3 h-3"
                    />
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
                    <input
                      type="checkbox"
                      checked={panelFilters.overallStatuses.includes(s)}
                      onChange={() => togglePanelFilter("overallStatuses", s)}
                      className="rounded w-3 h-3"
                    />
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
                    <input
                      type="checkbox"
                      checked={panelFilters.trainingStatuses.includes(s)}
                      onChange={() => togglePanelFilter("trainingStatuses", s)}
                      className="rounded w-3 h-3"
                    />
                    {s.replace(/_/g, " ")}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <HRDashboardKPICards
        stats={kpiStats}
        onCardClick={(type) => setStatModal(type)}
      />

      {/* Charts */}
      <HRDashboardCharts
        trainingCompletionData={trainingCompletionData}
        homeCompletionData={homeCompletionData}
        monthlyProgressData={monthlyProgressData}
        roleBreakdownData={roleBreakdownData}
        onHomeClick={(homeName) => {
          const homeId = homes.find(h => h.name === homeName)?.id;
          if (homeId) setFilterHome(homeId);
        }}
      />

      {/* Training Matrix */}
      <HRDashboardTrainingMatrix
        filteredStaff={filteredStaff}
        activeCourses={activeCourses}
        recordMap={recordMap}
        requirements={requirements}
        staffProfile={propStaffProfile}
        homes={homes}
        panelFilters={panelFilters}
        onRecordSaved={() => {
          queryClient.refetchQueries({ queryKey: ["training-records"] });
          queryClient.refetchQueries({ queryKey: ["staff"] });
        }}
      />

      {/* Compliance Insights */}
      <HRDashboardComplianceInsights
        workingTimeCompliance={workingTimeCompliance}
        rtwAlerts={rtwAlerts}
        dbsExpiringTop5={dbsExpiringTop5}
        dbsExpiringTotal={dbsExpiring.length}
        onViewRTWAlerts={() => {}}
        onViewDBSAlerts={() => {}}
        onRunWTRCheck={() => {}}
      />
    </div>
  );
}