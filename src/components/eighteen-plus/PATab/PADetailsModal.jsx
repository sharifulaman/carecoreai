import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ORG_ID } from "@/lib/roleConfig";

export default function PADetailsModal({ resident, residents, paDetail, onClose, onSave }) {
  const [residentId, setResidentId] = useState(resident?.id || "");
  const [paName, setPaName] = useState(paDetail?.pa_name || "");
  const [paOrg, setPaOrg] = useState(paDetail?.pa_organisation || "");
  const [paEmail, setPaEmail] = useState(paDetail?.pa_email || "");
  const [paPhone, setPaPhone] = useState(paDetail?.pa_phone || "");
  const [allocatedDate, setAllocatedDate] = useState(paDetail?.pa_allocated_date || new Date().toISOString().split("T")[0]);
  const [la, setLa] = useState(paDetail?.local_authority || "");
  const [laSw, setLaSw] = useState(paDetail?.la_social_worker_name || "");
  const [laSwEmail, setLaSwEmail] = useState(paDetail?.la_social_worker_email || "");
  const [laSwPhone, setLaSwPhone] = useState(paDetail?.la_social_worker_phone || "");
  const [laArea, setLaArea] = useState(paDetail?.la_area || "");
  const [notes, setNotes] = useState(paDetail?.notes || "");

  const selectedResident = residents.find(r => r.id === residentId);

  const handleSave = () => {
    if (!residentId || !paName) {
      alert("Please fill Resident and PA Name");
      return;
    }

    onSave({
      org_id: ORG_ID,
      resident_id: residentId,
      resident_name: selectedResident?.display_name,
      home_id: selectedResident?.home_id,
      pa_name: paName,
      pa_organisation: paOrg,
      pa_email: paEmail,
      pa_phone: paPhone,
      pa_allocated_date: allocatedDate,
      local_authority: la,
      la_social_worker_name: laSw,
      la_social_worker_email: laSwEmail,
      la_social_worker_phone: laSwPhone,
      la_area: laArea,
      notes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">PA Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="text-xs font-medium">Resident *</label>
            <select
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            >
              <option value="">Select resident</option>
              {residents.map(r => (
                <option key={r.id} value={r.id}>{r.display_name || r.initials}</option>
              ))}
            </select>
          </div>

          <h4 className="font-semibold text-sm mt-6">PA Information</h4>

          <div>
            <label className="text-xs font-medium">PA Name *</label>
            <Input
              value={paName}
              onChange={(e) => setPaName(e.target.value)}
              placeholder="Full name"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Organisation</label>
              <Input value={paOrg} onChange={(e) => setPaOrg(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Allocated Date</label>
              <Input type="date" value={allocatedDate} onChange={(e) => setAllocatedDate(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Email</label>
              <Input type="email" value={paEmail} onChange={(e) => setPaEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Phone</label>
              <Input value={paPhone} onChange={(e) => setPaPhone(e.target.value)} className="mt-1" />
            </div>
          </div>

          <h4 className="font-semibold text-sm mt-6">Local Authority</h4>

          <div>
            <label className="text-xs font-medium">Local Authority</label>
            <Input value={la} onChange={(e) => setLa(e.target.value)} placeholder="e.g. London Borough of X" className="mt-1" />
          </div>

          <div>
            <label className="text-xs font-medium">Area / District</label>
            <Input value={laArea} onChange={(e) => setLaArea(e.target.value)} className="mt-1" />
          </div>

          <h4 className="font-semibold text-sm mt-6">LA Social Worker</h4>

          <div>
            <label className="text-xs font-medium">Social Worker Name</label>
            <Input value={laSw} onChange={(e) => setLaSw(e.target.value)} className="mt-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Email</label>
              <Input type="email" value={laSwEmail} onChange={(e) => setLaSwEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium">Phone</label>
              <Input value={laSwPhone} onChange={(e) => setLaSwPhone(e.target.value)} className="mt-1" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border sticky bottom-0 bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  );
}