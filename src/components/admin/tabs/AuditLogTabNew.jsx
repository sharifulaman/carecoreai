import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, ChevronDown, ChevronRight, Shield, Search, X } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { RETENTION_LABELS } from "@/lib/logAudit";

const ENTITY_OPTIONS = [
  "StaffProfile", "TrainingRecord", "LeaveRequest", "LeaveBalance",
  "Timesheet", "Payslip", "HMRC_RTI", "DisciplinaryRecord",
  "SupervisionRecord", "AppraisalRecord", "StaffDocument",
];

const ACTION_COLORS = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  view: "bg-purple-100 text-purple-700",
  export: "bg-amber-100 text-amber-700",
  status_change: "bg-orange-100 text-orange-700",
};

const RETENTION_COLORS = {
  payroll: "bg-blue-100 text-blue-700",
  employment: "bg-purple-100 text-purple-700",
  care_record: "bg-red-100 text-red-700",
  system: "bg-muted text-muted-foreground",
};

function formatValue(obj) {
  if (!obj || typeof obj !== "object") return String(obj ?? "—");
  return Object.entries(obj)
    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v === true ? "yes" : v === false ? "no" : v ?? "—"}`)
    .join(" · ");
}

function DetailPanel({ log, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div className="bg-card w-full max-w-lg h-full overflow-y-auto shadow-2xl border-l border-border" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-semibold text-sm">{log.action?.toUpperCase()} — {log.record_type}</h3>
            <p className="text-xs text-muted-foreground">{log.created_date ? format(new Date(log.created_date), "dd MMM yyyy HH:mm:ss") : "—"}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-xs text-muted-foreground">Changed By</p><p className="font-medium">{log.username || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Action</p><Badge className={`text-xs ${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"}`}>{log.action}</Badge></div>
            <div><p className="text-xs text-muted-foreground">Record Type</p><p className="font-mono text-xs">{log.record_type}</p></div>
            <div><p className="text-xs text-muted-foreground">Record ID</p><p className="font-mono text-xs truncate">{log.record_id || "—"}</p></div>
            <div><p className="text-xs text-muted-foreground">Module</p><p>{log.module || "HR"}</p></div>
            <div>
              <p className="text-xs text-muted-foreground">Retention</p>
              <Badge className={`text-xs ${RETENTION_COLORS[log.retention_category] || "bg-muted text-muted-foreground"}`}>
                {RETENTION_LABELS[log.retention_category] || log.retention_category || "—"}
              </Badge>
            </div>
            {log.ip_address && <div><p className="text-xs text-muted-foreground">IP Address</p><p className="font-mono text-xs">{log.ip_address}</p></div>}
          </div>

          {log.description && (
            <div className="p-3 rounded-lg bg-muted/30 text-sm">{log.description}</div>
          )}

          {log.old_value && Object.keys(log.old_value).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Previous Values</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
                {Object.entries(log.old_value).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs gap-2">
                    <span className="text-muted-foreground shrink-0">{k.replace(/_/g, " ")}</span>
                    <span className="text-right font-medium text-red-700">{String(v ?? "—")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {log.new_value && Object.keys(log.new_value).length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">New Values</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1">
                {Object.entries(log.new_value).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs gap-2">
                    <span className="text-muted-foreground shrink-0">{k.replace(/_/g, " ")}</span>
                    <span className="text-right font-medium text-green-700">{String(v ?? "—")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuditLogTabNew({ user }) {
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  const { data: homes = [] } = useQuery({
    queryKey: ["homes-list"],
    queryFn: () => secureGateway.filter("Home", { status: "active" }),
    staleTime: 10 * 60 * 1000,
  });

  const { data: rawLogs = [], isLoading } = useQuery({
    queryKey: ["audit-trail-hr"],
    queryFn: () => secureGateway.filter("AuditTrail", {}, "-created_date", 500),
    staleTime: 30 * 1000,
  });

  const logs = useMemo(() => {
    let data = rawLogs;
    if (filterEntity) data = data.filter(l => l.record_type === filterEntity);
    if (filterAction) data = data.filter(l => l.action === filterAction);
    if (filterSearch) {
      const q = filterSearch.toLowerCase();
      data = data.filter(l =>
        l.username?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q) ||
        l.record_type?.toLowerCase().includes(q) ||
        JSON.stringify(l.new_value || {}).toLowerCase().includes(q)
      );
    }
    if (filterDateFrom) {
      data = data.filter(l => l.created_date && l.created_date >= filterDateFrom);
    }
    if (filterDateTo) {
      data = data.filter(l => l.created_date && l.created_date <= filterDateTo + "T23:59:59");
    }
    return data;
  }, [rawLogs, filterEntity, filterAction, filterSearch, filterDateFrom, filterDateTo]);

  const clearFilters = () => {
    setFilterEntity("");
    setFilterAction("");
    setFilterSearch("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const exportCSV = () => {
    const headers = ["Date/Time", "Action", "Record Type", "Description", "Changed By", "Old Values", "New Values", "Retention"];
    const rows = logs.map(l => [
      l.created_date ? format(new Date(l.created_date), "dd/MM/yyyy HH:mm") : "",
      l.action || "",
      l.record_type || "",
      `"${(l.description || "").replace(/"/g, "'")}"`,
      l.username || "",
      `"${formatValue(l.old_value).replace(/"/g, "'")}"`,
      `"${formatValue(l.new_value).replace(/"/g, "'")}"`,
      RETENTION_LABELS[l.retention_category] || l.retention_category || "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${format(new Date(), "yyyyMMdd_HHmm")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const hasFilters = filterEntity || filterAction || filterSearch || filterDateFrom || filterDateTo;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <div>
            <h2 className="font-semibold text-sm">HR Audit Trail</h2>
            <p className="text-xs text-muted-foreground">GDPR Art. 5(2) · Ofsted/CQC · {logs.length} entries shown</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={exportCSV}>
          <Download className="w-3.5 h-3.5" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search staff, record type, description…"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            className="pl-8 h-8 text-xs w-64"
          />
        </div>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="All entity types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All entity types</SelectItem>
            {ENTITY_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="All actions" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={null}>All actions</SelectItem>
            {["create", "update", "delete", "view", "export", "status_change"].map(a => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-xs w-36" placeholder="From date" />
        <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-xs w-36" placeholder="To date" />
        {hasFilters && (
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={clearFilters}>
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">Date / Time</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Record Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Details</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Changed By</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">New Values</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Retention</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">Loading audit records…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-xs">
                  {hasFilters ? "No matching audit records." : "No audit records yet. HR write operations will be logged here."}
                </td></tr>
              ) : logs.map(log => (
                <tr
                  key={log.id}
                  className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="px-4 py-3 text-xs whitespace-nowrap text-muted-foreground">
                    {log.created_date ? format(new Date(log.created_date), "dd MMM yy HH:mm") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${ACTION_COLORS[log.action] || "bg-muted text-muted-foreground"}`}>
                      {log.action || "—"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{log.record_type || "—"}</td>
                  <td className="px-4 py-3 text-xs max-w-[220px] truncate">{log.description || "—"}</td>
                  <td className="px-4 py-3 text-xs font-medium">{log.username || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">
                    {log.new_value ? formatValue(log.new_value) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${RETENTION_COLORS[log.retention_category] || "bg-muted text-muted-foreground"}`}>
                      {RETENTION_LABELS[log.retention_category] || log.retention_category || "—"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail panel */}
      {selectedLog && <DetailPanel log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}