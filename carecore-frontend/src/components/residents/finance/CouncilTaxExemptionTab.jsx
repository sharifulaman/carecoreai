import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { secureGateway } from '@/lib/secureGateway';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { ORG_ID } from '@/lib/roleConfig';
import { toast } from 'sonner';

const EXEMPTION_TYPES = {
  care_leaver: 'Care Leaver',
  full_time_student: 'Full Time Student',
  disability_living_allowance: 'Disability Living Allowance',
  personal_independence_payment: 'Personal Independence Payment',
  in_training: 'In Training',
  other: 'Other'
};

const EXEMPTION_STATUSES = {
  active: 'Active',
  applied: 'Applied',
  rejected: 'Rejected',
  expired: 'Expired',
  not_applicable: 'Not Applicable',
  pending: 'Pending'
};

const STATUS_COLORS = {
  active: 'bg-green-500/10 text-green-700 border-green-200',
  applied: 'bg-blue-500/10 text-blue-700 border-blue-200',
  rejected: 'bg-red-500/10 text-red-700 border-red-200',
  expired: 'bg-amber-500/10 text-amber-700 border-amber-200',
  not_applicable: 'bg-gray-500/10 text-gray-700 border-gray-200',
  pending: 'bg-slate-500/10 text-slate-700 border-slate-200'
};

export default function CouncilTaxExemptionTab({ residents, homes, staff, user, isAdminOrTL }) {
  const qc = useQueryClient();
  const [selectedResidentId, setSelectedResidentId] = useState(residents[0]?.id || '');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    exemption_type: '',
    exemption_status: 'pending',
    start_date: '',
    end_date: '',
    exemption_percentage: 100,
    council_name: '',
    council_contact: '',
    council_email: '',
    reference_number: '',
    notes: '',
    supporting_documents: [],
    renewal_date: ''
  });

  const selectedResident = residents.find(r => r.id === selectedResidentId) || residents[0];

  const { data: exemptions = [] } = useQuery({
    queryKey: ['council-tax-exemptions', selectedResidentId],
    queryFn: () => secureGateway.filter('CouncilTaxExemption', { resident_id: selectedResidentId }),
    enabled: !!selectedResidentId
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CouncilTaxExemption.create({
      ...data,
      org_id: ORG_ID,
      resident_id: selectedResidentId,
      resident_name: selectedResident?.display_name,
      home_id: selectedResident?.home_id,
      home_name: homes.find(h => h.id === selectedResident?.home_id)?.name,
      applied_by_staff_id: user?.id,
      applied_by_name: user?.full_name,
      applied_date: new Date().toISOString()
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['council-tax-exemptions', selectedResidentId] });
      setShowForm(false);
      setFormData({
        exemption_type: '',
        exemption_status: 'pending',
        start_date: '',
        end_date: '',
        exemption_percentage: 100,
        council_name: '',
        council_contact: '',
        council_email: '',
        reference_number: '',
        notes: '',
        supporting_documents: [],
        renewal_date: ''
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.CouncilTaxExemption.update(editingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['council-tax-exemptions', selectedResidentId] });
      setEditingId(null);
      setShowForm(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CouncilTaxExemption.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['council-tax-exemptions', selectedResidentId] });
    }
  });

  const handleSubmit = () => {
    const errs = {};
    if (!formData.exemption_type) errs.exemption_type = "Exemption type is required";
    if (!formData.start_date) errs.start_date = "Start date is required";
    if (!formData.end_date) errs.end_date = "End date is required";
    if (!formData.council_name?.trim()) errs.council_name = "Council name is required";
    if (!formData.renewal_date) errs.renewal_date = "Renewal date is required";
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fill in all required fields");
      return;
    }
    setErrors({});
    if (editingId) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (exemption) => {
    setErrors({});
    setFormData({
      exemption_type: exemption.exemption_type,
      exemption_status: exemption.exemption_status,
      start_date: exemption.start_date,
      end_date: exemption.end_date,
      exemption_percentage: exemption.exemption_percentage,
      council_name: exemption.council_name,
      council_contact: exemption.council_contact,
      council_email: exemption.council_email,
      reference_number: exemption.reference_number,
      notes: exemption.notes,
      supporting_documents: exemption.supporting_documents || [],
      renewal_date: exemption.renewal_date
    });
    setEditingId(exemption.id);
    setShowForm(true);
  };

  if (residents.length === 0) {
    return (
      <div className="mt-4 bg-card rounded-xl border border-border p-12 text-center text-muted-foreground text-sm">
        No residents found.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {residents.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Resident:</label>
          <select
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
            value={selectedResidentId}
            onChange={e => setSelectedResidentId(e.target.value)}
          >
            {residents.map(r => (
              <option key={r.id} value={r.id}>{r.display_name}</option>
            ))}
          </select>
        </div>
      )}

      {isAdminOrTL && (
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setFormData({
              exemption_type: '',
              exemption_status: 'pending',
              start_date: '',
              end_date: '',
              exemption_percentage: 100,
              council_name: '',
              council_contact: '',
              council_email: '',
              reference_number: '',
              notes: '',
              supporting_documents: [],
              renewal_date: ''
            });
            setErrors({});
            setShowForm(true);
          }}
          className="gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Exemption
        </Button>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-sm">{editingId ? 'Edit' : 'New'} Council Tax Exemption</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Exemption Type *</label>
              <select
                className={`w-full border rounded-lg px-3 py-1.5 text-sm bg-card mt-1 ${errors.exemption_type ? "border-red-500" : "border-border"}`}
                value={formData.exemption_type}
                onChange={e => setFormData({ ...formData, exemption_type: e.target.value })}
              >
                <option value="">Select type</option>
                {Object.entries(EXEMPTION_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
              {errors.exemption_type && <p className="text-xs text-red-500 mt-1">{errors.exemption_type}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-card mt-1"
                value={formData.exemption_status}
                onChange={e => setFormData({ ...formData, exemption_status: e.target.value })}
              >
                {Object.entries(EXEMPTION_STATUSES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Start Date *</label>
              <input
                type="date"
                className={`w-full border rounded-lg px-3 py-1.5 text-sm bg-card mt-1 ${errors.start_date ? "border-red-500" : "border-border"}`}
                value={formData.start_date}
                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
              />
              {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">End Date *</label>
              <input
                type="date"
                className={`w-full border rounded-lg px-3 py-1.5 text-sm bg-card mt-1 ${errors.end_date ? "border-red-500" : "border-border"}`}
                value={formData.end_date}
                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
              />
              {errors.end_date && <p className="text-xs text-red-500 mt-1">{errors.end_date}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Exemption %</label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-card mt-1"
                value={formData.exemption_percentage}
                onChange={e => setFormData({ ...formData, exemption_percentage: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Renewal Date *</label>
              <input
                type="date"
                className={`w-full border rounded-lg px-3 py-1.5 text-sm bg-card mt-1 ${errors.renewal_date ? "border-red-500" : "border-border"}`}
                value={formData.renewal_date}
                onChange={e => setFormData({ ...formData, renewal_date: e.target.value })}
              />
              {errors.renewal_date && <p className="text-xs text-red-500 mt-1">{errors.renewal_date}</p>}
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Council Name *</label>
              <input
                type="text"
                className={`w-full border rounded-lg px-3 py-1.5 text-sm bg-card mt-1 ${errors.council_name ? "border-red-500" : "border-border"}`}
                value={formData.council_name}
                onChange={e => setFormData({ ...formData, council_name: e.target.value })}
                placeholder="e.g. Westminster City Council"
              />
              {errors.council_name && <p className="text-xs text-red-500 mt-1">{errors.council_name}</p>}
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Council Phone</label>
              <input
                type="tel"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-card mt-1"
                value={formData.council_contact}
                onChange={e => setFormData({ ...formData, council_contact: e.target.value })}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Council Email</label>
              <input
                type="email"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-card mt-1"
                value={formData.council_email}
                onChange={e => setFormData({ ...formData, council_email: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Reference Number</label>
              <input
                type="text"
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-card mt-1"
                value={formData.reference_number}
                onChange={e => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="Council tax exemption reference"
              />
            </div>

            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-card mt-1"
                rows="3"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'Update' : 'Create'} Exemption
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {exemptions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No council tax exemptions recorded.
          </div>
        ) : (
          exemptions.map(exemption => (
            <div key={exemption.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-sm">{EXEMPTION_TYPES[exemption.exemption_type]}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{exemption.council_name || 'Council name not set'}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_COLORS[exemption.exemption_status]}`}>
                  {EXEMPTION_STATUSES[exemption.exemption_status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                {exemption.reference_number && (
                  <div>
                    <span className="text-muted-foreground">Reference:</span>
                    <p className="font-medium">{exemption.reference_number}</p>
                  </div>
                )}
                {exemption.start_date && (
                  <div>
                    <span className="text-muted-foreground">Start Date:</span>
                    <p className="font-medium">{new Date(exemption.start_date).toLocaleDateString()}</p>
                  </div>
                )}
                {exemption.end_date && (
                  <div>
                    <span className="text-muted-foreground">End Date:</span>
                    <p className="font-medium">{new Date(exemption.end_date).toLocaleDateString()}</p>
                  </div>
                )}
                {exemption.exemption_percentage !== null && (
                  <div>
                    <span className="text-muted-foreground">Exemption:</span>
                    <p className="font-medium">{exemption.exemption_percentage}%</p>
                  </div>
                )}
              </div>

              {exemption.notes && (
                <p className="text-xs text-muted-foreground mb-3 bg-muted/30 p-2 rounded">{exemption.notes}</p>
              )}

              {exemption.council_contact && (
                <p className="text-xs text-muted-foreground">📞 {exemption.council_contact}</p>
              )}

              {isAdminOrTL && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-border">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(exemption)}
                    className="text-xs gap-1"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteMutation.mutate(exemption.id)}
                    className="text-xs gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}