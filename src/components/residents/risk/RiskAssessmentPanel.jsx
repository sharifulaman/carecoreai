import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS = {
  suicide_self_harm: "Suicide / Self-harm",
  harm_to_others: "Harm to others / Damage to property",
  vulnerability: "Vulnerability",
  criminal_exploitation: "Criminal exploitation",
  sexual_exploitation: "Sexual activity / Exploitation",
  missing_from_care: "Missing from care",
  substance_misuse: "Substance misuse",
  communication_language: "Communication / Language barrier",
  online_safety: "Online safety",
};

function calcOverallRating(isPresent, likelihood, consequence) {
  if (isPresent === "none") return "none";
  if (isPresent === "unknown" || likelihood === "unknown" || consequence === "unknown") return "unknown";
  const matrix = {
    low: { low: "low", medium: "low", high: "medium" },
    medium: { low: "low", medium: "medium", high: "high" },
    high: { low: "medium", medium: "high", high: "high" },
  };
  return matrix[likelihood]?.[consequence] || "unknown";
}

const RATING_STYLES = {
  none: "bg-green-100 text-green-700",
  low: "bg-blue-100 text-blue-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-600",
};

function PillSelector({ label, options, value, onChange, disabled }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              value === opt.value
                ? "bg-foreground text-background border-foreground"
                : "bg-card border-border text-foreground hover:bg-muted"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function RiskAssessmentPanel({ resident, category, existing, staffProfile, onClose, onSaved, readOnly = false }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    is_present: existing?.is_present || "unknown",
    likelihood: existing?.likelihood || "unknown",
    consequence: existing?.consequence || "unknown",
    background: existing?.background || "",
    triggers: existing?.triggers || "",
    management_strategy: existing?.management_strategy || "",
    protective_factors: existing?.protective_factors || "",
    yp_consulted: existing?.yp_consulted ?? false,
    review_date: existing?.review_date || "",
  });

  useEffect(() => {
    setForm({
      is_present: existing?.is_present || "unknown",
      likelihood: existing?.likelihood || "unknown",
      consequence: existing?.consequence || "unknown",
      background: existing?.background || "",
      triggers: existing?.triggers || "",
      management_strategy: existing?.management_strategy || "",
      protective_factors: existing?.protective_factors || "",
      yp_consulted: existing?.yp_consulted ?? false,
      review_date: existing?.review_date || "",
    });
  }, [existing]);

  const overallRating = calcOverallRating(form.is_present, form.likelihood, form.consequence);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      const payload = {
        org_id: ORG_ID,
        resident_id: resident.id,
        home_id: resident.home_id,
        category,
        is_present: form.is_present,
        likelihood: form.likelihood,
        consequence: form.consequence,
        overall_rating: overallRating,
        background: form.background,
        triggers: form.triggers,
        management_strategy: form.management_strategy,
        protective_factors: form.protective_factors,
        yp_consulted: form.yp_consulted,
        review_date: form.review_date,
        last_reviewed_by: staffProfile?.id || null,
        last_reviewed_by_name: staffProfile?.full_name || null,
        last_reviewed_at: now,
      };
      if (existing?.id) {
        return await secureGateway.update("RiskAssessment", existing.id, payload);
      } else {
        return await secureGateway.create("RiskAssessment", payload);
      }
    },
    onSuccess: () => {
      toast.success("Assessment saved");
      qc.invalidateQueries({ queryKey: ["risk-assessments"] });
      onSaved?.();
      onClose();
    },
    onError: (e) => toast.error("Error saving: " + e.message),
  });

  const categoryLabel = CATEGORY_LABELS[category] || category;
  const lastReviewedText = existing?.last_reviewed_at
    ? `Last reviewed: ${new Date(existing.last_reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} by ${existing.last_reviewed_by_name || "—"}`
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto shadow-xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-5 py-4 flex items-start justify-between">
          <div>
            <p className="font-semibold text-sm">{categoryLabel} — {resident.display_name}</p>
            {lastReviewedText && <p className="text-xs text-muted-foreground mt-0.5">{lastReviewedText}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground mt-0.5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5 flex-1">
          {/* Is present */}
          <PillSelector
            label="Is this risk present?"
            value={form.is_present}
            onChange={v => setForm(p => ({ ...p, is_present: v }))}
            disabled={readOnly}
            options={[
              { value: "none", label: "No" },
              { value: "low", label: "Yes — low" },
              { value: "medium", label: "Yes — medium" },
              { value: "high", label: "Yes — high" },
              { value: "unknown", label: "Unknown" },
            ]}
          />

          {/* Likelihood + Consequence */}
          <div className="grid grid-cols-2 gap-4">
            <PillSelector
              label="Likelihood"
              value={form.likelihood}
              onChange={v => setForm(p => ({ ...p, likelihood: v }))}
              disabled={readOnly}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
            />
            <PillSelector
              label="Consequence"
              value={form.consequence}
              onChange={v => setForm(p => ({ ...p, consequence: v }))}
              disabled={readOnly}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
            />
          </div>

          {/* Overall rating */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Overall Risk Rating</p>
            <span className={`text-sm px-3 py-1 rounded-full font-semibold capitalize ${RATING_STYLES[overallRating]}`}>
              {overallRating === "none" ? "None" : overallRating.charAt(0).toUpperCase() + overallRating.slice(1)}
            </span>
          </div>

          {/* Text fields */}
          {[
            { key: "background", label: "Background / Presenting Factors", placeholder: "Why does this risk exist for this young person?" },
            { key: "triggers", label: "Triggers", placeholder: "What situations or behaviours escalate this risk?" },
            { key: "management_strategy", label: "Management Strategy", placeholder: "What must staff do to reduce harm?" },
            { key: "protective_factors", label: "Protective Factors", placeholder: "What is working in this young person's favour?" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{label}</p>
              <Textarea
                value={form[key]}
                onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                rows={3}
                disabled={readOnly}
                className="resize-y"
              />
            </div>
          ))}

          {/* YP consulted + Review date */}
          <div className="grid grid-cols-2 gap-4 items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">YP Consulted?</p>
              <div className="flex gap-2">
                {[{ value: true, label: "Yes" }, { value: false, label: "No" }].map(opt => (
                  <button
                    key={String(opt.value)}
                    type="button"
                    disabled={readOnly}
                    onClick={() => setForm(p => ({ ...p, yp_consulted: opt.value }))}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      form.yp_consulted === opt.value
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card border-border text-foreground hover:bg-muted"
                    } ${readOnly ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Review Date</p>
              <input
                type="date"
                value={form.review_date}
                onChange={e => setForm(p => ({ ...p, review_date: e.target.value }))}
                disabled={readOnly}
                className="w-full px-3 py-2 border border-input rounded-md text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-5 py-4 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!readOnly && (
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save assessment"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}