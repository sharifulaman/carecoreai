import { useState, useMemo, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ROLE_RANK } from "@/lib/roleConfig";
import { Shield } from "lucide-react";
import AuditTrailHeader from "@/components/audit/AuditTrailHeader";
import AuditTrailFilters from "@/components/audit/AuditTrailFilters";
import AuditKPICards from "@/components/audit/AuditKPICards";
import AuditEventsTable from "@/components/audit/AuditEventsTable";
import AuditEventDetails from "@/components/audit/AuditEventDetails";
import AuditAnalytics from "@/components/audit/AuditAnalytics";

const DEFAULT_FILTERS = {
  module: "all",
  actionType: "all",
  userRole: "all",
  home: null,
  severity: "all",
  dateRange: { from: null, to: null },
  search: "",
};

// Minimum rank required to see data in the Audit Trail.
// support_worker (rank 10) has nobody ranked below them, so they would always
// receive an empty result set from the backend. Rank 1 means any authenticated
// staff role can open the page; the backend rank filter controls what they see.
const MIN_AUDIT_RANK = 1;

export default function AuditTrail() {
  const { user, staffProfile } = useOutletContext();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  // Module/Action/Role/Severity row — shown by default, toggled by the
  // header's "Advanced Filters" button.
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(true);

  const currentRole = staffProfile?.role || user?.role;

  // Resolve rank instantly from the static ROLE_RANK map — no API call needed.
  // Any recognised staff role has rank >= 10; unrecognised / portal roles get 0.
  const userRank = ROLE_RANK[currentRole] ?? 0;
  const hasAccess = userRank >= MIN_AUDIT_RANK;

  // Debounce search: wait 400 ms after the user stops typing before firing a request.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  // Any filter change resets to page 1 so the result set stays coherent.
  useEffect(() => {
    setPage(1);
  }, [filters.module, filters.actionType, filters.userRole, filters.home,
      filters.severity, filters.dateRange, debouncedSearch]);

  // Build API query params — omit keys that have no active value.
  const queryParams = useMemo(() => {
    const p = { page, page_size: pageSize };
    if (filters.module !== "all")     p.module_name = filters.module;
    if (filters.actionType !== "all") p.action_type = filters.actionType;
    if (filters.userRole !== "all")   p.actor_role  = filters.userRole;
    if (filters.severity !== "all")   p.severity    = filters.severity;
    if (filters.home && filters.home !== "all") p.home_id = filters.home;
    if (filters.dateRange?.from) {
      p.from_date = filters.dateRange.from.toISOString().slice(0, 10);
    }
    if (filters.dateRange?.to) {
      p.to_date = filters.dateRange.to.toISOString().slice(0, 10);
    }
    if (debouncedSearch) p.search = debouncedSearch;
    return p;
  }, [filters, debouncedSearch, page, pageSize]);

  const {
    data: response,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["audit-trail", queryParams],
    queryFn: () => base44.auditTrail.list(queryParams),
    enabled: hasAccess,
    staleTime: 30 * 1000,
    // Keep showing the previous page's rows while a new filter/search/page
    // fetches, instead of clearing to a "Loading events..." flash on every
    // keystroke or filter change.
    placeholderData: keepPreviousData,
    retry: (failCount, err) => {
      // Never retry on 403 — it won't change without a re-login.
      const e = /** @type {any} */ (err);
      if (e?.status === 403 || e?.statusCode === 403) return false;
      return failCount < 2;
    },
  });

  // Response envelope: { status, data: [...], meta: { page, page_size, total_count, total_pages, kpis } }
  const entries = response?.data ?? [];
  const meta = response?.meta ?? {
    page: 1,
    page_size: pageSize,
    total_count: 0,
    total_pages: 0,
    kpis: {},
  };

  // All KPI counts come from the backend, computed against the full filtered
  // result set (not just the current page) — see GetAuditTrail/countMatching.
  const kpis = useMemo(() => ({
    totalEvents:      meta.total_count,
    highRiskEvents:   meta.kpis?.high_risk_events ?? 0,
    approvalActions:  meta.kpis?.approval_actions ?? 0,
    escalations:      meta.kpis?.escalations ?? 0,
    deletedRestored:  meta.kpis?.deleted_restored ?? 0,
    exportsDownloads: meta.kpis?.exports_downloads ?? 0,
  }), [meta]);

  // ── Access denied: rank too low or API returned 403 ──────────────────────
  const httpError = /** @type {any} */ (error);
  const isForbidden = !hasAccess || (isError && httpError?.status === 403);
  if (isForbidden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You do not have permission to view the Audit Trail.
          </p>
          {userRank !== null && userRank < MIN_AUDIT_RANK && (
            <p className="text-xs text-muted-foreground mt-2">
              Your role does not have sufficient seniority for this section.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AuditTrailHeader
        filters={filters}
        setFilters={setFilters}
        queryParams={queryParams}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvancedFilters={() => setShowAdvancedFilters(v => !v)}
      />
      {showAdvancedFilters && (
        <AuditTrailFilters filters={filters} setFilters={setFilters} />
      )}
      <AuditKPICards kpis={kpis} filters={filters} setFilters={setFilters} />

      <div className="flex-1 flex gap-6 px-6 pb-6">
        <div className="flex-1 space-y-6">
          <AuditEventsTable
            events={entries}
            totalEvents={meta.total_count}
            isLoading={isLoading}
            isFetching={isFetching}
            page={page}
            pageSize={pageSize}
            totalPages={meta.total_pages}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            onRefresh={refetch}
          />

          <AuditAnalytics events={entries} />
        </div>

        {selectedEvent && (
          <AuditEventDetails
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}
      </div>
    </div>
  );
}
