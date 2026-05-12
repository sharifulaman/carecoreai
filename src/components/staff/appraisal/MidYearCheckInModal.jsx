import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function MidYearCheckInModal({ record, onSave, onClose }) {
  const [notes, setNotes] = useState(record?.mid_year_checkin?.overall_notes || "");
  const [goalUpdates, setGoalUpdates] = useState(
    record?.goals?.map(g => {
      const existing = record?.mid_year_checkin?.goal_updates?.find(u => u.goal_id === g.id);
      return {
        goal_id: g.id,
        goal_title: g.title,
        rag_status: existing?.rag_status || g.rag_status,
        progress_note: existing?.progress_note || "",
      };
    }) || []
  );

  const ragColor = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };

  const handleUpdateGoal = (goalId, field, value) => {
    setGoalUpdates(prev =>
      prev.map(g => g.goal_id === goalId ? { ...g, [field]: value } : g)
    );
  };

  const handleSubmit = () => {
    onSave({
      date: new Date().toISOString().split("T")[0],
      overall_notes: notes,
      goal_updates: goalUpdates,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h2 className="font-semibold text-base">Mid-Year Check-In</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-semibold block">Overall Check-In Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="How is the appraisee progressing overall? Any achievements or challenges to note?"
              className="w-full px-3 py-2 rounded border border-input text-sm resize-none min-h-[100px]"
            />
          </div>

          {goalUpdates.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-semibold block">Development Goals Progress</label>
              <div className="space-y-3">
                {goalUpdates.map(goal => (
                  <div key={goal.goal_id} className="bg-muted/20 rounded-lg p-4 space-y-3">
                    <h4 className="font-medium text-sm">{goal.goal_title}</h4>
                    <div className="flex gap-2">
                      <span className="text-xs text-muted-foreground pt-1">Status:</span>
                      <select
                        value={goal.rag_status}
                        onChange={e => handleUpdateGoal(goal.goal_id, "rag_status", e.target.value)}
                        className={`text-xs px-2 py-1 rounded border font-medium ${ragColor[goal.rag_status]}`}
                      >
                        <option value="green">Green</option>
                        <option value="amber">Amber</option>
                        <option value="red">Red</option>
                      </select>
                    </div>
                    <textarea
                      value={goal.progress_note}
                      onChange={e => handleUpdateGoal(goal.goal_id, "progress_note", e.target.value)}
                      placeholder="Progress on this goal?"
                      className="w-full px-2 py-1.5 rounded border border-input text-xs resize-none min-h-[60px]"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save Check-In</Button>
        </div>
      </div>
    </div>
  );
}