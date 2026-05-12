import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, parseISO, addMonths, format } from "date-fns";
import { ORG_ID } from "@/lib/roleConfig";

function AccrualForm({ staff, org, onClose, onSubmit }) {
  const [form, setForm] = useState({ staff_id: "", hours: "", reason: "Overtime approved" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-sm rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Accrue TOIL</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Staff Member</label>
          <Select value={form.staff_id} onValueChange={v => setForm(f => ({ ...f, staff_id: v }))}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select staff" /></SelectTrigger>
            <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Hours to Accrue</label>
          <Input type="number" className="mt-1" min="0.5" step="0.5" placeholder="e.g. 3.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Reason</label>
          <Input className="mt-1" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!form.staff_id || !form.hours} onClick={() => onSubmit(form)}>Accrue TOIL</Button>
        </div>
      </div>
    </div>
  );
}

export default function TOILTab({ user, staff = [], staffProfile }) {
  const queryClient = useQueryClient();
  const isAdmin = user?.role === "admin" || user?.role === "admin_officer";
  const isTL = user?.role === "team_leader";
  const [showAccrue, setShowAccrue] = useState(false);

  const { data: org } = useQuery({
    queryKey: ["organisation"],
    queryFn: () => secureGateway.filter("Organisation"),
    select: d => d?.[0] || null,
    staleTime: 10 * 60 * 1000,
  });
  const toilExpiryMonths = org?.hr_policy?.toil_expiry_months ?? 3;

  const { data: toilBalances = [] } = useQuery({
    queryKey: ["toil-balances"],
    queryFn: () => secureGateway.filter("TOILBalance"),
    staleTime: 5 * 60 * 1000,
  });

  const myProfile = staffProfile || staff.find(s => s.email === user?.email);

  const accrueToil = useMutation({
    mutationFn: async ({ staff_id, hours, reason }) => {
      const member = staff.find(s => s.id === staff_id);
      const existing = toilBalances.find(b => b.staff_id === staff_id);
      const hrs = parseFloat(hours) || 0;
      const today = new Date().toISOString().split("T")[0];
      const expiry = format(addMonths(new Date(), toilExpiryMonths), "yyyy-MM-dd");

      if (existing) {
        await secureGateway.update("TOILBalance", existing.id, {
          hours_accrued: (existing.hours_accrued || 0) + hrs,
          hours_remaining: (existing.hours_remaining || 0) + hrs,
          last_accrual_date: today,
          expiry_date: expiry,
          flagged_for_review: false,
        });
      } else {
        await secureGateway.create("TOILBalance", {
          org_id: ORG_ID,
          staff_id,
          staff_name: member?.full_name || "",
          hours_accrued: hrs,
          hours_taken: 0,
          hours_remaining: hrs,
          last_accrual_date: today,
          expiry_date: expiry,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toil-balances"] });
      setShowAccrue(false);
      toast.success("TOIL accrued");
    },
  });

  // Check for expiring TOIL (past expiry date with remaining hours)
  const today = new Date();
  const expiringToil = toilBalances.filter(b => {
    if (!b.expiry_date || (b.hours_remaining || 0) <= 0) return false;
    return new Date(b.expiry_date) <= today;
  });

  const visibleBalances = isAdmin || isTL
    ? toilBalances
    : toilBalances.filter(b => b.staff_id === myProfile?.id);

  // Flag expiring ones
  const flagExpiringMutation = useMutation({
    mutationFn: (id) => secureGateway.update("TOILBalance", id, { flagged_for_review: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["toil-balances"] }),
  });

  // Auto-flag on render (fire-and-forget)
  expiringToil.forEach(b => {
    if (!b.flagged_for_review) flagExpiringMutation.mutate(b.id);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-base flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> TOIL Balances</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Time Off In Lieu — expires after {toilExpiryMonths} months</p>
        </div>
        {(isAdmin || isTL) && (
          <Button size="sm" className="gap-1" onClick={() => setShowAccrue(true)}>
            <Plus className="w-3.5 h-3.5" /> Accrue TOIL
          </Button>
        )}
      </div>

      {expiringToil.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>TOIL Expiry Alert:</strong> {expiringToil.map(b => `${b.staff_name} (${b.hours_remaining}h)`).join(", ")} — TOIL has expired and should be reviewed.</span>
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Staff Member</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Accrued (hrs)</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Used (hrs)</th>
              <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Remaining (hrs)</th>
              <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Expires</th>
              <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleBalances.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground text-xs">No TOIL balances. Accrue TOIL from approved overtime timesheets.</td></tr>
            ) : visibleBalances.map(b => {
              const isExpired = b.expiry_date && new Date(b.expiry_date) < today && (b.hours_remaining || 0) > 0;
              const isExpiringSoon = b.expiry_date && !isExpired && differenceInDays(parseISO(b.expiry_date), today) <= 14 && (b.hours_remaining || 0) > 0;
              return (
                <tr key={b.id} className={`border-b border-border last:border-0 hover:bg-muted/20 ${isExpired ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3 font-medium">{b.staff_name}</td>
                  <td className="px-4 py-3 text-right">{(b.hours_accrued || 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{(b.hours_taken || 0).toFixed(1)}</td>
                  <td className="px-4 py-3 text-right font-semibold">
                    <span className={b.hours_remaining > 0 ? "text-green-600" : "text-muted-foreground"}>
                      {(b.hours_remaining || 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {b.expiry_date ? (
                      <span className={isExpired ? "text-red-600 font-medium" : isExpiringSoon ? "text-amber-600 font-medium" : ""}>
                        {b.expiry_date}
                        {isExpiringSoon && " ⚠"}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isExpired && <Badge className="bg-red-100 text-red-700 text-xs">Expired</Badge>}
                    {isExpiringSoon && <Badge className="bg-amber-100 text-amber-700 text-xs">Expiring Soon</Badge>}
                    {!isExpired && !isExpiringSoon && b.hours_remaining > 0 && <Badge className="bg-green-100 text-green-700 text-xs">Active</Badge>}
                    {(b.hours_remaining || 0) <= 0 && !isExpired && <Badge className="bg-muted text-muted-foreground text-xs">Exhausted</Badge>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 TOIL is deducted automatically when a TOIL leave request is approved. Accrue TOIL manually above when overtime is worked instead of paid.
      </p>

      {showAccrue && (
        <AccrualForm
          staff={staff.filter(s => s.status === "active")}
          org={org}
          onClose={() => setShowAccrue(false)}
          onSubmit={accrueToil.mutate}
        />
      )}
    </div>
  );
}