import { useState, useEffect } from "react";
import { useOutletContext, Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FileText } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import CICProgressNotes from "@/components/reports/CICProgressNotes";
import VisitReportDetail from "@/components/reports/VisitReportDetail";

const TABS = [
  { key: "visit_reports", label: "Visit Reports" },
  { key: "daily_summary", label: "Daily Summary" },
  { key: "cic_progress", label: "CIC Progress Notes" },
  { key: "kw_sessions", label: "Key Worker Sessions" },
];

function ReportsTable({ reports, isLoading, emptyMsg, staffProfile, autoOpenReportId }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(() =>
    autoOpenReportId ? (reports.find(r => r.id === autoOpenReportId) || null) : null
  );

  // Auto-open when reports load (if report_id param was provided)
  useEffect(() => {
    if (autoOpenReportId && !selectedReport && reports.length > 0) {
      const found = reports.find(r => r.id === autoOpenReportId);
      if (found) setSelectedReport(found);
    }
  }, [reports, autoOpenReportId]);

  const filtered = reports.filter(r => {
    const matchesSearch = r.resident_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.worker_name?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by resident or worker..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-xl" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{emptyMsg}</p>
        </div>
      ) : (
        <>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Resident</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Worker</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Duration</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} onClick={() => setSelectedReport(r)} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium">{r.resident_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.worker_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.date}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{r.duration_minutes ? `${r.duration_minutes} min` : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        r.status === "approved" ? "bg-green-500/10 text-green-500" :
                        r.status === "submitted" ? "bg-blue-500/10 text-blue-500" :
                        r.status === "reviewed" ? "bg-purple-500/10 text-purple-500" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedReport && <VisitReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} staffProfile={staffProfile} />}
        </>
      )}
    </>
  );
}

export default function VisitReports() {
  const { user, staffProfile } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("visit_reports");
  const [autoOpenReportId] = useState(() => searchParams.get("report_id"));

  const { data: allReports = [], isLoading } = useQuery({
    queryKey: ["visit-reports-list"],
    queryFn: () => secureGateway.filter("VisitReport", {}, "-date", 500),
  });

  // Correct filters using !== true to handle undefined/null on old records
  const visitReports = allReports.filter(r => r.is_key_worker_session !== true && r.is_daily_summary !== true);
  const dailySummary = allReports.filter(r => r.is_daily_summary === true);
  const kwSessions = allReports.filter(r => r.is_key_worker_session === true);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Visit Reports / Daily Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">{allReports.length} total reports</p>
        </div>
        <Link to="/visit-reports/new">
          <Button className="gap-2 rounded-xl" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}>
            <Plus className="w-4 h-4" /> New Report
          </Button>
        </Link>
      </div>

      <div className="flex gap-0 border-b border-border mb-6 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-teal-600 text-teal-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.key === "visit_reports" && !isLoading && (
              <span className="ml-1.5 text-xs text-muted-foreground">({visitReports.length})</span>
            )}
            {tab.key === "daily_summary" && !isLoading && (
              <span className="ml-1.5 text-xs text-muted-foreground">({dailySummary.length})</span>
            )}
            {tab.key === "kw_sessions" && !isLoading && (
              <span className="ml-1.5 text-xs text-muted-foreground">({kwSessions.length})</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "visit_reports" && (
        <ReportsTable reports={visitReports} isLoading={isLoading} emptyMsg="No visit reports yet. Create your first visit report." staffProfile={staffProfile} autoOpenReportId={autoOpenReportId} />
      )}
      {activeTab === "daily_summary" && (
        <ReportsTable reports={dailySummary} isLoading={isLoading} emptyMsg="No daily summaries yet. Tick 'Daily Summary' when creating a new report." staffProfile={staffProfile} />
      )}
      {activeTab === "cic_progress" && (
        <CICProgressNotes user={user} />
      )}
      {activeTab === "kw_sessions" && (
        <ReportsTable reports={kwSessions} isLoading={isLoading} emptyMsg="No key worker sessions recorded yet." staffProfile={staffProfile} />
      )}
    </div>
  );
}