import { useState } from "react";
import { X } from "lucide-react";
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

export default function PAVisitLogModal({ resident, residents, paDetails, onClose, onSave }) {
  const [residentId, setResidentId] = useState(resident?.id || "");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split("T")[0]);
  const [visitTime, setVisitTime] = useState("10:00");
  const [visitType, setVisitType] = useState("in_person");
  const [location, setLocation] = useState("");
  const [duration, setDuration] = useState("60");
  const [ypPresent, setYpPresent] = useState(true);
  const [topics, setTopics] = useState([]);
  const [ypViews, setYpViews] = useState("");
  const [concerns, setConcerns] = useState("");
  const [actions, setActions] = useState("");
  const [paRecs, setPaRecs] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [nextType, setNextType] = useState("in_person");
  const [pathwayReviewed, setPathwayReviewed] = useState(false);
  const [pathwayUpdateNeeded, setPathwayUpdateNeeded] = useState(false);
  const [notes, setNotes] = useState("");

  const selectedResident = residents.find(r => r.id === residentId);
  const paDetail = paDetails.find(p => p.resident_id === residentId);
  const paName = paDetail?.pa_name || "";

  const handleSave = () => {
    if (!residentId || !visitDate || topics.length === 0 || !nextDate) {
      alert("Please fill required fields: Resident, Visit Date, at least one Topic, and Next Visit Date");
      return;
    }

    onSave({
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
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">Log PA Visit</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      visitType === vt.id
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