import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format, addYears } from "date-fns";
import { AlertCircle, ChevronDown, CheckCircle2, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ORG_ID } from "@/lib/roleConfig";

const SCHEDULE_2_SECTIONS = [
  { label: "Personal Details", checks: ["check_full_name", "check_dob_and_sex", "check_religion", "check_ethnicity_and_language", "check_address_before_admission", "check_address_on_discharge", "check_money_and_valuables", "check_statutory_provision"] },
  { label: "Contact Details", checks: ["check_accommodating_authority_contact", "check_parents_details", "check_social_worker_details", "check_school_or_college", "check_employer_details"] },
  { label: "Care, Protection and Safety", checks: ["check_missing_from_home_records", "check_restraint_records", "check_contact_arrangements"] },
  { label: "Plans and Reports", checks: ["check_sen_statement_or_ehcp", "check_school_reports", "check_relevant_plans", "check_plan_review_dates"] },
  { label: "Health", checks: ["check_gp_details", "check_accident_illness_records", "check_immunisation_allergy_medical", "check_health_examination_details", "check_medication_details", "check_dietary_health_needs"] },
];

const CHECK_LABELS = {
  check_full_name: "Full name",
  check_dob_and_sex: "Date of birth and sex",
  check_religion: "Religion",
  check_ethnicity_and_language: "Ethnicity and language",
  check_address_before_admission: "Address before admission",
  check_address_on_discharge: "Address on discharge",
  check_money_and_valuables: "Money and valuables",
  check_statutory_provision: "Statutory provision",
  check_accommodating_authority_contact: "Accommodating authority contact",
  check_parents_details: "Parents/carers details",
  check_social_worker_details: "Social worker details",
  check_school_or_college: "School/college details",
  check_employer_details: "Employer details",
  check_missing_from_home_records: "Missing from home records",
  check_restraint_records: "Restraint records",
  check_contact_arrangements: "Contact arrangements",
  check_sen_statement_or_ehcp: "SEN statement/EHCP",
  check_school_reports: "School reports",
  check_relevant_plans: "Relevant plans",
  check_plan_review_dates: "Plan review dates",
  check_gp_details: "GP details",
  check_accident_illness_records: "Accident/illness records",
  check_immunisation_allergy_medical: "Immunisation/allergies/medical",
  check_health_examination_details: "Health examination details",
  check_medication_details: "Medication details",
  check_dietary_health_needs: "Dietary/health needs",
};

export default function Reg24_25CaseRecords({ staffProfile }) {
  const queryClient = useQueryClient();
  const [filterBand, setFilterBand] = useState("all");
  const [filterHome, setFilterHome] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [expandedResidentId, setExpandedResidentId] = useState(null);

  // Fetch checks
  const { data: allChecks = [] } = useQuery({
    queryKey: ["reg24-checks"],
    queryFn: () => base44.entities.RecordCompletenessCheck.filter({ org_id: ORG_ID }, "-last_checked_at", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch homes for filter
  const { data: homes = [] } = useQuery({
    queryKey: ["reg24-homes"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch retention config
  const { data: retentionConfig } = useQuery({
    queryKey: ["reg24-retention"],
    queryFn: () => base44.entities.RecordRetentionConfig.filter({ org_id: ORG_ID }).then(r => r[0]),
    staleTime: 10 * 60 * 1000,
  });

  // Stats
  const stats = useMemo(() => {
    const complete = allChecks.filter(c => c.completeness_band === "complete").length;
    const good = allChecks.filter(c => c.completeness_band === "good").length;
    const needsAttention = allChecks.filter(c => c.completeness_band === "needs_attention").length;
    const incomplete = allChecks.filter(c => c.completeness_band === "incomplete").length;
    const critical = allChecks.filter(c => c.completeness_band === "critical").length;
    return { complete, good, needsAttention, incomplete, critical, total: allChecks.length };
  }, [allChecks]);

  // Filter checks
  const filteredChecks = useMemo(() => {
    return allChecks.filter(c => {
      if (filterBand !== "all" && c.completeness_band !== filterBand) return false;
      if (filterHome !== "all" && c.home_id !== filterHome) return false;
      if (filterStatus !== "all" && c.placement_status !== filterStatus) return false;
      return true;
    });
  }, [allChecks, filterBand, filterHome, filterStatus]);

  const exportReport = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Case Record Completeness Report</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
    h1 { font-size: 24px; margin-bottom: 10px; }
    .meta { font-size: 12px; color: #666; margin-bottom: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #f0f0f0; padding: 10px; text-align: left; border-bottom: 2px solid #999; font-weight: bold; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    tr:last-child td { border-bottom: none; }
    .critical { background-color: #ffcccc; color: #cc0000; font-weight: bold; }
    .incomplete { background-color: #ffe6e6; color: #cc0000; }
    .needs-attention { background-color: #fff3cd; color: #856404; }
    .good { background-color: #d1ecf1; color: #0c5460; }
    .complete { background-color: #d4edda; color: #155724; }
    footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #999; font-size: 11px; text-align: center; color: #666; }
  </style>
</head>
<body>

<h1>Case Record Completeness Report</h1>
<div class="meta">
  <p>Generated: ${format(new Date(), "dd MMMM yyyy HH:mm")}</p>
  <p>Total Residents: ${stats.total}</p>
  <p>Overall Completeness: ${stats.total > 0 ? ((allChecks.reduce((sum, c) => sum + c.completeness_score, 0) / stats.total).toFixed(1)) : 0}%</p>
</div>

<table>
  <thead>
    <tr>
      <th>Resident Name</th>
      <th>Home</th>
      <th>Completeness</th>
      <th>Band</th>
      <th>Missing Items</th>
      <th>Retention Expiry</th>
    </tr>
  </thead>
  <tbody>
    ${allChecks.map(c => `
    <tr class="${c.completeness_band}">
      <td>${c.resident_name || "Unknown"}</td>
      <td>${c.home_name || "—"}</td>
      <td>${c.completeness_score.toFixed(1)}%</td>
      <td>${c.completeness_band.replace(/_/g, " ")}</td>
      <td>${(c.missing_items || []).length} items</td>
      <td>${c.retention_expiry_date ? format(new Date(c.retention_expiry_date), "yyyy") : "—"}</td>
    </tr>
    `).join("")}
  </tbody>
</table>

<footer>
Generated in accordance with Regulation 24 of the Supported Accommodation (England) Regulations 2023
</footer>

</body>
</html>`;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Regulation 24 & 25 — Children's Case Records and Other Records</h2>
        <p className="text-sm text-muted-foreground mt-1">Case records must be kept for 75 years from the child's date of birth. Every child's case record must contain the information listed in Schedule 2 of the Regulations.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard label="Complete" value={stats.complete} color="bg-green-100 text-green-700" />
        <StatCard label="Good" value={stats.good} color="bg-blue-100 text-blue-700" />
        <StatCard label="Needs Attention" value={stats.needsAttention} color="bg-amber-100 text-amber-700" />
        <StatCard label="Incomplete" value={stats.incomplete} color="bg-red-100 text-red-700" />
        <StatCard label="Critical" value={stats.critical} color="bg-red-900 text-red-100" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="completeness" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="completeness">Case Record Completeness</TabsTrigger>
          <TabsTrigger value="retention">Retention Timeline</TabsTrigger>
          <TabsTrigger value="registers">Schedule 3 Registers</TabsTrigger>
        </TabsList>

        {/* Tab 1 — Completeness */}
        <TabsContent value="completeness" className="space-y-4 mt-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select value={filterBand} onChange={(e) => setFilterBand(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="all">All Bands</option>
              <option value="complete">Complete</option>
              <option value="good">Good</option>
              <option value="needs_attention">Needs Attention</option>
              <option value="incomplete">Incomplete</option>
              <option value="critical">Critical</option>
            </select>
            <select value={filterHome} onChange={(e) => setFilterHome(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="all">All Homes</option>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-border rounded-lg px-3 py-2 text-sm bg-card">
              <option value="active">Active</option>
              <option value="discharged">Discharged</option>
              <option value="all">All</option>
            </select>
            <Button onClick={exportReport} size="sm" variant="outline" className="gap-1.5 ml-auto">
              <Download className="w-4 h-4" /> Export for Ofsted
            </Button>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-3 font-semibold text-xs">Resident</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Home</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Completeness</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Missing</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Retention Expiry</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredChecks.map(check => (
                  <tr key={check.id} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 font-medium">{check.resident_name || "Unknown"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{check.home_name || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                        check.placement_status === "active" ? "bg-green-100 text-green-700" :
                        check.placement_status === "discharged" ? "bg-slate-100 text-slate-700" :
                        "bg-muted text-muted-foreground"
                      }`}>{check.placement_status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${
                            check.completeness_score >= 90 ? "bg-green-500" :
                            check.completeness_score >= 75 ? "bg-blue-500" :
                            check.completeness_score >= 50 ? "bg-amber-500" :
                            "bg-red-500"
                          }`} style={{ width: `${check.completeness_score}%` }} />
                        </div>
                        <span className="text-xs font-semibold">{check.completeness_score.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{(check.missing_items || []).length} items</td>
                    <td className="px-4 py-3 text-xs font-mono">{check.retention_expiry_date ? format(new Date(check.retention_expiry_date), "yyyy") : "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      <Button variant="ghost" size="sm" onClick={() => setExpandedResidentId(expandedResidentId === check.id ? null : check.id)}>
                        {expandedResidentId === check.id ? "Hide" : "View Detail"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded Detail */}
          {expandedResidentId && filteredChecks.find(c => c.id === expandedResidentId) && (
            <Reg24_25DetailPanel check={filteredChecks.find(c => c.id === expandedResidentId)} />
          )}
        </TabsContent>

        {/* Tab 2 — Retention */}
        <TabsContent value="retention" className="space-y-4 mt-4">
          <Reg24_25RetentionTab retentionConfig={retentionConfig} checks={allChecks} />
        </TabsContent>

        {/* Tab 3 — Registers */}
        <TabsContent value="registers" className="space-y-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
            <p className="font-semibold">Schedule 3 Registers</p>
            <p className="mt-1 text-xs">Coming soon — Children's Register and Staff Register will be auto-populated from live data.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className={`${color} rounded-lg p-4 text-center`}>
      <p className="text-xs opacity-75 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function Reg24_25DetailPanel({ check }) {
  return (
    <div className="bg-muted/20 rounded-lg p-6 space-y-6">
      <h3 className="font-semibold">Schedule 2 Completeness Detail</h3>
      {SCHEDULE_2_SECTIONS.map(section => (
        <div key={section.label}>
          <h4 className="font-medium text-sm mb-3">{section.label}</h4>
          <div className="space-y-2">
            {section.checks.map(checkKey => (
              <div key={checkKey} className="flex items-center gap-2 text-sm">
                {check[checkKey] ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <X className="w-4 h-4 text-red-600" />
                )}
                <span>{CHECK_LABELS[checkKey] || checkKey}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Reg24_25RetentionTab({ retentionConfig, checks }) {
  return (
    <div className="space-y-6">
      {retentionConfig && (
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-semibold">Record Retention Configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Child case records</span>
              <span className="font-mono">{retentionConfig.child_case_records_years} years (minimum: 75)</span>
            </div>
            <div className="flex justify-between">
              <span>Child deceased before 18</span>
              <span className="font-mono">{retentionConfig.child_deceased_before_18_years} years from death (minimum: 15)</span>
            </div>
            <div className="flex justify-between">
              <span>Other records</span>
              <span className="font-mono">{retentionConfig.other_records_years} years (minimum: 15)</span>
            </div>
            {retentionConfig.last_reviewed_date && (
              <div className="text-xs text-muted-foreground mt-4 pt-4 border-t">
                Last reviewed: {format(new Date(retentionConfig.last_reviewed_date), "d MMM yyyy")} by {retentionConfig.last_reviewed_by_name}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              <th className="text-left px-4 py-3 font-semibold text-xs">Resident</th>
              <th className="text-left px-4 py-3 font-semibold text-xs">DOB</th>
              <th className="text-left px-4 py-3 font-semibold text-xs">Retention Basis</th>
              <th className="text-left px-4 py-3 font-semibold text-xs">Expiry Date</th>
              <th className="text-left px-4 py-3 font-semibold text-xs">Years Remaining</th>
            </tr>
          </thead>
          <tbody>
            {checks
              .sort((a, b) => new Date(a.retention_expiry_date) - new Date(b.retention_expiry_date))
              .map(check => (
                <tr key={check.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3 font-medium">{check.resident_name}</td>
                  <td className="px-4 py-3 text-xs">{format(new Date(check.resident_dob), "d MMM yyyy")}</td>
                  <td className="px-4 py-3 text-xs">{check.death_before_18 ? "15yr from death" : "75yr from DOB"}</td>
                  <td className="px-4 py-3 text-xs font-mono">{format(new Date(check.retention_expiry_date), "d MMM yyyy")}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{check.years_remaining} years</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}