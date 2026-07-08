import { format } from "date-fns";
import { X, Download, Check } from "lucide-react";

function SuitabilityBadge({ value }) {
  if (!value) return <span className="text-xs text-muted-foreground italic">Not assessed</span>;
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
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cfg[status] || "bg-muted"}`}>{status}</span>;
}

function Section({ title, children }) {
  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value, empty = "Not recorded" }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 text-sm">
      <span className="text-xs text-muted-foreground font-medium pt-0.5">{label}</span>
      <span className="leading-relaxed whitespace-pre-wrap">{value || <span className="italic text-muted-foreground">{empty}</span>}</span>
    </div>
  );
}

function RatingBadge({ value }) {
  if (!value) return <span className="text-xs text-muted-foreground italic">—</span>;
  const cfg = { good: "bg-green-100 text-green-700", adequate: "bg-blue-100 text-blue-700", limited: "bg-amber-100 text-amber-700", poor: "bg-red-100 text-red-700", low: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", high: "bg-red-100 text-red-700", concerns: "bg-amber-100 text-amber-700", serious_concerns: "bg-red-100 text-red-700" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${cfg[value] || "bg-muted"}`}>{value.replace(/_/g, " ")}</span>;
}

function BoolIcon({ value }) {
  if (value === null || value === undefined) return <span className="text-xs text-muted-foreground italic">—</span>;
  return value
    ? <span className="text-xs text-green-700 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Yes</span>
    : <span className="text-xs text-red-700 font-medium">No</span>;
}

export default function AssessmentViewDrawer({ assessment, onClose }) {
  if (!assessment) return null;
  const a = assessment;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex">
      <div className="ml-auto w-full max-w-2xl bg-card h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-5 flex items-start justify-between gap-3 z-10">
          <div>
            <h3 className="font-semibold">{a.home_name} — Location Assessment</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={a.status} />
              <SuitabilityBadge value={a.overall_suitability} />
              <span className="text-xs text-muted-foreground">{a.assessment_year} · {a.version_number}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {a.document_url && (
              <a href={a.document_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs font-medium hover:bg-muted">
                <Download className="w-3.5 h-3.5" /> PDF
              </a>
            )}
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
        </div>

        <div className="p-5 space-y-4 flex-1">
          {/* Section 1 */}
          <Section title="1. Premises and Category">
            <Row label="Home" value={a.home_name} />
            <Row label="Address" value={a.home_address} />
            <Row label="Assessment date" value={a.assessment_date ? format(new Date(a.assessment_date), "dd MMMM yyyy") : "—"} />
            <Row label="Year" value={a.assessment_year} />
            <Row label="Accommodation category" value={a.accommodation_category?.replace(/_/g, " ")} />
            {a.ofsted_registration_assessment && (
              <div className="flex items-center gap-2 text-xs text-primary font-medium">
                <Check className="w-3.5 h-3.5" /> Submitted for Ofsted registration purposes
              </div>
            )}
          </Section>

          {/* Section 2 */}
          <Section title="2. Location Suitability">
            <div className="space-y-2">
              {[
                ["Access to local services", null, a.local_services_accessible, a.local_services_notes],
                ["Education access", a.education_access, null, a.education_access_notes],
                ["Healthcare access", a.healthcare_access, null, a.healthcare_access_notes],
                ["Public transport", a.public_transport_access, null, a.public_transport_access_notes],
                ["Community participation", a.community_participation, null, a.community_participation_notes],
                ["Stigmatisation risk", a.stigmatisation_risk, null, a.stigmatisation_notes],
                ["Promotes self-esteem", null, a.self_esteem_promotion, a.self_esteem_notes],
              ].map(([label, rating, bool, notes]) => (
                <div key={label} className="grid grid-cols-[160px_1fr] gap-2 text-sm items-start">
                  <span className="text-xs text-muted-foreground font-medium pt-0.5">{label}</span>
                  <div>
                    {rating !== null && rating !== undefined ? <RatingBadge value={rating} /> : <BoolIcon value={bool} />}
                    {notes && <p className="text-xs text-muted-foreground mt-0.5">{notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Section 3 */}
          <Section title="3. Safety and Security">
            <Row label="Area safety" value={<RatingBadge value={a.area_safety_rating} />} />
            {a.area_safety_notes && <Row label="Safety notes" value={a.area_safety_notes} />}
            {a.known_risks_in_area && <Row label="Known area risks" value={a.known_risks_in_area} />}
            <Row label="Proximity to risks" value={<BoolIcon value={a.proximity_to_known_risks} />} />
            {a.proximity_risk_details && <Row label="Proximity details" value={a.proximity_risk_details} />}
            {a.risk_mitigation_measures && <Row label="Mitigation measures" value={a.risk_mitigation_measures} />}
          </Section>

          {/* Section 4 */}
          <Section title="4. Premises Physical Suitability">
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Suitable for category", a.premises_suitable_for_category],
                ["Stability & consistency", a.stability_and_consistency],
                ["Accessible (disabilities)", a.accessibility],
                ["Private bedrooms", a.private_bedrooms],
                ["Internet connectivity", a.internet_connectivity],
                ["Physically secure", a.physically_secure],
                ["Homely environment", a.homely_environment],
                ["Hazards removed", a.hazards_removed],
                ["H&S compliant", a.health_safety_compliant],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between border border-border/50 rounded px-2 py-1.5 text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <BoolIcon value={val} />
                </div>
              ))}
            </div>
          </Section>

          {/* Section 5 */}
          <Section title="5. Consultations">
            {(a.consultations || []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No consultations recorded.</p>
            ) : (
              <div className="space-y-3">
                {a.consultations.map((c, i) => (
                  <div key={i} className="border border-border/50 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{c.person_name}</span>
                      <span className="text-xs text-muted-foreground">— {c.person_role}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{c.consultation_date}</span>
                    </div>
                    {c.views_summary && <p className="text-xs text-muted-foreground">{c.views_summary}</p>}
                    {c.concerns_raised && <p className="text-xs text-amber-700 font-medium">⚠ Concerns: {c.concerns_detail}</p>}
                    {c.how_views_taken_into_account && <p className="text-xs text-muted-foreground">Taken into account: {c.how_views_taken_into_account}</p>}
                  </div>
                ))}
              </div>
            )}
            {a.children_consulted !== undefined && (
              <div className="mt-2 border border-blue-100 bg-blue-50/30 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium">Children consulted: <BoolIcon value={a.children_consulted} /></p>
                {a.children_consultation_summary && <p className="text-xs text-muted-foreground">{a.children_consultation_summary}</p>}
                {a.children_concerns && <p className="text-xs text-amber-700">Concerns: {a.children_concerns}</p>}
              </div>
            )}
          </Section>

          {/* Section 6 */}
          <Section title="6. Overall Assessment">
            <Row label="Overall suitability" value={<SuitabilityBadge value={a.overall_suitability} />} />
            <Row label="Notes" value={a.overall_suitability_notes} />
            {a.conditions_attached && <Row label="Conditions" value={a.conditions_attached} />}
            {a.unsuitable_action_plan && <Row label="Action plan" value={a.unsuitable_action_plan} />}
            {(a.recommended_actions || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Recommended actions</p>
                {a.recommended_actions.map((ra, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs border border-border/50 rounded px-2 py-1.5 mb-1">
                    <span className={`px-1.5 py-0.5 rounded font-medium capitalize shrink-0 ${ra.priority === "immediate" ? "bg-red-100 text-red-700" : ra.priority === "within_1_month" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>{ra.priority?.replace(/_/g, " ")}</span>
                    <span className="flex-1">{ra.action}</span>
                    {ra.responsible_person_name && <span className="text-muted-foreground shrink-0">{ra.responsible_person_name}</span>}
                    {ra.completed && <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Sign-off */}
          <Section title="Sign-off">
            <Row label="Assessed by" value={`${a.assessed_by_name || "—"}${a.assessment_date ? " · " + a.assessment_date : ""}`} />
            <Row label="Reviewed by" value={`${a.reviewed_by_name || "—"}${a.reviewed_at ? " · " + format(new Date(a.reviewed_at), "dd MMM yyyy") : ""}`} />
            <Row label="Approved by" value={`${a.approved_by_name || "—"}${a.approved_at ? " · " + format(new Date(a.approved_at), "dd MMM yyyy") : ""}`} />
            <Row label="Next due" value={a.next_assessment_due ? format(new Date(a.next_assessment_due), "dd MMM yyyy") : "—"} />
          </Section>
        </div>
      </div>
    </div>
  );
}