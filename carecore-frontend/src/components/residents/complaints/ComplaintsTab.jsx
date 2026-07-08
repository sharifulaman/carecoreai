import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, AlertCircle, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import ComplaintForm from "./ComplaintForm";
import ComplaintDetail from "./ComplaintDetail";
import StatsModal from "./StatsModal";
import ComplaintKPIs from "./ComplaintKPIs";

function daysSince(dateStr) {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function ComplaintsTab({ residents, homes, staff, user, staffProfile, isAdminOrTL, complaints = [] }) {
   const qc = useQueryClient();
   const [showForm, setShowForm] = useState(false);
   const [selectedComplaint, setSelectedComplaint] = useState(null);
   const [statsModalOpen, setStatsModalOpen] = useState(null); // null | 'open' | 'resolved' | 'total'
   const [filterHome, setFilterHome] = useState("all");
   const [filterStatus, setFilterStatus] = useState("all");
   const [filterChildComplainant, setFilterChildComplainant] = useState("all");
   const [dateFrom, setDateFrom] = useState("");
   const [dateTo, setDateTo] = useState("");

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);
  const residentMap = useMemo(() => Object.fromEntries(residents.map(r => [r.id, r])), [residents]);

  const filtered = useMemo(() => {
    let result = [...complaints];

    if (filterHome !== "all") result = result.filter(c => c.home_id === filterHome);
    if (filterStatus !== "all") result = result.filter(c => c.status === filterStatus);
    if (filterChildComplainant !== "all") {
      const isChild = filterChildComplainant === "yes";
      result = result.filter(c => c.is_child_complainant === isChild);
    }
    if (dateFrom) result = result.filter(c => c.received_datetime?.split("T")[0] >= dateFrom);
    if (dateTo) result = result.filter(c => c.received_datetime?.split("T")[0] <= dateTo);

    return result.sort((a, b) => (b.received_datetime || "").localeCompare(a.received_datetime || ""));
  }, [complaints, filterHome, filterStatus, filterChildComplainant, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const open = complaints.filter(c => c.status === "received" || c.status === "investigating");
    const resolved = complaints.filter(c => c.status === "resolved" || c.status === "closed");
    const upheld = resolved.filter(c => c.outcome_category === "upheld");
    const overdue = open.filter(c => c.target_resolution_date && c.target_resolution_date < new Date().toISOString().split("T")[0]);
    const childComplainants = complaints.filter(c => c.is_child_complainant);

    const resolutionTimes = resolved
      .filter(c => c.received_datetime && c.resolution_date)
      .map(c => daysSince(c.received_datetime));
    const avgTime = resolutionTimes.length > 0 ? Math.round(resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) : 0;

    return { total: complaints.length, open: open.length, resolved: resolved.length, upheld: upheld.length, overdue: overdue.length, childComplainants: childComplainants.length, avgTime };
  }, [complaints]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Complaints & Compliments</h3>
        <div className="flex-1" />
        {isAdminOrTL && (
          <Button onClick={() => setShowForm(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Log Complaint / Compliment
          </Button>
        )}
      </div>

      {/* Phase 7 KPIs */}
      {complaints.length > 0 && <ComplaintKPIs complaints={complaints} />}

      {/* Summary Cards - Clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button 
          onClick={() => setStatsModalOpen("total")}
          className="bg-card border border-border rounded-lg p-3 hover:shadow-md hover:border-primary/40 transition-all duration-200 cursor-pointer"
        >
          <p className="text-xs text-muted-foreground font-medium">Total</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </button>
        <button 
          onClick={() => setStatsModalOpen("open")}
          className={`bg-card border rounded-lg p-3 hover:shadow-md transition-all duration-200 cursor-pointer ${stats.open > 0 ? "border-amber-300 hover:border-amber-400" : "border-border hover:border-primary/40"}`}
        >
          <p className="text-xs text-muted-foreground font-medium">Open</p>
          <p className={`text-2xl font-bold mt-1 ${stats.open > 0 ? "text-amber-600" : ""}`}>{stats.open}</p>
        </button>
        <button 
          onClick={() => setStatsModalOpen("resolved")}
          className="bg-card border border-border rounded-lg p-3 hover:shadow-md hover:border-green-400 transition-all duration-200 cursor-pointer"
        >
          <p className="text-xs text-muted-foreground font-medium">Resolved</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{stats.resolved}</p>
        </button>
        {stats.childComplainants > 0 && (
          <button 
            onClick={() => setFilterChildComplainant("yes")}
            className="bg-blue-100 border border-blue-300 rounded-lg p-3 hover:shadow-md hover:border-blue-400 transition-all duration-200 cursor-pointer"
          >
            <p className="text-xs text-blue-700 font-medium">Child Complainants</p>
            <p className="text-2xl font-bold mt-1 text-blue-700">{stats.childComplainants}</p>
          </button>
        )}
        {stats.overdue > 0 && (
          <button 
            onClick={() => setFilterStatus("all")}
            className="bg-red-100 border border-red-400 rounded-lg p-3 hover:shadow-md transition-all duration-200 cursor-pointer"
          >
            <p className="text-xs text-red-700 font-medium">Overdue</p>
            <p className="text-2xl font-bold mt-1 text-red-700">⚠️ {stats.overdue}</p>
          </button>
        )}
      </div>

      {/* Overdue Alert */}
      {stats.overdue > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700"><strong>{stats.overdue}</strong> complaint(s) overdue for resolution (28-day limit)</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterHome} onValueChange={setFilterHome}>
          <SelectTrigger className="w-48 text-sm"><SelectValue placeholder="All homes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All homes</SelectItem>
            {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterChildComplainant} onValueChange={setFilterChildComplainant}>
          <SelectTrigger className="w-40 text-sm"><SelectValue placeholder="Complainant" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="yes">Child complainant</SelectItem>
            <SelectItem value="no">Other sources</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">From:</span>
         <Popover>
           <PopoverTrigger asChild>
             <Button variant="outline" className="w-36 text-xs h-8 justify-start text-left font-normal">
               <CalendarIcon className="mr-2 h-4 w-4" />
               {dateFrom ? format(new Date(dateFrom), "dd MMM yyyy") : "Select date"}
             </Button>
           </PopoverTrigger>
           <PopoverContent className="w-auto p-0" align="start">
             <Calendar mode="single" selected={dateFrom ? new Date(dateFrom) : undefined} onSelect={(date) => setDateFrom(date ? format(date, "yyyy-MM-dd") : "")} />
           </PopoverContent>
         </Popover>
         <span className="text-xs text-muted-foreground">to</span>
         <Popover>
           <PopoverTrigger asChild>
             <Button variant="outline" className="w-36 text-xs h-8 justify-start text-left font-normal">
               <CalendarIcon className="mr-2 h-4 w-4" />
               {dateTo ? format(new Date(dateTo), "dd MMM yyyy") : "Select date"}
             </Button>
           </PopoverTrigger>
           <PopoverContent className="w-auto p-0" align="start">
             <Calendar mode="single" selected={dateTo ? new Date(dateTo) : undefined} onSelect={(date) => setDateTo(date ? format(date, "yyyy-MM-dd") : "")} />
           </PopoverContent>
         </Popover>
      </div>

      {/* Complaints Cards Grid */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
            No complaints recorded.
          </div>
        ) : filtered.map(c => {
          const isOverdue = c.target_resolution_date && c.target_resolution_date < new Date().toISOString().split("T")[0];
          const statusColor = c.status === "resolved" || c.status === "closed" ? "border-l-green-400 bg-green-50/30" : c.status === "investigating" ? "border-l-blue-400 bg-blue-50/30" : "border-l-amber-400 bg-amber-50/30";
          return (
            <button 
              key={c.id}
              onClick={() => setSelectedComplaint(c)}
              className={`block w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all duration-200 ${statusColor} ${isOverdue ? "border-l-red-500" : ""}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Row 1: ID + Status Badge */}
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-mono font-semibold text-foreground">{c.complaint_id || "—"}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${c.status === "resolved" || c.status === "closed" ? "bg-green-100 text-green-700" : c.status === "investigating" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                      {c.status}
                    </span>
                    {c.is_child_complainant && (
                      <span className="inline-block px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        Child complainant
                      </span>
                    )}
                  </div>

                  {/* Row 2: Resident + Home */}
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-foreground">{residentMap[c.resident_id]?.display_name || "Unknown resident"}</p>
                    <p className="text-xs text-muted-foreground">{homeMap[c.home_id]?.name || "Unknown home"}</p>
                  </div>

                  {/* Row 3: Category + Source */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-muted rounded text-muted-foreground font-medium">
                      {c.complaint_type?.replace(/_/g, " ") || "—"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {c.complainant_source?.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                {/* Right side: Dates + Badges */}
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    {c.complaint_date ? new Date(c.complaint_date).toLocaleDateString("en-GB") : "—"}
                  </p>
                  {c.resolution_date && (
                    <p className="text-xs text-muted-foreground">
                      Closed {new Date(c.resolution_date).toLocaleDateString("en-GB")}
                    </p>
                  )}
                  <div className="flex justify-end gap-1 mt-2 flex-wrap">
                    {c.outcome_category && (
                      <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-medium">
                        {c.outcome_category}
                      </span>
                    )}
                    {c.annex_a_reportable && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                        Annex A
                      </span>
                    )}
                    {isOverdue && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-700 rounded font-semibold">
                        ⚠️ Overdue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modals */}
      {showForm && <ComplaintForm residents={residents} homes={homes} staff={staff} user={user} onClose={() => setShowForm(false)} onSave={() => { qc.invalidateQueries({ queryKey: ["complaints"] }); setShowForm(false); }} />}
      {selectedComplaint && <ComplaintDetail complaint={selectedComplaint} residents={residents} homes={homes} staff={staff} user={user} staffProfile={staffProfile} onClose={() => setSelectedComplaint(null)} onUpdate={() => qc.invalidateQueries({ queryKey: ["complaints"] })} />}
      
      {/* Stats Modal - Shows filtered complaints list */}
      {statsModalOpen && (
        <StatsModal 
          status={statsModalOpen} 
          complaints={complaints.filter(c => {
            if (statsModalOpen === "open") return c.status === "received" || c.status === "investigating";
            if (statsModalOpen === "resolved") return c.status === "resolved" || c.status === "closed";
            return true;
          })}
          residents={residents}
          homes={homes}
          onSelectComplaint={(c) => {
            setSelectedComplaint(c);
            setStatsModalOpen(null);
          }}
          onClose={() => setStatsModalOpen(null)}
        />
      )}
    </div>
  );
}