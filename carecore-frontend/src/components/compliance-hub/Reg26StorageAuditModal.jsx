import { useState, useEffect, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { format, addMonths, addYears } from "date-fns";
import { Check, X, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ORG_ID } from "@/lib/roleConfig";

const ITEMS = [
  { num: 1, key: "item1", label: "Statement of Purpose (Reg 9)" },
  { num: 2, key: "item2", label: "Written Guide for Children (Children's Guide)" },
  { num: 3, key: "item3", label: "Safeguarding Policy (Reg 20)" },
  { num: 4, key: "item4", label: "Missing Child Policy (Reg 21)" },
  { num: 5, key: "item5", label: "Behaviour Management Policy (Reg 22)" },
  { num: 6, key: "item6", label: "Records of Restraint Use (Reg 22(2))" },
  { num: 7, key: "item7", label: "Children's Case Records (Reg 24)" },
  { num: 8, key: "item8", label: "Children's Register and Staff Register (Reg 25)" },
  { num: 9, key: "item9", label: "Complaints Procedure (Reg 31)" },
  { num: 10, key: "item10", label: "Complaints Records (Reg 31)" },
  { num: 11, key: "item11", label: "Quality of Support Review Reports (Reg 32)" },
  { num: 12, key: "item12", label: "Location Assessment Records (Reg 6(2)(a))" },
];

export default function Reg26StorageAuditModal({ isOpen, onClose, staffProfile }) {
  const [auditDate, setAuditDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [conductedById, setConductedById] = useState(staffProfile?.id || "");
  const [loadingItems, setLoadingItems] = useState(new Set(ITEMS.map(i => i.key)));
  const [itemData, setItemData] = useState({});
  const [auditNotes, setAuditNotes] = useState("");
  const [itemNotes, setItemNotes] = useState({});
  const [declaration, setDeclaration] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch staff for dropdown
  const { data: staffList = [] } = useQuery({
    queryKey: ["reg26-staff"],
    queryFn: () => secureGateway.filter("StaffProfile", { status: "active", role: "rsm" || "admin_manager" }),
    enabled: isOpen,
  });

  // Run auto-checks when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const runChecks = async () => {
      const results = {};

      try {
        // Item 1 — Statement of Purpose
        const orgProfile = await secureGateway.filter("OrganisationProfile", { org_id: ORG_ID }).then(r => r[0]);
        const item1Exists = !!orgProfile?.aims_and_objectives;
        const item1UpToDate = orgProfile?.last_updated_date && new Date(orgProfile.last_updated_date) > new Date(Date.now() - 365 * 86400000);
        results.item1 = { exists: item1Exists, accessible: true, up_to_date: item1UpToDate, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item1")));

        // Item 2 — Welcome Pack
        const welcomePacks = await secureGateway.filter("WelcomePack", { status: "active" });
        const item2Exists = welcomePacks.length > 0;
        const item2UpToDate = welcomePacks.length > 0 && welcomePacks[0].last_updated_at && new Date(welcomePacks[0].last_updated_at) > new Date(Date.now() - 365 * 86400000);
        results.item2 = { exists: item2Exists, accessible: true, up_to_date: item2UpToDate, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item2")));

        // Items 3, 4, 5 — Policies
        const policies = await secureGateway.filter("ChildProtectionPolicy", { org_id: ORG_ID, is_deleted: false });
        const safeguarding = policies.find(p => p.policy_type === "safeguarding" && p.status === "active");
        const missing = policies.find(p => p.policy_type === "missing_child" && p.status === "active");
        const behaviour = policies.find(p => p.policy_type === "behaviour_management" && p.status === "active");

        results.item3 = { exists: !!safeguarding, accessible: true, up_to_date: !safeguarding?.review_date || new Date(safeguarding.review_date) >= new Date(), moduleActive: true };
        results.item4 = { exists: !!missing, accessible: true, up_to_date: !missing?.review_date || new Date(missing.review_date) >= new Date(), moduleActive: true };
        results.item5 = { exists: !!behaviour, accessible: true, up_to_date: !behaviour?.review_date || new Date(behaviour.review_date) >= new Date(), moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => !["item3", "item4", "item5"].includes(i))));

        // Item 6 — Restraint Records
        const restraints = await secureGateway.filter("RestraintRecord", { org_id: ORG_ID, is_deleted: false });
        const allComplete = restraints.every(r => r.overall_status !== "overdue");
        results.item6 = { exists: true, accessible: true, record_count: restraints.length, all_complete: allComplete, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item6")));

        // Item 7 — Case Records
        const checks = await secureGateway.filter("RecordCompletenessCheck", { org_id: ORG_ID });
        const avgCompleteness = checks.length > 0 ? checks.reduce((sum, c) => sum + c.completeness_score, 0) / checks.length : 0;
        const belowThreshold = checks.filter(c => ["incomplete", "critical"].includes(c.completeness_band)).length;
        results.item7 = { exists: true, accessible: true, average_completeness: avgCompleteness, below_threshold_count: belowThreshold, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item7")));

        // Item 8 — Registers
        const residents = await secureGateway.filter("Resident", { is_deleted: false });
        const staff = await secureGateway.filter("StaffProfile", { status: "active" });
        const childRegComplete = residents.filter(r => r.status === "active").every(r => r.legal_placement_basis && r.placing_local_authority);
        const staffRegComplete = staff.every(s => s.dob && s.address);
        results.item8 = { exists: true, accessible: true, children_register_complete: childRegComplete, staff_register_complete: staffRegComplete, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item8")));

        // Item 9 — Complaints Procedure
        const item9Exists = !!orgProfile?.complaints_procedure;
        const item9UpToDate = orgProfile?.last_updated_date && new Date(orgProfile.last_updated_date) > new Date(Date.now() - 365 * 86400000);
        results.item9 = { exists: item9Exists, accessible: true, up_to_date: item9UpToDate, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item9")));

        // Item 10 — Complaints Records
        const complaints = await secureGateway.filter("Complaint", { org_id: ORG_ID });
        const openCount = complaints.filter(c => c.status !== "closed").length;
        results.item10 = { exists: true, accessible: true, record_count: complaints.length, open_count: openCount, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item10")));

        // Item 11 — Reg 32 Reports
        const reports = await secureGateway.filter("Reg32Report", { org_id: ORG_ID, status: ["submitted", "complete"] });
        const lastReport = reports.sort((a, b) => (b.completed_date || "").localeCompare(a.completed_date || ""))[0];
        const item11Exists = !!lastReport;
        const nextDue = lastReport ? addMonths(new Date(lastReport.completed_date), 6) : null;
        const item11Overdue = nextDue && nextDue < new Date();
        results.item11 = { exists: item11Exists, accessible: true, last_review_date: lastReport?.completed_date, next_review_due: nextDue ? format(nextDue, "yyyy-MM-dd") : null, overdue: item11Overdue, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item11")));

        // Item 12 — Location Assessments
        const homes = await secureGateway.filter("Home", { status: "active" });
        const assessments = await secureGateway.filter("LocationAssessment", { is_deleted: false });
        const thisYear = new Date().getFullYear();
        const assessedHomes = assessments.filter(a => a.assessment_year === thisYear && a.status === "approved").map(a => a.home_id);
        const allAssessed = homes.every(h => assessedHomes.includes(h.id));
        const homesMissingCount = homes.length - assessedHomes.length;
        results.item12 = { exists: assessments.length > 0, accessible: true, all_homes_assessed_this_year: allAssessed, homes_missing_assessment: homesMissingCount, moduleActive: true };
        setLoadingItems(prev => new Set(Array.from(prev).filter(i => i !== "item12")));

        setItemData(results);
      } catch (error) {
        console.error("Auto-check error:", error);
        setLoadingItems(new Set());
      }
    };

    runChecks();
  }, [isOpen]);

  const createAuditMutation = useMutation({
    mutationFn: async (payload) => {
      setSubmitting(true);
      const result = await base44.entities.StorageAudit.create(payload);
      setSubmitting(false);
      return result;
    },
  });

  const handleSubmit = async () => {
    const itemsCompliant = ITEMS.filter(item => {
      const data = itemData[item.key];
      if (!data) return false;
      if (item.num <= 5 || item.num === 9) return data.exists && data.accessible && data.up_to_date;
      if (item.num === 6) return data.exists && data.accessible && data.all_complete;
      if (item.num === 7) return data.exists && data.accessible && data.below_threshold_count === 0;
      if (item.num === 8) return data.exists && data.accessible && data.children_register_complete && data.staff_register_complete;
      if (item.num === 10) return data.exists && data.accessible;
      if (item.num === 11) return data.exists && data.accessible && !data.overdue;
      if (item.num === 12) return data.exists && data.accessible && data.all_homes_assessed_this_year;
      return false;
    }).length;

    const itemsWithIssues = 12 - itemsCompliant;

    const payload = {
      org_id: ORG_ID,
      audit_date: auditDate,
      audit_year: parseInt(auditDate.split("-")[0]),
      conducted_by_id: conductedById,
      conducted_by_name: staffList.find(s => s.id === conductedById)?.full_name || "",
      status: itemsWithIssues === 0 ? "completed" : "draft",
      audit_summary_notes: auditNotes,
      auditor_declaration: declaration,
      next_audit_due: format(addYears(new Date(auditDate), 1), "yyyy-MM-dd"),
      total_items: 12,
      items_fully_compliant: itemsCompliant,
      items_with_issues: itemsWithIssues,
      overall_compliance_percentage: (itemsCompliant / 12) * 100,
      ...Object.entries(itemData).reduce((acc, [key, val]) => {
        acc[`${key}_exists`] = val.exists;
        acc[`${key}_accessible`] = val.accessible;
        if (val.up_to_date !== undefined) acc[`${key}_up_to_date`] = val.up_to_date;
        if (val.record_count !== undefined) acc[`${key}_record_count`] = val.record_count;
        if (val.all_complete !== undefined) acc[`${key}_all_complete`] = val.all_complete;
        if (val.average_completeness !== undefined) acc[`${key}_average_completeness`] = val.average_completeness;
        if (val.below_threshold_count !== undefined) acc[`${key}_below_threshold_count`] = val.below_threshold_count;
        if (val.children_register_complete !== undefined) acc[`${key}_children_register_complete`] = val.children_register_complete;
        if (val.staff_register_complete !== undefined) acc[`${key}_staff_register_complete`] = val.staff_register_complete;
        if (val.open_count !== undefined) acc[`${key}_open_count`] = val.open_count;
        if (val.last_review_date !== undefined) acc[`${key}_last_review_date`] = val.last_review_date;
        if (val.next_review_due !== undefined) acc[`${key}_next_review_due`] = val.next_review_due;
        if (val.overdue !== undefined) acc[`${key}_overdue`] = val.overdue;
        if (val.homes_missing_assessment !== undefined) acc[`${key}_homes_missing_assessment`] = val.homes_missing_assessment;
        acc[`${key}_notes`] = itemNotes[key] || "";
        return acc;
      }, {}),
    };

    await createAuditMutation.mutateAsync(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-bold">Reg 26 Storage Audit — {new Date(auditDate).getFullYear()}</h1>
          <p className="text-sm text-muted-foreground mt-1">All specified records must be stored in an accessible manner and may be kept in electronic form.</p>
        </div>

        <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/10">
          <div>
            <label className="text-sm font-medium">Conducted by</label>
            <select value={conductedById} onChange={(e) => setConductedById(e.target.value)} className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm bg-white">
              <option value="">Select staff member</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Audit date</label>
            <input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-3">
          {ITEMS.map(item => {
            const data = itemData[item.key];
            const isLoading = loadingItems.has(item.key);
            const isCompliant = data && !isLoading && ((item.num <= 5 || item.num === 9) ? (data.exists && data.accessible && data.up_to_date) : (item.num === 6 ? (data.exists && data.all_complete) : (item.num === 7 ? (data.below_threshold_count === 0) : (item.num === 8 ? (data.children_register_complete && data.staff_register_complete) : (item.num === 10 ? true : (item.num === 11 ? (!data.overdue) : (item.num === 12 ? (data.all_homes_assessed_this_year) : false)))))));

            return (
              <div key={item.key} className={`border-2 rounded-lg p-4 ${isLoading ? "border-muted bg-muted/10" : isCompliant ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
                <div className="flex items-start gap-3">
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 mt-1 animate-spin text-muted-foreground" />
                  ) : isCompliant ? (
                    <Check className="w-5 h-5 mt-1 text-green-600" />
                  ) : (
                    <X className="w-5 h-5 mt-1 text-red-600" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{item.num}. {item.label}</h3>
                    {!isLoading && data && (
                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {item.num <= 5 || item.num === 9 ? (
                          <>
                            <p>{data.exists ? "✓ Exists" : "✗ Does not exist"}</p>
                            <p>{data.up_to_date ? "✓ Up to date" : "✗ Not up to date"}</p>
                          </>
                        ) : item.num === 6 ? (
                          <>
                            <p>Records: {data.record_count}</p>
                            <p>{data.all_complete ? "✓ All complete" : "✗ Some overdue"}</p>
                          </>
                        ) : item.num === 7 ? (
                          <>
                            <p>Avg completeness: {data.average_completeness.toFixed(1)}%</p>
                            <p>{data.below_threshold_count === 0 ? "✓ All good" : `✗ ${data.below_threshold_count} below threshold`}</p>
                          </>
                        ) : item.num === 8 ? (
                          <>
                            <p>{data.children_register_complete ? "✓ Children register complete" : "✗ Children register incomplete"}</p>
                            <p>{data.staff_register_complete ? "✓ Staff register complete" : "✗ Staff register incomplete"}</p>
                          </>
                        ) : item.num === 10 ? (
                          <>
                            <p>Complaints: {data.record_count} total, {data.open_count} open</p>
                          </>
                        ) : item.num === 11 ? (
                          <>
                            <p>Last review: {data.last_review_date ? format(new Date(data.last_review_date), "d MMM yyyy") : "Never"}</p>
                            <p>Next due: {data.next_review_due ? format(new Date(data.next_review_due), "d MMM yyyy") : "—"}</p>
                            <p>{data.overdue ? "✗ Overdue" : "✓ On time"}</p>
                          </>
                        ) : item.num === 12 ? (
                          <>
                            <p>{data.all_homes_assessed_this_year ? "✓ All homes assessed this year" : `✗ ${data.homes_missing_assessment} homes missing assessment`}</p>
                          </>
                        ) : null}
                      </div>
                    )}
                    <textarea placeholder="Add notes..." value={itemNotes[item.key] || ""} onChange={(e) => setItemNotes(prev => ({ ...prev, [item.key]: e.target.value }))} className="w-full mt-3 border border-border rounded-lg px-2 py-1 text-xs" rows={2} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/10">
          <div>
            <label className="text-sm font-medium">Audit summary notes</label>
            <textarea value={auditNotes} onChange={(e) => setAuditNotes(e.target.value)} className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Overall narrative from the audit..." />
          </div>
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={declaration} onChange={(e) => setDeclaration(e.target.checked)} className="mt-1" />
            <span className="text-xs">I confirm that I have reviewed all 12 items required by Regulation 26 of the Supported Accommodation (England) Regulations 2023 and that to the best of my knowledge all records are stored in an accessible manner and can be produced on demand.</span>
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!declaration || submitting} onClick={handleSubmit} className="gap-1.5">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Submit Audit
          </Button>
        </div>
      </div>
    </div>
  );
}