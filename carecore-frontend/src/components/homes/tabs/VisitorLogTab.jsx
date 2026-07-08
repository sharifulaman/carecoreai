import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, LogOut, Download, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import VisitorSignInForm from "./VisitorSignInForm";
import { useModuleActions } from "@/lib/PermissionContext";

const RELATIONSHIPS = {
  social_worker: "Social Worker",
  iro: "IRO",
  parent: "Parent",
  family: "Family Member",
  solicitor: "Solicitor",
  health_professional: "Health Professional",
  ofsted_inspector: "Ofsted Inspector",
  contractor: "Contractor",
  police: "Police",
  other: "Other",
};

export default function VisitorLogTab({ home, staff, residents, user }) {
  const qc = useQueryClient();
  const { canAdd, canEdit: permCanEdit } = useModuleActions("residents");
  const today = new Date();
  const [dateRange, setDateRange] = useState({
    from: new Date(today.getFullYear(), today.getMonth(), 1),
    to: today,
  });
  const [filterType, setFilterType] = useState("all");
  const [showSignIn, setShowSignIn] = useState(false);

  const { data: visitors = [] } = useQuery({
    queryKey: ["visitor-logs", home?.id],
    queryFn: () => base44.entities.VisitorLog.filter({ home_id: home?.id }, "-visit_date", 500),
  });

  const dateVisitors = useMemo(() => {
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    const filtered = visitors.filter(v => v.visit_date >= fromStr && v.visit_date <= toStr && !v.is_deleted);
    return filterType === "all" ? filtered : filtered.filter(v => v.visitor_relationship === filterType);
  }, [visitors, dateRange, filterType]);

  const currentlySignedIn = useMemo(() => 
    dateVisitors.filter(v => v.signed_in && !v.departure_time),
    [dateVisitors]
  );

  const handleSignOut = async (visitorId) => {
    const now = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    await base44.entities.VisitorLog.update(visitorId, {
      departure_time: now,
      signed_in: false,
    });
    qc.invalidateQueries({ queryKey: ["visitor-logs", home?.id] });
    toast.success("Visitor signed out");
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Arrival", "Departure", "Visitor", "Role", "Organisation", "Purpose", "Resident", "DBS Checked", "Concerns"]
    ];
    dateVisitors.forEach(v => {
      rows.push([
        v.visit_date,
        v.arrival_time,
        v.departure_time || "—",
        v.visitor_name,
        RELATIONSHIPS[v.visitor_relationship] || v.visitor_relationship,
        v.visitor_organisation || "—",
        v.purpose_of_visit,
        v.resident_visited_name || "—",
        v.dbs_checked ? "Yes" : "No",
        v.any_concerns ? "Yes" : "No",
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitor-log-${format(dateRange.from, "yyyy-MM-dd")}-to-${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              From: {format(dateRange.from, "MMM dd")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateRange.from} onSelect={(date) => setDateRange({ ...dateRange, from: date })} />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              To: {format(dateRange.to, "MMM dd")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={dateRange.to} onSelect={(date) => setDateRange({ ...dateRange, to: date })} />
          </PopoverContent>
        </Popover>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(RELATIONSHIPS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={exportCSV} className="gap-1"><Download className="w-4 h-4" /> Export</Button>
        {canAdd && <Button onClick={() => setShowSignIn(true)} className="gap-1"><Plus className="w-4 h-4" /> Sign In Visitor</Button>}
      </div>

      {/* Currently Signed In */}
      {currentlySignedIn.length > 0 && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
          <p className="font-semibold text-sm text-blue-900 mb-2">Currently Signed In ({currentlySignedIn.length})</p>
          <div className="space-y-2">
            {currentlySignedIn.map(v => (
              <div key={v.id} className="flex items-center justify-between p-2 bg-white rounded border border-blue-200">
                <div className="text-sm">
                  <p className="font-medium">{v.visitor_name}</p>
                  <p className="text-xs text-muted-foreground">{RELATIONSHIPS[v.visitor_relationship]} · Arrived {v.arrival_time}</p>
                </div>
                {permCanEdit && (
                  <Button size="sm" variant="outline" onClick={() => handleSignOut(v.id)} className="gap-1 text-red-600 border-red-300 hover:bg-red-50">
                    <LogOut className="w-3 h-3" /> Sign Out
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visitors Table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 text-xs font-semibold">Date</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Arrival</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Departure</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Visitor</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Role</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Purpose</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Resident</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">DBS</th>
              <th className="text-left px-3 py-2 text-xs font-semibold">Concerns</th>
            </tr>
          </thead>
          <tbody>
            {dateVisitors.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No visitors recorded for this date range.</td></tr>
            ) : dateVisitors.map(v => (
              <tr key={v.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                <td className="px-3 py-2 text-xs">{v.visit_date}</td>
                <td className="px-3 py-2 text-xs">{v.arrival_time}</td>
                <td className="px-3 py-2 text-xs">{v.departure_time || "—"}</td>
                <td className="px-3 py-2 text-xs font-medium">{v.visitor_name}</td>
                <td className="px-3 py-2 text-xs">{RELATIONSHIPS[v.visitor_relationship] || v.visitor_relationship}</td>
                <td className="px-3 py-2 text-xs max-w-xs truncate">{v.purpose_of_visit}</td>
                <td className="px-3 py-2 text-xs">{v.resident_visited_name || "—"}</td>
                <td className="px-3 py-2 text-xs">{v.dbs_checked ? "✓" : "—"}</td>
                <td className="px-3 py-2 text-xs">{v.any_concerns ? "⚠️" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sign In Form Modal */}
      {showSignIn && <VisitorSignInForm home={home} residents={residents} user={user} onClose={() => setShowSignIn(false)} onSave={() => qc.invalidateQueries({ queryKey: ["visitor-logs", home?.id] })} />}
    </div>
  );
}