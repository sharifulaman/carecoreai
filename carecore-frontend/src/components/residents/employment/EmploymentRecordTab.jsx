import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";

export default function EmploymentRecordTab({ residents, homes, isAdminOrTL }) {
  const qc = useQueryClient();
  const [selectedResidentId, setSelectedResidentId] = useState(residents[0]?.id || null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const selectedResident = residents.find(r => r.id === selectedResidentId) || residents[0];
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  const { data: records = [] } = useQuery({
    queryKey: ["employment-records"],
    queryFn: () => secureGateway.filter("EmploymentRecord", {}),
    staleTime: 5 * 60 * 1000,
  });

  const residentRecords = useMemo(() => {
    if (!selectedResident) return [];
    return records.filter(r => r.resident_id === selectedResident.id).sort((a, b) => (b.start_date || b.created_date)?.localeCompare(a.start_date || a.created_date));
  }, [records, selectedResident]);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showForm]);

  const validate = () => {
    const errs = {};
    if (!form.employer_provider_name?.trim()) errs.employer_provider_name = "Employer name is required";
    if (!form.start_date) errs.start_date = "Start date is required";
    if (!form.nature_of_employment?.trim()) errs.nature_of_employment = "Nature of employment is required";
    if (!form.hours_worked_per_week) errs.hours_worked_per_week = "Hours per week is required";
    if (!form.review_date) errs.review_date = "Review date is required";
    return errs;
  };

  const handleSave = () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fill in all required fields");
      return;
    }
    setErrors({});
    mutation.mutate();
  };

  const [form, setForm] = useState({
    employer_provider_name: "",
    start_date: "",
    nature_of_employment: "",
    is_apprenticeship: false,
    hours_worked_per_week: "",
    employment_status: "active",
    evidence_urls: [],
    review_date: "",
  });

  const handleEditRecord = (record) => {
    setForm({
      employer_provider_name: record.employer_provider_name || "",
      start_date: record.start_date || "",
      nature_of_employment: record.nature_of_employment || "",
      is_apprenticeship: record.is_apprenticeship || false,
      hours_worked_per_week: record.hours_worked_per_week || "",
      employment_status: record.employment_status || "active",
      evidence_urls: record.evidence_urls || [],
      review_date: record.review_date || "",
    });
    setEditingId(record.id);
    setErrors({});
    setShowForm(true);
  };

  const handleNewRecord = () => {
    setForm({
      employer_provider_name: "",
      start_date: "",
      nature_of_employment: "",
      is_apprenticeship: false,
      hours_worked_per_week: "",
      employment_status: "active",
      evidence_urls: [],
      review_date: "",
    });
    setEditingId(null);
    setErrors({});
    setShowForm(true);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        org_id: selectedResident.org_id,
        resident_id: selectedResident.id,
        resident_name: selectedResident.display_name,
        home_id: selectedResident.home_id,
        home_name: homeMap[selectedResident.home_id]?.name || "",
        accommodation_category: selectedResident.accommodation_category,
        ...form,
      };

      if (editingId) {
        await secureGateway.update("EmploymentRecord", editingId, payload);
      } else {
        await secureGateway.create("EmploymentRecord", payload);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Record updated" : "Record created");
      qc.invalidateQueries({ queryKey: ["employment-records"] });
      setShowForm(false);
      setEditingId(null);
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => secureGateway.delete("EmploymentRecord", id),
    onSuccess: () => {
      toast.success("Record deleted");
      qc.invalidateQueries({ queryKey: ["employment-records"] });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  return (
    <div className="mt-4 space-y-4">
      {residents.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-muted-foreground">Resident:</label>
          <select
            value={selectedResidentId || ""}
            onChange={(e) => setSelectedResidentId(e.target.value)}
            className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
          </select>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-sm">Employment & Apprenticeship</h3>
          <p className="text-xs text-muted-foreground mt-1">Track employment and apprenticeship records</p>
        </div>
        {isAdminOrTL && (
          <Button onClick={handleNewRecord} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Record
          </Button>
        )}
      </div>

      {residentRecords.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          No employment records.
        </div>
      ) : (
        <div className="space-y-3">
          {residentRecords.map(record => (
            <div key={record.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{record.employer_provider_name || "Employment Record"}</p>
                    {record.is_apprenticeship && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-600 rounded-full font-medium">Apprenticeship</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{record.nature_of_employment}</p>
                </div>
                {isAdminOrTL && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)} className="text-xs h-7">Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => confirmDeleteToast(record.employer_provider_name ? `"${record.employer_provider_name}"` : "this employment record", () => deleteMutation.mutate(record.id))} className="text-red-600 hover:text-red-700 h-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Start:</span>
                  <p className="font-medium">{record.start_date ? new Date(record.start_date).toLocaleDateString("en-GB") : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium capitalize">{record.employment_status?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hours Per Week:</span>
                  <p className="font-medium">{record.hours_worked_per_week || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Review Due:</span>
                  <p className="font-medium">{record.review_date ? new Date(record.review_date).toLocaleDateString("en-GB") : "—"}</p>
                </div>
              </div>

              {record.evidence_urls?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {record.evidence_urls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20">
                      <FileText className="w-3 h-3" /> Evidence
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onWheel={(e) => e.stopPropagation()}>
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{editingId ? "Edit Record" : "Add Employment Record"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Employer / Provider Name <span className="text-red-500">*</span></label>
                <Input
                  value={form.employer_provider_name}
                  onChange={(e) => setForm({ ...form, employer_provider_name: e.target.value })}
                  placeholder="e.g. Tesco"
                  className={errors.employer_provider_name ? "border-red-500" : ""}
                />
                {errors.employer_provider_name && <p className="text-xs text-red-500 mt-1">{errors.employer_provider_name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Start Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${errors.start_date ? "border-red-500" : "border-border"}`}
                />
                {errors.start_date && <p className="text-xs text-red-500 mt-1">{errors.start_date}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Nature of Employment / Role <span className="text-red-500">*</span></label>
                <Input
                  value={form.nature_of_employment}
                  onChange={(e) => setForm({ ...form, nature_of_employment: e.target.value })}
                  placeholder="e.g. Retail Assistant"
                  className={errors.nature_of_employment ? "border-red-500" : ""}
                />
                {errors.nature_of_employment && <p className="text-xs text-red-500 mt-1">{errors.nature_of_employment}</p>}
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={form.is_apprenticeship}
                  onCheckedChange={(checked) => setForm({ ...form, is_apprenticeship: checked })}
                />
                <label className="text-sm font-medium">Apprenticeship?</label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Hours Worked Per Week <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  value={form.hours_worked_per_week}
                  onChange={(e) => setForm({ ...form, hours_worked_per_week: e.target.value })}
                  placeholder="e.g. 30"
                  className={errors.hours_worked_per_week ? "border-red-500" : ""}
                />
                {errors.hours_worked_per_week && <p className="text-xs text-red-500 mt-1">{errors.hours_worked_per_week}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Employment Status</label>
                <select
                  value={form.employment_status}
                  onChange={(e) => setForm({ ...form, employment_status: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                  <option value="paused">Paused</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Review Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.review_date}
                  onChange={(e) => setForm({ ...form, review_date: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${errors.review_date ? "border-red-500" : "border-border"}`}
                />
                {errors.review_date && <p className="text-xs text-red-500 mt-1">{errors.review_date}</p>}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border bg-muted/20 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}