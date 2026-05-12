import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, Clock, Check } from "lucide-react";
import { toast } from "sonner";
import MissingReportForm from "./MissingReportForm";
import MissingDetailPanel from "./MissingDetailPanel";

const STATUS_BADGES = {
  active: { bg: "bg-red-500/10", text: "text-red-600", label: "Active" },
  returned: { bg: "bg-amber-500/10", text: "text-amber-600", label: "Pending Interview" },
  closed: { bg: "bg-green-500/10", text: "text-green-600", label: "Closed" },
};

function hoursAgo(dt) {
  if (!dt) return null;
  return Math.round((Date.now() - new Date(dt).getTime()) / 3600000);
}

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MissingTab({ residents, homes, staff, user, isAdminOrTL, mfhRecords = [] }) {
   const qc = useQueryClient();
   const [showForm, setShowForm] = useState(false);
   const [selectedResident, setSelectedResident] = useState(null);
   const [selectedRecord, setSelectedRecord] = useState(null);
   const [filterStatus, setFilterStatus] = useState("all");
   const [filterHome, setFilterHome] = useState("all");

  const activeRecords = useMemo(() => mfhRecords.filter(r => r.status === "active"), [mfhRecords]);
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const filtered = useMemo(() => {
    let result = mfhRecords;
    if (filterStatus !== "all") result = result.filter(r => r.status === filterStatus);
    if (filterHome !== "all") result = result.filter(r => r.home_id === filterHome);
    return result.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
  }, [mfhRecords, filterStatus, filterHome]);

  const stats = useMemo(() => ({
    total: mfhRecords.length,
    active: activeRecords.length,
    returnedThisMonth: mfhRecords.filter(r => {
      if (!r.returned_datetime) return false;
      const d = new Date(r.returned_datetime);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length,
    interviewsOutstanding: mfhRecords.filter(r => r.status === "returned" && !r.return_interview_completed).length,
  }), [mfhRecords, activeRecords]);

  return (
    <div className="space-y-4">
      {/* Active Missing Banner */}
      {activeRecords.length > 0 && (
        <div className="border-2 border-red-500 bg-red-500/5 rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-700 text-lg">⚠️ ACTIVE MISSING — {activeRecords.length} child(ren)</h3>
              <div className="mt-3 space-y-2">
                {activeRecords.map(r => {
                  const hours = hoursAgo(r.last_seen_datetime);
                  return (
                    <div key={r.id} className="flex items-center justify-between bg-white p-2 rounded border border-red-200">
                      <div className="text-sm">
                        <span className="font-semibold">{r.resident_name}</span> · {homeMap[r.home_id]?.name || "—"} · Missing {hours}h
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700 font-medium">
                        {r.reported_to_police ? "Police: " + r.police_reference_number : "Not reported to police"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">Total MFH Episodes</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className={`bg-card border border-border rounded-lg p-3 ${stats.active > 0 ? "border-red-500 bg-red-500/5" : ""}`}>
          <p className="text-xs text-muted-foreground font-medium">Currently Missing</p>
          <p className={`text-2xl font-bold mt-1 ${stats.active > 0 ? "text-red-600" : ""}`}>{stats.active}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium">Returned This Month</p>
          <p className="text-2xl font-bold mt-1">{stats.returnedThisMonth}</p>
        </div>
        <div className={`bg-card border border-border rounded-lg p-3 ${stats.interviewsOutstanding > 0 ? "border-amber-500 bg-amber-500/5" : ""}`}>
          <p className="text-xs text-muted-foreground font-medium">Interviews Outstanding</p>
          <p className={`text-2xl font-bold mt-1 ${stats.interviewsOutstanding > 0 ? "text-amber-600" : ""}`}>{stats.interviewsOutstanding}</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        {isAdminOrTL && (
          <Select value={filterHome} onValueChange={setFilterHome}>
            <SelectTrigger className="w-40 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Homes</SelectItem>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        <Button onClick={() => { setSelectedResident(null); setShowForm(true); }} className="gap-1 bg-red-600 hover:bg-red-700">
          <Plus className="w-4 h-4" /> Report Missing
        </Button>
      </div>

      {/* Records Table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold">Resident</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Home</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Missing Since</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Duration</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Police Ref</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Return Interview</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground text-sm">No records found.</td></tr>
            ) : filtered.map(r => {
              const hours = hoursAgo(r.last_seen_datetime);
              const s = STATUS_BADGES[r.status] || STATUS_BADGES.closed;
              return (
                <tr key={r.id} onClick={() => setSelectedRecord(r)} className="border-b border-border/50 last:border-0 hover:bg-muted/20 cursor-pointer">
                  <td className="px-4 py-3">{r.resident_name}</td>
                  <td className="px-4 py-3 text-xs">{homeMap[r.home_id]?.name || "—"}</td>
                  <td className="px-4 py-3 text-xs">{formatDateTime(r.last_seen_datetime)}</td>
                  <td className="px-4 py-3 text-xs font-medium">{hours}h</td>
                  <td className="px-4 py-3 text-xs">{r.police_reference_number || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.bg} ${s.text}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.status === "returned" ? (
                      r.return_interview_completed ? <Check className="w-4 h-4 text-green-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Forms & Panels */}
      {showForm && <MissingReportForm resident={selectedResident} residents={residents} homes={homes} staff={staff} user={user} onClose={() => { setShowForm(false); setSelectedResident(null); }} onSave={() => { qc.invalidateQueries({ queryKey: ["mfh-records"] }); setShowForm(false); }} />}
      {selectedRecord && <MissingDetailPanel record={selectedRecord} resident={residents.find(r => r.id === selectedRecord.resident_id)} staff={staff} onClose={() => setSelectedRecord(null)} onUpdate={() => qc.invalidateQueries({ queryKey: ["mfh-records"] })} />}
    </div>
  );
}