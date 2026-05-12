import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftRight, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { createNotification } from "@/lib/createNotification";

export function ShiftSwapModal({ myShifts, myStaffProfile, colleagueStaff, colleagueShiftsMap, onClose, onSubmit }) {
  const [myShiftId, setMyShiftId] = useState("");
  const [targetStaffId, setTargetStaffId] = useState("");
  const [targetShiftId, setTargetShiftId] = useState("");
  const [reason, setReason] = useState("");

  const targetShifts = (colleagueShiftsMap[targetStaffId] || []);
  const myShift = myShifts.find(s => s.id === myShiftId);
  const targetShift = targetShifts.find(s => s.id === targetShiftId);
  const targetStaff = colleagueStaff.find(s => s.id === targetStaffId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" /> Request Shift Swap</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Your shift to swap</label>
          <Select value={myShiftId} onValueChange={setMyShiftId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select your shift…" /></SelectTrigger>
            <SelectContent>
              {myShifts.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.date} — {s.shift_type} ({s.time_start}–{s.time_end})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Swap with colleague</label>
          <Select value={targetStaffId} onValueChange={v => { setTargetStaffId(v); setTargetShiftId(""); }}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select colleague…" /></SelectTrigger>
            <SelectContent>
              {colleagueStaff.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {targetStaffId && (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">{targetStaff?.full_name}'s shift</label>
            <Select value={targetShiftId} onValueChange={setTargetShiftId}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select their shift…" /></SelectTrigger>
              <SelectContent>
                {targetShifts.length === 0
                  ? <SelectItem value={null} disabled>No upcoming shifts</SelectItem>
                  : targetShifts.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.date} — {s.shift_type} ({s.time_start}–{s.time_end})</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Reason (optional)</label>
          <input
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Why are you requesting this swap?"
            className="w-full border border-input rounded-md px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={!myShiftId || !targetStaffId || !targetShiftId}
            onClick={() => onSubmit({ myShiftId, myShift, targetStaffId, targetStaff, targetShiftId, targetShift, reason })}
          >
            Submit Swap Request
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ShiftSwapPanel({ staffProfile, staff = [], user, isAdminOrTL }) {
  const queryClient = useQueryClient();

  const { data: swaps = [] } = useQuery({
    queryKey: ["shift-swaps"],
    queryFn: () => secureGateway.filter("ShiftSwap"),
    staleTime: 30000,
  });

  const respondSwap = useMutation({
    mutationFn: async ({ swap, accept }) => {
      await secureGateway.update("ShiftSwap", swap.id, {
        status: accept ? "target_accepted" : "target_declined",
        target_responded_at: new Date().toISOString(),
      });
      // If accepted, notify TL/admin
      if (accept) {
        const admin = staff.find(s => s.role === "admin" || s.role === "team_leader");
        if (admin?.user_id) {
          createNotification({
            recipient_user_id: admin.user_id,
            recipient_staff_id: admin.id,
            title: "Shift Swap Accepted — Awaiting Approval",
            body: `${swap.target_staff_name} accepted a shift swap with ${swap.requesting_staff_name}. Please review and approve.`,
            type: "rota",
            link: "/staff?tab=rota",
          });
        }
      } else {
        // Notify requester of decline
        const requester = staff.find(s => s.id === swap.requesting_staff_id);
        if (requester?.user_id) {
          createNotification({
            recipient_user_id: requester.user_id,
            recipient_staff_id: requester.id,
            title: "Shift Swap Declined",
            body: `${swap.target_staff_name} declined your shift swap request.`,
            type: "rota",
            link: "/sw-dashboard",
          });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-swaps"] }); toast.success("Response recorded"); },
  });

  const approveSwap = useMutation({
    mutationFn: async (swap) => {
      // Swap staff_id on both shifts
      await secureGateway.update("Shift", swap.requesting_shift_id, {
        staff_id: swap.target_staff_id,
        staff_name: swap.target_staff_name,
        assigned_staff: [swap.target_staff_id],
        lead_staff_id: swap.target_staff_id,
      });
      await secureGateway.update("Shift", swap.target_shift_id, {
        staff_id: swap.requesting_staff_id,
        staff_name: swap.requesting_staff_name,
        assigned_staff: [swap.requesting_staff_id],
        lead_staff_id: swap.requesting_staff_id,
      });
      await secureGateway.update("ShiftSwap", swap.id, {
        status: "approved",
        reviewed_by: staffProfile?.full_name,
        reviewed_at: new Date().toISOString(),
      });
      // Notify both
      for (const [sid, sname] of [[swap.requesting_staff_id, swap.requesting_staff_name], [swap.target_staff_id, swap.target_staff_name]]) {
        const s = staff.find(x => x.id === sid);
        if (s?.user_id) {
          createNotification({
            recipient_user_id: s.user_id,
            recipient_staff_id: s.id,
            title: "Shift Swap Approved",
            body: `Your shift swap between ${swap.requesting_staff_name} and ${swap.target_staff_name} has been approved. Your rota has been updated.`,
            type: "rota",
            link: "/sw-dashboard",
          });
        }
      }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-swaps"] }); queryClient.invalidateQueries({ queryKey: ["rota-shifts"] }); toast.success("Swap approved — rotas updated"); },
  });

  const rejectSwap = useMutation({
    mutationFn: (swap) => secureGateway.update("ShiftSwap", swap.id, {
      status: "rejected", reviewed_by: staffProfile?.full_name, reviewed_at: new Date().toISOString(),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-swaps"] }); toast.success("Swap rejected"); },
  });

  // What each user sees
  const myPendingIncoming = swaps.filter(s => s.target_staff_id === staffProfile?.id && s.status === "pending");
  const pendingApproval = isAdminOrTL ? swaps.filter(s => s.status === "target_accepted") : [];
  const allVisible = [...myPendingIncoming, ...pendingApproval];

  if (allVisible.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-blue-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
        <ArrowLeftRight className="w-4 h-4" /> Shift Swap Requests ({allVisible.length})
      </h3>
      <div className="space-y-2">
        {myPendingIncoming.map(swap => (
          <div key={swap.id} className="p-3 bg-blue-50 rounded-lg border border-blue-100 space-y-2">
            <p className="text-sm font-medium">{swap.requesting_staff_name} wants to swap shifts</p>
            <p className="text-xs text-muted-foreground">
              Their shift: {swap.requesting_shift_date} → Your shift: {swap.target_shift_date}
              {swap.reason && ` · "${swap.reason}"`}
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700" onClick={() => respondSwap.mutate({ swap, accept: true })}>
                <CheckCircle className="w-3 h-3" /> Accept
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 text-red-600" onClick={() => respondSwap.mutate({ swap, accept: false })}>
                <X className="w-3 h-3" /> Decline
              </Button>
            </div>
          </div>
        ))}
        {pendingApproval.map(swap => (
          <div key={swap.id} className="p-3 bg-green-50 rounded-lg border border-green-100 space-y-2">
            <p className="text-sm font-medium">Swap awaiting approval</p>
            <p className="text-xs text-muted-foreground">
              {swap.requesting_staff_name} ({swap.requesting_shift_date}) ↔ {swap.target_staff_name} ({swap.target_shift_date})
            </p>
            <div className="flex gap-2">
              <Button size="sm" className="h-7 text-xs" onClick={() => approveSwap.mutate(swap)}>Approve Swap</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => rejectSwap.mutate(swap)}>Reject</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}