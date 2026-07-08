import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

const APPROVAL_CONFIG = {
  draft:         { label: "Draft",               cls: "bg-slate-100 text-slate-600",    icon: null },
  pending_tl:    { label: "Awaiting TL Approval", cls: "bg-amber-100 text-amber-700",   icon: Clock },
  pending_admin: { label: "Awaiting Admin Approval", cls: "bg-blue-100 text-blue-700",  icon: Clock },
  approved:      { label: "Approved",             cls: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  rejected:      { label: "Rejected",             cls: "bg-red-100 text-red-700",       icon: XCircle },
};

export default function BillApprovalBadge({ status, className = "" }) {
  if (!status || status === "draft") return null;
  const cfg = APPROVAL_CONFIG[status] || APPROVAL_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <Badge className={`text-xs gap-1 ${cfg.cls} ${className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {cfg.label}
    </Badge>
  );
}

export { APPROVAL_CONFIG };