import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export function getYPViewsStatus(record) {
  if (!record) return "not_started";
  const any = record.yp_views_on_placement?.trim() || record.yp_goals_and_wishes?.trim() || record.yp_concerns?.trim();
  return any ? "completed" : "not_started";
}

const FIELDS = [
  { key: "yp_views_on_placement", label: "YP's views on this placement", placeholder: "What does the young person think about living here?" },
  { key: "yp_goals_and_wishes", label: "Goals and wishes", placeholder: "What does the young person want for their future?" },
  { key: "yp_concerns", label: "Concerns", placeholder: "Any concerns the young person has raised?" },
];

export default function S10YPViews({ residentId, homeId, staffProfile, staff = [], readOnly = false }) {
  const qc = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["yp-views", residentId],
    queryFn: () => secureGateway.filter("YPViewsRecord", { resident_id: residentId }),
    enabled: !!residentId,
  });

  const existing = records[0] || null;

  const [form, setForm] = useState({
    yp_views_on_placement: "",
    yp_goals_and_wishes: "",
    yp_concerns: "",
    yp_signature_obtained: false,
    date_views_recorded: "",
    completed_by: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        yp_views_on_placement: existing.yp_views_on_placement || "",
        yp_goals_and_wishes: existing.yp_goals_and_wishes || "",
        yp_concerns: existing.yp_concerns || "",
        yp_signature_obtained: existing.yp_signature_obtained || false,
        date_views_recorded: existing.date_views_recorded || "",
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
      if (existing?.id) return secureGateway.update("YPViewsRecord", existing.id, payload);
      return secureGateway.create("YPViewsRecord", payload);
    },
    onSuccess: () => {
      toast.success("YP's views saved");
      qc.invalidateQueries({ queryKey: ["yp-views", residentId] });
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
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Date views recorded</p>
          <Input type="date" value={form.date_views_recorded} onChange={e => set("date_views_recorded", e.target.value)} disabled={readOnly} className="h-9" />
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

      <label className={`flex items-center gap-2 text-sm ${readOnly ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}>
        <input
          type="checkbox"
          checked={form.yp_signature_obtained}
          onChange={e => set("yp_signature_obtained", e.target.checked)}
          disabled={readOnly}
          className="rounded"
        />
        YP signature / agreement obtained
      </label>

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