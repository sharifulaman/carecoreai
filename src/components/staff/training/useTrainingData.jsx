import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { calcTrainingStatus } from "./TrainingStatusBadge";
import { subMonths, endOfMonth, format } from "date-fns";

export function useTrainingData({ filterHome, filterRole, filterStatus, staffProfile, panelFilters = {} }) {
  const isAdmin = staffProfile?.role === "admin" || staffProfile?.role === "admin_officer";
  const isTL = staffProfile?.role === "team_leader";

  const { data: allStaff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ["staff"],
    queryFn: () => secureGateway.filter("StaffProfile"),
    staleTime: 5 * 60 * 1000,
  });

  const { data: homes = [] } = useQuery({
    queryKey: ["homes", "active"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: trainingRecords = [], isLoading: loadingRecords } = useQuery({
    queryKey: ["training-records"],
    queryFn: () => secureGateway.filter("TrainingRecord"),
    staleTime: 2 * 60 * 1000,
  });

  const { data: requirements = [], isLoading: loadingReqs } = useQuery({
    queryKey: ["training-requirements"],
    queryFn: () => secureGateway.filter("TrainingRequirement", { is_active: true }),
    staleTime: 5 * 60 * 1000,
  });

  // Home map for name resolution
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  // Scope staff
  let scopedStaff = allStaff.filter(s => s.status === "active");
  if (isTL && staffProfile?.home_ids?.length) {
    scopedStaff = scopedStaff.filter(s =>
      s.home_ids?.some(hid => staffProfile.home_ids.includes(hid)) ||
      s.team_leader_id === staffProfile.id
    );
  }
  if (!isAdmin && !isTL) {
    scopedStaff = scopedStaff.filter(s => s.id === staffProfile?.id);
  }

  // Apply top-bar filters
  if (filterHome && filterHome !== "all") {
    scopedStaff = scopedStaff.filter(s => s.home_ids?.includes(filterHome) || s.home_id === filterHome);
  }
  if (filterRole && filterRole !== "all") {
    scopedStaff = scopedStaff.filter(s => s.role === filterRole);
  }

  // Apply panel home filter
  if (panelFilters.homes?.length > 0) {
    scopedStaff = scopedStaff.filter(s =>
      panelFilters.homes.some(hid => s.home_ids?.includes(hid) || s.home_id === hid)
    );
  }
  // Apply panel role filter
  if (panelFilters.roles?.length > 0) {
    scopedStaff = scopedStaff.filter(s => panelFilters.roles.includes(s.role));
  }

  // Build record lookup: staff_id + course_name → record
  const recordMap = {};
  trainingRecords.forEach(r => {
    const key = `${r.staff_id}__${r.course_name}`;
    if (!recordMap[key] || r.updated_date > recordMap[key].updated_date) {
      recordMap[key] = r;
    }
  });

  // Active requirements sorted by display_order
  const activeCourses = [...requirements].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  // Per-staff compliance
  const staffWithStatus = scopedStaff.map(s => {
    const mandatoryCourses = activeCourses.filter(c => c.is_mandatory === true);
    let hasExpired = false;
    let hasAtRisk = false;
    mandatoryCourses.forEach(c => {
      const rec = recordMap[`${s.id}__${c.course_name}`];
      const status = calcTrainingStatus(rec);
      if (status === "expired" || status === "not_started") hasExpired = true;
      else if (status === "expiring_soon" || status === "in_progress") hasAtRisk = true;
    });
    const overallStatus = hasExpired ? "Non-Compliant" : hasAtRisk ? "At Risk" : "Compliant";

    // Resolve home name
    const primaryHomeId = s.home_ids?.[0] || s.home_id;
    const homeName = homeMap[primaryHomeId]?.name || "No Home Assigned";

    return { ...s, overallStatus, primaryHomeId, homeName };
  });

  // Filter by overall status (top-bar + panel)
  let filteredStaff = staffWithStatus;
  const statusFilter = filterStatus !== "all" ? filterStatus : null;
  const panelStatusFilters = panelFilters.overallStatuses || [];
  if (statusFilter) {
    filteredStaff = filteredStaff.filter(s => s.overallStatus === statusFilter);
  } else if (panelStatusFilters.length > 0) {
    filteredStaff = filteredStaff.filter(s => panelStatusFilters.includes(s.overallStatus));
  }

  // Filter by training status (panel) — keep staff that have at least one cell matching
  if (panelFilters.trainingStatuses?.length > 0) {
    filteredStaff = filteredStaff.filter(s =>
      activeCourses.some(c => {
        const rec = recordMap[`${s.id}__${c.course_name}`];
        return panelFilters.trainingStatuses.includes(calcTrainingStatus(rec));
      })
    );
  }

  // Sort: Non-Compliant first, At Risk, Compliant
  const ORDER = { "Non-Compliant": 0, "At Risk": 1, "Compliant": 2 };
  filteredStaff = [...filteredStaff].sort((a, b) => (ORDER[a.overallStatus] ?? 3) - (ORDER[b.overallStatus] ?? 3));

  const today = new Date();
  const totalRequired = scopedStaff.length * activeCourses.length;

  // Stat calculations
  const allTrainingForScope = trainingRecords.filter(r => scopedStaff.find(s => s.id === r.staff_id));
  const completedCount = allTrainingForScope.filter(r => {
    const st = calcTrainingStatus(r);
    return st === "completed" || st === "valid";
  }).length;
  const completionPct = totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0;

  const overdueCount = allTrainingForScope.filter(r => calcTrainingStatus(r) === "expired").length;
  const expiringSoonCount = allTrainingForScope.filter(r => calcTrainingStatus(r) === "expiring_soon").length;
  const compliantStaff = staffWithStatus.filter(s => s.overallStatus === "Compliant").length;
  const avgCompliance = scopedStaff.length > 0 ? Math.round((compliantStaff / scopedStaff.length) * 100) : 0;

  // Donut chart — count across all staff × all courses
  const statusGroups = { completed: 0, in_progress: 0, not_started: 0, expired: 0, expiring_soon: 0 };
  scopedStaff.forEach(s => {
    activeCourses.forEach(c => {
      const rec = recordMap[`${s.id}__${c.course_name}`];
      const st = calcTrainingStatus(rec);
      if (st === "completed" || st === "valid") statusGroups.completed++;
      else if (st === "in_progress") statusGroups.in_progress++;
      else if (st === "expired") statusGroups.expired++;
      else if (st === "expiring_soon") statusGroups.expiring_soon++;
      else statusGroups.not_started++;
    });
  });

  const donutData = [
    { name: "Completed", value: statusGroups.completed, color: "#22c55e" },
    { name: "In Progress", value: statusGroups.in_progress, color: "#3b82f6" },
    { name: "Not Started", value: statusGroups.not_started, color: "#f59e0b" },
    { name: "Expired", value: statusGroups.expired, color: "#ef4444" },
    { name: "Expiring Soon", value: statusGroups.expiring_soon, color: "#f97316" },
  ].filter(d => d.value > 0);

  // Bar chart: completion % per home — use resolved home names
  const homeCompletion = homes.map(h => {
    const homeStaff = scopedStaff.filter(s => s.home_ids?.includes(h.id) || s.home_id === h.id);
    if (homeStaff.length === 0) return null;
    const total = homeStaff.length * activeCourses.length;
    const done = homeStaff.reduce((acc, s) => {
      return acc + activeCourses.filter(c => {
        const rec = recordMap[`${s.id}__${c.course_name}`];
        const st = calcTrainingStatus(rec);
        return st === "completed" || st === "valid";
      }).length;
    }, 0);
    return { name: h.name, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }).filter(Boolean);

  // Line chart: monthly completion % last 6 months
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const m = subMonths(today, 5 - i);
    const label = format(m, "MMM yy");
    const monthEnd = endOfMonth(m);
    const scopedIds = new Set(scopedStaff.map(s => s.id));
    const completedByMonth = trainingRecords.filter(r => {
      if (!r.completion_date) return false;
      if (!scopedIds.has(r.staff_id)) return false;
      return new Date(r.completion_date) <= monthEnd;
    }).length;
    const pct = totalRequired > 0 ? Math.round((completedByMonth / totalRequired) * 100) : 0;
    return { label, completion: Math.min(pct, 100), target: 85 };
  });

  return {
    scopedStaff,
    filteredStaff,
    staffWithStatus,   // all scoped staff with overallStatus (unfiltered by status filter)
    activeCourses,
    recordMap,
    homes,
    homeMap,
    isLoading: loadingStaff || loadingRecords || loadingReqs,
    stats: { totalStaff: scopedStaff.length, completionPct, overdueCount, expiringSoonCount, avgCompliance, compliantStaff },
    charts: { donutData, homeCompletion, monthlyData },
    allTrainingForScope,
  };
}