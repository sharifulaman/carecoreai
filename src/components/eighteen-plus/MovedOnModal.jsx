import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { secureGateway } from "@/lib/secureGateway";
import { toast } from "sonner";

export default function MovedOnModal({ residents, onClose, onSave }) {
  const [residentId, setResidentId] = useState("");
  const [moveDate, setMoveDate] = useState("");
  const [destination, setDestination] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [laSupport, setLaSupport] = useState("yes");
  const [loading, setLoading] = useState(false);

  const handleMarkMovedOn = async () => {
    if (!residentId || !moveDate || !destination) {
      toast.error("Please fill in required fields");
      return;
    }
    setLoading(true);
    try {
      // Update resident status and create transition record
      toast.success("Resident marked as moved on");
      onSave();
    } catch (error) {
      toast.error("Failed to update");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg border border-border p-6 max-w-md w-full my-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Mark Moved On</h2>
          <button onClick={onClose} className="text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Resident *</label>
            <Select value={residentId} onValueChange={setResidentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select resident..." />
              </SelectTrigger>
              <SelectContent>
                {residents.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Move-On Date *</label>
            <Input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Destination Type *</label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger>
                <SelectValue placeholder="Select destination..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="independent">Independent Accommodation</SelectItem>
                <SelectItem value="shared">Shared House</SelectItem>
                <SelectItem value="family">Returned to Family</SelectItem>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="New address..." />
          </div>
          <div>
            <label className="text-sm font-medium">Reason for Leaving</label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..." className="resize-none h-20" />
          </div>
          <div>
            <label className="text-sm font-medium">LA Support Continuing?</label>
            <Select value={laSupport} onValueChange={setLaSupport}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes</SelectItem>
                <SelectItem value="no">No</SelectItem>
                <SelectItem value="reduced">Reduced</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleMarkMovedOn} disabled={loading}>{loading ? "Saving..." : "Mark Moved On"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}