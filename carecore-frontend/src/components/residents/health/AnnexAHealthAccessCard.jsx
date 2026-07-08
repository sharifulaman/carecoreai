import { useState, useMemo, useEffect } from "react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

function Badge({ status, label }) {
  const styles = {
    complete: "bg-green-500/10 text-green-700",
    missing: "bg-amber-500/10 text-amber-700",
    concern: "bg-red-500/10 text-red-700",
    registered: "bg-green-500/10 text-green-700",
    "not-registered": "bg-red-500/10 text-red-700",
    unknown: "bg-slate-500/10 text-slate-700",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || ""}`}>
      {label}
    </span>
  );
}

export default function AnnexAHealthAccessCard({ resident, staff, homes }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  // Fetch health profile
  const { data: healthProfiles = [] } = useQuery({
    queryKey: ["health-profiles", resident?.id],
    queryFn: () => secureGateway.filter("HealthProfile", { resident_id: resident?.id }),
    staleTime: 5 * 60 * 1000,
  });

  const healthProfile = healthProfiles[0] || {};

  // Initialize form with auto-suggestions from resident data
  const [form, setForm] = useState({
    appropriate_healthcare_access: healthProfile.appropriate_healthcare_access !== undefined ? healthProfile.appropriate_healthcare_access : "unknown",
    healthcare_access_concern: healthProfile.healthcare_access_concern || false,
    healthcare_access_reason: healthProfile.healthcare_access_reason || "",
    gp_registered: healthProfile.gp_registered !== undefined ? (healthProfile.gp_registered ? "yes" : "no") : "unknown",
    dentist_registered: healthProfile.dentist_registered !== undefined ? (healthProfile.dentist_registered ? "yes" : "no") : "unknown",
    no_dentist_reason: healthProfile.no_dentist_reason || "",
    optician_registered: healthProfile.optician_registered !== undefined ? (healthProfile.optician_registered ? "yes" : "no") : "unknown",
    last_health_review: healthProfile.last_health_review || "",
    next_health_review: healthProfile.next_health_review || "",
    responsible_staff_id: healthProfile.responsible_staff_id || "",
    evidence_urls: healthProfile.evidence_urls || [],
  });

  // Auto-suggest based on resident data
  useEffect(() => {
    setForm(f => ({
      ...f,
      gp_registered: f.gp_registered === "unknown" && resident?.gp_practice ? "yes" : f.gp_registered,
      dentist_registered: f.dentist_registered === "unknown" && resident?.dentist_practice ? "yes" : f.dentist_registered,
      optician_registered: f.optician_registered === "unknown" && resident?.optician_practice ? "yes" : f.optician_registered,
    }));
  }, [resident]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        org_id: resident.org_id,
        resident_id: resident.id,
        resident_name: resident.display_name,
        home_id: resident.home_id,
        home_name: homeMap[resident.home_id]?.name || "",
        accommodation_category: resident.accommodation_category,
        appropriate_healthcare_access: form.appropriate_healthcare_access === "yes" ? true : form.appropriate_healthcare_access === "no" ? false : null,
        healthcare_access_concern: form.healthcare_access_reason ? true : false,
        healthcare_access_reason: form.healthcare_access_reason,
        gp_registered: form.gp_registered === "yes" ? true : form.gp_registered === "no" ? false : null,
        dentist_registered: form.dentist_registered === "yes" ? true : form.dentist_registered === "no" ? false : null,
        no_dentist_reason: form.no_dentist_reason,
        optician_registered: form.optician_registered === "yes" ? true : form.optician_registered === "no" ? false : null,
        last_health_review: form.last_health_review,
        next_health_review: form.next_health_review,
        responsible_staff_id: form.responsible_staff_id,
        last_updated_by_name: resident.display_name,
        last_updated_date: new Date().toISOString(),
        record_date: form.last_health_review || new Date().toISOString().split("T")[0],
        status: "active",
      };

      if (healthProfile.id) {
        await secureGateway.update("HealthProfile", healthProfile.id, payload);
      } else {
        await secureGateway.create("HealthProfile", payload);
      }
    },
    onSuccess: () => {
      toast.success("Health access summary saved");
      qc.invalidateQueries({ queryKey: ["health-profiles"] });
      setEditing(false);
      setSaving(false);
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
      setSaving(false);
    },
  });

  // Determine status badges
  const getAccessStatus = () => {
    if (form.appropriate_healthcare_access === "no" || form.healthcare_access_reason) return "concern";
    if (form.appropriate_healthcare_access === "unknown") return "missing";
    return "complete";
  };

  const getDentistStatus = () => {
    if (form.dentist_registered === "no" && !form.no_dentist_reason) return "missing";
    if (form.dentist_registered === "no") return "not-registered";
    if (form.dentist_registered === "yes") return "registered";
    return "unknown";
  };

  const getReviewOverdue = () => {
    if (!form.next_health_review) return false;
    return new Date(form.next_health_review) < new Date();
  };

  if (!resident) return null;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden ${getAccessStatus() === "concern" ? "border-red-500/30 bg-red-50/30" : "border-border"}`}>
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b border-border">
        <AlertTriangle className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Annex A Health Access Summary</h3>
      </div>

      {editing ? (
        <div className="p-4 space-y-4">
          {/* Healthcare Access */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Appropriate healthcare access?</label>
            <div className="flex gap-3">
              {["yes", "no", "unknown"].map(val => (
                <label key={val} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="access"
                    value={val}
                    checked={form.appropriate_healthcare_access === val}
                    onChange={(e) => setForm(f => ({ ...f, appropriate_healthcare_access: e.target.value }))}
                    className="w-4 h-4"
                  />
                  {val === "yes" ? "Yes" : val === "no" ? "No" : "Unknown"}
                </label>
              ))}
            </div>
          </div>

          {form.appropriate_healthcare_access === "no" && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Reason (required)</label>
              <Input
                value={form.healthcare_access_reason}
                onChange={(e) => setForm(f => ({ ...f, healthcare_access_reason: e.target.value }))}
                placeholder="Why healthcare access is not appropriate"
              />
            </div>
          )}

          {/* GP */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">GP registered?</label>
            <div className="flex gap-3">
              {["yes", "no", "unknown"].map(val => (
                <label key={val} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="gp"
                    value={val}
                    checked={form.gp_registered === val}
                    onChange={(e) => setForm(f => ({ ...f, gp_registered: e.target.value }))}
                    className="w-4 h-4"
                  />
                  {val === "yes" ? "Yes" : val === "no" ? "No" : "Unknown"}
                </label>
              ))}
            </div>
          </div>

          {/* Dentist */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Dentist registered?</label>
            <div className="flex gap-3 mb-2">
              {["yes", "no", "unknown"].map(val => (
                <label key={val} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dentist"
                    value={val}
                    checked={form.dentist_registered === val}
                    onChange={(e) => setForm(f => ({ ...f, dentist_registered: e.target.value }))}
                    className="w-4 h-4"
                  />
                  {val === "yes" ? "Yes" : val === "no" ? "No" : "Unknown"}
                </label>
              ))}
            </div>
            {form.dentist_registered === "no" && (
              <Input
                value={form.no_dentist_reason}
                onChange={(e) => setForm(f => ({ ...f, no_dentist_reason: e.target.value }))}
                placeholder="Reason for no dentist (required)"
                className="text-xs"
              />
            )}
          </div>

          {/* Optician */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-2">Optician registered?</label>
            <div className="flex gap-3">
              {["yes", "no", "unknown"].map(val => (
                <label key={val} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="optician"
                    value={val}
                    checked={form.optician_registered === val}
                    onChange={(e) => setForm(f => ({ ...f, optician_registered: e.target.value }))}
                    className="w-4 h-4"
                  />
                  {val === "yes" ? "Yes" : val === "no" ? "No" : "Unknown"}
                </label>
              ))}
            </div>
          </div>

          {/* Review Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Last health review</label>
              <input
                type="date"
                value={form.last_health_review}
                onChange={(e) => setForm(f => ({ ...f, last_health_review: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Next review due</label>
              <input
                type="date"
                value={form.next_health_review}
                onChange={(e) => setForm(f => ({ ...f, next_health_review: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Responsible Staff */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Responsible staff member</label>
            <select
              value={form.responsible_staff_id}
              onChange={(e) => setForm(f => ({ ...f, responsible_staff_id: e.target.value }))}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select staff member</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => { setSaving(true); mutation.mutate(); }} disabled={saving || (form.appropriate_healthcare_access === "no" && !form.healthcare_access_reason) || (form.dentist_registered === "no" && !form.no_dentist_reason)}>
              <Save className="w-3 h-3 mr-1" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex flex-wrap gap-2">
              <Badge status={getAccessStatus()} label={getAccessStatus() === "concern" ? "⚠ Concern" : getAccessStatus() === "missing" ? "? Missing" : "✓ Complete"} />
              <Badge status={form.gp_registered === "yes" ? "registered" : form.gp_registered === "no" ? "not-registered" : "unknown"} label={form.gp_registered === "yes" ? "GP: Registered" : form.gp_registered === "no" ? "GP: Not Registered" : "GP: Unknown"} />
              <Badge status={getDentistStatus()} label={form.dentist_registered === "yes" ? "Dentist: Registered" : form.dentist_registered === "no" ? "Dentist: Not Registered" : "Dentist: Unknown"} />
              <Badge status={form.optician_registered === "yes" ? "registered" : form.optician_registered === "no" ? "not-registered" : "unknown"} label={form.optician_registered === "yes" ? "Optician: Registered" : form.optician_registered === "no" ? "Optician: Not Registered" : "Optician: Unknown"} />
            </div>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">Healthcare Access:</span>
              <p className="font-medium capitalize">{form.appropriate_healthcare_access}</p>
            </div>
            <div>
              <span className="text-muted-foreground">GP Registered:</span>
              <p className="font-medium capitalize">{form.gp_registered}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Dentist Registered:</span>
              <p className="font-medium capitalize">{form.dentist_registered}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Optician Registered:</span>
              <p className="font-medium capitalize">{form.optician_registered}</p>
            </div>
            {form.healthcare_access_reason && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Access Reason:</span>
                <p className="font-medium">{form.healthcare_access_reason}</p>
              </div>
            )}
            {form.no_dentist_reason && (
              <div className="col-span-2">
                <span className="text-muted-foreground">No Dentist Reason:</span>
                <p className="font-medium">{form.no_dentist_reason}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Last Review:</span>
              <p className="font-medium">{form.last_health_review ? new Date(form.last_health_review).toLocaleDateString("en-GB") : "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Next Review:</span>
              <p className={`font-medium ${getReviewOverdue() ? "text-red-600" : ""}`}>{form.next_health_review ? new Date(form.next_health_review).toLocaleDateString("en-GB") : "—"}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Responsible Staff:</span>
              <p className="font-medium">{form.responsible_staff_id ? staffMap[form.responsible_staff_id]?.full_name : "—"}</p>
            </div>
          </div>

          {getReviewOverdue() && (
            <div className="mt-3 text-xs bg-red-500/10 text-red-700 px-2 py-1.5 rounded font-medium">
              ⚠ Next review date is overdue
            </div>
          )}

          {getAccessStatus() === "concern" && (
            <div className="mt-3 text-xs bg-red-500/10 text-red-700 px-2 py-1.5 rounded font-medium">
              ⚠ Healthcare access concern recorded
            </div>
          )}
        </div>
      )}
    </div>
  );
}