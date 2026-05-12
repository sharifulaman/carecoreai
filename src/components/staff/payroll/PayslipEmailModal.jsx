import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Mail, CheckCircle, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function PayslipEmailModal({ payslip, staffEmail, staffName, org, onClose, onEmailSent }) {
  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const totalDeductions = ((payslip.ni_deduction || 0) + (payslip.tax_deduction || 0) + (payslip.pension_deduction || 0));

  const handleSendAndClose = async () => {
    if (!sendEmail) { onClose(); return; }
    if (!staffEmail) { toast.error("No email address found for this staff member"); onClose(); return; }

    setSending(true);
    setError(null);
    try {
      await base44.functions.invoke("sendPayslipEmail", {
        payslip_id: payslip.id,
        staff_email: staffEmail,
        staff_name: staffName,
        org_name: org?.name || "CareCore AI",
        org_contact_email: org?.contact_email || "",
      });
      toast.success(`Payslip emailed to ${staffEmail}`);
      onEmailSent?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Failed to send email");
      setSending(false);
    }
  };

  const handleSaveOnly = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="font-semibold">Payslip Generated</h3>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Summary */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Staff</span>
              <span className="font-medium">{payslip.staff_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Period</span>
              <span className="font-medium">{payslip.pay_period_label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gross Pay</span>
              <span>£{(payslip.gross_pay || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deductions</span>
              <span className="text-red-600">-£{totalDeductions.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-green-600 border-t border-border pt-1.5 mt-1">
              <span>Net Pay</span>
              <span>£{(payslip.net_pay || 0).toFixed(2)}</span>
            </div>
          </div>

          {/* Email option */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={sendEmail}
              onChange={e => setSendEmail(e.target.checked)}
              className="mt-0.5 rounded w-4 h-4 accent-primary"
            />
            <div>
              <p className="text-sm font-medium">Send payslip to staff automatically</p>
              {staffEmail ? (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {staffEmail}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">⚠ No email address on staff profile</p>
              )}
            </div>
          </label>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" className="flex-1" onClick={handleSaveOnly} disabled={sending}>
            Save Only
          </Button>
          <Button
            className="flex-1 gap-1.5"
            onClick={handleSendAndClose}
            disabled={sending || (sendEmail && !staffEmail)}
          >
            {sending ? (
              <>Sending…</>
            ) : sendEmail ? (
              <><Mail className="w-4 h-4" /> Send & Close</>
            ) : (
              "Close"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}