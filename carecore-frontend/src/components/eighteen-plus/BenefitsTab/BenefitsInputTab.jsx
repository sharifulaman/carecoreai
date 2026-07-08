import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, AlertCircle } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import { useModuleActions } from "@/lib/PermissionContext";

const BENEFIT_TYPES = [
  { key: "universal_credit", label: "Universal Credit", color: "blue" },
  { key: "housing_benefit", label: "Housing Benefit", color: "green" },
  { key: "council_tax_exempt", label: "Council Tax Exempt", color: "purple" },
  { key: "setting_up_grant", label: "Setting Up Grant Applied", color: "amber" },
  { key: "care_leaver_bursary", label: "Care Leaver Bursary", color: "indigo" },
  { key: "with_benefit_record", label: "With Benefit Record", color: "red" },
];

export default function BenefitsInputTab({ residents }) {
  const qc = useQueryClient();
  const { canAdd, canDelete } = useModuleActions("residents");
  const [selectedResidentId, setSelectedResidentId] = useState(residents[0]?.id || "");
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState([]);

  // Form state
  const [formData, setFormData] = useState({
    benefit_type: "",
    amount: "",
    status: "active",
    start_date: "",
    end_date: "",
    notes: "",
  });

  const { data: benefits = [] } = useQuery({
    queryKey: ["care-leaver-benefits-input"],
    queryFn: () => base44.entities.CareLeaverBenefit.filter({}, "-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CareLeaverBenefit.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-leaver-benefits-input"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CareLeaverBenefit.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["care-leaver-benefits-input"] });
    },
  });

  const selectedResident = residents.find(r => r.id === selectedResidentId);
  const residentBenefits = benefits.filter(b => b.resident_id === selectedResidentId);

  const handleSubmit = () => {
    const newErrors = [];
    if (!formData.benefit_type) newErrors.push("Benefit type is required");
    if (!formData.status) newErrors.push("Status is required");
    if (!formData.start_date) newErrors.push("Start date is required");

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors([]);
    createMutation.mutate({
      org_id: ORG_ID,
      resident_id: selectedResidentId,
      resident_name: selectedResident?.display_name,
      benefit_type: formData.benefit_type,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      status: formData.status,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      notes: formData.notes,
    });
  };

  const resetForm = () => {
    setFormData({
      benefit_type: "",
      amount: "",
      status: "active",
      start_date: "",
      end_date: "",
      notes: "",
    });
    setShowForm(false);
    setErrors([]);
  };

  const getBenefitColor = (key) => {
    const type = BENEFIT_TYPES.find(b => b.key === key);
    const colorMap = {
      blue: "bg-blue-500/10 text-blue-600",
      green: "bg-green-500/10 text-green-600",
      purple: "bg-purple-500/10 text-purple-600",
      amber: "bg-amber-500/10 text-amber-600",
      indigo: "bg-indigo-500/10 text-indigo-600",
      red: "bg-red-500/10 text-red-600",
    };
    return colorMap[type?.color] || "bg-gray-500/10 text-gray-600";
  };

  return (
    <div className="space-y-6">
      {/* Resident Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Viewing:</span>
        <select
          value={selectedResidentId}
          onChange={(e) => setSelectedResidentId(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {residents.map(r => (
            <option key={r.id} value={r.id}>
              {r.display_name || r.initials}
            </option>
          ))}
        </select>
      </div>

      {/* Validation Errors */}
      {errors.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-red-700 mb-2">Validation Error</p>
              <ul className="space-y-1">
                {errors.map((error, i) => (
                  <li key={i} className="text-xs text-red-600">• {error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Add Benefit Button */}
      {!showForm && canAdd && (
        <Button onClick={() => setShowForm(true)} className="gap-1">
          <Plus className="w-4 h-4" /> Add Benefit
        </Button>
      )}

      {/* Add Benefit Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <h4 className="font-semibold">Add Benefit for {selectedResident?.display_name}</h4>

          <div>
            <label className="text-xs font-medium">Benefit Type *</label>
            <select
              value={formData.benefit_type}
              onChange={(e) => setFormData({ ...formData, benefit_type: e.target.value })}
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select benefit type</option>
              {BENEFIT_TYPES.map(b => (
                <option key={b.key} value={b.key}>{b.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Amount (optional)</label>
              <Input
                type="number"
                placeholder="e.g. 500.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Status *</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium">Start Date *</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium">End Date (optional)</label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">Notes</label>
            <textarea
              placeholder="Additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="mt-1 w-full h-16 rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetForm} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1">Add Benefit</Button>
          </div>
        </div>
      )}

      {/* Benefits List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm">Benefits for {selectedResident?.display_name}</h4>
        {residentBenefits.length === 0 ? (
          <p className="text-xs text-muted-foreground">No benefits recorded yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {residentBenefits.map(benefit => (
              <div key={benefit.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getBenefitColor(benefit.benefit_type)}`}>
                    {BENEFIT_TYPES.find(b => b.key === benefit.benefit_type)?.label}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => deleteMutation.mutate(benefit.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-1 text-xs">
                  {benefit.amount && (
                    <p><span className="text-muted-foreground">Amount:</span> £{benefit.amount.toFixed(2)}</p>
                  )}
                  <p><span className="text-muted-foreground">Status:</span> <span className="capitalize">{benefit.status}</span></p>
                  <p><span className="text-muted-foreground">Start:</span> {new Date(benefit.start_date).toLocaleDateString()}</p>
                  {benefit.end_date && (
                    <p><span className="text-muted-foreground">End:</span> {new Date(benefit.end_date).toLocaleDateString()}</p>
                  )}
                  {benefit.notes && (
                    <p className="text-muted-foreground italic">{benefit.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}