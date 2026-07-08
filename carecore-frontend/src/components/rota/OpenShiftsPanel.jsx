import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { ORG_ID } from "@/lib/roleConfig";
import { createNotification } from "@/lib/createNotification";

export default function OpenShiftsPanel({ openShifts = [], homes = [], staff = [], user, staffProfile, isAdminOrTL }) {
  const queryClient = useQueryClient();

  const { data: claims = [] } = useQuery({
    queryKey: ["shift-claims"],
    queryFn: () => secureGateway.filter("ShiftClaim"),
    staleTime: 30000,
  });

  const claimShift = useMutation({
    mutationFn: async (shift) => {
      const existing = claims.find(c => c.shift_id === shift.id && c.staff_id === staffProfile?.id && c.status === "pending");
      if (existing) { toast.error("You've already claimed this shift"); return; }
      const claim = await secureGateway.create("ShiftClaim", {
        org_id: ORG_ID,
        shift_id: shift.id,
        staff_id: staffProfile?.id,
        staff_name: staffProfile?.full_name,
        claimed_at: new Date().toISOString(),
        status: "pending",
      });
      // Notify TL/admin
      const home = homes.find(h => h.id === shift.home_id);
      const admin = staff.find(s => s.role === "admin" || s.role === "team_leader");
      if (admin?.user_id) {
        createNotification({
          recipient_user_id: admin.user_id,
          recipient_staff_id: admin.id,
          title: "Open Shift Claim",
          body: `${staffProfile?.full_name} wants to cover the ${shift.shift_type} shift on ${shift.date} at ${home?.name || ""}. Review in Rota.`,
          type: "rota",
          link: "/staff?tab=rota",
        });
      }
      return claim;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-claims"] }); toast.success("Shift claimed — awaiting approval"); },
  });

  const approveClaim = useMutation({
    mutationFn: async (claim) => {
      // Assign shift to claimant
      await secureGateway.update("Shift", claim.shift_id, {
        staff_id: claim.staff_id,
        staff_name: claim.staff_name,
        assigned_staff: [claim.staff_id],
        lead_staff_id: claim.staff_id,
        is_open_shift: false,
      });
      await secureGateway.update("ShiftClaim", claim.id, {
        status: "approved",
        reviewed_by: staffProfile?.full_name,
        reviewed_at: new Date().toISOString(),
      });
      // Reject other claims for this shift
      const otherClaims = claims.filter(c => c.shift_id === claim.shift_id && c.id !== claim.id && c.status === "pending");
      for (const c of otherClaims) {
        await secureGateway.update("ShiftClaim", c.id, { status: "rejected", reviewed_at: new Date().toISOString() });
      }
      // Notify claimant
      const claimantStaff = staff.find(s => s.id === claim.staff_id);
      if (claimantStaff?.user_id) {
        const shift = openShifts.find(s => s.id === claim.shift_id);
        createNotification({
          recipient_user_id: claimantStaff.user_id,
          recipient_staff_id: claimantStaff.id,
          title: "Shift Claim Approved",
          body: `Your claim for the ${shift?.shift_type} shift on ${shift?.date} has been approved. It's now on your rota.`,
          type: "rota",
          link: "/sw-dashboard",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rota-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["shift-claims"] });
      toast.success("Claim approved — shift assigned");
    },
  });

  const rejectClaim = useMutation({
    mutationFn: (claimId) => secureGateway.update("ShiftClaim", claimId, {
      status: "rejected", reviewed_by: staffProfile?.full_name, reviewed_at: new Date().toISOString(),
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["shift-claims"] }); toast.success("Claim rejected"); },
  });

  if (openShifts.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-amber-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        Open Shifts ({openShifts.length} unfilled)
      </h3>
      <div className="space-y-2">
        {openShifts.map(shift => {
          const home = homes.find(h => h.id === shift.home_id);
          const shiftClaims = claims.filter(c => c.shift_id === shift.id && c.status === "pending");
          const myClaim = claims.find(c => c.shift_id === shift.id && c.staff_id === staffProfile?.id);
          return (
            <div key={shift.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">{shift.shift_type} Shift</p>
                <p className="text-xs text-muted-foreground">{shift.date} · {shift.time_start}–{shift.time_end} · {home?.name}</p>
                {isAdminOrTL && shiftClaims.length > 0 && (
                  <p className="text-xs text-primary mt-0.5">{shiftClaims.length} claim(s) pending</p>
                )}
              </div>
              {!isAdminOrTL && !myClaim && (
                <Button size="sm" className="h-7 text-xs" onClick={() => claimShift.mutate(shift)}>
                  Claim Shift
                </Button>
              )}
              {!isAdminOrTL && myClaim && (
                <span className="text-xs text-amber-600 font-medium">Claimed — pending approval</span>
              )}
              {isAdminOrTL && shiftClaims.length > 0 && (
                <div className="flex flex-col gap-1 w-full mt-1">
                  {shiftClaims.map(claim => (
                    <div key={claim.id} className="flex items-center justify-between bg-white rounded p-2 border border-border">
                      <span className="text-xs font-medium">{claim.staff_name}</span>
                      <div className="flex gap-1">
                        <Button size="sm" className="h-6 text-[10px] gap-0.5 bg-green-600 hover:bg-green-700" onClick={() => approveClaim.mutate(claim)}>
                          <CheckCircle className="w-3 h-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 text-[10px] gap-0.5 text-red-600" onClick={() => rejectClaim.mutate(claim.id)}>
                          <X className="w-3 h-3" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}