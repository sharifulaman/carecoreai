import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, AlertTriangle, ChevronDown, ChevronRight, User } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { toast } from "sonner";

const DEFAULT_CHECKLIST = [
  { id: "contract_sent", label: "Contract sent and signed" },
  { id: "dbs_submitted", label: "DBS application submitted" },
  { id: "right_to_work", label: "Right to work documents verified" },
  { id: "induction_scheduled", label: "Induction scheduled" },
  { id: "it_access", label: "IT access set up" },
  { id: "uniform_issued", label: "Uniform / equipment issued" },
  { id: "bank_details", label: "Bank details collected" },
  { id: "emergency_contact", label: "Emergency contact confirmed" },
  { id: "first_supervision", label: "First supervision scheduled" },
  { id: "care_certificate", label: "Care Certificate started (mandatory training)" },
  { id: "safeguarding_booked", label: "Safeguarding training booked" },
  { id: "added_rota", label: "Added to home rota" },
  { id: "introduced_team", label: "Introduced to team" },
];

const PROBATION_OUTCOMES = [
  { value: "passed", label: "Passed", color: "bg-green-100 text-green-700" },
  { value: "extended", label: "Extended", color: "bg-amber-100 text-amber-700" },
  { value: "failed", label: "Failed", color: "bg-red-100 text-red-700" },
];

function StaffOnboardingCard({ member, user, onUpdate }) {
  const [expanded, setExpanded] = useState(false);
  // Local state for instant UI response
  const [localChecklist, setLocalChecklist] = useState(member.onboarding_checklist || {});
  const debounceRef = useRef(null);

  const progress = DEFAULT_CHECKLIST.filter(i => localChecklist[i.id]?.done).length;
  const pct = Math.round((progress / DEFAULT_CHECKLIST.length) * 100);

  const toggleItem = useCallback((itemId) => {
    // RTW checklist item cannot be manually ticked — it mirrors rtw_checked field
    if (itemId === "right_to_work" && !member.rtw_checked) {
      return; // blocked — must record actual RTW check in staff profile
    }
    const now = new Date().toISOString().split("T")[0];
    setLocalChecklist(prev => {
      const current = prev[itemId] || {};
      const next = {
        ...prev,
        [itemId]: current.done
          ? { done: false }
          : { done: true, completed_by: user?.full_name, completed_date: now },
      };
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onUpdate(member.id, next), 600);
      return next;
    });
  }, [member.id, user, onUpdate, member.rtw_checked]);

  const daysToStart = member.start_date
    ? differenceInDays(parseISO(member.start_date), new Date())
    : null;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/20 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0 overflow-hidden">
          {member.photo_url ? <img src={member.photo_url} alt="" className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{member.full_name}</span>
            <Badge className="text-[10px] capitalize bg-muted text-muted-foreground">{member.role?.replace(/_/g, " ")}</Badge>
            {daysToStart !== null && (
              <Badge className={daysToStart >= 0 ? "text-[10px] bg-blue-100 text-blue-700" : "text-[10px] bg-green-100 text-green-700"}>
                {daysToStart >= 0 ? `Starts in ${daysToStart}d` : `Started ${Math.abs(daysToStart)}d ago`}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{progress}/{DEFAULT_CHECKLIST.length}</span>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
      </div>

      {expanded && (
        <div className="border-t border-border p-4 space-y-2">
          {DEFAULT_CHECKLIST.map(item => {
            const state = localChecklist[item.id] || {};
            // RTW item: auto-reflect rtw_checked field, block manual toggle
            const isRTWItem = item.id === "right_to_work";
            const isDone = isRTWItem ? !!member.rtw_checked : !!state.done;
            const isBlocked = isRTWItem && !member.rtw_checked;
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-start gap-2.5 p-2 rounded-lg transition-colors ${isBlocked ? "opacity-60 cursor-not-allowed bg-red-50/50" : "hover:bg-muted/30 cursor-pointer"}`}
              >
                {isDone
                  ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  : <Circle className={`w-4 h-4 shrink-0 mt-0.5 ${isBlocked ? "text-red-400" : "text-muted-foreground"}`} />}
                <div className="flex-1">
                  <p className={`text-xs ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.label}</p>
                  {isRTWItem && member.rtw_checked && (
                    <p className="text-[10px] text-green-600 mt-0.5">✓ RTW check recorded on {member.rtw_check_date}</p>
                  )}
                  {isRTWItem && !member.rtw_checked && (
                    <p className="text-[10px] text-red-500 mt-0.5">⚠ Record RTW check in Staff Profile → DBS & Compliance</p>
                  )}
                  {!isRTWItem && isDone && state.completed_by && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ✓ {state.completed_by} · {state.completed_date}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProbationBanner({ staffOnProbation, onMarkOutcome }) {
  const [expanded, setExpanded] = useState(false);
  if (staffOnProbation.length === 0) return null;
  return (
    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-900/10 dark:border-amber-800">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-sm font-semibold text-amber-700">
          {staffOnProbation.length} staff member{staffOnProbation.length !== 1 ? "s" : ""} have probation reviews due
        </span>
        {expanded ? <ChevronDown className="w-4 h-4 text-amber-600 ml-auto" /> : <ChevronRight className="w-4 h-4 text-amber-600 ml-auto" />}
      </div>
      {expanded && (
        <div className="mt-3 space-y-2">
          {staffOnProbation.map(s => (
            <div key={s.id} className="flex items-center justify-between bg-white dark:bg-card p-3 rounded-lg border border-amber-100 dark:border-amber-800 gap-3 flex-wrap">
              <div>
                <p className="text-sm font-medium">{s.full_name}</p>
                <p className="text-xs text-muted-foreground">Probation ends: {s.probation_end_date}</p>
              </div>
              <div className="flex gap-1.5">
                {PROBATION_OUTCOMES.map(o => (
                  <Button
                    key={o.value}
                    size="sm"
                    variant="outline"
                    className={`h-7 text-xs ${o.color} border-current`}
                    onClick={() => onMarkOutcome(s.id, o.value)}
                  >
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function OnboardingTab({ user, staff = [] }) {
  const queryClient = useQueryClient();
  const alertDays = 14;

  // Staff onboarding: start_date within next 30 or last 14 days
  const today = new Date();
  const onboardingStaff = staff.filter(s => {
    if (!s.start_date) return false;
    const diff = differenceInDays(parseISO(s.start_date), today);
    return diff <= 30 && diff >= -14;
  });

  // Probation alerts
  const probationDue = staff.filter(s => {
    if (!s.probation_end_date || s.probation_outcome) return false;
    const diff = differenceInDays(parseISO(s.probation_end_date), today);
    return diff >= 0 && diff <= alertDays;
  });

  const updateChecklistMutation = useMutation({
    mutationFn: ({ staffId, checklist }) =>
      secureGateway.update("StaffProfile", staffId, { onboarding_checklist: checklist }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff"] }),
  });

  const markProbationMutation = useMutation({
    mutationFn: ({ staffId, outcome }) =>
      secureGateway.update("StaffProfile", staffId, { probation_outcome: outcome, probation_reviewed_date: new Date().toISOString().split("T")[0] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success("Probation outcome recorded");
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-base">Staff Onboarding</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Staff starting within 30 days or started within the last 14 days.</p>
      </div>

      <ProbationBanner
        staffOnProbation={probationDue}
        onMarkOutcome={(staffId, outcome) => markProbationMutation.mutate({ staffId, outcome })}
      />

      {onboardingStaff.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No staff in onboarding window right now.</p>
          <p className="text-xs text-muted-foreground mt-1">This shows staff starting within 30 days or started in the last 14 days.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {onboardingStaff.map(member => (
            <StaffOnboardingCard
              key={member.id}
              member={member}
              user={user}
              onUpdate={(staffId, checklist) => updateChecklistMutation.mutate({ staffId, checklist })}
            />
          ))}
        </div>
      )}
    </div>
  );
}