import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function SkillUpdateModal({ skill, domain, onClose, onSave, user }) {
  const [status, setStatus] = useState(skill.status || "not_started");
  const [evidence, setEvidence] = useState(skill.evidence || "");
  const [supportGiven, setSupportGiven] = useState(skill.support_given || "");
  const [nextSteps, setNextSteps] = useState(skill.next_steps || "");
  const [targetDate, setTargetDate] = useState(skill.target_date || "");

  const handleSave = () => {
    onSave({
      domain,
      skillName: skill.name,
      updates: {
        status,
        evidence,
        support_given: supportGiven,
        next_steps: nextSteps,
        target_date: targetDate,
        last_updated_by: user?.full_name,
        last_updated_date: new Date().toISOString()
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">{skill.name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_started">Not Started</SelectItem>
                <SelectItem value="developing">Developing</SelectItem>
                <SelectItem value="achieved">Achieved</SelectItem>
                <SelectItem value="maintaining">Maintaining</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Support Given</label>
            <textarea
              value={supportGiven}
              onChange={(e) => setSupportGiven(e.target.value)}
              placeholder="How was this worked on?"
              className="mt-1 w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Evidence</label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="What did the YP do to demonstrate this?"
              className="mt-1 w-full h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Next Steps</label>
            <textarea
              value={nextSteps}
              onChange={(e) => setNextSteps(e.target.value)}
              placeholder="What's next for this skill?"
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Target Date</label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  );
}