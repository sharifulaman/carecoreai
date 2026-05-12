import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";

export default function LoneWorkingLogs({ home }) {
  const qc = useQueryClient();
  const [showWelfareForm, setShowWelfareForm] = useState(null);
  const [welfareNotes, setWelfareNotes] = useState("");

  const { data: logs = [] } = useQuery({
    queryKey: ["lone-working-logs", home?.id],
    queryFn: () => secureGateway.filter("LoneWorkingLog", { home_id: home?.id }, "-check_in_datetime", 200),
    refetchInterval: 30000,
  });

  const overdueLogs = logs.filter(l => l.status === "checked_in" && new Date(l.expected_checkout_datetime) < new Date());

  const welfareCheckMutation = useMutation({
    mutationFn: async (logId) => {
      await secureGateway.update("LoneWorkingLog", logId, {
        welfare_check_initiated: true,
        welfare_check_outcome: welfareNotes,
        status: "welfare_check",
      });
    },
    onSuccess: () => {
      toast.success("Welfare check logged");
      qc.invalidateQueries({ queryKey: ["lone-working-logs"] });
      setShowWelfareForm(null);
      setWelfareNotes("");
    },
    onError: () => toast.error("Error logging welfare check"),
  });

  function timeOverdue(expectedCheckout) {
    const diff = new Date() - new Date(expectedCheckout);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m ago`;
  }

  return (
    <div className="space-y-4">
      {/* Overdue Alert */}
      {overdueLogs.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-pulse">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            <div>
              <h3 className="font-bold text-red-800">🚨 OVERDUE CHECK-INS — {overdueLogs.length}</h3>
              <div className="mt-2 space-y-1">
                {overdueLogs.map(l => (
                  <div key={l.id} className="text-sm text-red-700">
                    <p className="font-medium">{l.staff_name} with {l.resident_name}</p>
                    <p className="text-xs">Overdue since: {timeOverdue(l.expected_checkout_datetime)}</p>
                    <button
                      onClick={() => setShowWelfareForm(l.id)}
                      className="text-xs font-semibold underline mt-1 hover:opacity-70"
                    >
                      Log Welfare Check
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 text-xs font-semibold">Staff</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Resident</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Address</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Check In</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Check Out</th>
              <th className="text-left px-4 py-3 text-xs font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground text-sm">No lone working records.</td></tr>
            ) : logs.map((log, i) => (
              <tr key={log.id} className={`border-b border-border/50 last:border-0 ${log.status === "checked_in" && new Date(log.expected_checkout_datetime) < new Date() ? "bg-red-50" : i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                <td className="px-4 py-3 text-xs">{log.staff_name}</td>
                <td className="px-4 py-3 text-xs">{log.resident_name}</td>
                <td className="px-4 py-3 text-xs">{log.visit_address}</td>
                <td className="px-4 py-3 text-xs">{new Date(log.check_in_datetime).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
                <td className="px-4 py-3 text-xs">{log.actual_checkout_datetime ? new Date(log.actual_checkout_datetime).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    log.status === "completed" ? "bg-green-100 text-green-700" :
                    log.status === "checked_in" && new Date(log.expected_checkout_datetime) < new Date() ? "bg-red-100 text-red-700 font-bold" :
                    log.status === "checked_in" ? "bg-blue-100 text-blue-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {log.status === "checked_in" && new Date(log.expected_checkout_datetime) < new Date() ? "OVERDUE" : log.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Welfare Check Form */}
      {showWelfareForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold">Log Welfare Check</h2>
              <button onClick={() => setShowWelfareForm(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Outcome</label>
                <Textarea
                  value={welfareNotes}
                  onChange={e => setWelfareNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Safe, call connected, police welfare check initiated..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowWelfareForm(null)}>Cancel</Button>
                <Button onClick={() => welfareCheckMutation.mutate(showWelfareForm)} disabled={welfareCheckMutation.isPending}>Log</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}