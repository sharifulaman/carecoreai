import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";

export default function AppraisalGoalForm({ goals = [], onChange }) {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    target_date: "",
    rag_status: "green",
  });

  const handleAdd = () => {
    if (!form.title.trim()) return;
    const newGoals = [...goals, { id: `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, ...form, completed: false }];
    onChange(newGoals);
    setForm({ title: "", description: "", target_date: "", rag_status: "green" });
  };

  const handleUpdate = (id, field, value) => {
    const newGoals = goals.map(g => g.id === id ? { ...g, [field]: value } : g);
    onChange(newGoals);
  };

  const handleDelete = (id) => {
    onChange(goals.filter(g => g.id !== id));
  };

  const ragColor = {
    green: "bg-green-100 text-green-700 border-green-300",
    amber: "bg-amber-100 text-amber-700 border-amber-300",
    red: "bg-red-100 text-red-700 border-red-300",
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-semibold">Add Development Goal</h4>
        <Input
          placeholder="Goal title (required)"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          className="h-8 text-sm"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          className="w-full text-sm px-3 py-2 rounded border border-input resize-none min-h-[60px]"
        />
        <div className="flex gap-2">
          <Input
            type="date"
            value={form.target_date}
            onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))}
            className="h-8 text-sm flex-1"
          />
          <select
            value={form.rag_status}
            onChange={e => setForm(f => ({ ...f, rag_status: e.target.value }))}
            className="h-8 px-2 rounded border border-input text-sm"
          >
            <option value="green">Green</option>
            <option value="amber">Amber</option>
            <option value="red">Red</option>
          </select>
        </div>
        <Button size="sm" onClick={handleAdd} className="gap-1.5 h-7 text-xs">
          <Plus className="w-3 h-3" /> Add Goal
        </Button>
      </div>

      {goals.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Goals ({goals.length})</h4>
          {goals.map(goal => (
            <div key={goal.id} className="bg-card rounded-lg border border-border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="font-medium text-sm">{goal.title}</p>
                  {goal.description && <p className="text-xs text-muted-foreground mt-1">{goal.description}</p>}
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="text-muted-foreground hover:text-destructive p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Target: {goal.target_date || "No date"}</span>
                <select
                  value={goal.rag_status || "green"}
                  onChange={e => handleUpdate(goal.id, "rag_status", e.target.value)}
                  className={`text-xs px-2 py-0.5 rounded border ${ragColor[goal.rag_status] || ragColor.green}`}
                >
                  <option value="green">Green</option>
                  <option value="amber">Amber</option>
                  <option value="red">Red</option>
                </select>
                {goal.previous_rag_status && (
                  <span className="text-[10px] text-muted-foreground">Prev: {goal.previous_rag_status}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}