import { useState } from "react";
import { useOutletContext as useOC } from "react-router-dom";
function useOutletContext() { try { return useOC(); } catch { return {}; } }
import { useQuery } from "@tanstack/react-query";
import { useModuleActions } from "@/lib/PermissionContext";
import { Search, Plus, FileText, AlertTriangle, Clock, Shield, FileCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { secureGateway } from "@/lib/secureGateway";
import CICProgressNotes from "@/components/reports/CICProgressNotes";
import VisitReportDetail from "@/components/reports/VisitReportDetail";
import KeyWorkSessionDetail from "@/components/residents/keywork/KeyWorkSessionDetail";
import KeyWorkKPIs from "@/components/residents/keywork/KeyWorkKPIs";
import NewReportView from "@/components/reports/NewReportView";

const TABS = [
  { key: "visit_reports", label: "Visit Reports" },
  { key: "daily_summary", label: "Daily Summary" },
  { key: "cic_progress", label: "CIC Progress Notes" },
  { key: "kw_sessions", label: "Key Worker Sessions" },
];

function ReportsTable({ reports, isLoading, emptyMsg }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState(null);

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
          <Input placeholder="Search by resident or worker..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${r.status === "approved" ? "bg-green-500/10 text-green-500" :
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
          {selectedReport && <VisitReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />}
        </>
      )}
    </>
  );
}

const TOPIC_LABELS = {
  placement_progress: "Placement Progress", emotional_wellbeing: "Emotional Wellbeing",
  education: "Education", health: "Health", family_contact: "Family Contact",
  behaviour: "Behaviour", safety: "Safety", independence: "Independence",
  finance: "Finance", immigration_asylum: "Immigration/Asylum",
  move_on_planning: "Move-On Planning", other: "Other",
};

function KWSessionsTable({ sessions, isLoading, staffProfile, staff }) {
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState(null);

  const filtered = sessions.filter(s => {
    const q = search.toLowerCase();
    return !q || s.resident_name?.toLowerCase().includes(q) || s.worker_name?.toLowerCase().includes(q);
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by resident or worker..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No key worker sessions recorded yet.</p>
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
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Topic</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Flags</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} onClick={() => setSelectedSession(s)} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3 text-sm font-medium">{s.resident_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.worker_name || "—"}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{s.date}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{TOPIC_LABELS[s.kw_session_topic] || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {s.kw_concern_identified && (
                          <span title="Concern identified" className="flex items-center gap-0.5 text-xs text-red-600 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                          </span>
                        )}
                        {s.kw_follow_up_required && (
                          <span title="Follow-up required" className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                          </span>
                        )}
                        {s.kw_support_plan_update === "yes" && (
                          <span title="Support plan update required" className="flex items-center gap-0.5 text-xs text-orange-600 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                            <FileCheck className="w-3 h-3" />
                          </span>
                        )}
                        {s.kw_risk_assessment_update === "yes" && (
                          <span title="Risk assessment update required" className="flex items-center gap-0.5 text-xs text-purple-600 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${s.status === "approved" ? "bg-green-500/10 text-green-500" :
                          s.status === "submitted" ? "bg-blue-500/10 text-blue-500" :
                            s.status === "reviewed" ? "bg-purple-500/10 text-purple-500" :
                              "bg-muted text-muted-foreground"
                        }`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedSession && (
            <KeyWorkSessionDetail
              report={selectedSession}
              onClose={() => setSelectedSession(null)}
              staffProfile={staffProfile}
              staff={staff}
            />
          )}
        </>
      )}
    </>
  );
}

export default function VisitReportsTab({ staffProfile: staffProfileProp, staff: staffProp, residents: residentsProp = [], user: userProp } = {}) {
  const ctx = useOutletContext() || {};
  const user = userProp || ctx.user;
  const staffProfile = staffProfileProp || ctx.staffProfile;
  const staff = staffProp || ctx.staff || [];
  const [activeTab, setActiveTab] = useState("visit_reports");
  const [showNewReport, setShowNewReport] = useState(false);
  const { canAdd } = useModuleActions("residents");

  const { data: allReports = [], isLoading } = useQuery({
    queryKey: ["visit-reports-list"],
    queryFn: () => secureGateway.filter("VisitReport", {}, "-date", 500),
  });

  const visitReports = allReports.filter(r => r.is_key_worker_session !== true && r.is_daily_summary !== true);
  const dailySummary = allReports.filter(r => r.is_daily_summary === true);
  const kwSessions = allReports.filter(r => r.is_key_worker_session === true);

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Visit Reports </h2>
          <p className="text-xs text-muted-foreground">{allReports.length} total reports</p>
        </div>
        {canAdd && activeTab === "visit_reports" && (
          <Button onClick={() => setShowNewReport(true)} className="gap-2" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}>
            <Plus className="w-4 h-4" /> New Report
          </Button>
        )}
      </div>

      {showNewReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-6 px-4" onClick={() => setShowNewReport(false)}>
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-4xl p-6" onClick={e => e.stopPropagation()}>
            <NewReportView user={user} staffProfile={staffProfile} onBack={() => setShowNewReport(false)} />
          </div>
        </div>
      )}

      <div className="flex gap-0 border-b border-border overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
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
        <ReportsTable reports={visitReports} isLoading={isLoading} emptyMsg="No visit reports yet. Create your first visit report." />
      )}
      {activeTab === "daily_summary" && (
        <ReportsTable reports={dailySummary} isLoading={isLoading} emptyMsg="No daily summaries yet. Tick 'Daily Summary' when creating a new report." />
      )}
      {activeTab === "cic_progress" && (
        <CICProgressNotes user={user} />
      )}
      {activeTab === "kw_sessions" && (
        <>
          <KeyWorkKPIs sessions={allReports} />
          <KWSessionsTable sessions={kwSessions} isLoading={isLoading} staffProfile={staffProfile} staff={staff || []} />
        </>
      )}
    </div>
  );
}
