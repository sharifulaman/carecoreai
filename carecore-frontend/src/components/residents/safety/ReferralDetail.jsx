import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function ReferralDetail({ referral, residents, homes, staff, onClose, onUpdate }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(referral);

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  const mutation = useMutation({
    mutationFn: () => secureGateway.update("Referral", referral.id, form),
    onSuccess: () => {
      toast.success("Referral updated");
      qc.invalidateQueries({ queryKey: ["referrals"] });
      setEditMode(false);
      onUpdate();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-slate-50 to-transparent dark:from-slate-900/30 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground">{referral.referral_id}</h2>
            <p className="text-xs text-muted-foreground mt-1">Referral Detail</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Date</p>
              <p className="text-sm font-medium mt-1">{new Date(form.referral_date).toLocaleDateString("en-GB")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Status</p>
              <p className="text-sm font-medium mt-1 capitalize">{form.status}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Type</p>
              <p className="text-sm font-medium mt-1">{form.referral_type?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Outcome</p>
              <p className="text-sm font-medium mt-1">{form.outcome_status}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Residents</p>
            <p className="text-sm">{form.resident_names?.join(", ") || "—"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Home</p>
            <p className="text-sm">{homeMap[form.home_id]?.name || "—"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Details</p>
            <p className="text-sm bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{form.referral_details || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.local_authority_children_services_referral} onCheckedChange={(checked) => setForm({ ...form, local_authority_children_services_referral: checked })} disabled={!editMode} />
              <label className="text-sm">LA Children's Services</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.radicalisation_concern} onCheckedChange={(checked) => setForm({ ...form, radicalisation_concern: checked })} disabled={!editMode} />
              <label className="text-sm">Radicalisation concern</label>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={form.prevent_referral} onCheckedChange={(checked) => setForm({ ...form, prevent_referral: checked })} disabled={!editMode} />
            <label className="text-sm">Prevent referral</label>
          </div>

          {editMode && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Outcome/Status</label>
              <select
                value={form.outcome_status}
                onChange={(e) => setForm({ ...form, outcome_status: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="pending">Pending</option>
                <option value="referred">Referred</option>
                <option value="under_assessment">Under Assessment</option>
                <option value="supported">Supported</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)}>Cancel</Button>
              <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>Save Changes</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setEditMode(true)}>Edit</Button>
              <Button variant="outline" onClick={onClose}>Close</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}