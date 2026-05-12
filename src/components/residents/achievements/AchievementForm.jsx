import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { toast } from "sonner";

export default function AchievementForm({ resident, residents, staff, user, onClose, onSave }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    resident_id: resident?.id || "",
    achievement_date: new Date().toISOString().split("T")[0],
    category: "personal_growth",
    title: "",
    description: "",
    celebrated_how: "",
    shared_with_la: false,
    shared_with_family: false,
    photo_url: "",
  });

  const selectedResident = useMemo(() => residents.find(r => r.id === form.resident_id), [form.resident_id, residents]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await secureGateway.create("Achievement", {
        org_id: ORG_ID,
        resident_id: data.resident_id,
        resident_name: selectedResident?.display_name,
        home_id: selectedResident?.home_id,
        recorded_by_id: user?.id,
        recorded_by_name: user?.full_name,
        ...data,
      });
    },
    onSuccess: () => {
      toast.success("Achievement recorded");
      qc.invalidateQueries({ queryKey: ["achievements"] });
      onSave();
    },
    onError: (err) => toast.error("Error: " + err.message),
  });

  const handleSubmit = () => {
    if (!form.resident_id || !form.achievement_date || !form.title) {
      toast.error("Missing required fields");
      return;
    }
    createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">✨ Record Achievement</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          <div><label className="text-sm font-medium">Young Person *</label>
            <Select value={form.resident_id} onValueChange={v => setForm(p => ({ ...p, resident_id: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-sm font-medium">Achievement Date *</label>
              <Input type="date" value={form.achievement_date} onChange={e => setForm(p => ({ ...p, achievement_date: e.target.value }))} />
            </div>
            <div><label className="text-sm font-medium">Category *</label>
              <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["education", "employment", "health", "independence", "relationships", "sport_activity", "creative", "personal_growth", "community", "other"].map(c => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div><label className="text-sm font-medium">Title (one line) *</label>
            <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g., Passed GCSE Mathematics" />
          </div>

          <div><label className="text-sm font-medium">Description</label>
            <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4} placeholder="Full details of the achievement..." />
          </div>

          <div><label className="text-sm font-medium">How was this celebrated?</label>
            <Input value={form.celebrated_how} onChange={e => setForm(p => ({ ...p, celebrated_how: e.target.value }))} placeholder="e.g., Certificate awarded, special meal, mentioned in team meeting" />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.shared_with_la} onChange={e => setForm(p => ({ ...p, shared_with_la: e.target.checked }))} />
              Shared with Local Authority
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.shared_with_family} onChange={e => setForm(p => ({ ...p, shared_with_family: e.target.checked }))} />
              Shared with Family
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 bg-muted/30">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700">
            {createMutation.isPending ? "Saving..." : "Record Achievement"}
          </Button>
        </div>
      </div>
    </div>
  );
}