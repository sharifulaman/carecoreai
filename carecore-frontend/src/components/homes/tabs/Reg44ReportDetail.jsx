import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { X, Download } from "lucide-react";
import { toast } from "sonner";
import { generateReg44PDF } from "@/lib/generateReg44PDF";

const RATING_COLORS = {
  outstanding: "bg-green-100 text-green-700",
  good: "bg-blue-100 text-blue-700",
  requires_improvement: "bg-amber-100 text-amber-700",
  inadequate: "bg-red-100 text-red-700",
};

export default function Reg44ReportDetail({ report, staff, user, onClose, onUpdate }) {
  const [showResponse, setShowResponse] = useState(false);
  const [response, setResponse] = useState({
    manager_response: "",
    action_plan: "",
    recommendations_response: {},
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => secureGateway.update("Reg44Report", report.id, data),
    onSuccess: () => {
      toast.success("Response saved");
      onUpdate();
      setShowResponse(false);
    },
    onError: () => toast.error("Error saving response"),
  });

  const handleSaveResponse = () => {
    updateMutation.mutate({
      manager_response: response.manager_response,
      action_plan: response.action_plan,
      manager_id: user?.id,
      manager_name: user?.full_name,
      manager_response_date: new Date().toISOString().split("T")[0],
      status: "manager_responded",
    });
  };

  const handleExportPDF = () => {
    generateReg44PDF(report);
    toast.success("PDF downloaded");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl max-w-4xl w-full shadow-xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h2 className="text-lg font-bold">Regulation 44 Report</h2>
            <p className="text-xs text-muted-foreground">{report.visit_month} · {report.inspector_name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF} className="gap-1 text-sm"><Download className="w-4 h-4" /> PDF</Button>
            <button onClick={onClose}><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${RATING_COLORS[report.overall_rating]}`}>
              {report.overall_rating}
            </span>
            {report.status === "submitted" && <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-700">Pending manager response</span>}
            {report.status === "manager_responded" && <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">✓ Manager responded</span>}
          </div>

          {/* Visit Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Inspector</p>
              <p className="font-medium">{report.inspector_name}</p>
              {report.inspector_organisation && <p className="text-xs text-muted-foreground">{report.inspector_organisation}</p>}
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Visit Duration</p>
              <p className="font-medium">{report.visit_duration_hours} hours</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Residents Spoken To</p>
              <p className="font-medium">{report.residents_spoken_to}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Staff Spoken To</p>
              <p className="font-medium">{report.staff_spoken_to}</p>
            </div>
          </div>

          {/* Quality Standards */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Quality Standards Assessment</h3>
            <div className="space-y-3">
              {report.quality_standards.map(std => (
                <div key={std.standard_number} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Standard {std.standard_number}: {std.standard_name}</p>
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${RATING_COLORS[std.rating]}`}>{std.rating}</span>
                  </div>
                  {std.evidence && <div><p className="text-xs text-muted-foreground font-medium">Evidence</p><p className="text-sm">{std.evidence}</p></div>}
                  {std.concerns && <div><p className="text-xs text-muted-foreground font-medium">Concerns</p><p className="text-sm">{std.concerns}</p></div>}
                  {std.recommendations && <div><p className="text-xs text-muted-foreground font-medium">Recommendations</p><p className="text-sm">{std.recommendations}</p></div>}
                </div>
              ))}
            </div>
          </div>

          {/* Key Findings */}
          <div className="border-t border-border pt-4">
            <h3 className="font-semibold text-sm mb-3">Key Findings</h3>
            {report.strengths && (
              <div className="mb-3 p-3 bg-green-50 rounded">
                <p className="text-xs text-muted-foreground font-medium">Strengths</p>
                <p className="text-sm mt-1">{report.strengths}</p>
              </div>
            )}
            {report.areas_for_improvement && (
              <div className="mb-3 p-3 bg-blue-50 rounded">
                <p className="text-xs text-muted-foreground font-medium">Areas for Improvement</p>
                <p className="text-sm mt-1">{report.areas_for_improvement}</p>
              </div>
            )}
            {report.serious_concerns && (
              <div className="p-3 bg-red-50 rounded border border-red-200">
                <p className="text-xs text-red-700 font-medium">🚨 Serious Concerns</p>
                <p className="text-sm text-red-700 mt-1">{report.serious_concern_detail}</p>
              </div>
            )}
          </div>

          {/* New Recommendations */}
          {report.new_recommendations && report.new_recommendations.length > 0 && (
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-sm mb-2">New Recommendations</h3>
              <div className="space-y-2">
                {report.new_recommendations.map((rec, i) => (
                  <div key={i} className="p-2 bg-muted/30 rounded text-sm">
                    <p className="font-medium">{rec.recommendation}</p>
                    <p className="text-xs text-muted-foreground">Priority: {rec.priority} · Due: {rec.target_date} · {rec.responsible_person}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manager Response */}
          {report.status === "submitted" ? (
            showResponse ? (
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-sm mb-3">Manager Response</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Response to Findings</label>
                    <Textarea value={response.manager_response} onChange={e => setResponse(p => ({ ...p, manager_response: e.target.value }))} rows={3} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Action Plan</label>
                    <Textarea value={response.action_plan} onChange={e => setResponse(p => ({ ...p, action_plan: e.target.value }))} rows={3} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveResponse} disabled={updateMutation.isPending}>Save Response</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowResponse(false)}>Cancel</Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-border pt-4">
                <Button onClick={() => setShowResponse(true)} className="w-full">Add Manager Response</Button>
              </div>
            )
          ) : (
            <div className="border-t border-border pt-4">
              <h3 className="font-semibold text-sm mb-2">Manager Response</h3>
              <div className="space-y-2">
                {report.manager_response && <div><p className="text-xs text-muted-foreground">Response</p><p className="text-sm">{report.manager_response}</p></div>}
                {report.action_plan && <div><p className="text-xs text-muted-foreground">Action Plan</p><p className="text-sm">{report.action_plan}</p></div>}
                <p className="text-xs text-muted-foreground">Responded {report.manager_response_date} by {report.manager_name}</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}