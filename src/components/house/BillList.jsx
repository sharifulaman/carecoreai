import { PoundSterling, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  pending: "bg-amber-500/10 text-amber-500",
  paid: "bg-green-500/10 text-green-500",
  overdue: "bg-red-500/10 text-red-500",
  disputed: "bg-purple-500/10 text-purple-500",
};

const TYPE_LABELS = {
  utilities: "Utilities", council_tax: "Council Tax", insurance: "Insurance",
  cleaning: "Cleaning", maintenance: "Maintenance", rent: "Rent", other: "Other",
};

export default function BillList({ bills, canEdit, onMarkPaid }) {
  if (bills.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <PoundSterling className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No bills found.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border divide-y divide-border overflow-x-auto">
      {bills.map(b => (
        <div key={b.id} className="flex flex-col md:flex-row md:items-center md:justify-between px-4 md:px-5 py-3 md:py-4 gap-2 md:gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-medium text-xs md:text-sm">{TYPE_LABELS[b.bill_type] || b.bill_type}</p>
              {b.is_direct_debit && <span className="text-[9px] md:text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full">DD</span>}
              {b.is_recurring && <span className="text-[9px] md:text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Recurring</span>}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {b.home_name || "—"} · Due: {b.due_date || "—"}
              {b.supplier ? ` · ${b.supplier}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <p className="font-semibold text-sm">£{(b.amount || 0).toLocaleString()}</p>
            <Badge className={cn("text-xs capitalize", STATUS_COLORS[b.status])}>{b.status}</Badge>
            {canEdit && b.status !== "paid" && onMarkPaid && (
              <button onClick={() => onMarkPaid(b.id)} className="text-green-600 hover:text-green-700" title="Mark as paid">
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}