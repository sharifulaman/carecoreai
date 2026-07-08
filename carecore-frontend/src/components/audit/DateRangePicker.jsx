import { useState } from "react";
import { format, subDays, subMonths, startOfYear } from "date-fns";
import { CalendarIcon, ChevronDown, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const PRESETS = [
  {
    label: "Today",
    getRange: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    label: "Last 7 days",
    getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: "Last 30 days",
    getRange: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: "Last 3 months",
    getRange: () => ({ from: subMonths(new Date(), 3), to: new Date() }),
  },
  {
    label: "This year",
    getRange: () => ({ from: startOfYear(new Date()), to: new Date() }),
  },
];

function formatRangeLabel(dateRange) {
  const { from, to } = dateRange ?? {};
  if (from && to) {
    return `${format(from, "d MMM yyyy")} – ${format(to, "d MMM yyyy")}`;
  }
  if (from) return `From ${format(from, "d MMM yyyy")}`;
  if (to)   return `To ${format(to, "d MMM yyyy")}`;
  return null;
}

/**
 * DateRangePicker — a popover-based date range selector for the Audit Trail header.
 *
 * Props:
 *   value    { from: Date|null, to: Date|null }  — controlled value
 *   onChange (range) => void                     — called when the range changes
 */
export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const hasRange = value?.from || value?.to;
  const label    = formatRangeLabel(value) ?? "Date Range";

  // react-day-picker v8 requires undefined, not null, in its DateRange type.
  const calendarSelected = hasRange
    ? { from: value.from ?? undefined, to: value.to ?? undefined }
    : undefined;

  function handleSelect(range) {
    onChange({ from: range?.from ?? null, to: range?.to ?? null });
  }

  function handlePreset(preset) {
    onChange(preset.getRange());
    setOpen(false);
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange({ from: null, to: null });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg bg-background text-xs font-medium transition-colors hover:border-primary/60 focus:outline-none focus:ring-1 focus:ring-primary ${
            hasRange
              ? "border-primary text-foreground"
              : "border-border text-muted-foreground"
          }`}
        >
          <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="whitespace-nowrap">{label}</span>
          {hasRange ? (
            <X
              className="w-3 h-3 shrink-0 hover:text-destructive transition-colors"
              onClick={handleClear}
            />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-auto p-0 shadow-lg"
        align="end"
        sideOffset={6}
      >
        <div className="flex divide-x divide-border">
          {/* ── Preset shortcuts ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-0.5 p-3 min-w-[130px]">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Quick select
            </p>
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start text-xs h-7 px-2 font-normal"
                onClick={() => handlePreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* ── Two-month calendar ───────────────────────────────────────────── */}
          <div className="p-2">
            <Calendar
              mode="range"
              selected={calendarSelected}
              onSelect={handleSelect}
              numberOfMonths={2}
              disabled={{ after: new Date() }}
              initialFocus
            />
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────────── */}
        {hasRange && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
              onClick={() => onChange({ from: null, to: null })}
            >
              Clear
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
