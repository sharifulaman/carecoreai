import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function PostMoveOnContactModal({ resident, plan, onClose, onSave }) {
  const [contactDate, setContactDate] = useState(new Date().toISOString().split("T")[0]);
  const [contactType, setContactType] = useState("visit");
  const [stable, setStable] = useState(true);
  const [employment, setEmployment] = useState(true);
  const [anyCrisis, setAnyCrisis] = useState(false);
  const [crisisNotes, setCrisisNotes] = useState("");
  const [supportProvided, setSupportProvided] = useState("");
  const [notes, setNotes] = useState("");
  const [nextDate, setNextDate] = useState("");

  const handleSave = () => {
    onSave({
      contact_date: contactDate,
      contact_type: contactType,
      tenancy_stable: stable,
      employment_maintained: employment,
      any_crisis: anyCrisis,
      crisis_notes: crisisNotes,
      support_provided: supportProvided,
      notes: notes,
      next_contact_date: nextDate,
      worker_name: "Current User",
      worker_id: "auto"
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">Log Contact - {resident.display_name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={contactDate}
              onChange={(e) => setContactDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Contact Type</label>
            <Select value={contactType} onValueChange={setContactType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visit">Visit</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="drop_in">Drop In</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={stable}
                onChange={(e) => setStable(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="font-medium">Tenancy Stable?</span>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={employment}
                onChange={(e) => setEmployment(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="font-medium">Employment Maintained?</span>
            </label>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={anyCrisis}
                onChange={(e) => setAnyCrisis(e.target.checked)}
                className="w-4 h-4 rounded border-input"
              />
              <span className="font-medium">Any Crisis?</span>
            </label>
          </div>

          {anyCrisis && (
            <div>
              <label className="text-sm font-medium">Crisis Notes</label>
              <textarea
                value={crisisNotes}
                onChange={(e) => setCrisisNotes(e.target.value)}
                className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Support Provided</label>
            <textarea
              value={supportProvided}
              onChange={(e) => setSupportProvided(e.target.value)}
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Next Contact Date</label>
            <Input
              type="date"
              value={nextDate}
              onChange={(e) => setNextDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Log Contact</Button>
        </div>
      </div>
    </div>
  );
}