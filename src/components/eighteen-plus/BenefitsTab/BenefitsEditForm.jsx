import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function BenefitsEditForm({ resident, benefits, onClose, onSave }) {
  const [data, setData] = useState(benefits || {});
  const [loading, setLoading] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => base44.entities.CareLeaverBenefit.update(benefits.id, data),
    onSuccess: () => {
      onSave();
    },
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateMutation.mutateAsync();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
  };

  const toggleField = (key) => {
    setData(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-card rounded-lg max-w-2xl w-full my-8">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h3 className="font-semibold">Edit Benefits — {resident.display_name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div>
            <h4 className="font-semibold text-sm mb-4">Universal Credit</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.uc_claim_submitted || false}
                  onChange={() => toggleField("uc_claim_submitted")}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-sm">Claim submitted</span>
              </label>
              {data.uc_claim_submitted && (
                <>
                  <Input
                    label="UC Reference Number"
                    value={data.uc_reference_number || ""}
                    onChange={(e) => updateField("uc_reference_number", e.target.value)}
                    className="mt-1"
                  />
                  <Input
                    type="number"
                    label="Monthly Amount (£)"
                    value={data.uc_monthly_amount || ""}
                    onChange={(e) => updateField("uc_monthly_amount", parseFloat(e.target.value))}
                    className="mt-1"
                  />
                  <Input
                    type="number"
                    label="Payment Day (1-31)"
                    value={data.uc_payment_date || ""}
                    onChange={(e) => updateField("uc_payment_date", parseInt(e.target.value))}
                    className="mt-1"
                  />
                  <Input
                    type="date"
                    label="Next Review Date"
                    value={data.uc_next_review_date || ""}
                    onChange={(e) => updateField("uc_next_review_date", e.target.value)}
                    className="mt-1"
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Housing</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.housing_benefit_applicable || false}
                  onChange={() => toggleField("housing_benefit_applicable")}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-sm">In private rented accommodation</span>
              </label>
              {data.housing_benefit_applicable && (
                <>
                  <Input
                    type="number"
                    label="Weekly Rent (£)"
                    value={data.rent_amount_weekly || ""}
                    onChange={(e) => updateField("rent_amount_weekly", parseFloat(e.target.value))}
                  />
                  <Input
                    type="number"
                    label="Housing Benefit Amount (£)"
                    value={data.housing_benefit_amount || ""}
                    onChange={(e) => updateField("housing_benefit_amount", parseFloat(e.target.value))}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.housing_benefit_covers_rent || false}
                      onChange={() => toggleField("housing_benefit_covers_rent")}
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-sm">Covers full rent</span>
                  </label>
                  {!data.housing_benefit_covers_rent && (
                    <Input
                      type="number"
                      label="Weekly Shortfall (£)"
                      value={data.housing_shortfall_weekly || ""}
                      onChange={(e) => updateField("housing_shortfall_weekly", parseFloat(e.target.value))}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Council Tax</h4>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.council_tax_exempt || false}
                onChange={() => toggleField("council_tax_exempt")}
                className="w-4 h-4 rounded border-input"
              />
              <span className="text-sm">Exempt from council tax</span>
            </label>
            {data.council_tax_exempt && (
              <>
                <Input
                  type="date"
                  label="Confirmed Date"
                  value={data.council_tax_exempt_confirmed_date || ""}
                  onChange={(e) => updateField("council_tax_exempt_confirmed_date", e.target.value)}
                  className="mt-2"
                />
                <Input
                  label="Local Authority"
                  value={data.council_tax_exempt_la || ""}
                  onChange={(e) => updateField("council_tax_exempt_la", e.target.value)}
                  className="mt-2"
                />
              </>
            )}
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Grants</h4>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={data.setting_up_home_grant_applied || false}
                  onChange={() => toggleField("setting_up_home_grant_applied")}
                  className="w-4 h-4 rounded border-input"
                />
                <span className="text-sm">Setting Up Home Grant applied</span>
              </label>
              {data.setting_up_home_grant_applied && (
                <>
                  <Input
                    type="number"
                    label="Amount (£)"
                    value={data.setting_up_home_grant_amount || ""}
                    onChange={(e) => updateField("setting_up_home_grant_amount", parseFloat(e.target.value))}
                  />
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={data.setting_up_home_grant_received || false}
                      onChange={() => toggleField("setting_up_home_grant_received")}
                      className="w-4 h-4 rounded border-input"
                    />
                    <span className="text-sm">Received</span>
                  </label>
                  {data.setting_up_home_grant_received && (
                    <Input
                      type="date"
                      label="Date Received"
                      value={data.setting_up_home_grant_date || ""}
                      onChange={(e) => updateField("setting_up_home_grant_date", e.target.value)}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Weekly Budget</h4>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                label="UC Income (£)"
                value={data.weekly_income_uc || ""}
                onChange={(e) => updateField("weekly_income_uc", parseFloat(e.target.value))}
              />
              <Input
                type="number"
                label="Employment Income (£)"
                value={data.weekly_income_employment || ""}
                onChange={(e) => updateField("weekly_income_employment", parseFloat(e.target.value))}
              />
              <Input
                type="number"
                label="Rent (£)"
                value={data.weekly_rent || ""}
                onChange={(e) => updateField("weekly_rent", parseFloat(e.target.value))}
              />
              <Input
                type="number"
                label="Food (£)"
                value={data.weekly_food_budget || ""}
                onChange={(e) => updateField("weekly_food_budget", parseFloat(e.target.value))}
              />
              <Input
                type="number"
                label="Transport (£)"
                value={data.weekly_transport || ""}
                onChange={(e) => updateField("weekly_transport", parseFloat(e.target.value))}
              />
              <Input
                type="number"
                label="Phone (£)"
                value={data.weekly_phone || ""}
                onChange={(e) => updateField("weekly_phone", parseFloat(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t border-border bg-card">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={loading} className="flex-1">
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}