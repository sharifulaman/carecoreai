import { ChevronRight } from "lucide-react";

const STEPS = [
  {
    role: "Support Worker",
    action: "Submits bill, visit report, support plan or expense claim",
    badge: "submitted",
    filterStatus: null, // submitted = just means it's in any pending state
    badgeColor: "bg-amber-400/20 text-amber-600 border-amber-400/40",
    cardColor: "border-amber-400/30 bg-amber-50/60 dark:bg-amber-900/10",
    activeColor: "ring-2 ring-amber-400",
    roleColor: "text-amber-700 dark:text-amber-400",
  },
  {
    role: "Team Leader / TM",
    action: "1st approval gate — reviews & approves or rejects",
    badge: "pending_tl",
    filterStatus: "pending_tl",
    badgeColor: "bg-blue-400/20 text-blue-600 border-blue-400/40",
    cardColor: "border-blue-400/30 bg-blue-50/60 dark:bg-blue-900/10",
    activeColor: "ring-2 ring-blue-400",
    roleColor: "text-blue-700 dark:text-blue-400",
  },
  {
    role: "Admin Manager",
    action: "2nd approval gate for bills — verifies budget & authorises",
    badge: "pending_admin",
    filterStatus: "pending_admin",
    badgeColor: "bg-purple-400/20 text-purple-600 border-purple-400/40",
    cardColor: "border-purple-400/30 bg-purple-50/60 dark:bg-purple-900/10",
    activeColor: "ring-2 ring-purple-400",
    roleColor: "text-purple-700 dark:text-purple-400",
  },
  {
    role: "Finance Manager",
    action: "Final approval — posts payment to home expenses",
    badge: "pending_finance",
    filterStatus: "pending_finance",
    badgeColor: "bg-emerald-400/20 text-emerald-600 border-emerald-400/40",
    cardColor: "border-emerald-400/30 bg-emerald-50/60 dark:bg-emerald-900/10",
    activeColor: "ring-2 ring-emerald-400",
    roleColor: "text-emerald-700 dark:text-emerald-400",
  },
  {
    role: "Approved & Posted",
    action: "Payment posted to HomeExpense — audit trail complete",
    badge: "approved",
    filterStatus: "approved",
    badgeColor: "bg-green-400/20 text-green-700 border-green-400/40",
    cardColor: "border-green-400/30 bg-green-50/60 dark:bg-green-900/10",
    activeColor: "ring-2 ring-green-400",
    roleColor: "text-green-700 dark:text-green-500",
  },
];

export default function ApprovalFlowDiagram({ activeStatus, onFilter }) {
  const handleClick = (step) => {
    if (!onFilter) return;
    // Toggle off if already active
    if (activeStatus === step.filterStatus) {
      onFilter("all");
    } else {
      onFilter(step.filterStatus || "all");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Approval Workflow — Bill Journey {onFilter && <span className="normal-case font-normal">(click a stage to filter)</span>}
      </p>

      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-stretch gap-0">
        {STEPS.map((step, i) => {
          const isActive = activeStatus === step.filterStatus && step.filterStatus !== null;
          return (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <button
                onClick={() => handleClick(step)}
                className={`flex-1 rounded-xl border p-3 flex flex-col gap-2 min-h-[110px] text-left transition-all ${step.cardColor} ${isActive ? step.activeColor : ""} ${onFilter ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
              >
                <p className={`text-xs font-bold leading-tight ${step.roleColor}`}>{step.role}</p>
                <p className="text-xs text-muted-foreground leading-snug flex-1">{step.action}</p>
                <span className={`self-start text-xs px-2 py-0.5 rounded-full border font-medium ${step.badgeColor}`}>
                  {step.badge}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mx-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="flex md:hidden flex-col gap-2">
        {STEPS.map((step, i) => {
          const isActive = activeStatus === step.filterStatus && step.filterStatus !== null;
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="flex flex-col items-center shrink-0 pt-1">
                <div className={`w-2 h-2 rounded-full border-2 ${step.cardColor}`} />
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-border mt-1 h-4" />}
              </div>
              <button
                onClick={() => handleClick(step)}
                className={`flex-1 rounded-xl border p-3 flex flex-col gap-1 text-left transition-all ${step.cardColor} ${isActive ? step.activeColor : ""} ${onFilter ? "hover:opacity-80 cursor-pointer" : "cursor-default"}`}
              >
                <p className={`text-xs font-bold ${step.roleColor}`}>{step.role}</p>
                <p className="text-xs text-muted-foreground">{step.action}</p>
                <span className={`self-start text-xs px-2 py-0.5 rounded-full border font-medium ${step.badgeColor}`}>
                  {step.badge}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}