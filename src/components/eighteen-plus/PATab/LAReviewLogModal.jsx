import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ORG_ID } from "@/lib/roleConfig";

const REVIEW_TYPES = [
  { id: "looked_after_review", label: "Looked After Review" },
  { id: "pathway_plan_review", label: "Pathway Plan Review" },
  { id: "placement_review", label: "Placement Review" },
  { id: "other", label: "Other" },
];

export default function LAReviewLogModal({ resident, residents, onClose, onSave }) {
  const [residentId, setResidentId] = useState(resident?.id || "");
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().split("T")[0]);
  const [reviewType, setReviewType] = useState("pathway_plan_review");
  const [chairName, setChairName] = useState("");
  const [chairRole, setChairRole] = useState("");
  const [attendees, setAttendees] = useState("");
  const [ypAttended, setYpAttended] = useState(true);
  const [ypViewsShared, setYpViewsShared] = useState(false);
  const [decisions, setDecisions] = useState("");
  const [pathwayUpdated, setPathwayUpdated] = useState(false);
  const [placementContinues, setPlacementContinues] = useState(true);
  const [anyConcerns, setAnyConcerns] = useState(false);
  const [concerns, setConcerns] = useState("");
  const [actions, setActions] = useState("[]");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [notes, setNotes] = useState("");

  const selectedResident = residents.find(r => r.id === residentId);

  const handleSave = () => {
    if (!residentId || !reviewDate || !decisions || !nextReviewDate) {
      alert("Please fill required fields");
      return;
    }

    try {
      const parsedActions = JSON.parse(actions || "[]");
      onSave({
        org_id: ORG_ID,
        resident_id: residentId,
        resident_name: selectedResident?.display_name,
        home_id: selectedResident?.home_id,
        review_date: new Date(reviewDate).toISOString(),
        review_type: reviewType,
        chair_name: chairName,
        chair_role: chairRole,
        attendees: attendees.split(",").map(a => a.trim()).filter(a => a),
        young_person_attended: ypAttended,
        young_person_views_shared: ypViewsShared,
        key_decisions: decisions,
        pathway_plan_updated: pathwayUpdated,
        placement_continues: placementContinues,
        any_concerns_raised: anyConcerns,
        concern_details: concerns,
        actions: parsedActions,
        next_review_date: nextReviewDate,
        notes,
      });
    } catch (e) {
      alert("Invalid actions JSON");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">Log LA Review</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-6">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Review Date *</label>
              <Input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Review Type</label>
              <Select value={reviewType} onValueChange={setReviewType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REVIEW_TYPES.map(rt => (
                    <SelectItem key={rt.id} value={rt.id}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Chair Name (usually IRO)</label>
              <Input value={chairName} onChange={(e) => setChairName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Chair Role</label>
              <Input value={chairRole} onChange={(e) => setChairRole(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Attendees (comma-separated)</label>
            <Input
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="Name 1, Name 2, Name 3"
              className="mt-1"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ypAttended}
                onChange={(e) => setYpAttended(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-xs font-medium">Young person attended</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={ypViewsShared}
                onChange={(e) => setYpViewsShared(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-xs font-medium">Young person views shared</span>
            </label>
          </div>

          <div>
            <label className="text-xs font-medium">Key Decisions *</label>
            <textarea
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              placeholder="What were the key decisions made?"
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pathwayUpdated}
                onChange={(e) => setPathwayUpdated(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-xs font-medium">Pathway plan updated</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={placementContinues}
                onChange={(e) => setPlacementContinues(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-xs font-medium">Placement continues</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={anyConcerns}
                onChange={(e) => setAnyConcerns(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-xs font-medium">Any concerns raised</span>
            </label>
          </div>

          {anyConcerns && (
            <div>
              <label className="text-xs font-medium">Concern Details</label>
              <textarea
                value={concerns}
                onChange={(e) => setConcerns(e.target.value)}
                className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium">Next Review Date *</label>
            <Input type="date" value={nextReviewDate} onChange={(e) => setNextReviewDate(e.target.value)} className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Log Review</Button>
        </div>
      </div>
    </div>
  );
}