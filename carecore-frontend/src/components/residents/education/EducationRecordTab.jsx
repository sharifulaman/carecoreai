import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";

export default function EducationRecordTab({ residents, homes, staff, isAdminOrTL }) {
  const qc = useQueryClient();
  const [selectedResidentId, setSelectedResidentId] = useState(residents[0]?.id || null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const selectedResident = residents.find(r => r.id === selectedResidentId) || residents[0];
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);

  const { data: records = [] } = useQuery({
    queryKey: ["education-records"],
    queryFn: () => secureGateway.filter("EducationRecord", {}),
    staleTime: 5 * 60 * 1000,
  });

  const residentRecords = useMemo(() => {
    if (!selectedResident) return [];
    return records.filter(r => r.resident_id === selectedResident.id).sort((a, b) => (b.record_date || b.created_date)?.localeCompare(a.record_date || a.created_date));
  }, [records, selectedResident]);

  const today = new Date().toISOString().split("T")[0];

  const blankForm = () => ({
    education_status: "",
    record_date: today,
    education_provider_name: "",
    is_main_provider: null,
    course_programme_name: "",
    hours_per_week_provided: "",
    hours_per_week_attended: "",
    attendance_concerns: false,
    start_date: "",
    end_date: "",
    review_date: "",
    evidence_urls: [],
  });

  const [form, setForm] = useState(blankForm());
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showForm]);

  const isFullOrPartTime = ["full_time_education", "part_time_education"].includes(form.education_status);
  const isNEET = form.education_status === "not_in_education";

  const validate = () => {
    const errs = {};
    if (!form.record_date) errs.record_date = "Record date is required";
    if (!form.education_status) errs.education_status = "Education status is required";
    if (isFullOrPartTime) {
      if (!form.education_provider_name?.trim()) errs.education_provider_name = "Provider name is required";
      if (form.is_main_provider === null) errs.is_main_provider = "Please select yes or no";
      if (!form.hours_per_week_provided) errs.hours_per_week_provided = "Scheduled hours are required";
      if (!form.hours_per_week_attended) errs.hours_per_week_attended = "Actual hours are required";
    }
    if (!form.start_date) errs.start_date = "Start date is required";
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

  const handleEditRecord = (record) => {
    setForm({
      education_status: record.education_status || "",
      record_date: record.record_date || today,
      education_provider_name: record.education_provider_name || "",
      is_main_provider: record.is_main_provider ?? null,
      course_programme_name: record.course_programme_name || "",
      hours_per_week_provided: record.hours_per_week_provided || "",
      hours_per_week_attended: record.hours_per_week_attended || "",
      attendance_concerns: record.attendance_concerns || false,
      start_date: record.start_date || "",
      end_date: record.end_date || "",
      review_date: record.review_date || "",
      evidence_urls: record.evidence_urls || [],
    });
    setEditingId(record.id);
    setErrors({});
    setShowForm(true);
  };

  const handleNewRecord = () => {
    setForm(blankForm());
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
        accommodation_category: selectedResident.accommodation_category || "",
        placing_local_authority: selectedResident.placing_local_authority || "",
        ...form,
      };

      if (editingId) {
        await secureGateway.update("EducationRecord", editingId, payload);
      } else {
        await secureGateway.create("EducationRecord", payload);
        // Auto-create NEET record if status is not_in_education
        if (form.education_status === "not_in_education") {
          await secureGateway.create("NEETRecord", {
            org_id: selectedResident.org_id,
            resident_id: selectedResident.id,
            resident_name: selectedResident.display_name,
            home_id: selectedResident.home_id,
            accommodation_category: selectedResident.accommodation_category || "",
            currently_neet: true,
            date_neet_started: today,
          });
        }
      }
    },
    onSuccess: () => {
      const isNEETSave = !editingId && form.education_status === "not_in_education";
      toast.success(editingId ? "Record updated" : isNEETSave ? "Education record saved — NEET record created" : "Record created");
      qc.invalidateQueries({ queryKey: ["education-records"] });
      qc.invalidateQueries({ queryKey: ["neet-records"] });
      setShowForm(false);
      setEditingId(null);
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => secureGateway.delete("EducationRecord", id),
    onSuccess: () => {
      toast.success("Record deleted");
      qc.invalidateQueries({ queryKey: ["education-records"] });
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
          <h3 className="font-semibold text-sm">Education Records</h3>
          <p className="text-xs text-muted-foreground mt-1">Track education status and attendance</p>
        </div>
        {isAdminOrTL && (
          <Button onClick={handleNewRecord} size="sm" className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Record
          </Button>
        )}
      </div>

      {residentRecords.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          No education records.
        </div>
      ) : (
        <div className="space-y-3">
          {residentRecords.map(record => (
            <div key={record.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold">{record.education_provider_name || "Education Record"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{record.course_programme_name || record.education_status?.replace(/_/g, " ")}</p>
                </div>
                {isAdminOrTL && (
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditRecord(record)} className="text-xs h-7">Edit</Button>
                    <Button variant="ghost" size="sm" onClick={() => confirmDeleteToast(record.education_provider_name ? `"${record.education_provider_name}"` : "this education record", () => deleteMutation.mutate(record.id))} className="text-red-600 hover:text-red-700 h-7">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p className="font-medium capitalize">{record.education_status?.replace(/_/g, " ")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Start:</span>
                  <p className="font-medium">{record.start_date ? new Date(record.start_date).toLocaleDateString("en-GB") : "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hours Provided:</span>
                  <p className="font-medium">{record.hours_per_week_provided || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Hours Attended:</span>
                  <p className="font-medium">{record.hours_per_week_attended || "—"}</p>
                </div>
              </div>

              {record.attendance_concerns && (
                <div className="mt-2 text-xs bg-amber-500/10 text-amber-600 px-2 py-1 rounded inline-block">⚠ Attendance concerns</div>
              )}

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
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onWheel={(e) => e.stopPropagation()}
        >
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{editingId ? "Edit Education Record" : "Add Education Record"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-muted rounded">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Auto-filled locked fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Accommodation Category</label>
                  <Input value={selectedResident?.accommodation_category?.replace(/_/g, " ") || "—"} disabled className="bg-muted text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Placing Local Authority</label>
                  <Input value={selectedResident?.placing_local_authority || "—"} disabled className="bg-muted text-muted-foreground" />
                </div>
              </div>

              {/* Record Date */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Record Date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={form.record_date}
                  onChange={(e) => setForm({ ...form, record_date: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${errors.record_date ? "border-red-500" : "border-border"}`}
                />
                {errors.record_date && <p className="text-xs text-red-500 mt-1">{errors.record_date}</p>}
              </div>

              {/* Education Status */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Education Status <span className="text-red-500">*</span></label>
                <select
                  value={form.education_status}
                  onChange={(e) => setForm({ ...form, education_status: e.target.value, is_main_provider: null })}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary ${errors.education_status ? "border-red-500" : "border-border"}`}
                >
                  <option value="">— Select status —</option>
                  <option value="full_time_education">Full-time Education</option>
                  <option value="part_time_education">Part-time Education</option>
                  <option value="alternative_provision">Alternative Provision</option>
                  <option value="not_in_education">Not in Education (NEET)</option>
                  <option value="unknown">Unknown</option>
                </select>
                {errors.education_status && <p className="text-xs text-red-500 mt-1">{errors.education_status}</p>}
                {isNEET && !editingId && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">⚠ A NEET record will be automatically created on save.</p>
                )}
              </div>

              {/* Full/Part-time required fields */}
              {isFullOrPartTime && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                      Education Provider / College Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={form.education_provider_name}
                      onChange={(e) => setForm({ ...form, education_provider_name: e.target.value })}
                      placeholder="e.g. Westminster College"
                      className={errors.education_provider_name ? "border-red-500" : ""}
                    />
                    {errors.education_provider_name && <p className="text-xs text-red-500 mt-1">{errors.education_provider_name}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-2">
                      Is this the main education provider? <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setForm({ ...form, is_main_provider: true })}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.is_main_provider === true ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                      >Yes</button>
                      <button
                        onClick={() => setForm({ ...form, is_main_provider: false })}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${form.is_main_provider === false ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"}`}
                      >No</button>
                    </div>
                    {errors.is_main_provider && <p className="text-xs text-red-500 mt-1">{errors.is_main_provider}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Scheduled Hours/Week (Q43) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={form.hours_per_week_provided}
                        onChange={(e) => setForm({ ...form, hours_per_week_provided: e.target.value })}
                        placeholder="e.g. 20"
                        className={errors.hours_per_week_provided ? "border-red-500" : ""}
                      />
                      {errors.hours_per_week_provided && <p className="text-xs text-red-500 mt-1">{errors.hours_per_week_provided}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                        Actual Hours/Week (Q43) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={form.hours_per_week_attended}
                        onChange={(e) => setForm({ ...form, hours_per_week_attended: e.target.value })}
                        placeholder="e.g. 18"
                        className={errors.hours_per_week_attended ? "border-red-500" : ""}
                      />
                      {errors.hours_per_week_attended && <p className="text-xs text-red-500 mt-1">{errors.hours_per_week_attended}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Course / Programme</label>
                    <Input
                      value={form.course_programme_name}
                      onChange={(e) => setForm({ ...form, course_programme_name: e.target.value })}
                      placeholder="e.g. GCSE English Literature"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={form.attendance_concerns}
                      onCheckedChange={(checked) => setForm({ ...form, attendance_concerns: checked })}
                    />
                    <label className="text-sm font-medium">Attendance concerns</label>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
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
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
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