import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { MapPin, Plus, Download, Eye, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import AssessmentFormModal from "@/components/compliance-hub/location-assessments/AssessmentFormModal";
import AssessmentViewDrawer from "@/components/compliance-hub/location-assessments/AssessmentViewDrawer";

function SuitabilityBadge({ value }) {
  if (!value) return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Not Assessed</span>;
  const cfg = { suitable: "bg-green-100 text-green-700", suitable_with_conditions: "bg-amber-100 text-amber-700", unsuitable: "bg-red-100 text-red-700" };
  const labels = { suitable: "Suitable", suitable_with_conditions: "With Conditions", unsuitable: "Unsuitable" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg[value] || "bg-muted text-muted-foreground"}`}>{labels[value] || value}</span>;
}

function StatusBadge({ status }) {
  const cfg = { draft: "bg-muted text-muted-foreground", completed: "bg-blue-100 text-blue-700", approved: "bg-green-100 text-green-700", overdue: "bg-red-100 text-red-700" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cfg[status] || "bg-muted"}`}>{status || "—"}</span>;
}

export default function LocationAssessmentSection({ home, staffProfile, homes, staff }) {
  const [showForm, setShowForm] = useState(false);
  const [viewAssessment, setViewAssessment] = useState(null);

  const thisYear = new Date().getFullYear();

  const { data: assessments = [] } = useQuery({
    queryKey: ["la-home-assessments", home?.id],
    queryFn: () => secureGateway.filter("LocationAssessment", { home_id: home.id, is_deleted: false }, "-assessment_date", 20),
    enabled: !!home?.id,
    staleTime: 60 * 1000,
  });

  const { data: allStaff = [] } = useQuery({
    queryKey: ["la-section-staff"],
    queryFn: () => secureGateway.filter("StaffProfile", { status: "active" }),
    enabled: !staff?.length,
    staleTime: 5 * 60 * 1000,
  });

  const staffList = staff?.length ? staff : allStaff;
  const allHomes = homes?.length ? homes : (home ? [home] : []);

  const currentYearApproved = assessments.find(a => a.assessment_year === thisYear && a.status === "approved");
  const latest = assessments[0];
  const nextDue = home?.next_location_assessment_due || currentYearApproved?.next_assessment_due;
  const isOverdue = nextDue && new Date(nextDue) < new Date();
  const isDueSoon = nextDue && !isOverdue && new Date(nextDue) < new Date(Date.now() + 30 * 86400000);

  const canCreate = ["admin", "rsm", "regional_manager", "admin_manager", "team_leader", "team_manager"].includes(staffProfile?.role);
  const hasCurrentAssessment = !!currentYearApproved;

  return (
    <div className="mb-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">Location Assessment <span className="text-xs text-muted-foreground font-normal ml-1">Reg 6(2)(a)</span></h3>
        </div>
        {canCreate && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)} className="gap-1.5 text-xs h-7">
            <Plus className="w-3.5 h-3.5" /> New Assessment
          </Button>
        )}
      </div>

      {/* Status Card */}
      <div className={`border rounded-xl p-4 ${!hasCurrentAssessment ? "bg-red-50 border-red-200" : isOverdue ? "bg-amber-50 border-amber-200" : isDueSoon ? "bg-amber-50/50 border-amber-100" : "bg-green-50/50 border-green-200"}`}>
        {!latest ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">No location assessment on record</p>
              <p className="text-xs text-red-600 mt-0.5">Regulation 6(2)(a) requires an annual written assessment for every premises.</p>
            </div>
            {canCreate && (
              <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5 shrink-0">
                <Plus className="w-3.5 h-3.5" /> Create First Assessment
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <SuitabilityBadge value={latest.overall_suitability} />
                <StatusBadge status={latest.status} />
                {latest.ofsted_registration_assessment && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Ofsted Reg</span>
                )}
                {!hasCurrentAssessment && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">No {thisYear} Assessment</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setViewAssessment(latest)} className="gap-1.5 text-xs h-7">
                  <Eye className="w-3.5 h-3.5" /> View
                </Button>
                {latest.document_url && (
                  <a href={latest.document_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7">
                      <Download className="w-3.5 h-3.5" /> PDF
                    </Button>
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground">Last assessed</p>
                <p className="font-medium mt-0.5">{latest.assessment_date ? format(new Date(latest.assessment_date), "dd MMM yyyy") : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Assessed by</p>
                <p className="font-medium mt-0.5">{latest.assessed_by_name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Next due</p>
                <p className={`font-medium mt-0.5 ${isOverdue ? "text-red-600" : isDueSoon ? "text-amber-600" : ""}`}>
                  {nextDue ? format(new Date(nextDue), "dd MMM yyyy") : "—"}
                  {isOverdue && " ⚠ Overdue"}
                  {isDueSoon && !isOverdue && " ● Due soon"}
                </p>
              </div>
            </div>

            {latest.conditions_attached && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <p className="text-xs font-medium text-amber-700">Conditions: {latest.conditions_attached}</p>
              </div>
            )}

            {/* Previous assessments */}
            {assessments.length > 1 && (
              <div className="border-t border-border/50 pt-2">
                <p className="text-xs text-muted-foreground mb-1.5">Assessment history ({assessments.length} total)</p>
                <div className="space-y-1">
                  {assessments.slice(1, 4).map(a => (
                    <button key={a.id} onClick={() => setViewAssessment(a)}
                      className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-muted/50 text-muted-foreground">
                      <span>{a.assessment_year} · {a.assessment_date ? format(new Date(a.assessment_date), "dd MMM yyyy") : "—"}</span>
                      <div className="flex items-center gap-2">
                        <SuitabilityBadge value={a.overall_suitability} />
                        <StatusBadge status={a.status} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <AssessmentFormModal
          homes={allHomes}
          staff={staffList}
          staffProfile={staffProfile}
          preHomeId={home?.id}
          existingAssessments={assessments}
          onClose={() => setShowForm(false)}
          onSaved={() => setShowForm(false)}
        />
      )}

      {/* View Drawer */}
      {viewAssessment && (
        <AssessmentViewDrawer
          assessment={viewAssessment}
          onClose={() => setViewAssessment(null)}
        />
      )}
    </div>
  );
}