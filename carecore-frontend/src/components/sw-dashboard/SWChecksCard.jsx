import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const CHECKLIST_ITEMS = [
  "Morning welfare checks completed",
  "Review new notes / handover",
  "Annex A critical checks reviewed",
  "Update health notes where needed",
  "Confirm today's appointments",
  "Missing episode checks completed",
  "Education / employment status verified",
  "Pathway plan progress reviewed",
  "End of day notes & handover",
];

export default function SWChecksCard() {
  const [completed, setCompleted] = useState({});

  const handleToggle = (index) => {
    setCompleted(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const completedCount = Object.values(completed).filter(Boolean).length;
  const completionPercent = Math.round((completedCount / CHECKLIST_ITEMS.length) * 100);

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Today's Checklist</h3>
        <p className="text-xs text-muted-foreground mt-1">{completedCount} / {CHECKLIST_ITEMS.length} completed</p>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all"
          style={{ width: `${completionPercent}%` }}
        ></div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {CHECKLIST_ITEMS.map((item, index) => (
          <label key={index} className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors">
            <input
              type="checkbox"
              checked={completed[index] || false}
              onChange={() => handleToggle(index)}
              className="w-4 h-4 rounded accent-green-600"
            />
            <span className={`text-xs font-medium ${completed[index] ? "text-muted-foreground line-through" : "text-foreground"}`}>
              {item}
            </span>
          </label>
        ))}
      </div>

      <button className="w-full text-xs font-medium text-primary hover:underline py-2">
        View full checklist
      </button>
    </div>
  );
}