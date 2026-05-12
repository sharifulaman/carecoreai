import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES = {
  paid: "bg-green-500/10 text-green-600 border-green-200",
  pending: "bg-amber-500/10 text-amber-600 border-amber-200",
  overdue: "bg-red-500/10 text-red-600 border-red-200",
  disputed: "bg-purple-500/10 text-purple-600 border-purple-200",
};

const BILL_LABELS = {
  utilities: "Utilities", council_tax: "Council Tax", insurance: "Insurance",
  cleaning: "Cleaning", maintenance: "Maintenance", rent: "Rent", other: "Other",
};

export default function BillDetailsModal({ title, bills, onClose, onMarkPaid, canEdit }) {
  const total = bills.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg md:max-w-xl max-h-[95vh] md:max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-border shrink-0 gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold text-base md:text-lg">{title}</h2>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{bills.length} bill{bills.length !== 1 ? "s" : ""} · £{total.toLocaleString(undefined, { minimumFractionDigits: 2 })} total</p>
          </div>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity shrink-0">
            <X className="w-4 md:w-5 h-4 md:h-5 text-muted-foreground" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 divide-y divide-border">
          {bills.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8 md:py-12">No bills to show.</p>
          )}
          {bills.map(b => (
            <div key={b.id} className="px-4 md:px-5 py-3 md:py-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-xs md:text-sm">{BILL_LABELS[b.bill_type] || b.bill_type}</span>
                  {b.is_direct_debit && (
                    <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 font-medium">DD</span>
                  )}
                  {b.is_recurring && (
                    <span className="text-[10px] bg-muted text-muted-foreground border border-border rounded px-1.5 py-0.5 font-medium">Recurring</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{b.supplier || "—"} · {b.home_name || "—"}</p>
                <p className="text-xs text-muted-foreground">Due: {b.due_date ? new Date(b.due_date).toLocaleDateString("en-GB") : "—"}</p>
                {b.notes && <p className="text-xs text-muted-foreground italic mt-0.5">{b.notes}</p>}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="font-bold text-sm">£{(b.amount || 0).toFixed(2)}</span>
                <Badge className={`text-[10px] px-1.5 py-0.5 border ${STATUS_STYLES[b.status] || ""}`}>{b.status}</Badge>
                {canEdit && b.status !== "paid" && (
                  <button
                    onClick={() => onMarkPaid(b.id)}
                    className="flex items-center gap-1 text-[11px] text-green-600 hover:text-green-700 font-medium transition-colors"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Mark Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 md:p-5 border-t border-border shrink-0 flex justify-end">
          <Button variant="outline" onClick={onClose} className="text-sm">Close</Button>
        </div>
      </div>
    </div>
  );
}