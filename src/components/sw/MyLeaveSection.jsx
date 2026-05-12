import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Calendar } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";

const LEAVE_TYPES = [
  { value: "annual_leave", label: "Annual Leave", color: "bg-blue-100 text-blue-700" },
  { value: "sick_leave", label: "Sick Leave", color: "bg-red-100 text-red-700" },
  { value: "unpaid_leave", label: "Unpaid Leave", color: "bg-gray-100 text-gray-700" },
  { value: "compassionate", label: "Compassionate", color: "bg-purple-100 text-purple-700" },
  { value: "maternity_paternity", label: "Maternity/Paternity", color: "bg-pink-100 text-pink-700" },
  { value: "toil", label: "TOIL", color: "bg-amber-100 text-amber-700" },
];

const STATUS_COLORS = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

function RequestModal({ myProfile, onClose, onSubmit }) {
  const [form, setForm] = useState({ leave_type: "annual_leave", date_from: "", date_to: "", notes: "" });
  const days = form.date_from && form.date_to
    ? Math.max(1, differenceInDays(parseISO(form.date_to), parseISO(form.date_from)) + 1)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-md rounded-xl shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Request Leave</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Leave Type</label>
            <Select value={form.leave_type} onValueChange={v => setForm(f => ({ ...f, leave_type: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">From</label>
              <Input type="date" className="mt-1" value={form.date_from} onChange={e => setForm(f => ({ ...f, date_from: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">To</label>
              <Input type="date" className="mt-1" value={form.date_to} onChange={e => setForm(f => ({ ...f, date_to: e.target.value }))} />
            </div>
          </div>
          {days > 0 && <p className="text-xs text-muted-foreground">{days} day{days !== 1 ? "s" : ""} requested</p>}
          <div>
            <label className="text-xs text-muted-foreground">Notes (optional)</label>
            <Input className="mt-1" placeholder="Any additional information…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!form.date_from || !form.date_to}
            onClick={() => onSubmit({ ...form, days_requested: days, staff_id: myProfile.id, staff_name: myProfile.full_name })}>
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function MyLeaveSection({ myProfile, org }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const defaultEntitlement = org?.hr_policy?.annual_leave_days ?? 28;
  const currentYear = new Date().getFullYear();

  const { data: leaveRequests = [] } = useQuery({
    queryKey: ["my-leave-requests", myProfile?.id],
    queryFn: () => secureGateway.filter("LeaveRequest", { staff_id: myProfile.id }, "-date_from"),
    enabled: !!myProfile?.id,
    staleTime: 0,
  });

  const { data: balances = [] } = useQuery({
    queryKey: ["my-leave-balance", myProfile?.id],
    queryFn: () => secureGateway.filter("LeaveBalance", { staff_id: myProfile.id }),
    enabled: !!myProfile?.id,
  });

  const submitLeave = useMutation({
    mutationFn: (data) => secureGateway.create("LeaveRequest", { org_id: ORG_ID, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-leave-requests"] });
      setShowModal(false);
      toast.success("Leave request submitted");
    },
  });

  const bal = balances.find(b => b.year === currentYear);
  const entitlement = bal?.annual_entitlement ?? defaultEntitlement;
  const taken = bal?.days_taken ?? 0;
  const remaining = bal?.days_remaining ?? entitlement;
  const sickCount = leaveRequests.filter(r => r.leave_type === "sick_leave" && r.status === "approved").length;
  const pending = leaveRequests.filter(r => r.status === "pending").reduce((s, r) => s + (r.days_requested || 0), 0);
  const pct = Math.min(100, Math.round((taken / entitlement) * 100));

  return (
    <div className="space-y-6">
      {/* Balance card */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Annual Leave {currentYear}/{String(currentYear + 1).slice(2)}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Entitlement: {entitlement} days</p>
          </div>
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-xl font-bold text-foreground">{taken}</p>
            <p className="text-xs text-muted-foreground">Taken</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xl font-bold text-green-600">{remaining}</p>
            <p className="text-xs text-muted-foreground">Remaining</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xl font-bold text-amber-600">{pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{pct}% used</span>
            <span>{remaining} days left</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        {sickCount > 0 && (
          <p className="text-xs text-muted-foreground">Sick leave taken this year: {sickCount} occurrence{sickCount !== 1 ? "s" : ""}</p>
        )}
      </div>

      <Button className="w-full gap-2" onClick={() => setShowModal(true)}>
        <Plus className="w-4 h-4" /> Request Leave
      </Button>

      {/* Leave history */}
      <div>
        <h3 className="font-semibold text-sm mb-3">My Leave History</h3>
        {leaveRequests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-xl border border-border">
            No leave requests yet.
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">From</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">To</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Days</th>
                  <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveRequests.map(req => {
                  const lt = LEAVE_TYPES.find(t => t.value === req.leave_type);
                  return (
                    <tr key={req.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lt?.color || ""}`}>{lt?.label}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">{req.date_from}</td>
                      <td className="px-4 py-3 text-xs">{req.date_to}</td>
                      <td className="px-4 py-3 text-center text-xs">{req.days_requested}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={`text-xs ${STATUS_COLORS[req.status] || "bg-muted text-muted-foreground"}`}>
                          {req.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <RequestModal
          myProfile={myProfile}
          onClose={() => setShowModal(false)}
          onSubmit={(data) => submitLeave.mutate(data)}
        />
      )}
    </div>
  );
}