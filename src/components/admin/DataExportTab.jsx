import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const EXPORTABLE = [
  { key: "Resident", label: "Residents" },
  { key: "StaffProfile", label: "Staff Profiles" },
  { key: "Home", label: "Homes" },
  { key: "VisitReport", label: "Visit Reports" },
  { key: "DailyLog", label: "Daily Logs" },
  { key: "AccidentReport", label: "Accident Reports" },
  { key: "MaintenanceLog", label: "Maintenance Logs" },
  { key: "HomeTask", label: "Tasks & Appointments" },
  { key: "AuditTrail", label: "Audit Trail" },
  { key: "HomeCheck", label: "Home Checks" },
];

function toCSV(data) {
  if (!data || data.length === 0) return "";
  const keys = Object.keys(data[0]);
  const header = keys.join(",");
  const rows = data.map(row =>
    keys.map(k => {
      const val = row[k];
      if (val === null || val === undefined) return "";
      const str = typeof val === "object" ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(",")
  );
  return [header, ...rows].join("\n");
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DataExportTab() {
  const [selected, setSelected] = useState("Resident");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await base44.entities[selected].filter({ org_id: ORG_ID }, "-created_date", 2000);
      const csv = toCSV(data);
      const label = EXPORTABLE.find(e => e.key === selected)?.label || selected;
      downloadCSV(`${label.toLowerCase().replace(/ /g, "_")}_export.csv`, csv);
      toast.success(`Exported ${data.length} ${label} records`);
    } catch (err) {
      toast.error("Export failed: " + err.message);
    }
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Export Data to CSV</h3>
        <p className="text-sm text-muted-foreground">Select an entity to download all records as a CSV file.</p>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-64">
            <Select value={selected} onValueChange={setSelected}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXPORTABLE.map(e => <SelectItem key={e.key} value={e.key}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-3">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wide">Quick Exports</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {EXPORTABLE.map(e => (
            <button
              key={e.key}
              onClick={() => { setSelected(e.key); setTimeout(handleExport, 100); }}
              className="flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm text-left"
            >
              <span className="font-medium">{e.label}</span>
              <Download className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}