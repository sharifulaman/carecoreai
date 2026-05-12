import { ChevronRight } from "lucide-react";

// Maps each role to the pipeline step index it "lives at"
const ROLE_STEP_INDEX = {
  support_worker:  0,
  team_leader:     1,
  team_manager:    1,
  admin_officer:   2,
  admin_manager:   2,
  admin:           2,
  finance:         3,
  finance_officer: 3,
};

const STEPS = [
  {
    role: "Support Worker",
    action: "Submits bill, visit report, support plan or expense claim",
    badge: "submitted",
    filterStatus: null,
  },
  {
    role: "Team Leader / TM",
    action: "1st approval gate — reviews & approves or rejects",
    badge: "pending_tl",
    filterStatus: "pending_tl",
  },
  {
    role: "Admin Manager",
    action: "2nd approval gate for bills — verifies budget & authorises",
    badge: "pending_admin",
    filterStatus: "pending_admin",
  },
  {
    role: "Finance Manager",
    action: "Final approval — posts payment to home expenses",
    badge: "pending_finance",
    filterStatus: "pending_finance",
  },
  {
    role: "Approved & Posted",
    action: "Payment posted to HomeExpense — audit trail complete",
    badge: "approved",
    filterStatus: "approved",
  },
];

const STATUS_BADGE = {
  submitted:       { label: "Awaiting TL",      color: "bg-amber-100 text-amber-700 border-amber-300" },
  pending_tl:      { label: "Awaiting TL",       color: "bg-amber-100 text-amber-700 border-amber-300" },
  pending_admin:   { label: "Awaiting Admin",    color: "bg-amber-100 text-amber-700 border-amber-300" },
  pending_finance: { label: "Awaiting Finance",  color: "bg-blue-100 text-blue-700 border-blue-300" },
  approved:        { label: "Approved & Posted", color: "bg-green-100 text-green-700 border-green-300" },
};

export default function ApprovalsFlowPipeline({ role, activeStatus, onFilter }) {
  const activeStepIndex = ROLE_STEP_INDEX[role] ?? -1;

  const handleClick = (step) => {
    if (!onFilter) return;
    if (activeStatus === step.filterStatus) {
      onFilter("all");
    } else {
      onFilter(step.filterStatus || "all");
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Approval Workflow — Bill Journey
        {onFilter && <span className="normal-case font-normal ml-1">(click a stage to filter)</span>}
      </p>

      {/* Desktop: horizontal scroll */}
      <div className="overflow-x-auto">
        <div className="flex items-stretch gap-0 min-w-[700px]">
          {STEPS.map((step, i) => {
            const isActive = i === activeStepIndex;
            const isFiltered = activeStatus === step.filterStatus && step.filterStatus !== null;
            const badgeCfg = STATUS_BADGE[step.badge] || { label: step.badge, color: "bg-muted text-muted-foreground border-border" };

            return (
              <div key={i} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => handleClick(step)}
                  className={[
                    "flex-1 rounded-xl border-2 p-3 flex flex-col gap-2 min-h-[110px] text-left transition-all",
                    isActive
                      ? "border-blue-500 shadow-md shadow-blue-500/20 bg-blue-50/40"
                      : "border-border bg-background opacity-60 hover:opacity-80",
                    isFiltered && !isActive ? "ring-2 ring-primary/40" : "",
                    onFilter ? "cursor-pointer" : "cursor-default",
                  ].join(" ")}
                >
                  <p className="text-xs font-bold leading-tight text-foreground">{step.role}</p>
                  <p className="text-xs text-muted-foreground leading-snug flex-1">{step.action}</p>
                  <span className={`self-start text-xs px-2 py-0.5 rounded-full border font-medium ${badgeCfg.color}`}>
                    {badgeCfg.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0 mx-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}