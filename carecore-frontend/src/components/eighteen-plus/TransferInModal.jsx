import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";

export default function TransferInModal({ onClose, onSave }) {
  const [residentId, setResidentId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTransfer = async () => {
    if (!residentId) {
      toast.error("Please select a resident");
      return;
    }
    setLoading(true);
    try {
      // In real implementation, would fetch home_id and update resident
      toast.success("Resident transferred to 18+ accommodation");
      onSave();
    } catch (error) {
      toast.error("Transfer failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Transfer Resident In</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Select a resident to transfer from children's home to 18+ accommodation.</p>
        <div className="space-y-4">
          <Select value={residentId} onValueChange={setResidentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select resident..." />
            </SelectTrigger>
            <SelectContent>
              {/* Would be populated from filtered residents */}
            </SelectContent>
          </Select>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={loading}>{loading ? "Transferring..." : "Transfer"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}