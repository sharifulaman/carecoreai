import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, FileText, AlertTriangle, CheckCircle2, Loader2, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { getMissingReadinessItems } from "@/lib/incidentAnalytics";

export default function OfstedReportConfirmModal({ incidents, ofstedNotifications, homes, selectedIds, filters, onClose }) {
  const [generating, setGenerating] = useState(false);
  const [reportHtml, setReportHtml] = useState(null);
  const [reportMeta, setReportMeta] = useState(null);
  const iframeRef = useRef(null);

  const reportIncidents = selectedIds.length > 0
    ? incidents.filter(i => selectedIds.includes(i.id))
    : incidents;

  const homesIncluded = new Set(reportIncidents.map(i => homes.find(h => h.id === i.home_id)?.name || i.home_name).filter(Boolean));
  const ofstedPendingCount = reportIncidents.filter(i => {
    const n = ofstedNotifications.find(on => on.incident_id === i.id);
    return n && ["pending", "pending_tl", "pending_tm", "pending_rsm", "overdue"].includes(n.status);
  }).length;

  const missingFields = reportIncidents.reduce((acc, i) => {
    getMissingReadinessItems(i, ofstedNotifications).forEach(item => acc.add(item));
    return acc;
  }, new Set());

  const generateMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      const payload = selectedIds.length > 0
        ? { incident_ids: selectedIds }
        : {
            date_from: filters.dateFrom ? format(filters.dateFrom, "yyyy-MM-dd") : null,
            date_to: filters.dateTo ? format(filters.dateTo, "yyyy-MM-dd") : null,
            home_ids: filters.homeIds.length > 0 ? filters.homeIds : null,
          };
      return await base44.functions.invoke("generateOfstedIncidentPack", payload);
    },
    onSuccess: (response) => {
      const data = response.data || response;
      if (data.html) {
        setReportHtml(data.html);
        setReportMeta({ count: data.incident_count || reportIncidents.length, generatedAt: new Date() });
        toast.success(`Ofsted pack generated: ${data.incident_count || reportIncidents.length} incidents`);
      } else {
        toast.error("No report content returned");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate report");
    },
    onSettled: () => setGenerating(false),
  });

  const handlePrint = () => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
  };

  const handleBack = () => {
    setReportHtml(null);
    setReportMeta(null);
  };

  // ── Report view (after generation) ──
  if (reportHtml) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-blue-50 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Ofsted Incident Report Pack</h2>
              {reportMeta && (
                <span className="text-xs text-slate-500 ml-2">
                  {reportMeta.count} incidents · Generated {format(reportMeta.generatedAt, "d MMM yyyy HH:mm")}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button size="sm" onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 ml-1"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden bg-slate-100">
            <iframe
              ref={iframeRef}
              title="Ofsted Report Pack"
              className="w-full h-full border-0"
              style={{ minHeight: "70vh" }}
              srcDoc={reportHtml}
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Confirmation view (before generation) ──
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-blue-50">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Generate Ofsted Report Pack</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Incidents included:</span>
              <span className="font-bold text-slate-800">{reportIncidents.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Date range:</span>
              <span className="font-medium text-slate-700">
                {filters.dateFrom ? format(filters.dateFrom, "d MMM yyyy") : "—"} → {filters.dateTo ? format(filters.dateTo, "d MMM yyyy") : "—"}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Homes included:</span>
              <span className="font-medium text-slate-700">{homesIncluded.size}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Ofsted pending:</span>
              <span className={`font-bold ${ofstedPendingCount > 0 ? "text-amber-600" : "text-green-600"}`}>{ofstedPendingCount}</span>
            </div>
          </div>

          {/* Missing fields warning */}
          {missingFields.size > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <p className="text-xs font-semibold text-amber-800">Missing Required Fields</p>
              </div>
              <p className="text-[10px] text-amber-700 mb-1.5">The following items are missing from some incidents:</p>
              <div className="flex flex-wrap gap-1">
                {[...missingFields].map(item => (
                  <span key={item} className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">{item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Pack contents */}
          <div>
            <p className="text-xs font-semibold text-slate-700 mb-2">The report pack will include:</p>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-600">
              {["Incident summary", "Resident anonymised details", "Home details", "Timeline & key events", "Actions taken", "Manager review notes", "Closure evidence", "Ofsted notification status"].map(item => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-green-500" /> {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
          <Button variant="outline" size="sm" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button size="sm" onClick={() => generateMutation.mutate()} disabled={generating || reportIncidents.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white">
            {generating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</> : <><FileText className="w-3.5 h-3.5" /> Generate Pack</>}
          </Button>
        </div>
      </div>
    </div>
  );
}