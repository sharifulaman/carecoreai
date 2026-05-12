import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";

export default function RejectExpenseModal({ expense, onClose, onConfirm }) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Reject Expense</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <p className="text-sm text-muted-foreground">
          Rejecting <strong>£{(expense.amount || 0).toFixed(2)}</strong> — {expense.description}
        </p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Rejection Reason *</label>
          <Input
            className="mt-1"
            placeholder="Explain why this expense is being rejected…"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={!reason.trim()}
            onClick={() => onConfirm(reason.trim())}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}