import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock, RefreshCw, X, ChevronDown, ChevronRight, FileDown } from "lucide-react";
import { format, subWeeks } from "date-fns";

function StatusBadge({ status }) {
  if (status === "Compliant") return <Badge className="bg-green-100 text-green-700 text-xs">Compliant</Badge>;
  if (status === "At Risk") return <Badge className="bg-amber-100 text-amber-700 text-xs">At Risk</Badge>;
  return <Badge className="bg-red-100 text-red-700 text-xs">Breach</Badge>;
}

function BreachDetailModal({ result, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold">{result.staff_name}</h3>
            <p className="text-xs text-muted-foreground">Working Time Compliance Details</p>
          </div>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {result.breaches.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-700 mb-2">Active Breaches ({result.breaches.length})</p>
              {result.breaches.map((b, i) => (
                <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 mb-2">
                  <p className="font-medium capitalize">{b.check.replace(/_/g, " ")}</p>
                  <p className="mt-0.5 text-red-600">{b.detail}</p>
                </div>
              ))}
            </div>
          )}
          {result.warnings.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 mb-2">Warnings ({result.warnings.length})</p>
              {result.warnings.map((w, i) => (
                <div key={i} className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700 mb-2">
                  <p className="font-medium capitalize">{w.check.replace(/_/g, " ")}</p>
                  <p className="mt-0.5">{w.detail}</p>
                </div>
              ))}
            </div>
          )}
          {result.breaches.length === 0 && result.warnings.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              No breaches or warnings detected.
            </div>
          )}
        </div>
        <div className="p-4 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full">Close</Button>
        </div>
      </div>
    </div>
  );
}

export default function WorkingTimeComplianceSection({ staff = [], homes = [] }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h.name]));

  const runCheck = async () => {
    setRunning(true);
    setError(null);
    try {
      const dateFrom = format(subWeeks(new Date(), 17), "yyyy-MM-dd");
      const dateTo = format(new Date(), "yyyy-MM-dd");
      const res = await base44.functions.invoke("checkWorkingTimeCompliance", {
        date_from: dateFrom,
        date_to: dateTo,
      });
      const data = res.data;

      // Group by staff
      const byStaff = {};
      for (const s of staff.filter(s => s.status === "active")) {
        byStaff[s.id] = {
          staff_id: s.id,
          staff_name: s.full_name,
          home: (s.home_ids || []).map(h => homeMap[h]).filter(Boolean).join(", ") || "—",
          breaches: [],
          warnings: [],
        };
      }
      for (const b of (data.breaches || [])) {
        if (byStaff[b.staff_id]) byStaff[b.staff_id].breaches.push(b);
      }
      for (const w of (data.warnings || [])) {
        if (byStaff[w.staff_id]) byStaff[w.staff_id].warnings.push(w);
      }

      setResults(Object.values(byStaff));
    } catch (e) {
      setError(e.message || "Failed to run compliance check.");
    } finally {
      setRunning(false);
    }
  };

  const exportPDF = () => {
    if (!results) return;
    const lines = [
      "WORKING TIME REGULATIONS 1998 — COMPLIANCE REPORT",
      `Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
      "═══════════════════════════════════════════════════",
      "",
    ];
    for (const r of results) {
      const status = r.breaches.length > 0 ? "BREACH" : r.warnings.length > 0 ? "AT RISK" : "COMPLIANT";
      lines.push(`${r.staff_name} | Home: ${r.home} | Status: ${status}`);
      for (const b of r.breaches) lines.push(`  BREACH: ${b.detail}`);
      for (const w of r.warnings) lines.push(`  WARNING: ${w.detail}`);
      lines.push("");
    }
    lines.push("═══════════════════════════════════════════════════");
    lines.push("This report is generated by CareCore AI for internal compliance purposes.");
    lines.push("Retain for Ofsted/CQC inspection evidence.");

    const content = lines.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `WTR_Compliance_Report_${format(new Date(), "yyyyMMdd")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalBreaches = results ? results.reduce((n, r) => n + r.breaches.length, 0) : 0;
  const totalWarnings = results ? results.reduce((n, r) => n + r.warnings.length, 0) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="font-semibold">Working Time Compliance (WTR 1998)</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Checks 48h average, 11h rest, 24h rest/week, break entitlement, young worker rules.
          </p>
        </div>
        <div className="flex gap-2">
          {results && (
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={exportPDF}>
              <FileDown className="w-3.5 h-3.5" /> Export Report
            </Button>
          )}
          <Button size="sm" className="gap-1.5 text-xs" onClick={runCheck} disabled={running}>
            {running ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Checking…</> : <><RefreshCw className="w-3.5 h-3.5" /> Run Full Compliance Check</>}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {error}
        </div>
      )}

      {!results && !running && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Click "Run Full Compliance Check" to analyse working hours for the last 17 weeks.</p>
        </div>
      )}

      {results && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{results.filter(r => r.breaches.length === 0 && r.warnings.length === 0).length}</p>
              <p className="text-xs text-green-700 mt-0.5">Compliant</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">{results.filter(r => r.breaches.length === 0 && r.warnings.length > 0).length}</p>
              <p className="text-xs text-amber-700 mt-0.5">At Risk</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{results.filter(r => r.breaches.length > 0).length}</p>
              <p className="text-xs text-red-700 mt-0.5">Breach</p>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff Member</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Home</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Breaches</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Warnings</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.sort((a, b) => b.breaches.length - a.breaches.length || b.warnings.length - a.warnings.length).map(r => {
                  const status = r.breaches.length > 0 ? "Breach" : r.warnings.length > 0 ? "At Risk" : "Compliant";
                  return (
                    <tr key={r.staff_id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium text-sm">{r.staff_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.home}</td>
                      <td className="px-4 py-3 text-center">
                        {r.breaches.length > 0
                          ? <span className="text-xs font-semibold text-red-600">{r.breaches.length}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.warnings.length > 0
                          ? <span className="text-xs font-semibold text-amber-600">{r.warnings.length}</span>
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center"><StatusBadge status={status} /></td>
                      <td className="px-4 py-3 text-center">
                        {(r.breaches.length > 0 || r.warnings.length > 0) && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setDetail(r)}>
                            View
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              <strong>Legal notice:</strong> Breaching the Working Time Regulations 1998 may be a criminal offence.
              Retain this report as compliance evidence for Ofsted/CQC inspections.
            </span>
          </div>
        </>
      )}

      {detail && <BreachDetailModal result={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}