import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function AllegationDetail({ allegation, residents, homes, staff, onClose, onUpdate }) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const qc = useQueryClient();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(allegation);

  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));
  const staffMap = Object.fromEntries(staff.map(s => [s.id, s]));

  const mutation = useMutation({
    mutationFn: () => secureGateway.update("Allegation", allegation.id, form),
    onSuccess: () => {
      toast.success("Allegation updated");
      qc.invalidateQueries({ queryKey: ["allegations"] });
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
            <h2 className="text-lg font-bold text-foreground">{allegation.allegation_id}</h2>
            <p className="text-xs text-muted-foreground mt-1">Allegation Detail</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Date</p>
              <p className="text-sm font-medium mt-1">{new Date(form.allegation_date).toLocaleDateString("en-GB")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Status</p>
              <p className="text-sm font-medium mt-1 capitalize">{form.status}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Made By</p>
              <p className="text-sm font-medium mt-1">{form.allegation_made_by?.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Investigation Status</p>
              <p className="text-sm font-medium mt-1">{form.investigation_status}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Against</p>
            <p className="text-sm font-medium">{form.staff_subject_to_allegation_name || "—"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Residents Involved</p>
            <p className="text-sm">{form.resident_names?.join(", ") || "—"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Home</p>
            <p className="text-sm">{homeMap[form.home_id]?.name || "—"}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Details</p>
            <p className="text-sm bg-muted/30 rounded-lg p-3 whitespace-pre-wrap">{form.allegation_details || "—"}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Checkbox checked={form.lado_notified} onCheckedChange={(checked) => setForm({ ...form, lado_notified: checked })} disabled={!editMode} />
              <label className="text-sm">LADO notified</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.local_authority_notified} onCheckedChange={(checked) => setForm({ ...form, local_authority_notified: checked })} disabled={!editMode} />
              <label className="text-sm">LA notified</label>
            </div>
          </div>

          {editMode && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Outcome</label>
              <select
                value={form.outcome}
                onChange={(e) => setForm({ ...form, outcome: e.target.value })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="pending">Pending</option>
                <option value="substantiated">Substantiated</option>
                <option value="unsubstantiated">Unsubstantiated</option>
                <option value="inconclusive">Inconclusive</option>
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