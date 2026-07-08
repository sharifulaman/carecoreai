import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { Eye, Download, Flag, AlertTriangle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { X } from "lucide-react";

const TEMPLATE_META = {
  voice_feedback:  { label: "Voice Feedback" },
  meeting_record:  { label: "Monthly Meeting Record" },
  questionnaire:   { label: "Feedback Questionnaire" },
};

const STATUS_BADGES = {
  submitted:         "bg-green-100 text-green-700",
  in_review:         "bg-blue-100 text-blue-700",
  signed_off:        "bg-emerald-100 text-emerald-700",
};

export default function YPVoiceReadOnly({ residents = [] }) {
  const [viewRecord, setViewRecord] = useState(null);

  const { data: submissions = [] } = useQuery({
    queryKey: ["yp-feedback-submissions-readonly"],
    queryFn: () => base44.entities.YPFeedbackSubmission.filter({ status: { $in: ["submitted", "in_review", "signed_off"] } }, "-submitted_at", 500),
    staleTime: 5 * 60 * 1000,
  });

  const residentIds = residents.map(r => r.id);
  const residentNames = residents.map(r => r.display_name || r.full_name);
  
  const filtered = submissions.filter(s => {
    if (s.template_category === "meeting_record") {
      const attending = s.response_json?.yp_attending_list || [];
      return attending.some(name => residentNames.includes(name));
    }
    return residentIds.includes(s.resident_id);
  });

  const exportSubmission = (sub) => {
    const win = window.open("", "_blank");
    const responses = sub.response_json ? JSON.stringify(sub.response_json, null, 2) : "No responses recorded.";
    win.document.write(`<!DOCTYPE html><html><head><title>${sub.template_name}</title>
    <style>body{font-family:Arial,sans-serif;padding:40px;color:#333;}h1{font-size:20px;}table{width:100%;border-collapse:collapse;}td,th{padding:8px;border:1px solid #ddd;font-size:12px;}pre{white-space:pre-wrap;font-family:Arial;font-size:12px;}</style>
    </head><body>
    <h1>${sub.template_name}</h1>
    <p><strong>Young Person:</strong> ${sub.resident_name || "—"} &nbsp; <strong>Home:</strong> ${sub.home_name || "—"}</p>
    <p><strong>Status:</strong> ${sub.status} &nbsp; <strong>Submitted:</strong> ${sub.submitted_at ? format(new Date(sub.submitted_at), "dd MMM yyyy HH:mm") : "Draft"}</p>
    <p><strong>Staff:</strong> ${sub.submitted_by_name || "—"}</p>
    <hr/><h2>Responses</h2><pre>${responses}</pre>
    ${sub.review_notes ? `<h2>Review Notes</h2><p>${sub.review_notes}</p>` : ""}
    </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">Young People's Voice & Feedback</h3>
        </div>
        
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">No voice or feedback submissions recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-4 py-2.5 font-semibold">Form</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Young Person</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Home</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Submitted</th>
                  <th className="text-left px-4 py-2.5 font-semibold">By</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sub => (
                  <tr key={sub.id} className="border-b border-border/50 last:border-0 hover:bg-muted/10">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{sub.template_name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      {sub.template_category === "meeting_record"
                        ? sub.response_json?.yp_attending || "—"
                        : sub.resident_name || "—"}
                    </td>
                    <td className="px-4 py-2.5">{sub.home_name || "—"}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full font-medium capitalize text-[10px] ${STATUS_BADGES[sub.status] || "bg-muted text-muted-foreground"}`}>
                        {sub.status?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {sub.submitted_at ? format(new Date(sub.submitted_at), "dd MMM yyyy HH:mm") : "—"}
                    </td>
                    <td className="px-4 py-2.5">{sub.submitted_by_name || "—"}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewRecord(sub)} title="View" className="text-muted-foreground hover:text-foreground">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => exportSubmission(sub)} title="Download PDF" className="text-muted-foreground hover:text-foreground">
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card">
              <div>
                <h2 className="font-bold text-base">{viewRecord.template_name}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{viewRecord.resident_name || "—"} · {viewRecord.home_name || "—"}</p>
              </div>
              <button onClick={() => setViewRecord(null)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Status</span>
                  <p className="font-medium capitalize mt-0.5">{viewRecord.status?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Submitted</span>
                  <p className="font-medium mt-0.5">{viewRecord.submitted_at ? format(new Date(viewRecord.submitted_at), "dd MMM yyyy HH:mm") : "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">By</span>
                  <p className="font-medium mt-0.5">{viewRecord.submitted_by_name || "—"}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Version</span>
                  <p className="font-medium mt-0.5">{viewRecord.template_version || "—"}</p>
                </div>
              </div>
              {Object.keys(viewRecord.response_json || {}).length > 0 && (
                <div className="border border-border rounded-xl p-4">
                  <h3 className="text-sm font-semibold mb-3">Feedback Responses</h3>
                  <div className="space-y-2">
                    {Object.entries(viewRecord.response_json || {}).map(([key, val]) => (
                      <div key={key} className="text-xs">
                        <span className="text-muted-foreground">{key}: </span>
                        <span className="font-medium">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {viewRecord.review_notes && (
                <div className="border border-border rounded-xl p-4 bg-blue-50/50">
                  <h3 className="text-sm font-semibold mb-1">Review Notes</h3>
                  <p className="text-xs text-muted-foreground">{viewRecord.review_notes}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">— {viewRecord.reviewed_by_name} · {viewRecord.reviewed_at ? format(new Date(viewRecord.reviewed_at), "dd MMM yyyy") : ""}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}