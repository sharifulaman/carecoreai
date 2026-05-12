import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, LogOut, CheckCircle2, Circle, Loader2, FileText } from "lucide-react";
import { addWeeks, format, parseISO } from "date-fns";
import { toast } from "sonner";

const OFFBOARDING_ITEMS = [
  { id: "keys_returned", label: "Keys / access cards returned" },
  { id: "uniform_returned", label: "Uniform / PPE returned" },
  { id: "equipment_returned", label: "Equipment returned (phone, tablet, etc.)" },
  { id: "it_access_removed", label: "IT access / system logins removed" },
  { id: "payroll_notified", label: "Payroll notified of leaving date" },
  { id: "final_payslip", label: "Final payslip generated" },
  { id: "p45_issued", label: "P45 issued" },
  { id: "reference_agreed", label: "Reference request confirmed" },
  { id: "handover_complete", label: "Handover notes completed" },
  { id: "exit_interview", label: "Exit interview conducted" },
];

export default function OffboardingModal({ member, org, onClose, onComplete }) {
  const queryClient = useQueryClient();
  const hrPolicy = org?.hr_policy || {};
  const noticePeriodWeeks = hrPolicy.probation_months ? Math.round(hrPolicy.probation_months * 0.5) : 4;

  const [step, setStep] = useState(1); // 1 = notice period, 2 = checklist, 3 = letter
  const [resignDate, setResignDate] = useState(new Date().toISOString().split("T")[0]);
  const [lastWorkingDay, setLastWorkingDay] = useState(
    format(addWeeks(new Date(), noticePeriodWeeks), "yyyy-MM-dd")
  );
  const [checklist, setChecklist] = useState({});
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [letter, setLetter] = useState("");

  const toggleItem = (id) => setChecklist(c => ({ ...c, [id]: !c[id] }));
  const completedCount = Object.values(checklist).filter(Boolean).length;

  const handleResignDateChange = (d) => {
    setResignDate(d);
    setLastWorkingDay(format(addWeeks(parseISO(d), noticePeriodWeeks), "yyyy-MM-dd"));
  };

  const generateLetter = async () => {
    setGeneratingLetter(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional resignation acceptance letter for a UK care organisation.

Details:
- Organisation name: ${org?.name || "CareCore"}
- Employee name: ${member.full_name}
- Job title: ${member.job_title || member.role?.replace(/_/g, " ")}
- Resignation received: ${resignDate}
- Last working day: ${lastWorkingDay}
- Notice period: ${noticePeriodWeeks} weeks

The letter should:
1. Acknowledge receipt of the resignation
2. Confirm the last working day
3. State any relevant terms (e.g. holiday pay, final payslip timing)
4. Wish them well
5. Be professional and warm in tone

Format as a complete letter including date, address placeholder, salutation, body, and closing.`,
      });
      setLetter(typeof result === "string" ? result : result?.response || "");
      setStep(3);
    } catch {
      toast.error("Failed to generate letter");
    } finally {
      setGeneratingLetter(false);
    }
  };

  const confirmOffboarding = useMutation({
    mutationFn: async () => {
      await secureGateway.update("StaffProfile", member.id, {
        status: "left",
        end_date: lastWorkingDay,
      });
      await secureGateway.create("AuditTrail", {
        action: "offboard",
        module: "HR",
        record_type: "StaffProfile",
        record_id: member.id,
        description: `${member.full_name} marked as left. Last working day: ${lastWorkingDay}. Offboarding checklist: ${completedCount}/${OFFBOARDING_ITEMS.length} items completed.`,
        new_value: { status: "left", end_date: lastWorkingDay, checklist },
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      toast.success(`${member.full_name} has been offboarded. Status set to 'left'.`);
      onComplete?.();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold">Offboarding — {member.full_name}</h3>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        {/* Step indicators */}
        <div className="flex border-b border-border">
          {["Notice Period", "Checklist", "Acceptance Letter"].map((label, i) => (
            <div key={i} className={`flex-1 text-center py-2 text-xs font-medium border-b-2 transition-colors ${step === i + 1 ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
              {label}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Step 1: Notice period */}
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">
                Required notice period: <strong>{noticePeriodWeeks} weeks</strong> (from HR Policy).
              </p>
              <div>
                <label className="text-xs text-muted-foreground">Resignation Date</label>
                <Input type="date" className="mt-1" value={resignDate} onChange={e => handleResignDateChange(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Last Working Day (auto-calculated)</label>
                <Input type="date" className="mt-1" value={lastWorkingDay} onChange={e => setLastWorkingDay(e.target.value)} />
                <p className="text-[11px] text-muted-foreground mt-1">You can adjust this manually if agreed.</p>
              </div>
              <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-1">
                <p><strong>Staff member:</strong> {member.full_name}</p>
                <p><strong>Current role:</strong> {member.role?.replace(/_/g, " ")}</p>
                <p><strong>Start date:</strong> {member.start_date || "N/A"}</p>
                <p><strong>Last working day:</strong> {lastWorkingDay}</p>
              </div>
            </>
          )}

          {/* Step 2: Offboarding checklist */}
          {step === 2 && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Offboarding Checklist</p>
                <span className="text-xs text-muted-foreground">{completedCount}/{OFFBOARDING_ITEMS.length} completed</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedCount / OFFBOARDING_ITEMS.length) * 100}%` }} />
              </div>
              <div className="space-y-2">
                {OFFBOARDING_ITEMS.map(item => (
                  <div key={item.id} onClick={() => toggleItem(item.id)}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-muted/30 cursor-pointer transition-colors">
                    {checklist[item.id]
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className={`text-xs ${checklist[item.id] ? "line-through text-muted-foreground" : ""}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Letter */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Resignation Acceptance Letter</p>
              </div>
              {letter ? (
                <>
                  <textarea
                    className="w-full text-xs border border-input rounded-md px-3 py-2 min-h-[280px] bg-background font-mono"
                    value={letter}
                    onChange={e => setLetter(e.target.value)}
                  />
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => {
                    navigator.clipboard.writeText(letter);
                    toast.success("Letter copied to clipboard");
                  }}>
                    Copy Letter
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>Generate a professional resignation acceptance letter.</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-between gap-3">
          <Button variant="outline" size="sm" onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}>
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          <div className="flex gap-2">
            {step === 1 && (
              <Button size="sm" onClick={() => setStep(2)}>Next: Checklist →</Button>
            )}
            {step === 2 && (
              <>
                <Button size="sm" variant="outline" onClick={generateLetter} disabled={generatingLetter} className="gap-1.5">
                  {generatingLetter ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                  {generatingLetter ? "Generating…" : "Generate Letter"}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => confirmOffboarding.mutate()} disabled={confirmOffboarding.isPending}>
                  {confirmOffboarding.isPending ? "Saving…" : "Confirm Offboard"}
                </Button>
              </>
            )}
            {step === 3 && (
              <Button size="sm" variant="destructive" onClick={() => confirmOffboarding.mutate()} disabled={confirmOffboarding.isPending}>
                {confirmOffboarding.isPending ? "Saving…" : "Confirm Offboard"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}