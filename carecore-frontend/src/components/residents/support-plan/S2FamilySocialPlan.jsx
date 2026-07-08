import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function getFamilySocialStatus(record) {
  if (!record) return "not_started";
  if (record.family_background?.trim() && record.family_contact_arrangements?.trim()) return "completed";
  const any = ["family_background","family_contact_arrangements","social_network","relationship_goals","concerns","yp_views_on_family"]
    .some(k => record[k]?.trim());
  return any ? "in_progress" : "not_started";
}

const FIELDS = [
  { key: "family_background", label: "Family background & significant relationships", placeholder: "Summary of family background and significant relationships" },
  { key: "family_contact_arrangements", label: "Current contact arrangements", placeholder: "Current contact arrangements with family members" },
  { key: "social_network", label: "Social network", placeholder: "Friends, peers, community connections" },
  { key: "relationship_goals", label: "Relationship goals", placeholder: "What are we working towards in terms of family and social relationships?" },
  { key: "concerns", label: "Concerns", placeholder: "Any concerns about relationships or contact arrangements" },
  { key: "yp_views_on_family", label: "Young person's own views", placeholder: "The young person's own views on their family and relationships" },
];

export default function S2FamilySocialPlan({ residentId, homeId, staffProfile, staff = [], readOnly = false }) {
  const qc = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["family-social-plan", residentId],
    queryFn: () => secureGateway.filter("FamilySocialPlan", { resident_id: residentId }),
    enabled: !!residentId,
  });

  const existing = records[0] || null;

  const [form, setForm] = useState(
    Object.fromEntries([...FIELDS.map(f => [f.key, ""]), ["review_date", ""], ["completed_by", ""]])
  );

  useEffect(() => {
    if (existing) {
      setForm({
        family_background: existing.family_background || "",
        family_contact_arrangements: existing.family_contact_arrangements || "",
        social_network: existing.social_network || "",
        relationship_goals: existing.relationship_goals || "",
        concerns: existing.concerns || "",
        yp_views_on_family: existing.yp_views_on_family || "",
        review_date: existing.review_date || "",
        completed_by: existing.completed_by || "",
      });
    }
  }, [existing?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const selectedStaff = staff.find(s => s.id === form.completed_by);
      const payload = {
        org_id: ORG_ID,
        resident_id: residentId,
        home_id: homeId,
        ...form,
        completed_by_name: selectedStaff?.full_name || staffProfile?.full_name || null,
        updated_at: new Date().toISOString(),
      };
      if (existing?.id) return secureGateway.update("FamilySocialPlan", existing.id, payload);
      return secureGateway.create("FamilySocialPlan", payload);
    },
    onSuccess: () => {
      toast.success("Family & social plan saved");
      qc.invalidateQueries({ queryKey: ["family-social-plan", residentId] });
    },
    onError: e => toast.error("Error: " + e.message),
  });

  if (isLoading) return <div className="py-6 text-center text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      {existing?.updated_at && (
        <p className="text-xs text-muted-foreground">
          Last saved {new Date(existing.updated_at).toLocaleDateString("en-GB")}
          {existing.completed_by_name ? ` by ${existing.completed_by_name}` : ""}
        </p>
      )}

      {FIELDS.map(({ key, label, placeholder }) => (
        <div key={key}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
          <Textarea
            value={form[key]}
            onChange={e => set(key, e.target.value)}
            disabled={readOnly}
            rows={3}
            placeholder={placeholder}
            className="resize-y"
          />
        </div>
      ))}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Review date</p>
          <Input type="date" value={form.review_date} onChange={e => set("review_date", e.target.value)} disabled={readOnly} className="h-9" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Completed by</p>
          <Select value={form.completed_by || ""} onValueChange={v => set("completed_by", v)} disabled={readOnly}>
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select staff member" /></SelectTrigger>
            <SelectContent>
              {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!readOnly && (
        <div className="flex justify-end pt-1">
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="sm">
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
}