import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarClock, CheckCircle2 } from "lucide-react";
import { differenceInDays, parseISO, format, addYears } from "date-fns";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

export default function YearEndCarryOver({ staff = [], org, balances = [], isAdmin }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [preview, setPreview] = useState(false);

  const hrPolicy = org?.hr_policy || {};
  const carryOverAllowed = hrPolicy.carry_over_allowed ?? true;
  const maxCarryOver = hrPolicy.max_carry_over_days ?? 5;
  const annualEntitlement = hrPolicy.annual_leave_days ?? 28;
  const leaveYearStart = hrPolicy.leave_year_start || "04-01"; // MM-DD

  // Calculate next year-end from leave_year_start
  const now = new Date();
  const [sm, sd] = leaveYearStart.split("-").map(Number);
  let yearEnd = new Date(now.getFullYear(), sm - 1, sd);
  // if leave year start is in the past (already started), year end is next year's start - 1 day
  if (yearEnd <= now) yearEnd = new Date(now.getFullYear() + 1, sm - 1, sd);
  const daysToYearEnd = differenceInDays(yearEnd, now);
  const nextYearLabel = yearEnd.getFullYear();
  const currentYearLabel = yearEnd.getFullYear() - 1;

  // Staff with unused leave above carry-over limit
  const atRiskStaff = useMemo(() => {
    return staff.filter(s => s.status === "active").map(s => {
      const bal = balances.find(b => b.staff_id === s.id && b.year === currentYearLabel);
      const remaining = bal?.days_remaining ?? annualEntitlement;
      const willCarryOver = carryOverAllowed ? Math.min(remaining, maxCarryOver) : 0;
      const forfeited = Math.max(0, remaining - willCarryOver);
      return { ...s, remaining, willCarryOver, forfeited, balanceId: bal?.id };
    }).filter(s => s.remaining > 0);
  }, [staff, balances, currentYearLabel, carryOverAllowed, maxCarryOver, annualEntitlement]);

  const staffWithForfeiture = atRiskStaff.filter(s => s.forfeited > 0);

  const runCarryOver = useMutation({
    mutationFn: async () => {
      setRunning(true);
      for (const s of atRiskStaff) {
        // Check if next year balance already exists
        const nextBal = balances.find(b => b.staff_id === s.id && b.year === nextYearLabel);
        if (nextBal) continue; // already done
        await secureGateway.create("LeaveBalance", {
          org_id: ORG_ID,
          staff_id: s.id,
          home_id: s.home_ids?.[0] || "",
          year: nextYearLabel,
          annual_entitlement: annualEntitlement + s.willCarryOver,
          days_taken: 0,
          days_remaining: annualEntitlement + s.willCarryOver,
          sick_occurrences: 0,
        });
      }
      setRunning(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      setPreview(false);
      toast.success(`Leave carry-over complete. ${nextYearLabel} balances created.`);
    },
  });

  if (!isAdmin) return null;

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start gap-2">
        <CalendarClock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Year-End Leave Carry Over</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Leave year ends <strong>{format(yearEnd, "d MMMM yyyy")}</strong> ({daysToYearEnd} days away).
            {carryOverAllowed ? ` Staff may carry over up to ${maxCarryOver} days.` : " Carry-over is disabled in HR Policy."}
          </p>
        </div>
        {daysToYearEnd <= 30 && (
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        )}
      </div>

      {staffWithForfeiture.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
          <p className="font-semibold mb-1">⚠ {staffWithForfeiture.length} staff will forfeit days at year end:</p>
          <ul className="space-y-0.5">
            {staffWithForfeiture.slice(0, 5).map(s => (
              <li key={s.id}>{s.full_name} — {s.remaining} days remaining, {s.willCarryOver} carry over, <strong>{s.forfeited} forfeited</strong></li>
            ))}
            {staffWithForfeiture.length > 5 && <li>…and {staffWithForfeiture.length - 5} more</li>}
          </ul>
        </div>
      )}

      {preview && (
        <div className="bg-muted/20 rounded-lg p-3 space-y-1 text-xs max-h-48 overflow-y-auto">
          <p className="font-semibold mb-2">Preview: {nextYearLabel} balances</p>
          {atRiskStaff.map(s => (
            <div key={s.id} className="flex justify-between">
              <span>{s.full_name}</span>
              <span className="text-muted-foreground">{annualEntitlement} + {s.willCarryOver} carried = <strong>{annualEntitlement + s.willCarryOver} days</strong></span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setPreview(p => !p)}>
          {preview ? "Hide Preview" : "Preview Balances"}
        </Button>
        <Button size="sm" disabled={running || runCarryOver.isPending}
          onClick={() => runCarryOver.mutate()}
          className="gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {running ? "Running…" : `Run Carry-Over → ${nextYearLabel}`}
        </Button>
      </div>
    </div>
  );
}