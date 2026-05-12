import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus } from "lucide-react";
import AppraisalGoalForm from "./AppraisalGoalForm";

export default function AppraisalLogForm({ initialData, staff, myProfile, onClose, onSubmit }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState(initialData || {
    staff_id: "",
    staff_name: "",
    appraisee_id: "",
    appraiser_id: myProfile?.id || "",
    appraisal_date: today,
    overall_rating: 3,
    performance_notes: "",
    strengths: "",
    areas_for_development: "",
    goals: [],
    outcome: "",
    next_appraisal_date: "",
  });

  // Auto-calculate next appraisal date (12 months ahead)
  useEffect(() => {
    if (form.appraisal_date && !initialData) {
      const date = new Date(form.appraisal_date);
      date.setFullYear(date.getFullYear() + 1);
      const nextDate = date.toISOString().split("T")[0];
      setForm(f => ({ ...f, next_appraisal_date: nextDate }));
    }
  }, [form.appraisal_date, initialData]);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const selectedStaff = staff.find(s => s.id === form.appraisee_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold text-base">Log Appraisal</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Staff selection */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Appraisee</label>
            <Select value={form.appraisee_id} onValueChange={v => {
              const sel = staff.find(s => s.id === v);
              f("appraisee_id", v);
              f("staff_name", sel?.full_name || "");
            }}>
              <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
              <SelectContent>
                {staff.filter(s => s.status === "active").map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Appraisal Date</label>
            <Input type="date" value={form.appraisal_date} onChange={e => f("appraisal_date", e.target.value)} />
          </div>

          {/* Overall rating */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Overall Rating (1–5 stars)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(r => (
                <button
                  key={r}
                  onClick={() => f("overall_rating", r)}
                  className={`w-10 h-10 rounded-full text-sm font-bold transition-colors ${
                    form.overall_rating >= r ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Performance notes */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Performance Feedback</label>
            <textarea
              value={form.performance_notes}
              onChange={e => f("performance_notes", e.target.value)}
              placeholder="Overall observations and feedback…"
              className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[80px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Strengths */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Key Strengths</label>
            <textarea
              value={form.strengths}
              onChange={e => f("strengths", e.target.value)}
              placeholder="What does this person do well?"
              className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Development areas */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Areas for Development</label>
            <textarea
              value={form.areas_for_development}
              onChange={e => f("areas_for_development", e.target.value)}
              placeholder="What could they improve?"
              className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Development Goals */}
          <AppraisalGoalForm goals={form.goals || []} onChange={goals => f("goals", goals)} />

          {/* Outcome */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Appraisal Outcome</label>
            <Select value={form.outcome} onValueChange={v => f("outcome", v)}>
              <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="satisfactory">Satisfactory</SelectItem>
                <SelectItem value="below_expectations">Below Expectations</SelectItem>
                <SelectItem value="improvement_plan">Improvement Plan Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Next appraisal date */}
          <div>
            <label className="text-xs text-muted-foreground font-medium block mb-2">Next Appraisal Due</label>
            <Input type="date" value={form.next_appraisal_date} onChange={e => f("next_appraisal_date", e.target.value)} />
            <p className="text-[10px] text-muted-foreground mt-1">Auto-calculated as 12 months from appraisal date</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(form)}>Save Appraisal</Button>
        </div>
      </div>
    </div>
  );
}