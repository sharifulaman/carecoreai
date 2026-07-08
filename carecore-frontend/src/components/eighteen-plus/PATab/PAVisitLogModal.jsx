import { useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ORG_ID } from "@/lib/roleConfig";

const TOPICS = [
  { id: "pathway_plan_review", label: "Pathway Plan Review" },
  { id: "accommodation_plans", label: "Accommodation Plans" },
  { id: "education_employment", label: "Education & Employment" },
  { id: "health_and_wellbeing", label: "Health & Wellbeing" },
  { id: "finances_and_benefits", label: "Finances & Benefits" },
  { id: "relationships_and_support", label: "Relationships & Support" },
  { id: "identity_and_culture", label: "Identity & Culture" },
  { id: "concerns_or_issues", label: "Concerns or Issues" },
  { id: "achievements_and_positives", label: "Achievements & Positives" },
  { id: "other", label: "Other" },
];

const VISIT_TYPES = [
  { id: "in_person", label: "In Person" },
  { id: "phone", label: "Phone" },
  { id: "video", label: "Video" },
  { id: "unplanned", label: "Unplanned" },
  { id: "other", label: "Other" },
];

export default function PAVisitLogModal({ resident, residents, paDetails, pathwayPlans = [], existingVisit = null, onClose, onSave }) {
  const [residentId, setResidentId] = useState(existingVisit?.resident_id || resident?.id || "");
  const [visitDate, setVisitDate] = useState(existingVisit?.visit_date ? new Date(existingVisit.visit_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
  const [visitTime, setVisitTime] = useState(existingVisit?.visit_date ? new Date(existingVisit.visit_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : "10:00");
  const [visitType, setVisitType] = useState(existingVisit?.visit_type || "in_person");
  const [location, setLocation] = useState(existingVisit?.location || "");
  const [duration, setDuration] = useState(existingVisit?.duration_minutes?.toString() || "60");
  const [ypPresent, setYpPresent] = useState(existingVisit ? existingVisit.young_person_present : true);
  const [topics, setTopics] = useState(existingVisit?.topics_discussed || []);
  const [ypViews, setYpViews] = useState(existingVisit?.young_person_views || "");
  const [concerns, setConcerns] = useState(existingVisit?.key_concerns || "");
  const [actions, setActions] = useState(existingVisit?.actions_agreed || "");
  const [paRecs, setPaRecs] = useState(existingVisit?.pa_recommendations || "");
  const [nextDate, setNextDate] = useState(existingVisit?.next_visit_date || "");
  const [nextType, setNextType] = useState(existingVisit?.next_visit_type || "in_person");
  const [pathwayReviewed, setPathwayReviewed] = useState(existingVisit ? existingVisit.pathway_plan_reviewed : false);
  const [pathwayUpdateNeeded, setPathwayUpdateNeeded] = useState(existingVisit ? existingVisit.pathway_plan_update_needed : false);
  const [notes, setNotes] = useState(existingVisit?.notes || "");
  const [validationErrors, setValidationErrors] = useState([]);

  const selectedResident = residents.find(r => r.id === residentId);
  const paDetail = paDetails.find(p => p.resident_id === residentId);
  const activePathwayPlan = pathwayPlans.find(p => p.resident_id === residentId && p.status === "active");
  const paName = activePathwayPlan?.personal_adviser_name || paDetail?.pa_name || "";

  const handleSave = () => {
    const errors = [];

    if (!residentId) errors.push("Resident is required");
    if (!visitDate) errors.push("Visit Date is required");
    if (topics.length === 0) errors.push("At least one Topic must be selected");
    if (!nextDate) errors.push("Next Visit Date is required");
    if (!duration || parseInt(duration) <= 0) errors.push("Duration must be a positive number");
    if (!ypViews.trim()) errors.push("Young Person's Views & Wishes is required");
    if (!actions.trim()) errors.push("Actions Agreed is required");

    if (errors.length > 0) {
      setValidationErrors(errors);
      const modalScroll = document.getElementById("pa-visit-modal-scroll");
      if (modalScroll) modalScroll.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setValidationErrors([]);

    onSave({
      id: existingVisit?.id,
      org_id: ORG_ID,
      resident_id: residentId,
      resident_name: selectedResident?.display_name,
      home_id: selectedResident?.home_id,
      pa_details_id: paDetail?.id,
      pa_name: paName,
      visit_date: new Date(`${visitDate}T${visitTime}`).toISOString(),
      visit_type: visitType,
      location,
      duration_minutes: parseInt(duration),
      young_person_present: ypPresent,
      topics_discussed: topics,
      young_person_views: ypViews,
      key_concerns: concerns,
      actions_agreed: actions,
      pa_recommendations: paRecs,
      next_visit_date: nextDate,
      next_visit_type: nextType,
      pathway_plan_reviewed: pathwayReviewed,
      pathway_plan_update_needed: pathwayUpdateNeeded,
      notes,
      recorded_by_name: "Current User",
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div id="pa-visit-modal-scroll" className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <h3 className="font-semibold">Log PA Visit</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {validationErrors.length > 0 && (
          <div className="mx-4 mt-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-red-700 mb-2">Validation Error</p>
                <ul className="space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i} className="text-xs text-red-600">• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 space-y-6">
          {/* Section 1: Visit Basics */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="font-semibold text-sm">Visit Basics</h4>

            <div>
              <label className="text-xs font-medium">Resident *</label>
              <Select value={residentId} onValueChange={setResidentId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select resident" />
                </SelectTrigger>
                <SelectContent>
                  {residents.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.display_name || r.initials}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium">PA Name</label>
              <Input value={paName} disabled className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Visit Date *</label>
                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium">Time</label>
                <Input type="time" value={visitTime} onChange={(e) => setVisitTime(e.target.value)} className="mt-1" />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium">Visit Type</label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {VISIT_TYPES.map(vt => (
                  <button
                    key={vt.id}
                    onClick={() => setVisitType(vt.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${visitType === vt.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-muted/50 text-muted-foreground hover:bg-muted"
                      }`}
                  >
                    {vt.label}
                  </button>
                ))}
              </div>
            </div>

            {visitType === "in_person" && (
              <div>
                <label className="text-xs font-medium">Location</label>
                <Input placeholder="e.g. Home, office, café" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Duration (minutes)</label>
                <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="mt-1" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ypPresent}
                    onChange={(e) => setYpPresent(e.target.checked)}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-xs font-medium">Young person present?</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Topics */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="font-semibold text-sm">Topics Discussed *</h4>
            <div className="grid grid-cols-2 gap-3">
              {TOPICS.map(topic => (
                <label key={topic.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={topics.includes(topic.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTopics([...topics, topic.id]);
                      } else {
                        setTopics(topics.filter(t => t !== topic.id));
                      }
                    }}
                    className="w-4 h-4 rounded border-input"
                  />
                  <span className="text-xs">{topic.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Sections 3-7: Text fields */}
          <div className="space-y-3 pb-4 border-b border-border">
            <div>
              <label className="text-xs font-medium">Young Person's Views & Wishes</label>
              <textarea
                value={ypViews}
                onChange={(e) => setYpViews(e.target.value)}
                placeholder="What did the young person say? What are their wishes?"
                className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Key Concerns Arising</label>
              <textarea
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                placeholder="Any concerns discussed or identified"
                className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs font-medium">Actions Agreed</label>
              <textarea
                value={actions}
                onChange={(e) => setActions(e.target.value)}
                placeholder="What actions were agreed between the young person and PA?"
                className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs font-medium">PA Recommendations</label>
              <textarea
                value={paRecs}
                onChange={(e) => setPaRecs(e.target.value)}
                placeholder="Any recommendations from the PA"
                className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          {/* Section 6: Pathway Plan */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="font-semibold text-sm">Pathway Plan</h4>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pathwayReviewed}
                onChange={(e) => setPathwayReviewed(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-xs font-medium">Pathway Plan Reviewed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pathwayUpdateNeeded}
                onChange={(e) => setPathwayUpdateNeeded(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-xs font-medium">Update Needed</span>
            </label>
          </div>

          {/* Section 7: Next Visit */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="font-semibold text-sm">Next Visit *</h4>
            <div>
              <label className="text-xs font-medium">Next Visit Date</label>
              <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Visit Type</label>
              <Select value={nextType} onValueChange={setNextType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map(vt => (
                    <SelectItem key={vt.id} value={vt.id}>{vt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium">Additional Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Log Visit</Button>
        </div>
      </div>
    </div>
  );
}