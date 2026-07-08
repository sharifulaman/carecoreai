import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, Settings, Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { exportCSV, exportExcel, exportPDF } from "@/lib/auditExport";
import DateRangePicker from "@/components/audit/DateRangePicker";
import HomesPicker from "@/components/audit/HomesPicker";

const EXPORT_FORMATS = ["CSV", "Excel", "PDF"];

export default function AuditTrailHeader({
  filters,
  setFilters,
  queryParams,
  showAdvancedFilters,
  onToggleAdvancedFilters,
}) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const queryClient = useQueryClient();

  async function handleExport(format) {
    setShowExportMenu(false);
    setExporting(true);

    const toastId = toast.loading(`Preparing ${format} export…`);
    try {
      // Fetch up to 1 000 records matching the current filters — no page cap.
      const result = await base44.auditTrail.list({
        ...queryParams,
        page: 1,
        page_size: 1000,
      });
      const entries = result?.data ?? [];

      if (entries.length === 0) {
        toast.dismiss(toastId);
        toast.info("No records to export for the current filters.");
        return;
      }

      if (format === "CSV")   exportCSV(entries);
      if (format === "Excel") exportExcel(entries);
      if (format === "PDF")   exportPDF(entries);

      // Record the export for the audit trail's own KPIs, then invalidate so
      // the KPI cards and table refetch immediately instead of only updating
      // on the next manual refresh. The backend write is synchronous, so by
      // the time this resolves the row is guaranteed to be visible.
      try {
        await base44.auditTrail.logExport(format.toLowerCase(), entries.length);
        queryClient.invalidateQueries({ queryKey: ["audit-trail"] });
      } catch {
        // Non-fatal: the export the user asked for already succeeded above.
      }

      toast.dismiss(toastId);
      toast.success(`${format} exported — ${entries.length.toLocaleString()} records.`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(`Export failed: ${err?.message ?? "unknown error"}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="bg-card border-b border-border px-6 py-5 sticky top-0 z-10">
      <div className="flex items-start justify-between gap-4">
        {/* Left: Title & Subtitle */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track every critical action, approval, change and system event across CareCoreAI.
          </p>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <DateRangePicker
            value={filters.dateRange}
            onChange={(range) => setFilters({ ...filters, dateRange: range })}
          />

          {/* Home Selector */}
          <HomesPicker
            value={filters.home}
            onChange={(homeId) => setFilters({ ...filters, home: homeId })}
          />

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search events, users, records..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full h-9 pl-9 pr-8 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters({ ...filters, search: "" })}
                aria-label="Clear search"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Export */}
          <div className="relative">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              disabled={exporting}
              onClick={() => !exporting && setShowExportMenu(v => !v)}
            >
              {exporting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Export
            </Button>

            {showExportMenu && !exporting && (
              <div className="absolute right-0 mt-2 w-40 bg-popover border border-border rounded-lg shadow-lg z-50">
                {EXPORT_FORMATS.map((fmt, i) => (
                  <button
                    key={fmt}
                    onClick={() => handleExport(fmt)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${
                      i === 0 ? "rounded-t-lg" : i === EXPORT_FORMATS.length - 1 ? "rounded-b-lg" : ""
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Filters Button — toggles the Module/Action/Role/Severity row below */}
          <Button
            size="sm"
            variant="outline"
            className={`gap-2 ${showAdvancedFilters ? "border-primary text-primary" : ""}`}
            onClick={onToggleAdvancedFilters}
          >
            <Settings className="w-4 h-4" />
            Advanced Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
