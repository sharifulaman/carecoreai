import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { Plus, Download, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import AssessmentFormModal from "./location-assessments/AssessmentFormModal";
import AssessmentViewDrawer from "./location-assessments/AssessmentViewDrawer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SuitabilityBadge({ value }) {
  if (!value) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Not Assessed</span>;
  const cfg = {
    suitable: "bg-green-100 text-green-700",
    suitable_with_conditions: "bg-amber-100 text-amber-700",
    unsuitable: "bg-red-100 text-red-700",
  };
  const labels = { suitable: "Suitable", suitable_with_conditions: "With Conditions", unsuitable: "Unsuitable" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg[value] || "bg-muted text-muted-foreground"}`}>{labels[value] || value}</span>;
}

function StatusBadge({ status }) {
  const cfg = {
    draft: "bg-muted text-muted-foreground",
    completed: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cfg[status] || "bg-muted"}`}>{status || "—"}</span>;
}

function DueDateCell({ date }) {
  if (!date) return <span className="text-xs text-muted-foreground">—</span>;
  const d = new Date(date);
  const now = new Date();
  const isOverdue = d < now;
  const isSoon = !isOverdue && d < new Date(now.getTime() + 30 * 86400000);
  return (
    <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : isSoon ? "text-amber-600" : "text-foreground"}`}>
      {isOverdue ? "⚠ " : isSoon ? "● " : ""}{format(d, "dd MMM yyyy")}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function Reg6LocationAssessments({ staffProfile }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("homes");
  const [showForm, setShowForm] = useState(false);
  const [preHomeId, setPreHomeId] = useState(null);
  const [viewAssessment, setViewAssessment] = useState(null);
  const [filterHome, setFilterHome] = useState("");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterSuitability, setFilterSuitability] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const thisYear = new Date().getFullYear();

  const { data: homes = [] } = useQuery({
    queryKey: ["la-homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["la-assessments"],
    queryFn: () => secureGateway.filter("LocationAssessment", { org_id: ORG_ID, is_deleted: false }, "-assessment_date", 500),
    staleTime: 60 * 1000,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["la-staff"],
    queryFn: () => secureGateway.filter("StaffProfile", { status: "active" }),
    staleTime: 5 * 60 * 1000,
  });

  // Derive per-home status
  const homeStatusMap = useMemo(() => {
    const map = {};
    for (const home of homes) {
      const homeAssessments = assessments.filter(a => a.home_id === home.id);
      const thisYearApproved = homeAssessments.find(a => a.assessment_year === thisYear && a.status === "approved");
      const latestAny = homeAssessments.sort((a, b) => (b.assessment_date || "").localeCompare(a.assessment_date || ""))[0];
      const nextDue = home.next_location_assessment_due || thisYearApproved?.next_assessment_due;
      const isOverdue = nextDue && new Date(nextDue) < new Date();
      map[home.id] = { thisYearApproved, latestAny, nextDue, isOverdue };
    }
    return map;
  }, [homes, assessments, thisYear]);

  // KPIs
  const kpis = useMemo(() => {
    const assessedThisYear = homes.filter(h => homeStatusMap[h.id]?.thisYearApproved).length;
    const overdueCount = homes.filter(h => !homeStatusMap[h.id]?.thisYearApproved).length;
    const dueSoon = homes.filter(h => {
      const nd = homeStatusMap[h.id]?.nextDue;
      return nd && new Date(nd) > new Date() && new Date(nd) < new Date(Date.now() + 30 * 86400000);
    }).length;
    const unsuitableCount = assessments.filter(a => a.status === "approved" && ["unsuitable", "suitable_with_conditions"].includes(a.overall_suitability)).length;
    const earliestNext = homes
      .map(h => homeStatusMap[h.id]?.nextDue)
      .filter(Boolean)
      .sort()[0];
    return { assessedThisYear, overdueCount, dueSoon, unsuitableCount, earliestNext };
  }, [homes, assessments, homeStatusMap]);

  const canCreate = ["admin", "rsm", "regional_manager", "admin_manager", "team_leader", "team_manager"].includes(staffProfile?.role);
  const canApprove = ["admin", "rsm", "regional_manager", "admin_manager"].includes(staffProfile?.role);

  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      if (filterHome && a.home_id !== filterHome) return false;
      if (filterYear && String(a.assessment_year) !== filterYear) return false;
      if (filterSuitability && a.overall_suitability !== filterSuitability) return false;
      if (filterStatus && a.status !== filterStatus) return false;
      return true;
    });
  }, [assessments, filterHome, filterYear, filterSuitability, filterStatus]);

  const exportOverview = () => {
    const rows = homes.map(h => {
      const { thisYearApproved, latestAny, nextDue } = homeStatusMap[h.id] || {};
      return `<tr>
        <td>${h.name}</td>
        <td>${h.type || "—"}</td>
        <td>${latestAny?.assessment_date ? format(new Date(latestAny.assessment_date), "dd MMM yyyy") : "Never"}</td>
        <td>${latestAny?.overall_suitability?.replace(/_/g, " ") || "Not assessed"}</td>
        <td>${nextDue ? format(new Date(nextDue), "dd MMM yyyy") : "—"}</td>
        <td>${latestAny?.assessed_by_name || "—"}</td>
        <td>${thisYearApproved ? "Approved" : latestAny?.status || "Not assessed"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Location Assessments Overview</title>
    <style>body{font-family:Arial;padding:30px;color:#333}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:20px}th{background:#f0f0f0;padding:8px;text-align:left;font-size:12px;border-bottom:2px solid #999}td{padding:7px 8px;font-size:12px;border-bottom:1px solid #ddd}footer{margin-top:30px;font-size:11px;color:#666;border-top:1px solid #999;padding-top:10px}</style>
    </head><body>
    <h1>Location Assessments — All Homes Overview</h1>
    <p>Generated ${format(new Date(), "dd MMMM yyyy HH:mm")} · Calendar year ${thisYear}</p>
    <table><thead><tr><th>Home</th><th>Type</th><th>Last Assessment</th><th>Suitability</th><th>Next Due</th><th>Assessed By</th><th>Status</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <footer>Homes assessed ${thisYear}: ${kpis.assessedThisYear} / ${homes.length} · Regulation 6(2)(a) Supported Accommodation (England) Regulations 2023</footer>
    </body></html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const years = [...new Set(assessments.map(a => String(a.assessment_year)))].sort().reverse();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Reg 6 — Accommodation Standard: Location Assessments</h2>
          <p className="text-sm text-muted-foreground mt-0.5 max-w-2xl">
            A written location assessment must be completed for each premises at least once in each calendar year, consulting relevant persons. Required for Ofsted registration (Schedule 1, para 13(d)).
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={exportOverview} className="gap-2"><Download className="w-4 h-4" /> Export</Button>
          {canCreate && <Button onClick={() => { setPreHomeId(null); setShowForm(true); }} className="gap-2"><Plus className="w-4 h-4" /> New Assessment</Button>}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-green-200 rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Assessed This Year</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{kpis.assessedThisYear}<span className="text-sm font-normal text-muted-foreground ml-1">/ {homes.length}</span></p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${kpis.overdueCount > 0 ? "border-red-200" : "border-border"}`}>
          <p className="text-xs text-muted-foreground">Assessments Overdue</p>
          <p className={`text-2xl font-bold mt-1 ${kpis.overdueCount > 0 ? "text-red-600" : ""}`}>{kpis.overdueCount}</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${kpis.dueSoon > 0 ? "border-amber-200" : "border-border"}`}>
          <p className="text-xs text-muted-foreground">Due Within 30 Days</p>
          <p className={`text-2xl font-bold mt-1 ${kpis.dueSoon > 0 ? "text-amber-600" : ""}`}>{kpis.dueSoon}</p>
        </div>
        <div className={`bg-card border rounded-xl p-4 ${kpis.unsuitableCount > 0 ? "border-red-200" : "border-border"}`}>
          <p className="text-xs text-muted-foreground">Unsuitable Findings</p>
          <p className={`text-2xl font-bold mt-1 ${kpis.unsuitableCount > 0 ? "text-red-600" : ""}`}>{kpis.unsuitableCount}</p>
        </div>
      </div>

      {/* Status Banner */}
      {kpis.overdueCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700">
            ⚠ {kpis.overdueCount} {kpis.overdueCount === 1 ? "home has" : "homes have"} not had a location assessment this calendar year.
            Ofsted requires annual assessments for every premises under Regulation 6(2)(a).
          </p>
        </div>
      )}
      {kpis.overdueCount === 0 && homes.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-medium text-green-700">
            All {homes.length} premises have a current location assessment for {thisYear}.
            {kpis.earliestNext && ` Next due: ${format(new Date(kpis.earliestNext), "dd MMM yyyy")}.`}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[["homes", "All Homes Overview"], ["history", "Assessment History"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1 — All Homes Overview */}
      {activeTab === "homes" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  {["Home Name", "Type", "Address", "Last Assessment", "Overall Suitability", "Next Due", "Assessed By", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {homes.map(home => {
                  const { thisYearApproved, latestAny, nextDue } = homeStatusMap[home.id] || {};
                  const displayAssessment = thisYearApproved || latestAny;
                  const draftForHome = assessments.find(a => a.home_id === home.id && a.status === "draft");
                  return (
                    <tr key={home.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 text-xs font-semibold">{home.name}</td>
                      <td className="px-4 py-3 text-xs capitalize">{home.type?.replace(/_/g, " ") || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[160px] truncate">{home.address || "—"}</td>
                      <td className="px-4 py-3 text-xs">{displayAssessment?.assessment_date ? format(new Date(displayAssessment.assessment_date), "dd MMM yyyy") : <span className="text-red-500 font-medium">Never</span>}</td>
                      <td className="px-4 py-3"><SuitabilityBadge value={displayAssessment?.overall_suitability} /></td>
                      <td className="px-4 py-3"><DueDateCell date={nextDue} /></td>
                      <td className="px-4 py-3 text-xs">{displayAssessment?.assessed_by_name || "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={thisYearApproved ? "approved" : latestAny?.status || "overdue"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {displayAssessment && (
                            <button onClick={() => setViewAssessment(displayAssessment)}
                              className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium flex items-center gap-1">
                              <Eye className="w-3 h-3" /> View
                            </button>
                          )}
                          {draftForHome && canCreate && (
                            <button onClick={() => setViewAssessment(draftForHome)}
                              className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 font-medium flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Draft
                            </button>
                          )}
                          {canCreate && !thisYearApproved && (
                            <button onClick={() => { setPreHomeId(home.id); setShowForm(true); }}
                              className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 font-medium whitespace-nowrap">
                              + New
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {homes.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground text-sm">No active homes found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2 — Assessment History */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filterHome} onChange={e => setFilterHome(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="">All homes</option>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="">All years</option>
              {[thisYear, thisYear - 1, thisYear - 2].map(y => <option key={y} value={String(y)}>{y}</option>)}
              {years.filter(y => !["", String(thisYear), String(thisYear - 1), String(thisYear - 2)].includes(y)).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterSuitability} onChange={e => setFilterSuitability(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="">All suitability</option>
              <option value="suitable">Suitable</option>
              <option value="suitable_with_conditions">With Conditions</option>
              <option value="unsuitable">Unsuitable</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="">All statuses</option>
              <option value="approved">Approved</option>
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    {["Home Name", "Year", "Date", "Overall Suitability", "Assessed By", "Approved By", "Approved Date", "Flags", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssessments.sort((a, b) => (b.assessment_date || "").localeCompare(a.assessment_date || "")).map(a => (
                    <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                      <td className="px-4 py-3 text-xs font-medium">{a.home_name}</td>
                      <td className="px-4 py-3 text-xs">{a.assessment_year}</td>
                      <td className="px-4 py-3 text-xs">{a.assessment_date ? format(new Date(a.assessment_date), "dd MMM yyyy") : "—"}</td>
                      <td className="px-4 py-3"><SuitabilityBadge value={a.overall_suitability} /></td>
                      <td className="px-4 py-3 text-xs">{a.assessed_by_name || "—"}</td>
                      <td className="px-4 py-3 text-xs">{a.approved_by_name || "—"}</td>
                      <td className="px-4 py-3 text-xs">{a.approved_at ? format(new Date(a.approved_at), "dd MMM yyyy") : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {a.ofsted_registration_assessment && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">Ofsted Reg</span>}
                          {a.shared_with_ofsted && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">Shared</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => setViewAssessment(a)}
                            className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 font-medium">View</button>
                          {a.document_url && (
                            <a href={a.document_url} target="_blank" rel="noreferrer"
                              className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium">PDF</a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredAssessments.length === 0 && (
                    <tr><td colSpan={10} className="px-4 py-10 text-center text-muted-foreground text-sm">No assessments found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showForm && (
        <AssessmentFormModal
          homes={homes}
          staff={staff}
          staffProfile={staffProfile}
          preHomeId={preHomeId}
          existingAssessments={assessments}
          onClose={() => { setShowForm(false); setPreHomeId(null); }}
          onSaved={() => { setShowForm(false); setPreHomeId(null); }}
        />
      )}
      {viewAssessment && (
        <AssessmentViewDrawer
          assessment={viewAssessment}
          onClose={() => setViewAssessment(null)}
        />
      )}
    </div>
  );
}