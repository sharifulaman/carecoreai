import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function AdvocacyTab({ residents, homes, staff, user }) {
  const qc = useQueryClient();
  const [selectedResident, setSelectedResident] = useState(residents[0]?.id || null);
  const [recordsMap, setRecordsMap] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [newSession, setNewSession] = useState({ date: "", duration_minutes: 30, notes: "", outcome: "" });

  const { data: records = [] } = useQuery({
    queryKey: ["advocacy-records"],
    queryFn: () => secureGateway.filter("AdvocacyRecord", { is_deleted: false }),
  });

  const resident = residents.find(r => r.id === selectedResident);
  const record = records.find(r => r.resident_id === selectedResident);

  const handleInformOfRight = async () => {
    if (!selectedResident) return;
    if (record && record.informed_of_right) {
      toast.error("Already recorded as informed");
      return;
    }

    if (record) {
      await secureGateway.update("AdvocacyRecord", record.id, {
        informed_of_right: true,
        informed_date: new Date().toISOString().split("T")[0],
        informed_by_id: user?.id,
        informed_by_name: user?.full_name,
      });
    } else {
      await secureGateway.create("AdvocacyRecord", {
        org_id: ORG_ID,
        resident_id: selectedResident,
        resident_name: resident?.display_name,
        home_id: resident?.home_id,
        informed_of_right: true,
        informed_date: new Date().toISOString().split("T")[0],
        informed_by_id: user?.id,
        informed_by_name: user?.full_name,
      });
    }

    qc.invalidateQueries({ queryKey: ["advocacy-records"] });
    toast.success("Recorded: child informed of right to advocacy");
  };

  const handleRequestAdvocate = async () => {
    const advocateName = prompt("Advocate name:");
    if (!advocateName) return;
    const organisation = prompt("Organisation:");
    const contact = prompt("Contact (phone/email):");

    if (record) {
      await secureGateway.update("AdvocacyRecord", record.id, {
        advocate_requested: true,
        advocate_name: advocateName,
        advocate_organisation: organisation,
        advocate_contact: contact,
        is_active: true,
      });
    } else {
      await secureGateway.create("AdvocacyRecord", {
        org_id: ORG_ID,
        resident_id: selectedResident,
        resident_name: resident?.display_name,
        home_id: resident?.home_id,
        advocate_requested: true,
        advocate_name: advocateName,
        advocate_organisation: organisation,
        advocate_contact: contact,
        is_active: true,
      });
    }

    qc.invalidateQueries({ queryKey: ["advocacy-records"] });
    toast.success("Advocate assigned");
  };

  const handleAddSession = async () => {
    if (!newSession.date) {
      toast.error("Session date required");
      return;
    }

    const sessions = record?.sessions || [];
    sessions.push({ ...newSession, id: Math.random().toString(36).slice(2) });

    await secureGateway.update("AdvocacyRecord", record.id, { sessions, first_meeting_date: sessions[0]?.date });
    qc.invalidateQueries({ queryKey: ["advocacy-records"] });
    setNewSession({ date: "", duration_minutes: 30, notes: "", outcome: "" });
    toast.success("Session logged");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Advocacy Support</h3>
        {residents.length > 1 && (
          <Select value={selectedResident} onValueChange={setSelectedResident}>
            <SelectTrigger className="w-56 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Not Informed Alert */}
      {!record?.informed_of_right && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <p className="text-sm text-amber-700 font-medium mb-3">⚠️ {resident?.display_name} has NOT been informed of their right to an independent advocate.</p>
          <p className="text-xs text-amber-700 mb-3">This is a statutory requirement under the Children's Homes Regulations.</p>
          <Button onClick={handleInformOfRight} className="bg-amber-600 hover:bg-amber-700">Record: Informed of Right to Advocate</Button>
        </div>
      )}

      {/* Status Card */}
      {record && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Informed of Right</p>
              <p className="text-sm font-medium mt-1">{record.informed_of_right ? "✓ Yes" : "✗ No"}</p>
              {record.informed_date && <p className="text-xs text-muted-foreground mt-1">{record.informed_date}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Advocate Assigned</p>
              <p className="text-sm font-medium mt-1">{record.advocate_requested ? "✓ Yes" : "✗ No"}</p>
            </div>
            {record.advocate_name && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground font-medium">Advocate Details</p>
                <p className="text-sm font-medium mt-1">{record.advocate_name}</p>
                {record.advocate_organisation && <p className="text-xs text-muted-foreground">{record.advocate_organisation}</p>}
                {record.advocate_contact && <p className="text-xs text-muted-foreground">{record.advocate_contact}</p>}
              </div>
            )}
            {record.sessions && record.sessions.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground font-medium">Sessions Logged</p>
                <p className="text-sm font-medium mt-1">{record.sessions.length}</p>
              </div>
            )}
          </div>

          {!record.advocate_requested && record.informed_of_right && (
            <Button onClick={handleRequestAdvocate} variant="outline" className="w-full">Request/Assign Advocate</Button>
          )}
        </div>
      )}

      {/* Sessions */}
      {record?.advocate_requested && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm">Advocacy Sessions</h4>

          {record.sessions && record.sessions.length > 0 && (
            <div className="space-y-2">
              {record.sessions.map((s, i) => (
                <div key={i} className="border border-border rounded-lg p-3 text-xs space-y-1">
                  <p className="font-medium">{s.date} · {s.duration_minutes}m</p>
                  {s.outcome && <p className="text-muted-foreground">Outcome: {s.outcome}</p>}
                  {s.notes && <p className="text-muted-foreground">{s.notes}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-xs font-medium">Log New Session</p>
            <Input type="date" value={newSession.date} onChange={e => setNewSession(p => ({ ...p, date: e.target.value }))} className="text-xs h-8" placeholder="Session date" />
            <Input type="number" min="0" value={newSession.duration_minutes} onChange={e => setNewSession(p => ({ ...p, duration_minutes: parseInt(e.target.value) || 0 }))} className="text-xs h-8" placeholder="Duration (minutes)" />
            <Textarea value={newSession.notes} onChange={e => setNewSession(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Session notes..." className="text-xs" />
            <Input value={newSession.outcome} onChange={e => setNewSession(p => ({ ...p, outcome: e.target.value }))} className="text-xs h-8" placeholder="Outcome/actions" />
            <Button onClick={handleAddSession} size="sm" className="w-full">Log Session</Button>
          </div>
        </div>
      )}

      {record?.child_feedback && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="text-xs text-green-700 font-medium mb-2">Child's Feedback</p>
          <p className="text-sm text-foreground">{record.child_feedback}</p>
        </div>
      )}
    </div>
  );
}