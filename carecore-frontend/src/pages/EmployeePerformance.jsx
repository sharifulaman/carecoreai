// @ts-nocheck
import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { performanceApi } from "@/lib/performanceApi";
import {
  Download, Zap, Users, Star, CheckCircle, Clock, Shield, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import EmployeeFilterBar from "@/components/performance/EmployeeFilterBar";
import RoleGroupChips from "@/components/performance/RoleGroupChips";
import EmployeePerformanceTable from "@/components/performance/EmployeePerformanceTable";
import PerformanceInsightsPanel from "@/components/performance/PerformanceInsightsPanel";
import RecentReviewsSection from "@/components/performance/RecentReviewsSection";
import ExportReportModal from "@/components/performance/ExportReportModal";
import DetailedAnalyticsModal from "@/components/performance/DetailedAnalyticsModal";
import KPIDrilldownModal from "@/components/performance/KPIDrilldownModal";
import PerformanceAlertsModal from "@/components/performance/PerformanceAlertsModal";

// Maps role group chip values to a comma-separated role string for the backend.
const ROLE_GROUP_MAP = {
  all:           "",
  support_workers: "support_worker",
  "24_hours":    "support_worker,team_leader",
  "18_plus":     "support_worker,team_leader",
  admin:         "admin_officer,admin_manager,admin",
  hr:            "hr_officer,hr_manager",
  maintenance:   "maintenance_officer,maintenance_manager",
  team_leaders:  "team_leader",
  managers:      "team_manager,regional_manager,admin_manager,hr_manager,maintenance_manager",
};

const KPI_CARD_CONFIG = [
  { key: "total_employees",        icon: Users,        color: "text-blue-600",   bg: "bg-blue-500/10",   label: "Total Employees Tracked",  format: (v) => v },
  { key: "avg_score",              icon: Star,         color: "text-cyan-600",   bg: "bg-cyan-500/10",   label: "Avg Performance Score",    format: (v) => v > 0 ? `${v}%` : "—" },
  { key: "tasks_completed",        icon: CheckCircle,  color: "text-purple-600", bg: "bg-purple-500/10", label: "Tasks Completed",          format: (v) => v.toLocaleString() },
  { key: "avg_hours_logged",       icon: Clock,        color: "text-teal-600",   bg: "bg-teal-500/10",   label: "Avg Hours Logged",         format: (v) => v > 0 ? `${v}h` : "—" },
  { key: "training_compliance_pct",icon: Shield,       color: "text-green-600",  bg: "bg-green-500/10",  label: "Training Compliance",      format: (v) => `${v}%` },
  { key: "alerts_count",           icon: AlertCircle,  color: "text-red-600",    bg: "bg-red-500/10",    label: "Performance Alerts",       format: (v) => v },
];

function trendLabel(pct, key) {
  if (pct === 0 || pct == null) return null;
  return `${pct > 0 ? "↑" : "↓"} ${Math.abs(pct)}% vs last period`;
}
function trendColor(pct, key) {
  if (!pct) return "text-muted-foreground";
  // For alerts, higher = worse
  if (key === "alerts_count") return pct > 0 ? "text-red-500" : "text-green-600";
  return pct > 0 ? "text-green-600" : "text-red-500";
}

export default function EmployeePerformance() {
  const { user } = useOutletContext();

  const [roleFilter, setRoleFilter]         = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [homeFilter, setHomeFilter]         = useState("all");
  const [periodFilter, setPeriodFilter]     = useState("current_month");
  const [statusFilter, setStatusFilter]     = useState("all");
  const [searchQuery, setSearchQuery]       = useState("");
  const [roleGroupChip, setRoleGroupChip]   = useState("all");
  const [page, setPage]                     = useState(1);
  const [sortBy, setSortBy]                 = useState("score");
  const [showExportModal, setShowExportModal]       = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal]       = useState(false);
  const [kpiModal, setKpiModal]                     = useState(null);

  // Effective role filter: role group chip takes precedence over the role dropdown
  const effectiveRole = ROLE_GROUP_MAP[roleGroupChip] || (roleFilter !== "all" ? roleFilter : "");

  // Debounce search: wait 400 ms after the user stops typing before firing a request.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to page 1 whenever department, status, or search changes.
  useEffect(() => {
    setPage(1);
  }, [departmentFilter, statusFilter, debouncedSearch]);

  const filters = {
    periodFilter,
    homeId: homeFilter,
    role: effectiveRole,
    department: departmentFilter,
    search: debouncedSearch,
    statusFilter,
  };

  // Homes — still needed for the filter bar dropdown
  const { data: homes = [] } = useQuery({
    queryKey: ["homes-perf"],
    queryFn:  () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 30 * 60 * 1000,
  });

  // KPI cards + insights panel data (one call)
  const { data: kpiData, isLoading: kpisLoading } = useQuery({
    queryKey: ["perf-kpis", filters],
    queryFn:  () => performanceApi.teamKPIs(filters),
    staleTime: 2 * 60 * 1000,
    retry: (n, err) => err?.status !== 403 && n < 2,
  });

  // Team performance table (paginated)
  const { data: teamData, isLoading: tableLoading } = useQuery({
    queryKey: ["perf-team", filters, page, sortBy],
    queryFn:  () => performanceApi.teamSummary({ ...filters, page, pageSize: 20, sortBy }),
    staleTime: 2 * 60 * 1000,
    keepPreviousData: true,
    retry: (n, err) => err?.status !== 403 && n < 2,
  });

  // Reset to page 1 when filters change
  const setFiltersAndReset = (setter) => (...args) => { setter(...args); setPage(1); };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Employee Performance Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unified performance overview across all staff roles
            {kpiData?.period?.label ? ` — ${kpiData.period.label}` : ""}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowExportModal(true)} className="gap-2">
            <Download className="w-4 h-4" /> Export Report
          </Button>
          <Button size="sm" onClick={() => setShowAnalyticsModal(true)} className="gap-2">
            <Zap className="w-4 h-4" /> View Detailed Analytics
          </Button>
        </div>
      </div>

      <EmployeeFilterBar
        roleFilter={roleFilter}
        setRoleFilter={setFiltersAndReset(setRoleFilter)}
        departmentFilter={departmentFilter}
        setDepartmentFilter={setDepartmentFilter}
        homeFilter={homeFilter}
        setHomeFilter={setFiltersAndReset(setHomeFilter)}
        homes={homes}
        periodFilter={periodFilter}
        setPeriodFilter={setFiltersAndReset(setPeriodFilter)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <RoleGroupChips
        selected={roleGroupChip}
        onChange={(v) => { setRoleGroupChip(v); setPage(1); }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_CARD_CONFIG.map(({ key, icon: Icon, color, bg, label, format }) => {
          const raw   = kpiData?.[key] ?? null;
          const value = raw != null ? format(raw) : (kpisLoading ? "…" : "—");
          const trendPct = key === "avg_score"
            ? kpiData?.avg_score_trend_pct
            : key === "tasks_completed"
            ? kpiData?.tasks_trend_pct
            : null;
          const sub      = trendLabel(trendPct, key);
          const subColor = trendColor(trendPct, key);

          return (
            <div
              key={key}
              className="bg-card rounded-xl border border-border p-4 flex gap-3 items-start cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
              onClick={() => setKpiModal(key)}
            >
              <div className={`p-2 rounded-full ${bg} shrink-0 mt-0.5`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground leading-tight mb-0.5">{label}</p>
                <p className="text-2xl font-bold leading-tight">{value}</p>
                {sub
                  ? <p className={`text-[10px] mt-0.5 font-medium ${subColor}`}>{sub}</p>
                  : <p className="text-[10px] mt-0.5 text-muted-foreground">No trend data</p>
                }
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <EmployeePerformanceTable
            data={teamData}
            isLoading={tableLoading}
            page={page}
            onPageChange={setPage}
            sortBy={sortBy}
            onSortChange={(s) => { setSortBy(s); setPage(1); }}
            user={user}
          />
        </div>
        <div>
          <PerformanceInsightsPanel
            kpiData={kpiData}
            isLoading={kpisLoading}
            onViewAllAlerts={() => setShowAlertsModal(true)}
          />
        </div>
      </div>

      <RecentReviewsSection
        teamData={teamData}
        kpiData={kpiData}
      />

      {kpiModal && (
        <KPIDrilldownModal
          kpiKey={kpiModal}
          kpiData={kpiData}
          onClose={() => setKpiModal(null)}
        />
      )}

      {showAlertsModal && (
        <PerformanceAlertsModal
          filters={filters}
          onClose={() => setShowAlertsModal(false)}
        />
      )}

      {showExportModal && (
        <ExportReportModal
          kpiData={kpiData}
          filters={{ role: effectiveRole, homeId: homeFilter, periodFilter }}
          onClose={() => setShowExportModal(false)}
        />
      )}
      {showAnalyticsModal && (
        <DetailedAnalyticsModal
          kpiData={kpiData}
          teamData={teamData}
          homes={homes}
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </div>
  );
}
