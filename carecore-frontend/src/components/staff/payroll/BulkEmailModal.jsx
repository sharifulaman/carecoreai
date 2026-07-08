import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Mail, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function BulkEmailModal({ payslips, staff, org, periodLabel, onClose, onComplete }) {
  const [stage, setStage] = useState("confirm"); // confirm | sending | done
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState([]);
  const [retrying, setRetrying] = useState(null);

  // Only payslips not yet emailed
  const pending = payslips.filter(p => !p.emailed_at);

  const getEmail = (ps) => {
    const member = staff.find(s => s.id === ps.staff_id);
    return member?.email || ps.emailed_to || null;
  };

  const sendOne = async (ps) => {
    const email = getEmail(ps);
    if (!email) throw new Error(`No email for ${ps.staff_name}`);
    const member = staff.find(s => s.id === ps.staff_id);
    await base44.functions.invoke("sendPayslipEmail", {
      payslip_id: ps.id,
      staff_email: email,
      staff_name: member?.full_name || ps.staff_name,
      org_name: org?.name || "CareCore AI",
      org_contact_email: org?.contact_email || "",
    });
  };

  const handleSend = async () => {
    setStage("sending");
    setProgress(0);
    const errs = [];

    for (let i = 0; i < pending.length; i++) {
      const ps = pending[i];
      try {
        await sendOne(ps);
      } catch (err) {
        errs.push({ payslip: ps, error: err?.response?.data?.error || err.message || "Failed" });
      }
      setProgress(i + 1);
      if (i < pending.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    setFailures(errs);
    setStage("done");
    onComplete?.();
  };

  const handleRetry = async (item) => {
    setRetrying(item.payslip.id);
    try {
      await sendOne(item.payslip);
      setFailures(prev => prev.filter(f => f.payslip.id !== item.payslip.id));
      toast.success(`Resent to ${getEmail(item.payslip)}`);
      onComplete?.();
    } catch (err) {
      toast.error(`Retry failed: ${err?.response?.data?.error || err.message}`);
    }
    setRetrying(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Email All Payslips</h3>
          </div>
          {stage !== "sending" && (
            <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {stage === "confirm" && (
            <>
              <p className="text-sm text-muted-foreground">
                Send payslips to <strong>{pending.length} staff member{pending.length !== 1 ? "s" : ""}</strong> for <strong>{periodLabel}</strong>?
                Each staff member will receive their individual payslip by email.
              </p>
              {pending.length === 0 && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                  <CheckCircle className="w-4 h-4" /> All payslips for this period have already been emailed.
                </div>
              )}
              {payslips.length > pending.length && (
                <p className="text-xs text-muted-foreground">
                  {payslips.length - pending.length} payslip{payslips.length - pending.length !== 1 ? "s" : ""} already sent — skipping those.
                </p>
              )}
            </>
          )}

          {stage === "sending" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <p className="text-sm font-medium">
                  Sending {progress} of {pending.length}…
                </p>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(progress / pending.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {stage === "done" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <p className="text-sm font-medium">
                  {pending.length - failures.length} of {pending.length} payslips sent successfully.
                </p>
              </div>

              {failures.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-600">Failed ({failures.length}):</p>
                  {failures.map(f => (
                    <div key={f.payslip.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50 border border-red-200">
                      <div>
                        <p className="text-xs font-medium text-red-700">{f.payslip.staff_name}</p>
                        <p className="text-[10px] text-red-500">{f.error}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50"
                        disabled={retrying === f.payslip.id}
                        onClick={() => handleRetry(f)}
                      >
                        {retrying === f.payslip.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Retry"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border">
          {stage === "confirm" && (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 gap-1.5"
                disabled={pending.length === 0}
                onClick={handleSend}
              >
                <Mail className="w-4 h-4" /> Confirm & Send
              </Button>
            </>
          )}
          {stage === "done" && (
            <Button className="flex-1" onClick={onClose}>Close</Button>
          )}
        </div>
      </div>
    </div>
  );
}