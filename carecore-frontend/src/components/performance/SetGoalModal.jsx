// @ts-nocheck
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X, Target, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { performanceApi } from "@/lib/performanceApi";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = [
  { value: "personal_development", label: "Personal Development" },
  { value: "skills_development",   label: "Skills Development" },
  { value: "compliance",           label: "Compliance" },
  { value: "team_performance",     label: "Team Performance" },
  { value: "leadership",           label: "Leadership" },
];

/**
 * SetGoalModal
 *
 * Allows a manager to set a performance goal for a specific employee.
 * Posts to POST /business/staff-performance/:staffId/goals via performanceApi.
 * On success, invalidates the perf-team query so the table refreshes with the
 * updated goal count on next load.
 *
 * Props:
 *   staffId    string  — target employee's ID
 *   staffName  string  — display name for the header
 *   staffRole  string  — display role subtitle
 *   onClose    fn      — closes the modal
 */
export default function SetGoalModal({ staffId, staffName, staffRole, onClose }) {
  const queryClient = useQueryClient();

  const [title, setTitle]           = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory]     = useState("personal_development");
  const [targetDate, setTargetDate] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [status, setStatus]         = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg]     = useState("");

  const canSubmit = title.trim().length > 0 && status !== "submitting";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      await performanceApi.setGoalForEmployee(staffId, {
        title:       title.trim(),
        description: description.trim(),
        category,
        target_date: targetDate || undefined,
        review_date: reviewDate || undefined,
      });

      // Invalidate team-summary so goals_count updates on next fetch
      queryClient.invalidateQueries({ queryKey: ["perf-team"] });
      setStatus("success");
    } catch (err) {
      setErrorMsg(err?.message || "Failed to set goal. Please try again.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl border border-border w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-blue-500/10 rounded-full">
              <Target className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">Set Goal for {staffName}</h2>
              <p className="text-[10px] text-muted-foreground capitalize">
                {staffRole?.replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Success state ── */}
        {status === "success" ? (
          <div className="px-5 py-10 flex flex-col items-center gap-3 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="font-semibold text-sm">Goal set successfully</p>
            <p className="text-xs text-muted-foreground">
              The goal has been added to {staffName}'s performance record. They will be able to
              update their progress from their own performance tab.
            </p>
            <Button size="sm" onClick={onClose} className="mt-2">Close</Button>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Goal Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Complete Manual Handling refresher by June"
                className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                maxLength={150}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-sm">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context or specific actions required to achieve this goal..."
                rows={3}
                className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                maxLength={500}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Target Date <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Review Date <span className="text-muted-foreground font-normal">(optional)</span></label>
                <input
                  type="date"
                  value={reviewDate}
                  onChange={(e) => setReviewDate(e.target.value)}
                  className="w-full h-9 px-3 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Error */}
            {status === "error" && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{errorMsg}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!canSubmit}
                className="min-w-[100px]"
              >
                {status === "submitting" ? "Saving…" : "Set Goal"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
