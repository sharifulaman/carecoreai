import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import BodyMapSilhouette from "./BodyMapSilhouette";


const BODY_LOCATIONS = [
  "Head", "Face", "Neck", "Left shoulder", "Right shoulder",
  "Left arm", "Right arm", "Left forearm", "Right forearm",
  "Hands", "Chest", "Abdomen", "Back", "Left hip", "Right hip",
  "Left leg", "Right leg", "Left knee", "Right knee", "Left ankle", "Right ankle", "Feet"
];

export default function BodyMapForm({ resident, staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const [marks, setMarks] = useState([]);
  const [selectedMarkIdx, setSelectedMarkIdx] = useState(null);
  const [markForm, setMarkForm] = useState({
    body_location: "",
    body_side: "front",
    x_position: 0,
    y_position: 0,
    mark_type: "bruise",
    colour: "",
    size_cm: "",
    description: "",
    child_explanation: "",
  });
  const [assessment, setAssessment] = useState({
    discovery_circumstance: "",
    consistent_with_explanation: null,
    safeguarding_concern: false,
    safeguarding_referral_made: false,
    referred_to: "",
    manager_notified: false,
    police_notified: false,
    notes: "",
  });

  const handleSilhouetteClick = (pos) => {
    setMarkForm(p => ({ ...p, x_position: pos.x, y_position: pos.y, body_side: pos.side }));
  };

  const handleAddMark = () => {
    if (!markForm.body_location || !markForm.mark_type) {
      toast.error("Fill in body location and mark type");
      return;
    }
    const newMark = { id: Math.random().toString(36).slice(2, 11), ...markForm };
    setMarks([...marks, newMark]);
    setMarkForm({
      body_location: "",
      body_side: "front",
      x_position: 0,
      y_position: 0,
      mark_type: "bruise",
      colour: "",
      size_cm: "",
      description: "",
      child_explanation: "",
    });
    setSelectedMarkIdx(null);
    toast.success("Mark added");
  };

  const handleRemoveMark = (idx) => {
    setMarks(m => m.filter((_, i) => i !== idx));
    setSelectedMarkIdx(null);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const bodyMap = {
        org_id: ORG_ID,
        resident_id: resident.id,
        resident_name: resident.display_name,
        home_id: resident.home_id,
        recorded_by_id: user?.id,
        recorded_by_name: user?.full_name,
        recorded_datetime: new Date().toISOString(),
        discovery_circumstance: assessment.discovery_circumstance,
        marks: marks,
        consistent_with_explanation: assessment.consistent_with_explanation,
        safeguarding_concern: assessment.safeguarding_concern,
        safeguarding_referral_made: assessment.safeguarding_referral_made,
        referred_to: assessment.referred_to,
        manager_notified: assessment.manager_notified,
        notes: assessment.notes,
        status: "open",
      };
      await secureGateway.create("BodyMap", bodyMap);
      
      // Auto-create SafeguardingRecord if concern flagged
      if (assessment.safeguarding_concern) {
        await secureGateway.create("SafeguardingRecord", {
          org_id: ORG_ID,
          resident_id: resident.id,
          resident_name: resident.display_name,
          home_id: resident.home_id,
          type: "body_map_concern",
          description: `Body map safeguarding concern: ${assessment.notes}`,
          reported_by_id: user?.id,
          reported_by_name: user?.full_name,
          status: "open",
        });
        // Notify TL/Admin
        await secureGateway.create("Notification", {
          org_id: ORG_ID,
          type: "safeguarding_concern",
          priority: "high",
          title: `Safeguarding concern raised via body map for ${resident.display_name}`,
          message: "Review immediately",
          recipient_role: "team_leader",
        });
      }
    },
    onSuccess: () => {
      toast.success("Body map recorded");
      qc.invalidateQueries({ queryKey: ["body-maps"] });
      onSave();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Body Map — {resident.display_name}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Silhouettes */}
          <div>
            <h3 className="font-semibold mb-4">Click to add mark location</h3>
            <div className="grid grid-cols-2 gap-6">
              <BodyMapSilhouette side="front" marks={marks} onClick={handleSilhouetteClick} />
              <BodyMapSilhouette side="back" marks={marks} onClick={handleSilhouetteClick} />
            </div>
          </div>

          {/* Mark Form */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold mb-4">Add Mark</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Body Location *</label>
                <Select value={markForm.body_location} onValueChange={v => setMarkForm(p => ({ ...p, body_location: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {BODY_LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Mark Type *</label>
                <Select value={markForm.mark_type} onValueChange={v => setMarkForm(p => ({ ...p, mark_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bruise">Bruise</SelectItem>
                    <SelectItem value="cut">Cut</SelectItem>
                    <SelectItem value="scratch">Scratch</SelectItem>
                    <SelectItem value="burn">Burn</SelectItem>
                    <SelectItem value="bite">Bite</SelectItem>
                    <SelectItem value="rash">Rash</SelectItem>
                    <SelectItem value="swelling">Swelling</SelectItem>
                    <SelectItem value="tattoo">Tattoo</SelectItem>
                    <SelectItem value="self_harm">Self-Harm</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><label className="text-sm font-medium">Colour/Appearance</label>
                <Input value={markForm.colour} onChange={e => setMarkForm(p => ({ ...p, colour: e.target.value }))} placeholder="e.g. purple/yellow" />
              </div>
              <div><label className="text-sm font-medium">Size</label>
                <Input value={markForm.size_cm} onChange={e => setMarkForm(p => ({ ...p, size_cm: e.target.value }))} placeholder="e.g. 3x2cm" />
              </div>
              <div className="col-span-2"><label className="text-sm font-medium">Description</label>
                <Textarea value={markForm.description} onChange={e => setMarkForm(p => ({ ...p, description: e.target.value }))} rows={2} />
              </div>
              <div className="col-span-2"><label className="text-sm font-medium">Child's Explanation</label>
                <Textarea value={markForm.child_explanation} onChange={e => setMarkForm(p => ({ ...p, child_explanation: e.target.value }))} placeholder="What did the child say caused this?" rows={2} />
              </div>
              <Button onClick={handleAddMark} className="col-span-2">Add Mark to Body Map</Button>
            </div>
          </div>

          {/* Marks List */}
          {marks.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">{marks.length} mark(s) recorded</h3>
              <div className="space-y-2">
                {marks.map((m, i) => (
                  <div key={m.id} className="p-3 bg-muted/30 border border-border rounded-lg flex items-start justify-between">
                    <div className="text-sm">
                      <p className="font-medium">{m.body_location} ({m.body_side})</p>
                      <p className="text-xs text-muted-foreground">{m.mark_type} · {m.colour} · {m.size_cm}</p>
                      {m.description && <p className="text-xs mt-1">{m.description}</p>}
                    </div>
                    <button onClick={() => handleRemoveMark(i)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assessment */}
          <div className="border border-border rounded-lg p-4 bg-muted/20">
            <h3 className="font-semibold mb-4">Assessment</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-medium">How/when was mark noticed?</label>
                <Input value={assessment.discovery_circumstance} onChange={e => setAssessment(p => ({ ...p, discovery_circumstance: e.target.value }))} />
              </div>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="radio" checked={assessment.consistent_with_explanation === true} onChange={() => setAssessment(p => ({ ...p, consistent_with_explanation: true }))} />
                Consistent with child's explanation
              </label></div>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="radio" checked={assessment.consistent_with_explanation === false} onChange={() => setAssessment(p => ({ ...p, consistent_with_explanation: false }))} />
                Not consistent / Unclear
              </label></div>
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={assessment.safeguarding_concern} onChange={e => setAssessment(p => ({ ...p, safeguarding_concern: e.target.checked }))} />
                Does this raise a safeguarding concern?
              </label></div>
              {assessment.safeguarding_concern && (
                <>
                  <div className="p-3 bg-red-100 border border-red-300 rounded-lg flex gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-700 shrink-0" />
                    <p className="text-sm text-red-700">A SafeguardingRecord will be created automatically on save.</p>
                  </div>
                  <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input type="checkbox" checked={assessment.safeguarding_referral_made} onChange={e => setAssessment(p => ({ ...p, safeguarding_referral_made: e.target.checked }))} />
                    Referral made?
                  </label></div>
                  <div><label className="text-sm font-medium">Referred to</label>
                    <Input value={assessment.referred_to} onChange={e => setAssessment(p => ({ ...p, referred_to: e.target.value }))} placeholder="e.g. Children's Social Care" />
                  </div>
                </>
              )}
              <div><label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input type="checkbox" checked={assessment.manager_notified} onChange={e => setAssessment(p => ({ ...p, manager_notified: e.target.checked }))} />
                Manager notified?
              </label></div>
              <div><label className="text-sm font-medium">Notes</label>
                <Textarea value={assessment.notes} onChange={e => setAssessment(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 bg-muted/30 flex justify-between">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={marks.length === 0 || saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save Body Map"}
          </Button>
        </div>
      </div>
    </div>
  );
}