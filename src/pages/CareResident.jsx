import { useState } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "care-plan", label: "Care Plan" },
  { key: "medication", label: "Medication & MAR" },
  { key: "health", label: "Health & Observations" },
  { key: "personal-care", label: "Personal Care" },
  { key: "capacity", label: "Capacity & Legal" },
  { key: "safeguarding", label: "Safeguarding" },
];

export default function CareResident() {
  const { resident_id } = useParams();
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  const isAdmin = user?.role === "admin";
  const isTeamLeader = user?.role === "team_leader";

  const { data: resident, isLoading: residentLoading } = useQuery({
    queryKey: ["resident-care", resident_id],
    queryFn: () => secureGateway.get("Resident", resident_id),
  });

  const { data: careProfile } = useQuery({
    queryKey: ["care-profile", resident_id],
    queryFn: () => secureGateway.filter("CareProfile", { resident_id }).then(res => res[0]),
    enabled: !!resident_id,
  });

  const { data: carePlan } = useQuery({
    queryKey: ["active-care-plan", resident_id],
    queryFn: () => secureGateway.filter("CarePlan", { resident_id, status: "active" }).then(res => res[0]),
    enabled: !!resident_id,
  });

  const { data: carePlanSections = [] } = useQuery({
    queryKey: ["care-plan-sections", resident_id],
    queryFn: () => secureGateway.filter("CarePlanSection", { resident_id }),
    enabled: !!carePlan,
  });

  const { data: medications = [] } = useQuery({
    queryKey: ["medications", resident_id],
    queryFn: () => secureGateway.filter("MedicationRecord", { resident_id, status: "active" }),
    enabled: !!resident_id,
  });

  const { data: healthObs = [] } = useQuery({
    queryKey: ["health-observations", resident_id],
    queryFn: () => secureGateway.filter("HealthObservation", { resident_id }, "-observation_datetime", 50),
    enabled: !!resident_id,
  });

  const { data: personalCare = [] } = useQuery({
    queryKey: ["personal-care", resident_id],
    queryFn: () => secureGateway.filter("PersonalCareRecord", { resident_id }, "-date", 30),
    enabled: !!resident_id,
  });

  const { data: mcaAssessments = [] } = useQuery({
    queryKey: ["mca-assessments", resident_id],
    queryFn: () => secureGateway.filter("MentalCapacityAssessment", { resident_id }),
    enabled: !!resident_id && (isAdmin || isTeamLeader),
  });

  const { data: safeguardingRecords = [] } = useQuery({
    queryKey: ["safeguarding", resident_id],
    queryFn: () => secureGateway.filter("SafeguardingRecord", { resident_id }),
    enabled: !!resident_id,
  });

  if (residentLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!resident || !careProfile) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Care record not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/care")}>
          Back to Care
        </Button>
      </div>
    );
  }

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-semibold text-sm mb-3">Care Profile</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Care Needs Level</p>
                    <p className="font-medium capitalize">{careProfile.care_needs_level}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Primary Category</p>
                    <p className="font-medium capitalize">{careProfile.primary_care_category?.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Primary Diagnosis</p>
                    <p className="font-medium">{careProfile.primary_diagnosis || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mobility Level</p>
                    <p className="font-medium capitalize">{careProfile.mobility_level}</p>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-semibold text-sm mb-3">Legal Status</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Mental Capacity</p>
                    <p className="font-medium">{careProfile.mental_capacity_assumed ? "Assumed Capable" : "Lacks Capacity"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">DoLS</p>
                    <p className="font-medium">{careProfile.has_dols ? `Active (Expires ${careProfile.dols_expiry})` : "None"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">MHA Status</p>
                    <p className="font-medium capitalize">{careProfile.mha_status?.replace(/_/g, " ")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">DNACPR</p>
                    <p className="font-medium">{careProfile.dnacpr_in_place ? "In Place" : "None"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm mb-3">Key Contacts</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">GP</p>
                  <p className="font-medium">{careProfile.gp_name || "—"}</p>
                  {careProfile.gp_practice && <p className="text-xs text-muted-foreground">{careProfile.gp_practice}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">Next of Kin</p>
                  <p className="font-medium">{careProfile.nok_name || "—"}</p>
                  {careProfile.nok_relationship && <p className="text-xs text-muted-foreground">{careProfile.nok_relationship}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">Care Coordinator</p>
                  <p className="font-medium">{careProfile.care_coordinator_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Community Nurse</p>
                  <p className="font-medium">{careProfile.community_nurse_name || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case "care-plan":
        return (
          <div className="space-y-4">
            {!carePlan ? (
              <div className="bg-muted/30 rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No active care plan</p>
              </div>
            ) : (
              <>
                <div className="bg-card rounded-xl border border-border p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{carePlan.plan_type === "initial" ? "Initial Care Plan" : "Care Plan Review"}</h3>
                      <p className="text-sm text-muted-foreground">Version {carePlan.version}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-muted-foreground">Review Due</p>
                      <p className="font-medium">{carePlan.review_due_date}</p>
                    </div>
                  </div>
                  {carePlan.summary && (
                    <p className="text-sm">{carePlan.summary}</p>
                  )}
                </div>

                <div className="grid gap-4">
                  {carePlanSections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No plan sections documented</p>
                  ) : carePlanSections.sort((a, b) => (a.order || 0) - (b.order || 0)).map(section => (
                    <div key={section.id} className="bg-card rounded-xl border border-border p-5">
                      <h4 className="font-semibold text-sm mb-3 capitalize">{section.domain?.replace(/_/g, " ")}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        {section.needs_summary && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Needs</p>
                            <p>{section.needs_summary}</p>
                          </div>
                        )}
                        {section.goals && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Goals</p>
                            <p>{section.goals}</p>
                          </div>
                        )}
                        {section.interventions && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Interventions</p>
                            <p>{section.interventions}</p>
                          </div>
                        )}
                        {section.resident_preferences && (
                          <div>
                            <p className="text-muted-foreground text-xs mb-1">Resident Preferences</p>
                            <p>{section.resident_preferences}</p>
                          </div>
                        )}
                        {section.risks && (
                          <div className="md:col-span-2">
                            <p className="text-muted-foreground text-xs mb-1">Risks</p>
                            <p>{section.risks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        );

      case "medication":
        return (
          <div className="space-y-4">
            {medications.length === 0 ? (
              <div className="bg-muted/30 rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No active medications</p>
              </div>
            ) : (
              <div className="bg-card rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold">Medication</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Dose & Frequency</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Administration</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold">Type</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medications.map(med => (
                      <tr key={med.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium">{med.medication_name}</p>
                          {med.brand_name && <p className="text-xs text-muted-foreground">{med.brand_name}</p>}
                        </td>
                        <td className="px-4 py-3 text-xs">{med.dose} · {med.frequency}</td>
                        <td className="px-4 py-3 text-xs capitalize">{med.administration_model?.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3">
                          {med.controlled_drug && <span className="inline-block px-2 py-1 rounded-full bg-red-500/10 text-red-600 text-xs font-medium">Controlled</span>}
                          {med.medication_type === "prn" && <span className="inline-block px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">PRN</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {med.stock_quantity && (
                            <span className={med.stock_quantity <= (med.reorder_threshold || 5) ? "text-red-600 font-medium" : ""}>
                              {med.stock_quantity}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );

      case "health":
        return (
          <div className="space-y-4">
            {healthObs.length === 0 ? (
              <div className="bg-muted/30 rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No health observations recorded</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {healthObs.slice(0, 10).map(obs => (
                  <div key={obs.id} className={`bg-card rounded-xl border ${obs.within_normal_range ? "border-border" : "border-red-500/30 bg-red-500/5"} p-4`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm capitalize">{obs.observation_type?.replace(/_/g, " ")}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {obs.value_numeric ? `${obs.value_numeric}${obs.unit ? ` ${obs.unit}` : ""}` : obs.value_text}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${obs.within_normal_range ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
                          {obs.within_normal_range ? "Normal" : "Alert"}
                        </span>
                        <p className="text-xs text-muted-foreground mt-2">{new Date(obs.observation_datetime).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {!obs.within_normal_range && !obs.alert_actioned_by && (
                      <p className="text-xs text-red-600 mt-2">⚠ Unactioned alert</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "personal-care":
        return (
          <div className="space-y-4">
            {personalCare.length === 0 ? (
              <div className="bg-muted/30 rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No personal care records</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {personalCare.slice(0, 10).map(record => (
                  <div key={record.id} className="bg-card rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-semibold text-sm">{record.date} • {record.shift}</p>
                      <span className="inline-block px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 text-xs font-medium">{record.recorded_by ? "Completed" : "Pending"}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      {record.meal_eaten && (
                        <div>
                          <p className="text-muted-foreground">Meals</p>
                          <p className="font-medium capitalize">{record.meal_eaten}</p>
                        </div>
                      )}
                      {record.mood && (
                        <div>
                          <p className="text-muted-foreground">Mood</p>
                          <p className="font-medium capitalize">{record.mood}</p>
                        </div>
                      )}
                      {record.skin_condition && (
                        <div>
                          <p className="text-muted-foreground">Skin</p>
                          <p className={`font-medium capitalize ${["broken", "pressure_area_noted"].includes(record.skin_condition) ? "text-red-600" : ""}`}>
                            {record.skin_condition?.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case "capacity":
        return (
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-5">
              <h3 className="font-semibold text-sm mb-3">Mental Capacity Status</h3>
              <div className="text-sm space-y-2">
                <div>
                  <p className="text-muted-foreground">Current Status</p>
                  <p className="font-medium">{careProfile.mental_capacity_assumed ? "Presumed Capable" : "Assessed as Lacking Capacity"}</p>
                </div>
                {careProfile.has_dols && (
                  <div>
                    <p className="text-muted-foreground">Deprivation of Liberty Safeguards</p>
                    <p className="font-medium">{careProfile.dols_reference}</p>
                    {careProfile.dols_expiry && <p className="text-xs text-muted-foreground">Expires: {careProfile.dols_expiry}</p>}
                  </div>
                )}
              </div>
            </div>

            {(isAdmin || isTeamLeader) && mcaAssessments.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-5">
                <h3 className="font-semibold text-sm mb-3">MCA Assessments</h3>
                <div className="space-y-3">
                  {mcaAssessments.map(mca => (
                    <div key={mca.id} className="border-t border-border/50 pt-3 first:border-0 first:pt-0 text-sm">
                      <p className="font-medium">{mca.decision_in_question}</p>
                      <p className="text-xs text-muted-foreground mt-1">{mca.assessment_date}</p>
                      <p className={`text-xs font-medium mt-1 ${mca.has_capacity ? "text-green-600" : "text-red-600"}`}>
                        {mca.has_capacity ? "Has Capacity" : "Lacks Capacity"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "safeguarding":
        return (
          <div className="space-y-4">
            {!isAdmin && !isTeamLeader ? (
              <div className="bg-card rounded-xl border border-border p-8 text-center">
                <p className="text-muted-foreground">Access restricted</p>
              </div>
            ) : safeguardingRecords.length === 0 ? (
              <div className="bg-muted/30 rounded-xl p-8 text-center">
                <p className="text-muted-foreground">No safeguarding records</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {safeguardingRecords.map(record => (
                  <div key={record.id} className={`bg-card rounded-xl border ${record.immediate_risk === "critical" ? "border-red-700/50 bg-red-500/5" : record.immediate_risk === "high" ? "border-red-500/50 bg-red-500/5" : "border-border"} p-5`}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-sm capitalize">{record.concern_type?.replace(/_/g, " ")}</h4>
                        <p className="text-xs text-muted-foreground">{record.date_of_concern}</p>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${record.status === "open" ? "bg-red-500/10 text-red-600" : record.status === "under_investigation" ? "bg-amber-500/10 text-amber-600" : "bg-green-500/10 text-green-600"}`}>
                        {record.status}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{record.description}</p>
                    {record.la_safeguarding_referred && (
                      <p className="text-xs text-amber-600 mt-2">📋 LA Referred: {record.la_reference}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => navigate("/care")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{resident.display_name}</h1>
          <p className="text-xs text-muted-foreground">Care Record • {careProfile?.primary_care_category?.replace(/_/g, " ") || "Adult Care"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {renderTab()}
      </div>
    </div>
  );
}