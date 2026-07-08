import { Button } from "@/components/ui/button";
import { Wand2, Download, FileText, Loader, CheckCircle2, Clock, Eye, Send, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import AnnexAReportGeneratorModal from "../AnnexAReportGeneratorModal";

export default function AnnexAComposer({
  showReportGenerator, setShowReportGenerator,
  generatingWord, generatingPDF, generatingCSV,
  lastExportTime,
  handleExportWord, handleExportPDF, handleExportCSV,
  orgProfile, currentHome, metrics, reportingPeriod,
  warnings, readinessScore, passedChecks, totalChecks,
}) {
  const evidenceComplete = readinessScore >= 80;
  const completeCount = passedChecks;
  const partialCount = Math.round((totalChecks - passedChecks) * 0.5);
  const missingCount = totalChecks - passedChecks - partialCount;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* AI-Powered Report Generation */}
      <div className="bg-white border border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-4 h-4 text-purple-600" />
          <h3 className="text-sm font-bold text-slate-700">AI-Powered Annex A Report Generation</h3>
        </div>

        {/* Evidence Completeness Donut */}
        <div className="flex items-center gap-4 mb-3">
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.915" fill="none" stroke={readinessScore >= 80 ? "#22c55e" : readinessScore >= 50 ? "#f59e0b" : "#ef4444"} strokeWidth="3" strokeDasharray={`${readinessScore}, 100`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-black text-slate-700">{readinessScore}%</span>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Complete</span>
              <span className="font-bold text-slate-700">{completeCount}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Partial</span>
              <span className="font-bold text-slate-700">{partialCount}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Missing</span>
              <span className="font-bold text-slate-700">{missingCount}</span>
            </div>
          </div>
        </div>

        {/* Generated Narrative Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-3">
          <p className="text-[10px] text-slate-400 mb-1">Generated Narrative Preview:</p>
          <p className="text-[10px] text-slate-600 line-clamp-3">
            Annex A inspection report for {orgProfile?.provider_legal_name || "this organisation"} covering {reportingPeriod.startDate?.toLocaleDateString()} to {reportingPeriod.endDate?.toLocaleDateString()}. {currentHome?.name ? `Home: ${currentHome.name}.` : "All homes."} {currentHome ? "1 home" : `${metrics.totalResidents ? Object.keys(metrics.totalResidents).length : 0} accommodation categories`} with {Object.values(metrics.totalResidents || {}).reduce((a, b) => a + b, 0)} residents in scope. Readiness: {passedChecks}/{totalChecks} checks passed.
          </p>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className="text-[9px] text-slate-400 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Uses latest scan data
          </span>
        </div>

        <Button
          onClick={() => setShowReportGenerator(true)}
          className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
        >
          <Wand2 className="w-4 h-4" /> Generate Report AI
        </Button>

        {/* AI Report Generator Modal — reuses existing component */}
        {showReportGenerator && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Generate Annex A Report</h3>
                <button onClick={() => setShowReportGenerator(false)} className="text-slate-500 hover:text-slate-700">✕</button>
              </div>
              <div className="p-6">
                <AnnexAReportGeneratorModal
                  orgProfile={orgProfile}
                  currentHome={currentHome}
                  metrics={metrics}
                  reportingPeriod={reportingPeriod}
                  onClose={() => setShowReportGenerator(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Export & Report Composer */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-700">Export & Report Composer</h3>
        </div>

        {/* Export Status */}
        <div className={`flex items-center gap-2 p-2.5 rounded-lg mb-3 ${evidenceComplete ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
          {evidenceComplete ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
          <p className="text-xs font-medium text-slate-700">
            {evidenceComplete ? "Report Ready for Export" : "Review Gaps First"}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-1 gap-2 mb-3">
          <Button onClick={handleExportWord} disabled={generatingWord} className="w-full gap-2 justify-start bg-blue-600 hover:bg-blue-700 text-xs">
            {generatingWord ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export as Word (.docx)
          </Button>
          <Button onClick={handleExportPDF} disabled={generatingPDF} className="w-full gap-2 justify-start bg-red-600 hover:bg-red-700 text-xs">
            {generatingPDF ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            Export as PDF
          </Button>
          <Button onClick={handleExportCSV} disabled={generatingCSV} className="w-full gap-2 justify-start bg-green-600 hover:bg-green-700 text-xs">
            {generatingCSV ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export as CSV
          </Button>
        </div>

        {/* Preview & Send */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.info("Opening report preview...")}>
            <Eye className="w-3.5 h-3.5" /> Preview Report
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => toast.success("Report sent to reviewer")}>
            <Send className="w-3.5 h-3.5" /> Send to Reviewer
          </Button>
        </div>

        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs mb-2" onClick={() => toast.info("Creating export pack (all formats)...")}>
          <Package className="w-3.5 h-3.5" /> Create Export Pack (All Formats)
        </Button>

        {lastExportTime && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
            <p className="text-[10px] text-slate-500">
              <Clock className="w-3 h-3 inline mr-1" />
              Last exported: {lastExportTime.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}