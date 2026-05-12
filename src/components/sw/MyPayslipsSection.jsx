import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { FileText, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import PayslipDocument from "@/components/staff/payroll/PayslipDocument";

function PayslipPrintModal({ payslip, orgName, onClose }) {
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const el = document.getElementById("sw-payslip-print-area");
    printWindow.document.write(`<html><head><title>Payslip - ${payslip.staff_name}</title>
      <style>body{margin:20px;font-family:Arial,sans-serif;}</style></head>
      <body>${el.innerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Payslip — {payslip.pay_period_label}</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="w-4 h-4" /> Print / Download
            </Button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl font-bold px-2">×</button>
          </div>
        </div>
        <div className="p-6" id="sw-payslip-print-area">
          <PayslipDocument payslip={payslip} orgName={orgName} />
        </div>
      </div>
    </div>
  );
}

export default function MyPayslipsSection({ myProfile, org }) {
  const [viewPayslip, setViewPayslip] = useState(null);
  const orgName = org?.name || org?.app_name || "CareCore AI";

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ["my-payslips", myProfile?.id],
    queryFn: () => secureGateway.filter("Payslip", { staff_id: myProfile.id }, "-period_end"),
    enabled: !!myProfile?.id,
    staleTime: 0,
  });

  if (isLoading) return <div className="py-10 text-center text-muted-foreground text-sm">Loading payslips…</div>;

  if (payslips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <FileText className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No payslips generated yet.</p>
        <p className="text-xs mt-1">Your payslips will appear here once processed by your payroll team.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{payslips.length} payslip{payslips.length !== 1 ? "s" : ""} on record</p>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Period</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Gross Pay</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Deductions</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Net Pay</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Generated</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">View</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map(ps => {
              const totalDed = (ps.ni_deduction || 0) + (ps.tax_deduction || 0) + (ps.pension_deduction || 0);
              return (
                <tr key={ps.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium text-sm">{ps.pay_period_label}</td>
                  <td className="px-4 py-3 text-right">£{(ps.gross_pay || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-red-600">-£{totalDed.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">£{(ps.net_pay || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-xs text-muted-foreground">
                    {ps.generated_at ? format(new Date(ps.generated_at), "dd MMM yyyy") : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setViewPayslip(ps)}>
                      <Download className="w-3 h-3" /> View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {viewPayslip && (
        <PayslipPrintModal
          payslip={viewPayslip}
          orgName={orgName}
          onClose={() => setViewPayslip(null)}
        />
      )}
    </div>
  );
}