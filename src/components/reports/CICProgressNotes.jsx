import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, FileText, Trash2, Eye, Printer, ArrowLeft, AlertTriangle } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";

// ─── CIC Template Config — change only this object to update the template ───
const CIC_TEMPLATE_CONFIG = {
  version: "v1",
  sections: [
    {
      key: "placement_update",
      title: "Placement Update",
      description: "Overview of the young person's current placement, their relationship with staff and other residents, any placement-related concerns or positive developments, and overall stability of the placement during this period.",
    },
    {
      key: "health_update",
      title: "Health Update",
      description: "Summary of physical and mental health during this period including any GP appointments, medical tests, medication changes, mental health support, dental or optical appointments, and the young person's engagement with their health.",
    },
    {
      key: "ils_update",
      title: "Independent Living Skills (ILS) Update",
      description: "Progress made in independent living skills during this period including cooking, budgeting, hygiene, transport, household management, and any specific skills being developed or supported.",
    },
    {
      key: "education_update",
      title: "Education and Employment Update",
      description: "Summary of education, training, and employment activity during this period including attendance, engagement, any courses or qualifications being pursued, employment status, and support provided.",
    },
    {
      key: "finances_update",
      title: "Finances Update",
      description: "Overview of the young person's financial situation during this period including allowances, budgeting skills, any benefits, savings, debts, and financial independence progress.",
    },
  ],
};

function calculateAge(dob) {
  if (!dob) return "unknown";
  const d = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  if (today < new Date(today.getFullYear(), d.getMonth(), d.getDate())) age--;
  return age;
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function CICReportPreview({ report, reportData, onClose, onSave, onRegenerate, onDiscard, isSaved, saving }) {
  const [discardConfirm, setDiscardConfirm] = useState(false);

  const handlePrint = () => window.print();

  const data = isSaved ? report.report_data : reportData;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between print:hidden">
        <button onClick={onClose || (() => {})} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to list
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handlePrint}>
            <Printer className="w-4 h-4" /> Print
          </Button>
          {!isSaved && onSave && (
            <Button size="sm" className="gap-2 rounded-xl" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }} onClick={onSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Report
            </Button>
          )}
          {!isSaved && onRegenerate && (
            <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={onRegenerate}>
              Regenerate
            </Button>
          )}
          {!isSaved && onDiscard && !discardConfirm && (
            <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-red-500" onClick={() => setDiscardConfirm(true)}>
              Discard
            </Button>
          )}
          {!isSaved && discardConfirm && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-1 text-sm">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="text-red-700">Discard this report?</span>
              <button onClick={onDiscard} className="text-red-600 font-semibold hover:underline">Yes</button>
              <button onClick={() => setDiscardConfirm(false)} className="text-muted-foreground hover:underline">Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-card rounded-xl border border-border p-8 space-y-8 print:border-0 print:shadow-none print:p-0">
        <div className="border-b border-border pb-6">
          <h1 className="text-xl font-bold">{isSaved ? report.title : "CIC Progress Notes"}</h1>
          <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">Young Person:</span> <span className="font-medium">{isSaved ? report.resident_name : "—"}</span></p>
            <p><span className="text-muted-foreground">Period:</span> {isSaved ? `${fmtDate(report.date_from)} to ${fmtDate(report.date_to)}` : "—"}</p>
            <p><span className="text-muted-foreground">Generated by:</span> {isSaved ? report.generated_by : "—"}</p>
            <p><span className="text-muted-foreground">Saved on:</span> {isSaved ? fmtDate(report.created_date) : "—"}</p>
          </div>
        </div>

        {CIC_TEMPLATE_CONFIG.sections.map((section, i) => (
          <div key={section.key} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold">{i + 1}</span>
              <h2 className="font-semibold text-base">{section.title}</h2>
            </div>
            <div className="pl-10 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {data?.[section.key] || <span className="text-muted-foreground italic">No content generated</span>}
            </div>
            {i < CIC_TEMPLATE_CONFIG.sections.length - 1 && <hr className="border-border" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CICProgressNotes({ user }) {
  const qc = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState("generate");

  // Generate tab state
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Previously generated tab
  const [viewReport, setViewReport] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [residentFilter, setResidentFilter] = useState("all");

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-for-cic"],
    queryFn: () => base44.entities.Resident.filter({ org_id: ORG_ID, status: "active" }),
  });

  const { data: cicReports = [] } = useQuery({
    queryKey: ["cic-reports"],
    queryFn: () => base44.entities.CICReport.filter({ org_id: ORG_ID }, "-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CICReport.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cic-reports"] });
      setDeleteConfirmId(null);
      toast.success("Report deleted");
    },
  });

  const selectedResident = residents.find(r => r.id === selectedResidentId);
  const isAdminOrTL = user?.role === "admin" || user?.role === "team_leader";

  const handleGenerate = async () => {
    if (!selectedResidentId) { toast.error("Please select a young person"); return; }
    if (!dateFrom || !dateTo) { toast.error("Please select a date range"); return; }
    if (dateTo < dateFrom) { toast.error("End date must be after start date"); return; }

    setGenerating(true);
    setGeneratedData(null);

    try {
      // Gather data
      const [allLogs, allVisits, allKPIs] = await Promise.all([
        base44.entities.DailyLog.filter({ org_id: ORG_ID, resident_id: selectedResidentId }, "-date", 500),
        base44.entities.VisitReport.filter({ org_id: ORG_ID, resident_id: selectedResidentId }, "-date", 500),
        base44.entities.KPIRecord.filter({ org_id: ORG_ID, resident_id: selectedResidentId }, "-date", 500),
      ]);

      const dailyLogs = allLogs.filter(l => l.date >= dateFrom && l.date <= dateTo);
      const visitReports = allVisits.filter(r => r.date >= dateFrom && r.date <= dateTo);
      const kpiRecords = allKPIs.filter(k => k.date >= dateFrom && k.date <= dateTo);

      const logSummary = dailyLogs.map(l => {
        const contentText = typeof l.content === "string" ? l.content : (l.content?.notes || JSON.stringify(l.content || ""));
        return `[${l.date} ${l.shift || ""}]: ${contentText}`;
      }).join("\n") || "No daily logs recorded in this period";

      const visitSummary = visitReports.map(r =>
        `[${r.date}] ${r.is_key_worker_session ? "Key Worker Session" : "Visit"}: ${r.action_text || ""} | Outcome: ${r.outcome_text || ""}`
      ).join("\n") || "No visit reports in this period";

      const appointmentSummary = kpiRecords
        .filter(k => k.appointment_type)
        .map(k => `[${k.date}] ${k.appointment_type}: ${k.appointment_details_notes || "no notes"}`)
        .join("\n") || "No health appointments recorded in this period";

      const healthKPIs = kpiRecords.map(k =>
        `[${k.date}] Health adherence: ${k.health_adherence || "not recorded"}, Risk: ${k.risk_level || "not recorded"}`
      ).join("\n") || "No health KPI data in this period";

      const educationKPIs = kpiRecords
        .filter(k => k.college_status)
        .map(k => `[${k.date}] Education: ${k.college_status}`)
        .join("\n") || "No education data in this period";

      const ilsKPIs = kpiRecords
        .filter(k => k.life_skills && k.life_skills.length > 0)
        .map(k => `[${k.date}] Life skills: ${Array.isArray(k.life_skills) ? k.life_skills.join(", ") : k.life_skills}`)
        .join("\n") || "No ILS data in this period";

      const prompt = `You are a professional social care worker writing a formal Children in Care (CIC) Progress Notes report for a review period.

Write in third person. Be specific and professional. Reference actual events and observations from the data provided.
Do not invent information that is not in the data. If data for a section is limited, state what is known and note that further monitoring is ongoing.
Each section should be a minimum of 3 paragraphs.

YOUNG PERSON DETAILS:
- Identifier: ${selectedResident?.initials || selectedResident?.display_name}
- Age: ${calculateAge(selectedResident?.dob)} years old
- Report period: ${dateFrom} to ${dateTo}

DAILY LOG ENTRIES (${dailyLogs.length} logs in this period):
${logSummary}

VISIT REPORTS AND KEY WORKER SESSIONS (${visitReports.length} in this period):
${visitSummary}

HEALTH APPOINTMENTS:
${appointmentSummary}

HEALTH KPI DATA:
${healthKPIs}

EDUCATION KPI DATA:
${educationKPIs}

INDEPENDENT LIVING SKILLS DATA:
${ilsKPIs}

Generate a CIC Progress Notes report with exactly these five sections:

1. PLACEMENT UPDATE: ${CIC_TEMPLATE_CONFIG.sections[0].description}
2. HEALTH UPDATE: ${CIC_TEMPLATE_CONFIG.sections[1].description}
3. ILS UPDATE: ${CIC_TEMPLATE_CONFIG.sections[2].description}
4. EDUCATION UPDATE: ${CIC_TEMPLATE_CONFIG.sections[3].description}
5. FINANCES UPDATE: ${CIC_TEMPLATE_CONFIG.sections[4].description}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            placement_update: { type: "string" },
            health_update: { type: "string" },
            ils_update: { type: "string" },
            education_update: { type: "string" },
            finances_update: { type: "string" },
          },
          required: ["placement_update", "health_update", "ils_update", "education_update", "finances_update"],
        },
      });

      setGeneratedData(result);
      setShowPreview(true);
    } catch (err) {
      toast.error("Failed to generate CIC report. Please try again.");
    }
    setGenerating(false);
  };

  const getMonday = (dateStr) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(new Date(dateStr).setDate(diff)).toISOString().split("T")[0];
  };
  const getMonth = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const title = reportTitle.trim() ||
        `${selectedResident?.initials || selectedResident?.display_name} CIC Progress Notes ${dateFrom} to ${dateTo}`;

      const savedReport = await base44.entities.CICReport.create({
        org_id: ORG_ID,
        resident_id: selectedResidentId,
        resident_name: selectedResident?.display_name || "",
        home_id: selectedResident?.home_id || "",
        date_from: dateFrom,
        date_to: dateTo,
        title,
        generated_by: user?.email || "",
        status: "saved",
        template_version: CIC_TEMPLATE_CONFIG.version,
        report_data: generatedData,
      });

      // Wire SWPerformanceKPI (non-blocking)
      const today = new Date().toISOString().split("T")[0];
      base44.entities.StaffProfile.filter({ org_id: ORG_ID, email: user?.email })
        .then(profiles => {
          const staffProfile = profiles[0];
          return base44.entities.SWPerformanceKPI.create({
            org_id: ORG_ID,
            worker_id: user?.email || "",
            worker_name: user?.full_name || user?.email || "",
            employee_id: staffProfile?.employee_id || "",
            home_id: selectedResident?.home_id || "",
            resident_id: selectedResidentId,
            date: today,
            week_start: getMonday(today),
            month: getMonth(today),
            activity_type: "cic_report",
            source_entity: "CICReport",
            source_id: savedReport.id,
            hours_with_yp: 0,
            kw_session_count: 0,
            cic_report_count: 1,
            support_plan_count: 0,
            gp_appointment_count: 0,
          });
        }).catch(() => {});

      qc.invalidateQueries({ queryKey: ["cic-reports"] });
      toast.success("CIC report saved successfully");
      setShowPreview(false);
      setGeneratedData(null);
      setActiveSubTab("previously_generated");
    } catch (err) {
      toast.error("Failed to save report");
    }
    setSaving(false);
  };

  const handleDiscard = () => {
    setGeneratedData(null);
    setShowPreview(false);
    setSelectedResidentId("");
    setDateFrom("");
    setDateTo("");
    setReportTitle("");
  };

  const handleRegenerate = () => {
    setGeneratedData(null);
    setShowPreview(false);
    // Keep resident + dates filled
  };

  const filteredReports = cicReports.filter(r => {
    const matchSearch = !searchFilter || r.resident_name?.toLowerCase().includes(searchFilter.toLowerCase()) || r.title?.toLowerCase().includes(searchFilter.toLowerCase());
    const matchResident = residentFilter === "all" || r.resident_id === residentFilter;
    return matchSearch && matchResident;
  });

  // ─── PREVIOUSLY GENERATED VIEW ───
  if (activeSubTab === "previously_generated" && viewReport) {
    return (
      <CICReportPreview
        report={viewReport}
        isSaved={true}
        onClose={() => setViewReport(null)}
      />
    );
  }

  // ─── GENERATE PREVIEW ───
  if (activeSubTab === "generate" && showPreview && generatedData) {
    const previewReport = {
      title: reportTitle.trim() || `${selectedResident?.initials || selectedResident?.display_name} CIC Progress Notes ${dateFrom} to ${dateTo}`,
      resident_name: selectedResident?.display_name,
      date_from: dateFrom,
      date_to: dateTo,
      generated_by: user?.email,
      created_date: new Date().toISOString(),
      report_data: generatedData,
    };
    return (
      <CICReportPreview
        report={previewReport}
        reportData={generatedData}
        isSaved={false}
        onClose={handleRegenerate}
        onSave={handleSave}
        onRegenerate={handleRegenerate}
        onDiscard={handleDiscard}
        saving={saving}
      />
    );
  }

  return (
    <div className="space-y-0">
      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-border mb-6">
        {[
          { key: "generate", label: "Generate CIC Report" },
          { key: "previously_generated", label: `Previously Generated (${cicReports.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveSubTab(t.key)}
            className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeSubTab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ─── GENERATE TAB ─── */}
      {activeSubTab === "generate" && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-6">
          <div>
            <h2 className="font-semibold text-base mb-1">Generate CIC Progress Report</h2>
            <p className="text-sm text-muted-foreground">Select a young person and date range. The report will be generated from all daily logs, visit reports, and KPI records in the selected period.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm mb-1.5 block">Young Person <span className="text-red-500">*</span></Label>
              <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                <SelectTrigger className="rounded-lg"><SelectValue placeholder="Select young person" /></SelectTrigger>
                <SelectContent className="max-h-60 overflow-y-auto">
                  {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Report Title <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                value={reportTitle}
                onChange={e => setReportTitle(e.target.value)}
                placeholder="Auto-generated if left blank"
                className="rounded-lg"
              />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Report Period Start <span className="text-red-500">*</span></Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="rounded-lg" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">Report Period End <span className="text-red-500">*</span></Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="rounded-lg" />
              {dateTo && dateFrom && dateTo < dateFrom && (
                <p className="text-xs text-red-500 mt-1">End date must be after start date</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating || !selectedResidentId || !dateFrom || !dateTo || (dateTo < dateFrom)}
            className="gap-2 rounded-xl px-6"
            style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {generating ? "Generating Report..." : "Generate CIC Report"}
          </Button>
          {generating && (
            <p className="text-xs text-muted-foreground">Reading all logs, visits and KPI data — this may take up to 30 seconds...</p>
          )}
        </div>
      )}

      {/* ─── PREVIOUSLY GENERATED TAB ─── */}
      {activeSubTab === "previously_generated" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search by resident or title..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="rounded-xl max-w-sm"
            />
            <Select value={residentFilter} onValueChange={setResidentFilter}>
              <SelectTrigger className="w-48 rounded-xl"><SelectValue placeholder="All residents" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All residents</SelectItem>
                {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredReports.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No CIC reports saved yet. Generate and save a report from the Generate tab.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Title</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Young Person</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Period</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Generated By</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Saved On</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setViewReport(r)}>
                      <td className="px-4 py-3 text-sm font-medium max-w-xs truncate">{r.title}</td>
                      <td className="px-4 py-3 text-sm">{r.resident_name || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{fmtDate(r.date_from)} – {fmtDate(r.date_to)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.generated_by || "—"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{fmtDate(r.created_date)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 h-7 px-2 text-xs"
                            onClick={() => setViewReport(r)}
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </Button>
                          {isAdminOrTL && (
                            deleteConfirmId === r.id ? (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-red-600">Delete?</span>
                                <button onClick={() => deleteMutation.mutate(r.id)} className="text-red-600 font-semibold hover:underline">Yes</button>
                                <button onClick={() => setDeleteConfirmId(null)} className="text-muted-foreground hover:underline">No</button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1 h-7 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setDeleteConfirmId(r.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}