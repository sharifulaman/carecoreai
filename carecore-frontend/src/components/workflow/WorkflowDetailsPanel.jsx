import { useState } from "react";
import { format } from "date-fns";
import {
  X, Receipt, CheckCircle2, XCircle, AlertTriangle, AlertCircle,
  FileText, ChevronDown, ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkflowDetailsPanel({ workflow, onClose, onApprove, onReject, loading }) {
  const [expandedSections, setExpandedSections] = useState({
    summary: true,
    submission: false,
    reviewNotes: false,
    attachments: false,
    decisionPanel: false,
    auditTrail: true,
  });

  if (!workflow) return null;

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getStatusBadgeColor = (status) => {
    const colors = {
      submitted: "bg-amber-100 text-amber-700",
      pending_tl: "bg-amber-100 text-amber-700",
      pending_tm: "bg-purple-100 text-purple-700",
      pending_fm: "bg-blue-100 text-blue-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-slate-100 text-slate-700";
  };

  const auditTrail = [
    { action: "Submitted", date: "10 May 2025 09:30", status: "completed" },
    { action: "First Review", date: "11 May 2025 11:15", status: "completed" },
    { action: "Management Review", date: "11 May 2025 14:45", status: "pending" },
  ];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={onClose} />
      
      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-96 bg-card border-l border-border flex flex-col z-50 overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-4 border-b border-border shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                <Receipt className="w-3.5 h-3.5 text-amber-700" />
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">Bill Approval</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 whitespace-nowrap">High Priority</span>
            </div>
            <h3 className="font-bold text-sm leading-tight">Home Expense Posting - May 2025</h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">BILL-2025-0307</p>
          </div>
          <button onClick={onClose} className="shrink-0 -mr-1">
            <X className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-3 p-4">
            
            {/* Summary */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("summary")}
                className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase">Summary</p>
                {expandedSections.summary ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {expandedSections.summary && (
                <div className="border-t border-border p-3 bg-muted/20 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Home:</span>
                    <span className="font-medium">{workflow.home_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Stage:</span>
                    <span className={`font-medium ${getStatusBadgeColor(workflow.status)}`}>
                      Management Review
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created 01:</span>
                    <span className="font-medium">{workflow.submitted_at ? format(new Date(workflow.submitted_at), "dd MMM yyyy HH:mm") : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SLA Due Date:</span>
                    <span className="font-medium">10 May 2025</span>
                  </div>
                </div>
              )}
            </div>

            {/* Current Action Required */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-900 mb-1.5">Current Action Required</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                You are required to review and approve this bill for posting to home expense
              </p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-1"
                onClick={() => onApprove(workflow)}
                disabled={loading}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Approve</span>
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs border border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1"
                variant="outline"
                onClick={() => onReject(workflow, "Needs revision")}
                disabled={loading}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reject</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-orange-200 text-orange-700 hover:bg-orange-50 flex items-center justify-center gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Changes</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 flex items-center justify-center gap-1"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Escalate</span>
              </Button>
            </div>

            {/* Submission Details */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("submission")}
                className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase">Submission Details</p>
                {expandedSections.submission ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {expandedSections.submission && (
                <div className="border-t border-border p-3 bg-muted/20 text-xs text-muted-foreground">
                  <p>Bill details, amounts, and submission notes visible here in locked view.</p>
                </div>
              )}
            </div>

            {/* Review Notes */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("reviewNotes")}
                className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Review Notes</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">3</span>
                </div>
                {expandedSections.reviewNotes ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {expandedSections.reviewNotes && (
                <div className="border-t border-border p-3 bg-muted/20 space-y-2">
                  <div className="text-xs text-muted-foreground">No review notes yet. Add notes below.</div>
                </div>
              )}
            </div>

            {/* Attachments */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("attachments")}
                className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Attachments</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">3</span>
                </div>
                {expandedSections.attachments ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {expandedSections.attachments && (
                <div className="border-t border-border p-3 bg-muted/20 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Bill_5026-0307.pdf</span>
                  </div>
                </div>
              )}
            </div>

            {/* Decision Panel */}
            <div className="border border-border rounded-lg overflow-hidden bg-slate-50">
              <button
                onClick={() => toggleSection("decisionPanel")}
                className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors"
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase">Decision Panel</p>
                {expandedSections.decisionPanel ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {expandedSections.decisionPanel && (
                <div className="border-t border-border p-3 space-y-2 text-xs">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" id="approve-all" />
                    <label htmlFor="approve-all" className="text-muted-foreground leading-relaxed">
                      ✓ Approve / Sign Off
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" id="reject" />
                    <label htmlFor="reject" className="text-muted-foreground">
                      ✕ Reject
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" id="request-changes" />
                    <label htmlFor="request-changes" className="text-muted-foreground">
                      Request Changes
                    </label>
                  </div>
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-0.5" id="escalate" />
                    <label htmlFor="escalate" className="text-muted-foreground">
                      Escalate
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Audit Trail */}
            <div className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSection("auditTrail")}
                className="w-full flex items-center justify-between gap-2 p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Audit Trail</p>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">8</span>
                </div>
                {expandedSections.auditTrail ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              {expandedSections.auditTrail && (
                <div className="border-t border-border p-3 bg-muted/20 space-y-3">
                  {auditTrail.map((entry, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                        entry.status === "completed" ? "bg-green-500" :
                        entry.status === "pending" ? "bg-slate-300" :
                        "bg-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{entry.action}</p>
                        <p className="text-xs text-muted-foreground">{entry.date}</p>
                      </div>
                    </div>
                  ))}
                  <button className="text-xs text-primary hover:underline font-medium mt-2">View full audit trail →</button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Footer - Add Note */}
        <div className="border-t border-border p-4 shrink-0 bg-muted/10">
          <textarea
            placeholder="Add your note here..."
            className="w-full h-14 text-xs border border-border rounded-lg p-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
          <button className="text-xs text-primary hover:underline font-medium mt-2">+ Add Note</button>
        </div>
      </div>
    </>
  );
}