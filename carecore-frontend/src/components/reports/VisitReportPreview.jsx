import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Send, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function VisitReportPreview({
  report,
  onChange,
  onBack,
  onSaveDraft,
  onSubmit,
  saving,
  residentName,
  workerName,
  date,
}) {
  const handleCopy = () => {
    const text = `VISIT REPORT — ${residentName}\nDate: ${date}\nWorker: ${workerName}\n\nACTION\n${report.action}\n\nOUTCOME\n${report.outcome}${report.recommendations ? "\n\nRECOMMENDATIONS\n" + report.recommendations : ""}`;
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Generated Report</h1>
            <p className="text-sm text-muted-foreground">
              {residentName} · {date} · {workerName}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2 rounded-xl">
          <Copy className="w-4 h-4" /> Copy
        </Button>
      </div>

      {/* Action */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-3 text-primary">ACTION</h2>
        <Textarea
          value={report.action}
          onChange={e => onChange({ ...report, action: e.target.value })}
          className="min-h-[200px] text-sm leading-relaxed"
        />
      </div>

      {/* Outcome */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-semibold text-lg mb-3 text-primary">OUTCOME</h2>
        <Textarea
          value={report.outcome}
          onChange={e => onChange({ ...report, outcome: e.target.value })}
          className="min-h-[120px] text-sm leading-relaxed"
        />
      </div>

      {/* Recommendations */}
      {report.recommendations && (
        <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-6">
          <h2 className="font-semibold text-lg mb-3 text-amber-600">RECOMMENDATIONS</h2>
          <Textarea
            value={report.recommendations}
            onChange={e => onChange({ ...report, recommendations: e.target.value })}
            className="min-h-[100px] text-sm leading-relaxed"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onSaveDraft} disabled={saving} className="gap-2 rounded-xl">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save as Draft
        </Button>
        <Button onClick={onSubmit} disabled={saving} className="gap-2 rounded-xl" style={{ background: "linear-gradient(135deg, #4B8BF5, #6aa8ff)" }}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Save and Submit
        </Button>
      </div>
    </div>
  );
}