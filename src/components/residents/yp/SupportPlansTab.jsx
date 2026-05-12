/**
 * SupportPlansTab — rebuilt from scratch per spec.
 *
 * DATA SOURCES CONFIRMED:
 * - Section 1 (Placement Details): PlacementDetails entity via secureGateway
 * - Section 2 (Family & Social): FamilySocialPlan entity via secureGateway
 * - Section 3 (Health): Resident entity fields (gp_name, gp_practice, medical_conditions[], allergies[], health_notes)
 *   NOTE: No separate MedicationRecord table used by HealthTab — medications are not tracked there.
 *   NOTE: No EHCP field exists on the Resident entity — omitted from Section 4.
 * - Section 4 (Education): Resident entity fields (education_provider, education_course, education_status, education_notes)
 * - Section 5 (Behaviour): BehaviourSupportPlan entity via secureGateway
 * - Section 6 (Therapeutic): TherapeuticPlan entity via secureGateway
 * - Section 7 (Risk): RiskAssessment entity via secureGateway (9 categories, overall_rating field)
 * - Section 8 (ILS): ILSPlan + ILSPlanSection entities via base44.entities (NOT secureGateway — kept as-is)
 * - Section 9 (Activities): Resident entity leisure_* fields
 * - Section 10 (YP Views): YPViewsRecord entity via secureGateway
 * - Section 11 (Attachments): ResidentDocument entity via secureGateway
 * - Section 12 (Signoff): SupportPlanSignoff entity via secureGateway
 */

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronUp, Pencil, Archive, Download, CheckCircle2, AlertTriangle, Lock } from "lucide-react";

// Section form components (already exist)
import S1PlacementDetails, { getPlacementDetailsStatus } from "../support-plan/S1PlacementDetails";
import S2FamilySocialPlan, { getFamilySocialStatus } from "../support-plan/S2FamilySocialPlan";
import S3HealthSummary, { getHealthStatus } from "../support-plan/S3HealthSummary";
import S4EducationSummary, { getEducationStatus } from "../support-plan/S4EducationSummary";
import BehaviourManagementForm, { getBehaviourStatus } from "../behaviour/BehaviourManagementForm";
import TherapeuticPlanForm, { getTherapeuticStatus } from "../behaviour/TherapeuticPlanForm";
import S7RiskSummary, { getRiskStatus } from "../support-plan/S7RiskSummary";
import S8ILSSummary, { getILSStatus } from "../support-plan/S8ILSSummary";
import S9ActivitiesSummary, { getActivitiesStatus } from "../support-plan/S9ActivitiesSummary";
import S10YPViews, { getYPViewsStatus } from "../support-plan/S10YPViews";
import S11Attachments, { getAttachmentsStatus } from "../support-plan/S11Attachments";
import S12Signoff from "../support-plan/S12Signoff";

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  completed:    { label: "Completed",       cls: "bg-green-100 text-green-700 border-green-200" },
  in_progress:  { label: "In Progress",     cls: "bg-amber-100 text-amber-700 border-amber-200" },
  not_started:  { label: "Not Started",     cls: "bg-gray-100 text-gray-500 border-gray-200" },
  locked:       { label: "Cannot Start Yet",cls: "bg-slate-200 text-slate-500 border-slate-300" },
  signed_off:   { label: "Signed Off",      cls: "bg-green-600 text-white border-green-600" },
  draft:        { label: "Draft",           cls: "bg-blue-100 text-blue-700 border-blue-200" },
  active:       { label: "Active",          cls: "bg-teal-100 text-teal-700 border-teal-200" },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.not_started;
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ─── Accordion section ────────────────────────────────────────────────────────
function AccordionSection({ title, status, children, expandAll, locked = false }) {
  const [open, setOpen] = useState(false);
  const isOpen = expandAll || open;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => !locked && setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-5 py-3.5 bg-muted/20 hover:bg-muted/40 transition-colors text-left ${locked ? "cursor-default" : ""}`}
      >
        <span className="text-sm font-semibold">{title}</span>
        <div className="flex items-center gap-2.5">
          <StatusBadge status={locked ? "locked" : status} />
          {locked
            ? <Lock className="w-4 h-4 text-muted-foreground" />
            : isOpen
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </button>
      {isOpen && !locked && (
        <div className="px-5 py-4 border-t border-border">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Plan header ──────────────────────────────────────────────────────────────
function PlanHeader({ resident, signoff, planStatus, onDownloadPDF }) {
  const date = signoff?.signed_off_at
    ? new Date(signoff.signed_off_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
      <div>
        <h2 className="text-lg font-bold">Support Plan</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {resident.display_name}
          {date ? ` · Signed off ${date}` : " · No plan signed off yet"}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <StatusBadge status={planStatus} />
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={onDownloadPDF}>
          <Download className="w-3.5 h-3.5 text-green-600" /> Download PDF
        </Button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SupportPlansTab({
  residents,
  homes,
  staff,
  isAdminOrTL,
  myStaffProfile,
  defaultResidentId,
  onNavigateToTab,
}) {
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const [selectedResidentId, setSelectedResidentId] = useState(defaultResidentId || residents[0]?.id || null);
  const [expandAll, setExpandAll] = useState(false);

  const resident = residents.find(r => r.id === selectedResidentId) || residents[0] || null;
  const home = resident ? homeMap[resident.home_id] : null;
  const readOnly = !isAdminOrTL;

  // ── All data queries ────────────────────────────────────────────────────────
  const { data: placementRecs = [] } = useQuery({
    queryKey: ["placement-details", resident?.id],
    queryFn: () => secureGateway.filter("PlacementDetails", { resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const { data: familyRecs = [] } = useQuery({
    queryKey: ["family-social-plan", resident?.id],
    queryFn: () => secureGateway.filter("FamilySocialPlan", { resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const { data: behaviourRecs = [] } = useQuery({
    queryKey: ["behaviour-plan", resident?.id],
    queryFn: () => secureGateway.filter("BehaviourSupportPlan", { resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const { data: therapeuticRecs = [] } = useQuery({
    queryKey: ["therapeutic-plan", resident?.id],
    queryFn: () => secureGateway.filter("TherapeuticPlan", { resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const { data: riskRecs = [] } = useQuery({
    queryKey: ["risk-assessments-sp", resident?.id],
    queryFn: () => secureGateway.filter("RiskAssessment", { resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const { data: ilsPlans = [] } = useQuery({
    queryKey: ["ils-plans-sp", resident?.id],
    queryFn: () => base44.entities.ILSPlan.filter({ org_id: ORG_ID, resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const { data: ypViews = [] } = useQuery({
    queryKey: ["yp-views", resident?.id],
    queryFn: () => secureGateway.filter("YPViewsRecord", { resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const { data: docs = [] } = useQuery({
    queryKey: ["resident-docs", resident?.id],
    queryFn: () => secureGateway.filter("ResidentDocument", { resident_id: resident.id }),
    enabled: !!resident?.id,
  });
  const { data: signoffs = [] } = useQuery({
    queryKey: ["support-plan-signoff", resident?.id],
    queryFn: () => secureGateway.filter("SupportPlanSignoff", { resident_id: resident.id }, "-signed_off_at", 10),
    enabled: !!resident?.id,
  });

  // ── Compute section statuses ────────────────────────────────────────────────
  const sectionStatuses = useMemo(() => ({
    "1. Placement Details":          getPlacementDetailsStatus(placementRecs[0] || null),
    "2. Family & Social":            getFamilySocialStatus(familyRecs[0] || null),
    "3. Health":                     getHealthStatus(resident),
    "4. Education":                  getEducationStatus(resident),
    "5. Behaviour Management":       getBehaviourStatus(behaviourRecs[0] || null),
    "6. Therapeutic Plan":           getTherapeuticStatus(therapeuticRecs[0] || null),
    "7. Risk Management":            getRiskStatus(riskRecs),
    "8. Independent Life Skills":    getILSStatus(ilsPlans),
    "9. Activities & Leisure":       getActivitiesStatus(resident),
    "10. YP's Views":                getYPViewsStatus(ypViews[0] || null),
    "11. Attachments":               getAttachmentsStatus(docs),
  }), [placementRecs, familyRecs, behaviourRecs, therapeuticRecs, riskRecs, ilsPlans, ypViews, docs, resident]);

  const latestSignoff = signoffs[0] || null;
  const isSignedOff = !!latestSignoff?.signed_off_at;
  const allComplete = Object.values(sectionStatuses).every(s => s === "completed");

  const effectiveReadOnly = readOnly || isSignedOff;

  const planStatus = isSignedOff ? "signed_off" : allComplete ? "active" : "draft";

  // ── PDF download (print approach) ──────────────────────────────────────────
  const handleDownloadPDF = () => window.print();

  if (!resident) {
    return (
      <div className="mt-6 text-center text-muted-foreground text-sm">No residents found.</div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Resident selector */}
      {residents.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground shrink-0">Young Person:</span>
          <Select value={selectedResidentId || ""} onValueChange={setSelectedResidentId}>
            <SelectTrigger className="w-56 text-sm h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Plan header */}
      <div className="bg-card border border-border rounded-xl px-5 py-4">
        <PlanHeader
          resident={resident}
          signoff={latestSignoff}
          planStatus={planStatus}
          onDownloadPDF={handleDownloadPDF}
        />

        {/* Signed off banner */}
        {isSignedOff && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              Signed off by <strong>{latestSignoff.signed_off_by_name || "—"}</strong> on{" "}
              {new Date(latestSignoff.signed_off_at).toLocaleDateString("en-GB")}. Plan is read-only.
            </span>
          </div>
        )}

        {/* Progress summary */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{Object.values(sectionStatuses).filter(s => s === "completed").length}</strong>
            {" "}/ 11 sections completed
          </span>
          {!allComplete && (
            <span className="flex items-center gap-1 text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              {Object.values(sectionStatuses).filter(s => s === "not_started").length} not started
            </span>
          )}
          {allComplete && !isSignedOff && (
            <span className="text-green-600 font-medium">Ready to sign off ↓</span>
          )}
        </div>
      </div>

      {/* Expand all toggle */}
      <div className="flex justify-end">
        <button
          onClick={() => setExpandAll(v => !v)}
          className="text-xs text-primary hover:underline font-medium"
        >
          {expandAll ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* ── 12 Accordion sections ───────────────────────────────────────────── */}
      <AccordionSection title="1. Placement Details" status={sectionStatuses["1. Placement Details"]} expandAll={expandAll}>
        <S1PlacementDetails
          residentId={resident.id}
          homeId={home?.id}
          staffProfile={myStaffProfile}
          readOnly={effectiveReadOnly}
        />
      </AccordionSection>

      <AccordionSection title="2. Family & Social Relationships" status={sectionStatuses["2. Family & Social"]} expandAll={expandAll}>
        <S2FamilySocialPlan
          residentId={resident.id}
          homeId={home?.id}
          staffProfile={myStaffProfile}
          staff={staff}
          readOnly={effectiveReadOnly}
        />
      </AccordionSection>

      <AccordionSection title="3. Health" status={sectionStatuses["3. Health"]} expandAll={expandAll}>
        <S3HealthSummary resident={resident} onNavigateToTab={onNavigateToTab} />
      </AccordionSection>

      <AccordionSection title="4. Education" status={sectionStatuses["4. Education"]} expandAll={expandAll}>
        <S4EducationSummary resident={resident} onNavigateToTab={onNavigateToTab} />
      </AccordionSection>

      <AccordionSection title="5. Behaviour Management" status={sectionStatuses["5. Behaviour Management"]} expandAll={expandAll}>
        <BehaviourManagementForm
          residentId={resident.id}
          homeId={home?.id}
          staffProfile={myStaffProfile}
          readOnly={effectiveReadOnly}
        />
      </AccordionSection>

      <AccordionSection title="6. Therapeutic Plan" status={sectionStatuses["6. Therapeutic Plan"]} expandAll={expandAll}>
        <TherapeuticPlanForm
          residentId={resident.id}
          homeId={home?.id}
          staffProfile={myStaffProfile}
          readOnly={effectiveReadOnly}
        />
      </AccordionSection>

      <AccordionSection title="7. Risk Management" status={sectionStatuses["7. Risk Management"]} expandAll={expandAll}>
        <S7RiskSummary residentId={resident.id} onNavigateToTab={onNavigateToTab} />
      </AccordionSection>

      <AccordionSection title="8. Independent Life Skills" status={sectionStatuses["8. Independent Life Skills"]} expandAll={expandAll}>
        <S8ILSSummary residentId={resident.id} onNavigateToTab={onNavigateToTab} />
      </AccordionSection>

      <AccordionSection title="9. Activities & Leisure" status={sectionStatuses["9. Activities & Leisure"]} expandAll={expandAll}>
        <S9ActivitiesSummary resident={resident} onNavigateToTab={onNavigateToTab} />
      </AccordionSection>

      <AccordionSection title="10. Young Person's Views & Comments" status={sectionStatuses["10. YP's Views"]} expandAll={expandAll}>
        <S10YPViews
          residentId={resident.id}
          homeId={home?.id}
          staffProfile={myStaffProfile}
          staff={staff}
          readOnly={effectiveReadOnly}
        />
      </AccordionSection>

      <AccordionSection title="11. Attachments" status={sectionStatuses["11. Attachments"]} expandAll={expandAll}>
        <S11Attachments
          residentId={resident.id}
          homeId={home?.id}
          staffProfile={myStaffProfile}
          readOnly={effectiveReadOnly}
        />
      </AccordionSection>

      <AccordionSection
        title="12. Signoffs & Alerts"
        status={isSignedOff ? "completed" : allComplete ? "not_started" : "locked"}
        expandAll={expandAll}
        locked={!allComplete && !isSignedOff}
      >
        <S12Signoff
          residentId={resident.id}
          homeId={home?.id}
          staffProfile={myStaffProfile}
          sectionStatuses={sectionStatuses}
          readOnly={readOnly && !isAdminOrTL}
        />
      </AccordionSection>

      {/* Audit link */}
      <div className="text-right pb-4">
        <button className="text-xs text-muted-foreground hover:underline">
          View Audit Logs
        </button>
      </div>
    </div>
  );
}