import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import MoveOnChecklist from "./MoveOnChecklist";
import PostMoveOnContactLog from "./PostMoveOnContactLog";

const CHECKLISTS = {
  planning: [
    "Pathway plan updated with move-on goal",
    "Target move-on date agreed",
    "Move-on type identified",
    "LA social worker consulted",
    "Personal adviser updated",
    "Young person's preferences recorded",
    "ILS readiness assessment done",
    "Financial needs assessed"
  ],
  accommodation_found: [
    "Property identified and viewed",
    "Address confirmed",
    "Landlord details recorded",
    "Tenancy type confirmed",
    "Rent amount known",
    "Deposit arrangement confirmed",
    "Tenancy start date agreed",
    "LA approved the accommodation"
  ],
  benefits_ready: [
    "Universal Credit claim submitted",
    "UC reference number recorded",
    "Housing benefit entitlement calculated",
    "Benefits sufficient to cover rent?",
    "If shortfall: plan in place",
    "Setting up home grant applied for",
    "Furniture pack arranged",
    "Bank account active for payments"
  ],
  confirmed: [
    "Tenancy agreement signed",
    "Keys received",
    "Utilities set up",
    "GP registered at new address",
    "Royal Mail redirect arranged",
    "Emergency contacts updated",
    "Post-move support confirmed",
    "Staying Close arrangement agreed",
    "Young person signed move-on plan"
  ]
};

export default function MoveOnDetail({ resident, home, ilsScore, onBack }) {
  const queryClient = useQueryClient();
  const [showContacts, setShowContacts] = useState(false);

  const { data: plan } = useQuery({
    queryKey: ["move-on-plan", resident.id],
    queryFn: () =>
      secureGateway.filter("MoveOnPlan", { resident_id: resident.id })
        .then(plans => plans[0] || null),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ["post-move-contacts", resident.id],
    queryFn: () => secureGateway.filter("PostMoveOnContact", { resident_id: resident.id }, "-contact_date", 50),
  });

  const daysUntilBirthday = useMemo(() => {
    if (!resident.dob) return null;
    const today = new Date();
    const birthDate = new Date(resident.dob);
    const nextBirthday = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    if (nextBirthday < today) {
      nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
    }
    return Math.ceil((nextBirthday - today) / (1000 * 60 * 60 * 24));
  }, [resident.dob]);

  const getStatusBadge = (status) => {
    const badges = {
      no_plan: { label: "No Plan", color: "bg-slate-100 text-slate-700" },
      planning: { label: "Planning", color: "bg-slate-100 text-slate-700" },
      accommodation_found: { label: "Accommodation Found", color: "bg-blue-100 text-blue-700" },
      benefits_ready: { label: "Benefits Ready", color: "bg-amber-100 text-amber-700" },
      confirmed: { label: "Confirmed", color: "bg-green-100 text-green-700" },
      moved_out: { label: "Moved Out", color: "bg-purple-100 text-purple-700" },
      breakdown: { label: "Breakdown", color: "bg-red-100 text-red-700" }
    };
    const badge = badges[status] || badges.no_plan;
    return <Badge className={`${badge.color}`}>{badge.label}</Badge>;
  };

  const getCurrentChecklist = () => {
    if (!plan) return [];
    return CHECKLISTS[plan.status] || [];
  };

  const getCompletionPercent = () => {
    if (!plan) return 0;
    const checklist = getCurrentChecklist();
    // Map checklist items to plan fields
    let completed = 0;
    checklist.forEach((item) => {
      if (item.includes("Pathway plan") && plan.pathway_plan_updated) completed++;
      if (item.includes("Target move-on") && plan.target_move_on_date) completed++;
      if (item.includes("Move-on type") && plan.move_on_type) completed++;
      if (item.includes("LA") && plan.la_agreed) completed++;
      if (item.includes("Universal Credit") && plan.universal_credit_submitted) completed++;
      if (item.includes("Accommodation") && plan.accommodation_identified) completed++;
      if (item.includes("Tenancy") && plan.tenancy_confirmed_date) completed++;
      if (item.includes("Bank") && plan.bank_account_active) completed++;
    });
    return Math.round((completed / checklist.length) * 100);
  };

  return (
    <div className="space-y-6 bg-card border border-border rounded-lg p-6">
      {/* Header */}
      <div className="pb-4 border-b border-border">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{resident.display_name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{home?.name}</p>
          </div>
          <div className="text-right">
            {getStatusBadge(plan?.status || "no_plan")}
            {daysUntilBirthday && (
              <div className={`mt-2 text-sm font-medium ${daysUntilBirthday < 90 ? "text-red-600" : "text-amber-600"}`}>
                {daysUntilBirthday} days to 21
              </div>
            )}
          </div>
        </div>

        {ilsScore < 60 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              ILS score is {ilsScore}%. Consider whether this resident is ready to move on independently.
            </p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">Overall Readiness</p>
          <p className="text-sm font-bold text-blue-600">{getCompletionPercent()}%</p>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${getCompletionPercent()}%` }} />
        </div>
      </div>

      {/* Stage Details */}
      {plan && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Target Move-On Date</p>
            <p className="font-semibold">{plan.target_move_on_date ? new Date(plan.target_move_on_date).toLocaleDateString() : "Not set"}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1">Move-On Type</p>
            <p className="font-semibold capitalize">{plan.move_on_type?.replace(/_/g, " ") || "Not specified"}</p>
          </div>
          {plan.accommodation_address && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Accommodation</p>
              <p className="font-semibold text-sm">{plan.accommodation_address}</p>
            </div>
          )}
          {plan.rent_amount_weekly && (
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Rent (weekly)</p>
              <p className="font-semibold">£{plan.rent_amount_weekly.toFixed(2)}</p>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      <MoveOnChecklist stage={plan?.status || "planning"} checklist={getCurrentChecklist()} plan={plan} />

      {/* Post Move-On Contacts */}
      {plan?.status === "moved_out" && (
        <PostMoveOnContactLog resident={resident} contacts={contacts} plan={plan} />
      )}

      <Button variant="outline" onClick={onBack} className="w-full">Back</Button>
    </div>
  );
}