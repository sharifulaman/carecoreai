import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import ReferralForm from "./ReferralForm";
import ReferralDetail from "./ReferralDetail";

export default function ReferralsTab({ residents, homes, staff, user, staffProfile, isAdminOrTL }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState(null);

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => secureGateway.filter("Referral", {}, "-created_date", 200),
  });

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const residentMap = Object.fromEntries(residents.map(r => [r.id, r]));

  const openCount = referrals.filter(r => r.status === "open").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="text-lg font-bold">Referrals</h3>
        <div className="flex-1" />
        {isAdminOrTL && (
          <Button onClick={() => setShowForm(true)} className="gap-1">
            <Plus className="w-4 h-4" /> Log Referral
          </Button>
        )}
      </div>

      {/* Alert */}
      {openCount > 0 && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700"><strong>{openCount}</strong> open referral(s) in progress</p>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {referrals.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground text-sm">
            No referrals recorded.
          </div>
        ) : referrals.map(r => (
          <button
            key={r.id}
            onClick={() => setSelectedReferral(r)}
            className="block w-full text-left bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-mono font-semibold text-foreground">{r.referral_id || "—"}</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    r.status === "closed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {r.resident_names?.join(", ") || "—"}
                </p>
                <p className="text-xs text-muted-foreground">{homeMap[r.home_id]?.name || "Unknown home"}</p>
                <p className="text-xs text-muted-foreground mt-1">{r.referral_type?.replace(/_/g, " ")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-muted-foreground">
                  {new Date(r.referral_date).toLocaleDateString("en-GB")}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{r.outcome_status}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Modals */}
      {showForm && (
        <ReferralForm
          residents={residents}
          homes={homes}
          staff={staff}
          user={user}
          staffProfile={staffProfile}
          onClose={() => setShowForm(false)}
          onSave={() => {
            qc.invalidateQueries({ queryKey: ["referrals"] });
            setShowForm(false);
          }}
        />
      )}
      {selectedReferral && (
        <ReferralDetail
          referral={selectedReferral}
          residents={residents}
          homes={homes}
          staff={staff}
          onClose={() => setSelectedReferral(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ["referrals"] })}
        />
      )}
    </div>
  );
}