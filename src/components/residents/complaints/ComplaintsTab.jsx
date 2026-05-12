import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import ComplaintForm from "./ComplaintForm";
import ComplaintDetail from "./ComplaintDetail";

const SEVERITY_COLOURS = {
  minor: "border-l-slate-300",
  moderate: "border-l-amber-400",
  serious: "border-l-orange-500",
  very_serious: "border-l-red-600",
};

const SEVERITY_BADGE = {
  minor: "bg-slate-100 text-slate-700",
  moderate: "bg-amber-100 text-amber-700",
  serious: "bg-orange-100 text-orange-700",
  very_serious: "bg-red-100 text-red-700",
};

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ComplaintsTab({ residents, homes, staff, user, isAdminOrTL, complaints = [] }) {
   const qc = useQueryClient();
   const [selectedResident, setSelectedResident] = useState(residents[0]?.id || null);
   const [showType, setShowType] = useState("complaints"); // "complaints" or "compliments"
   const [showForm, setShowForm] = useState(false);
   const [selectedComplaint, setSelectedComplaint] = useState(null);
   const [filterStatus, setFilterStatus] = useState("all");
   const [dateFrom, setDateFrom] = useState("");
   const [dateTo, setDateTo] = useState("");

  const resident = residents.find(r => r.id === selectedResident);
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  const filtered = useMemo(() => {
    let result = complaints.filter(c => {
      if (showType === "complaints" && c.is_representation) return false;
      if (showType === "compliments" && !c.is_representation) return false;
      if (c.resident_id !== selectedResident) return false;
      return true;
    });

    if (filterStatus !== "all") result = result.filter(c => c.status === filterStatus);
    if (dateFrom) result = result.filter(c => c.received_datetime?.split("T")[0] >= dateFrom);
    if (dateTo) result = result.filter(c => c.received_datetime?.split("T")[0] <= dateTo);

    return result.sort((a, b) => (b.received_datetime || "").localeCompare(a.received_datetime || ""));
  }, [complaints, selectedResident, showType, filterStatus, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const allForResident = complaints.filter(c => c.resident_id === selectedResident && !c.is_representation);
    const compliments = complaints.filter(c => c.resident_id === selectedResident && c.is_representation);
    const open = allForResident.filter(c => c.status === "received" || c.status === "investigating");
    const resolved = allForResident.filter(c => c.status === "resolved" || c.status === "closed");
    const upheld = resolved.filter(c => c.outcome_category === "upheld");
    const overdue = open.filter(c => c.target_resolution_date && c.target_resolution_date < new Date().toISOString().split("T")[0]);

    const resolutionTimes = resolved
      .filter(c => c.received_datetime && c.resolution_date)
      .map(c => daysSince(c.received_datetime));
    const avgTime = resolutionTimes.length > 0 ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) : 0;

    return { open: open.length, resolved: resolved.length, upheld: upheld.length, compliments: compliments.length, avgTime, overdue: overdue.length };
  }, [complaints, selectedResident]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Complaints & Representations</h3>
        {residents.length > 1 && (
          <Select value={selectedResident} onValueChange={setSelectedResident}>
            <SelectTrigger className="w-56 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          <button
            onClick={() => setShowType("complaints")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${showType === "complaints" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Complaints
          </button>
          <button
            onClick={() => setShowType("compliments")}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${showType === "compliments" ? "bg-green-600 text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            Compliments
          </button>
        </div>
        <Button onClick={() => setShowForm(true)} className={`gap-1 ${showType === "compliments" ? "bg-green-600 hover:bg-green-700" : ""}`}>
          <Plus className="w-4 h-4" /> Log {showType === "complaints" ? "Complaint" : "Compliment"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {showType === "complaints" ? (
          <>
            <div className={`bg-card border border-border rounded-lg p-3 ${stats.open > 0 ? "border-amber-300" : ""}`}>
              <p className="text-xs text-muted-foreground font-medium">Open</p>
              <p className={`text-2xl font-bold mt-1 ${stats.open > 0 ? "text-amber-600" : ""}`}>{stats.open}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">Resolved</p>
              <p className="text-2xl font-bold mt-1 text-green-600">{stats.resolved}</p>
            </div>
            {stats.upheld > 0 && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                <p className="text-xs text-red-700 font-medium">Upheld</p>
                <p className="text-2xl font-bold mt-1 text-red-700">{stats.upheld}</p>
              </div>
            )}
            {stats.overdue > 0 && (
              <div className="bg-red-100 border border-red-400 rounded-lg p-3">
                <p className="text-xs text-red-700 font-medium">Overdue</p>
                <p className="text-2xl font-bold mt-1 text-red-700">⚠️ {stats.overdue}</p>
              </div>
            )}
            <div className="bg-card border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium">Avg Resolution</p>
              <p className="text-2xl font-bold mt-1">{stats.avgTime}d</p>
            </div>
          </>
        ) : (
          <div className="bg-green-100 border border-green-300 rounded-lg p-3 col-span-2 sm:col-span-5">
            <p className="text-xs text-green-700 font-medium">Compliments Received</p>
            <p className="text-2xl font-bold mt-1 text-green-700">✓ {stats.compliments}</p>
          </div>
        )}
      </div>

      {/* Statutory Timeline Alert */}
      {showType === "complaints" && stats.overdue > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-sm text-red-700 font-medium">⚠️ {stats.overdue} complaint(s) overdue for resolution (28-day statutory limit)</p>
        </div>
      )}

      {/* Filters */}
      {showType === "complaints" && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="received">Received</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="escalated">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">Date range:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-32 text-xs h-8" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-32 text-xs h-8" />
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center text-muted-foreground text-sm">
            No {showType === "complaints" ? "complaints" : "compliments"} recorded.
          </div>
        ) : (
          filtered.map(c => {
            const daysSinceReceived = daysSince(c.received_datetime);
            const isOverdue = c.target_resolution_date && c.target_resolution_date < new Date().toISOString().split("T")[0];
            return (
              <button
                key={c.id}
                onClick={() => setSelectedComplaint(c)}
                className={`block w-full text-left bg-card border rounded-lg p-4 hover:bg-muted/20 transition-all ${SEVERITY_COLOURS[c.severity] || "border-l-slate-300"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${SEVERITY_BADGE[c.severity] || "bg-slate-100"}`}>
                        {c.severity}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "resolved" ? "bg-green-100 text-green-700" : c.status === "investigating" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="font-semibold text-sm">{c.summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.complainant_type === "anonymous" ? "Anonymous" : c.complainant_name} · {c.complaint_type?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-medium text-muted-foreground whitespace-nowrap">{new Date(c.received_datetime).toLocaleDateString("en-GB")}</p>
                    <p className="text-xs text-muted-foreground">{daysSinceReceived}d ago</p>
                    {isOverdue && <p className="text-xs text-red-700 font-medium mt-1">⚠️ Overdue</p>}
                    {!c.acknowledged && c.status === "received" && (
                      <p className="text-xs text-amber-700 font-medium mt-1">Unacknowledged</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Modals */}
      {showForm && <ComplaintForm resident={resident} residents={residents} staff={staff} user={user} onClose={() => setShowForm(false)} onSave={() => { qc.invalidateQueries({ queryKey: ["complaints"] }); setShowForm(false); }} />}
      {selectedComplaint && <ComplaintDetail complaint={selectedComplaint} resident={resident} staff={staff} onClose={() => setSelectedComplaint(null)} onUpdate={() => qc.invalidateQueries({ queryKey: ["complaints"] })} />}
    </div>
  );
}