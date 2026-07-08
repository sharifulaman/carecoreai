import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

/**
 * useSaveStatus — lightweight hook for save button state.
 * Returns { status, onSuccess, onError } to wire into useMutation callbacks.
 * "saved" state auto-resets to "idle" after 3 s; "error" after 5 s.
 */
export function useSaveStatus() {
  const [status, setStatus] = useState("idle"); // idle | saving | saved | error
  return {
    status,
    onSuccess: () => { setStatus("saved"); setTimeout(() => setStatus("idle"), 3000); },
    onError:   () => { setStatus("error"); setTimeout(() => setStatus("idle"), 5000); },
  };
}

/**
 * SaveButton — drop-in replacement for the plain "Save" button.
 * Provides: Save → Saving… → ✓ Saved (green, 3 s) → Save
 *                          → Retry (red, 5 s) → Save
 */
export function SaveButton({ status = "idle", onClick, label = "Save", disabled = false }) {
  const cfg = {
    idle:   { text: label,      cls: "" },
    saving: { text: "Saving…",  cls: "" },
    saved:  { text: "✓ Saved",  cls: "bg-green-600 hover:bg-green-700 text-white border-green-600" },
    error:  { text: "Retry",    cls: "bg-red-600 hover:bg-red-700 text-white border-red-600" },
  };
  const s = cfg[status] || cfg.idle;
  return (
    <Button
      onClick={onClick}
      disabled={status === "saving" || disabled}
      size="sm"
      className={s.cls}
    >
      {s.text}
    </Button>
  );
}

/**
 * SavedAt — compact "✓ Saved DD Mon YYYY at HH:MM by Name" line.
 * Shows nothing when iso is falsy or invalid.
 */
export function SavedAt({ iso, by }) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return (
    <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
      <CheckCircle2 className="w-3 h-3 shrink-0" />
      Saved {dateStr} at {timeStr}{by ? ` by ${by}` : ""}
    </span>
  );
}
