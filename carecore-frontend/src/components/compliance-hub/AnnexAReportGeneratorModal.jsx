import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Download, Loader } from "lucide-react";
import { toast } from "sonner";

export default function AnnexAReportGeneratorModal({
  orgProfile,
  currentHome,
  metrics,
  reportingPeriod,
  onClose,
}) {
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [reporterName, setReporterName] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const handleGenerateReport = async () => {
    if (!reporterName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setGenerating(true);
    try {
      const payload = {
        orgName: orgProfile?.provider_legal_name || "N/A",
        urn: orgProfile?.ofsted_urn || "N/A",
        reporterName,
        reportDate: new Date().toLocaleDateString(),
        reportPeriod: `${reportingPeriod.startDate.toLocaleDateString()} to ${reportingPeriod.endDate.toLocaleDateString()}`,
        metrics,
        homeNames: currentHome?.name || "All Homes",
        orgProfile,
        additionalNotes,
      };

      const response = await base44.functions.invoke("generateAnnexAReportWord", payload);

      if (response.data?.success) {
        setGeneratedReport(response.data);
        toast.success("Report generated successfully");
      } else {
        toast.error("Failed to generate report");
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const downloadAsText = () => {
    if (!generatedReport?.reportText) return;

    const element = document.createElement("a");
    const file = new Blob([generatedReport.reportText], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `Annex_A_Report_${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Report downloaded as text file");
  };

  if (generatedReport) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-900">✓ Report Generated Successfully</p>
        </div>

        <div className="bg-slate-100 rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs whitespace-pre-wrap">
          {generatedReport.reportText}
        </div>

        <div className="flex gap-2">
          <Button onClick={downloadAsText} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700">
            <Download className="w-4 h-4" /> Download as Text
          </Button>
          <Button onClick={() => setGeneratedReport(null)} variant="outline" className="flex-1">
            Generate Another
          </Button>
        </div>

        <p className="text-xs text-slate-600">
          📌 Use the "Export as Word" button to convert this to .docx format with full formatting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm font-semibold text-blue-900 mb-2">ℹ️ Report Settings</p>
        <p className="text-xs text-blue-800">
          This will generate a formatted Annex A inspection report using all collected data from the tabs.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Your Name</label>
          <input
            type="text"
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="e.g., Jane Smith"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Provider Details</label>
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-xs">
            <p><span className="font-medium">Organisation:</span> {orgProfile?.provider_legal_name || "—"}</p>
            <p><span className="font-medium">Ofsted URN:</span> {orgProfile?.ofsted_urn || "—"}</p>
            <p><span className="font-medium">Period:</span> {reportingPeriod.startDate.toLocaleDateString()} to {reportingPeriod.endDate.toLocaleDateString()}</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">Additional Notes (Optional)</label>
          <Textarea
            value={additionalNotes}
            onChange={(e) => setAdditionalNotes(e.target.value)}
            placeholder="Add any additional context or notes to include in the report..."
            className="h-20 text-sm"
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs text-amber-800">
            <strong>Summary:</strong> Report will include {Object.values(metrics.totalResidents).reduce((a, b) => a + b, 0)} residents across {Object.keys(metrics.totalResidents).length} accommodation categories.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleGenerateReport}
          disabled={generating || !reporterName.trim()}
          className="flex-1 gap-2 bg-purple-600 hover:bg-purple-700"
        >
          {generating ? (
            <>
              <Loader className="w-4 h-4 animate-spin" /> Generating...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" /> Generate Report
            </>
          )}
        </Button>
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}