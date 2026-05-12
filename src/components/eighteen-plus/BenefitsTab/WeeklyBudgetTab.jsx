import { useMemo } from "react";
import { AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";

export default function WeeklyBudgetTab({ residents, benefits, savings }) {
  const [selectedResidentId, setSelectedResidentId] = useState(residents[0]?.id || "");
  const selectedResident = residents.find(r => r.id === selectedResidentId);
  const selectedBenefit = benefits.find(b => b.resident_id === selectedResidentId);
  const selectedSavings = savings.find(s => s.resident_id === selectedResidentId);

  if (!selectedBenefit) {
    return (
      <div className="bg-muted/50 rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No benefits record for selected resident</p>
      </div>
    );
  }

  const weeklyIncome = (selectedBenefit.weekly_income_uc || 0) + (selectedBenefit.weekly_income_employment || 0) + (selectedBenefit.weekly_income_other || 0);
  const weeklyOutgoings = (selectedBenefit.weekly_rent || 0) + (selectedBenefit.weekly_food_budget || 0) + (selectedBenefit.weekly_transport || 0) + (selectedBenefit.weekly_phone || 0) + (selectedBenefit.weekly_other || 0);
  const surplus = weeklyIncome - weeklyOutgoings;

  return (
    <div className="space-y-6">
      <div>
        <label className="text-xs font-medium">Select Resident</label>
        <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
          <SelectTrigger className="w-full sm:w-64 mt-2">
            <SelectValue placeholder="Select resident" />
          </SelectTrigger>
          <SelectContent>
            {residents.map(r => (
              <SelectItem key={r.id} value={r.id}>{r.display_name || r.initials}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Income */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="font-semibold text-green-900 mb-4">Weekly Income</h3>
          <div className="space-y-2 mb-4">
            {selectedBenefit.weekly_income_uc > 0 && (
              <div className="flex justify-between text-sm">
                <span>Universal Credit</span>
                <span className="font-medium">£{selectedBenefit.weekly_income_uc.toFixed(2)}</span>
              </div>
            )}
            {selectedBenefit.weekly_income_employment > 0 && (
              <div className="flex justify-between text-sm">
                <span>Employment</span>
                <span className="font-medium">£{selectedBenefit.weekly_income_employment.toFixed(2)}</span>
              </div>
            )}
            {selectedBenefit.weekly_income_other > 0 && (
              <div className="flex justify-between text-sm">
                <span>Other</span>
                <span className="font-medium">£{selectedBenefit.weekly_income_other.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-t-2 border-green-200 pt-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Total weekly income</span>
              <span className="text-lg text-green-700">£{weeklyIncome.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Outgoings */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="font-semibold text-red-900 mb-4">Weekly Outgoings</h3>
          <div className="space-y-2 mb-4">
            {selectedBenefit.weekly_rent > 0 && (
              <div className="flex justify-between text-sm">
                <span>Rent</span>
                <span className="font-medium">£{selectedBenefit.weekly_rent.toFixed(2)}</span>
              </div>
            )}
            {selectedBenefit.weekly_food_budget > 0 && (
              <div className="flex justify-between text-sm">
                <span>Food</span>
                <span className="font-medium">£{selectedBenefit.weekly_food_budget.toFixed(2)}</span>
              </div>
            )}
            {selectedBenefit.weekly_transport > 0 && (
              <div className="flex justify-between text-sm">
                <span>Transport</span>
                <span className="font-medium">£{selectedBenefit.weekly_transport.toFixed(2)}</span>
              </div>
            )}
            {selectedBenefit.weekly_phone > 0 && (
              <div className="flex justify-between text-sm">
                <span>Phone</span>
                <span className="font-medium">£{selectedBenefit.weekly_phone.toFixed(2)}</span>
              </div>
            )}
            {selectedBenefit.weekly_other > 0 && (
              <div className="flex justify-between text-sm">
                <span>Other</span>
                <span className="font-medium">£{selectedBenefit.weekly_other.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="border-t-2 border-red-200 pt-2">
            <div className="flex justify-between text-sm font-semibold">
              <span>Total outgoings</span>
              <span className="text-lg text-red-700">£{weeklyOutgoings.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className={`rounded-lg p-6 border-2 ${surplus >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-semibold ${surplus >= 0 ? "text-green-900" : "text-red-900"}`}>
            Weekly Balance
          </h3>
          {surplus >= 0 ? (
            <TrendingUp className="w-5 h-5 text-green-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600" />
          )}
        </div>
        <div className={`text-3xl font-bold mb-4 ${surplus >= 0 ? "text-green-700" : "text-red-700"}`}>
          {surplus >= 0 ? "+" : ""}£{Math.abs(surplus).toFixed(2)} {surplus >= 0 ? "surplus" : "deficit"}
        </div>

        {surplus < 0 && (
          <div className="bg-white rounded border border-red-300 p-4 mt-4">
            <h4 className="font-semibold text-sm text-red-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Action Needed
            </h4>
            <p className="text-sm text-red-800">
              This resident has a weekly deficit of £{Math.abs(surplus).toFixed(2)}. Consider: reviewing benefits claims, budgeting support, or additional LA assistance.
            </p>
          </div>
        )}
      </div>

      {/* Savings */}
      {selectedSavings && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="font-semibold mb-3">Savings & Assets</h3>
          <div className="text-2xl font-bold text-primary">£{(selectedSavings.balance || 0).toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Current balance</p>
        </div>
      )}

      {/* Notes */}
      {selectedBenefit.budget_notes && (
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-xs text-muted-foreground"><span className="font-medium">Budget Notes:</span> {selectedBenefit.budget_notes}</p>
        </div>
      )}

      {/* ILS Link */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm">
          <span className="font-semibold text-blue-900">Finance & Money ILS Score:</span> Budget updates feed into ILS Domain 3. <a href="#" className="text-blue-600 hover:underline">Update ILS →</a>
        </p>
      </div>
    </div>
  );
}