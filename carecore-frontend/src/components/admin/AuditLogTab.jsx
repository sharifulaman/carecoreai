import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";

const MODULES = ["all", "Resident", "DailyLog", "VisitReport", "Home", "StaffProfile", "AccidentReport", "HomeCheck", "HomeTask"];

export default function AuditLogTab() {
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-trail"],
    queryFn: () => base44.entities.AuditTrail.filter({ org_id: ORG_ID }, "-created_date", 200),
  });

  const filtered = logs.filter(l => {
    const matchSearch = !search || l.description?.toLowerCase().includes(search.toLowerCase()) || l.username?.toLowerCase().includes(search.toLowerCase()) || l.action?.toLowerCase().includes(search.toLowerCase());
    const matchModule = filterModule === "all" || l.record_type === filterModule;
    return matchSearch && matchModule;
  });

  const fmtDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 text-sm" placeholder="Search logs..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterModule} onValueChange={setFilterModule}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Modules" /></SelectTrigger>
          <SelectContent>
            {MODULES.map(m => <SelectItem key={m} value={m}>{m === "all" ? "All Modules" : m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="text-left px-4 py-3 text-xs font-semibold">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Module</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold">Description</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log, i) => (
                  <tr key={log.id} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(log.created_date)}</td>
                    <td className="px-4 py-3 text-xs font-medium">{log.username || "—"}</td>
                    <td className="px-4 py-3 text-xs capitalize">{log.role?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                        log.action === "create" ? "bg-green-500/10 text-green-600" :
                        log.action === "update" ? "bg-blue-500/10 text-blue-600" :
                        log.action === "delete" ? "bg-red-500/10 text-red-600" :
                        "bg-muted text-muted-foreground"
                      }`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{log.record_type || log.module || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate">{log.description || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}