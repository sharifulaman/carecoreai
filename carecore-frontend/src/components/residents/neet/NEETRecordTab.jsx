import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";

export default function NEETRecordTab({ residents, homes, staff, isAdminOrTL }) {
  const qc = useQueryClient();
  const [selectedResidentId, setSelectedResidentId] = useState(residents[0]?.id || null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const selectedResident = residents.find(r => r.id === selectedResidentId) || residents[0];
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const { data: records = [] } = useQuery({
    queryKey: ["neet-records"],
    queryFn: () => secureGateway.filter("NEETRecord", {}),
    staleTime: 5 * 60 * 1000,
  });

  const residentRecords = useMemo(() => {
    if (!selectedResident) return [];
    return records.filter(r => r.resident_id === selectedResident.id).sort((a, b) => (b.date_neet_started || b.created_date)?.localeCompare(a.date_neet_started || a.created_date));
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
    if (!form.date_neet_started) errs.date_neet_started = "Date NEET started is required";
    if (!form.reason_currently_neet?.trim()) errs.reason_currently_neet = "Reason is required";
    if (!form.action_plan?.trim()) errs.action_plan = "Action plan is required";
    if (!form.responsible_staff_id) errs.responsible_staff_id = "Responsible staff is required";
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
    currently_neet: false,
    date_neet_started: "",
    last_date_education_training_employment: "",
    reason_currently_neet: "",
    action_plan: "",
    responsible_staff_id: "",
    review_date: "",
    outcome_notes: "",
    manager_review_status: "submitted",
    manager_review_date: "",
  });

  const handleEditRecord = (record) => {
    setForm({
      currently_neet: record.currently_neet || false,
      date_neet_started: record.date_neet_started || "",
      last_date_education_training_employment: record.last_date_education_training_employment || "",
      reason_currently_neet: record.reason_currently_neet || "",
      action_plan: record.action_plan || "",
      responsible_staff_id: record.responsible_staff_id || "",
      review_date: record.review_date || "",
      outcome_notes: record.outcome_notes || "",
      manager_review_status: record.manager_review_status || "submitted",
      manager_review_date: record.manager_review_date || "",
    });
    setEditingId(record.id);
    setErrors({});
    setShowForm(true);
  };

  const handleNewRecord = () => {
    setForm({
      currently_neet: false,
      date_neet_started: "",
      last_date_education_training_employment: "",
      reason_currently_neet: "",
      action_plan: "",
      responsible_staff_id: "",
      review_date: "",
      outcome_notes: "",
      manager_review_status: "submitted",
      manager_review_date: "",
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
        await secureGateway.update("NEETRecord", editingId, payload);
      } else {
        await secureGateway.create("NEETRecord", payload);
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Record updated" : "Record created");
      qc.invalidateQueries({ queryKey: ["neet-records"] });
      setShowForm(false);
      setEditingId(null);
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => secureGateway.delete("NEETRecord", id),
    onSuccess: () => {
      toast.success("Record deleted");
      qc.invalidateQueries({ queryKey: ["neet-records"] });
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
          <h3 className="font-semibold text-sm">NEET / Not in Education or Employment</h3>
          <p className="text-xs text-muted-foreground mt-1">Track NEET status and action plans</p>
        </div>
        {isAdminOrTL && (
          <Button onClick={handleNewRecord} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Record
          </Button>
        )}
      </div>

      {residentRecords.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          No NEET records.
        </div>
      ) : (
        <div className="space-y-3">
          {residentRecords.map(record => (
            <div key={record.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">NEET Record</p>
                    {record.currently_neet && (
                      <span className="text-xs px-2 py-0.5 bg-red-500/10 text-red-600 rounded-full font-medium">Currently NEET</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{record.reason_currently_neet || "—"}</p>
                </div>
                {isAdminOrTL && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)} className="text-xs h-7">Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => confirmDeleteToast("this NEET record", () => deleteMutation.mutate(record.id))} className="text-red-600 hover:text-red-700 h-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">NEET Start:</span>
                  <p className="font-medium">{record.date_neet_started ? new Date(record.date_neet_started).toLocaleDateString("en-GB") : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Employment:</span>
                  <p className="font-medium">{record.last_date_education_training_employment ? new Date(record.last_date_education_training_employment).toLocaleDateString("en-GB") : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Responsible Staff:</span>
                  <p className="font-medium">{record.responsible_staff_id ? staffMap[record.responsible_staff_id]?.full_name : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Review Date:</span>
                  <p className="font-medium">{record.review_date ? new Date(record.review_date).toLocaleDateString("en-GB") : "—"}</p>
                </div>
              </div>

              {record.action_plan && (
                <div className="mt-2 text-xs">
                  <span className="text-muted-foreground">Action Plan:</span>
                  <p className="font-medium whitespace-pre-wrap">{record.action_plan}</p>
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
              <h2 className="font-semibold text-foreground">{editingId ? "Edit Record" : "Add NEET Record"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={form.currently_neet}
                  onCheckedChange={(checked) => setForm({ ...form, currently_neet: checked })}
                />
                <label className="text-sm font-medium">Currently NEET?</label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Date NEET Started <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.date_neet_started}
                  onChange={(e) => setForm({ ...form, date_neet_started: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${errors.date_neet_started ? "border-red-500" : "border-border"}`}
                />
                {errors.date_neet_started && <p className="text-xs text-red-500 mt-1">{errors.date_neet_started}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Last Date in Education / Training / Employment</label>
                <input
                  type="date"
                  value={form.last_date_education_training_employment}
                  onChange={(e) => setForm({ ...form, last_date_education_training_employment: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Reason Currently NEET <span className="text-red-500">*</span></label>
                <Input
                  value={form.reason_currently_neet}
                  onChange={(e) => setForm({ ...form, reason_currently_neet: e.target.value })}
                  placeholder="e.g. Job search, Health, Transport"
                  className={errors.reason_currently_neet ? "border-red-500" : ""}
                />
                {errors.reason_currently_neet && <p className="text-xs text-red-500 mt-1">{errors.reason_currently_neet}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Action Plan <span className="text-red-500">*</span></label>
                <Textarea
                  value={form.action_plan}
                  onChange={(e) => setForm({ ...form, action_plan: e.target.value })}
                  placeholder="Detail steps to address NEET status"
                  className={`h-20 ${errors.action_plan ? "border-red-500" : ""}`}
                />
                {errors.action_plan && <p className="text-xs text-red-500 mt-1">{errors.action_plan}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Responsible Staff <span className="text-red-500">*</span></label>
                <select
                  value={form.responsible_staff_id}
                  onChange={(e) => setForm({ ...form, responsible_staff_id: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${errors.responsible_staff_id ? "border-red-500" : "border-border"}`}
                >
                  <option value="">Select staff member</option>
                  {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                </select>
                {errors.responsible_staff_id && <p className="text-xs text-red-500 mt-1">{errors.responsible_staff_id}</p>}
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

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Outcome Notes</label>
                <Textarea
                  value={form.outcome_notes}
                  onChange={(e) => setForm({ ...form, outcome_notes: e.target.value })}
                  placeholder="Notes on outcomes and progress"
                  className="h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Manager Review Status</label>
                <select
                  value={form.manager_review_status}
                  onChange={(e) => setForm({ ...form, manager_review_status: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="submitted">Submitted</option>
                  <option value="pending_review">Pending Review</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Manager Review Date</label>
                <input
                  type="date"
                  value={form.manager_review_date}
                  onChange={(e) => setForm({ ...form, manager_review_date: e.target.value })}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
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