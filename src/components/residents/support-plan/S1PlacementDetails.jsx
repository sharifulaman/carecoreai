import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const DOMAINS = [
  "Family & Social Relationships",
  "Health",
  "Education",
  "Behaviour Management",
  "Therapeutic Plan",
  "Risk Management",
  "Independent Life Skills",
  "Activities & Leisure",
];

const DOMAIN_COLOURS = [
  "bg-pink-100 text-pink-700",
  "bg-red-100 text-red-700",
  "bg-blue-100 text-blue-700",
  "bg-amber-100 text-amber-700",
  "bg-purple-100 text-purple-700",
  "bg-orange-100 text-orange-700",
  "bg-green-100 text-green-700",
  "bg-teal-100 text-teal-700",
];

export function getPlacementDetailsStatus(record) {
  if (!record) return "not_started";
  const hasHistory = record.placement_history?.trim();
  const hasAnyAim = record.la_placement_aims?.trim() || record.parents_carers_aims?.trim() || record.yp_placement_aims?.trim();
  if (hasHistory && hasAnyAim) return "completed";
  const anyContent = Object.values(record).some(v => typeof v === "string" && v.trim());
  return anyContent ? "in_progress" : "not_started";
}

function AimsPanel({ title, value, onChange, readOnly }) {
  const [open, setOpen] = useState(false);
  const hasCont = value?.trim();
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/20 hover:bg-muted/40 text-left text-sm font-medium"
      >
        <span>{title}</span>
        <div className="flex items-center gap-2">
          {hasCont && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>
      {open && (
        <div className="p-3 border-t border-border">
          <Textarea
            value={value || ""}
            onChange={e => onChange(e.target.value)}
            disabled={readOnly}
            rows={4}
            className="resize-y text-sm"
          />
        </div>
      )}
    </div>
  );
}

export default function S1PlacementDetails({ residentId, homeId, staffProfile, readOnly = false }) {
  const qc = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["placement-details", residentId],
    queryFn: () => secureGateway.filter("PlacementDetails", { resident_id: residentId }),
    enabled: !!residentId,
  });

  const existing = records[0] || null;

  const [form, setForm] = useState({
    date_of_plan: "",
    domains: [],
    placement_history: "",
    la_placement_aims: "",
    parents_carers_aims: "",
    yp_placement_aims: "",
  });

  useEffect(() => {
    if (existing) {
      setForm({
        date_of_plan: existing.date_of_plan || "",
        domains: existing.domains || [],
        placement_history: existing.placement_history || "",
        la_placement_aims: existing.la_placement_aims || "",
        parents_carers_aims: existing.parents_carers_aims || "",
        yp_placement_aims: existing.yp_placement_aims || "",
      });
    }
  }, [existing?.id]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleDomain = (d) => {
    setForm(f => ({
      ...f,
      domains: f.domains.includes(d) ? f.domains.filter(x => x !== d) : [...f.domains, d],
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const payload = {
        org_id: ORG_ID,
        resident_id: residentId,
        home_id: homeId,
        ...form,
        completed_by: staffProfile?.id || null,
        completed_by_name: staffProfile?.full_name || null,
        updated_at: now,
      };
      if (existing?.id) return secureGateway.update("PlacementDetails", existing.id, payload);
      return secureGateway.create("PlacementDetails", payload);
    },
    onSuccess: () => {
      toast.success("Placement details saved");
      qc.invalidateQueries({ queryKey: ["placement-details", residentId] });
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

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Date of plan</p>
        <Input type="date" value={form.date_of_plan} onChange={e => set("date_of_plan", e.target.value)} disabled={readOnly} className="w-48 h-9" />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Support domains covered</p>
        <div className="flex flex-wrap gap-2">
          {DOMAINS.map((d, i) => (
            <button
              key={d}
              type="button"
              disabled={readOnly}
              onClick={() => toggleDomain(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                form.domains.includes(d)
                  ? DOMAIN_COLOURS[i] + " border-transparent"
                  : "bg-white border-border text-muted-foreground hover:bg-muted/30"
              } ${readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Summary of placement history</p>
        <Textarea
          value={form.placement_history}
          onChange={e => set("placement_history", e.target.value)}
          disabled={readOnly}
          rows={4}
          placeholder="Summary of this YP's placement history..."
          className="resize-y"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Placement aims</p>
        <AimsPanel title="Local Authority aims" value={form.la_placement_aims} onChange={v => set("la_placement_aims", v)} readOnly={readOnly} />
        <AimsPanel title="Parents / Carers aims" value={form.parents_carers_aims} onChange={v => set("parents_carers_aims", v)} readOnly={readOnly} />
        <AimsPanel title="Young Person's aims" value={form.yp_placement_aims} onChange={v => set("yp_placement_aims", v)} readOnly={readOnly} />
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