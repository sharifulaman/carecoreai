import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { X } from "lucide-react";
import { ORG_ID } from "@/lib/roleConfig";
import { WORLD_LANGUAGES } from "@/lib/worldLanguages";

export default function ResidentForm({ homes, staff, onSubmit, onClose, saving, defaultServiceType }) {
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    display_name: "",
    initials: "",
    dob: "",
    gender: "",
    nationality: "",
    home_id: "",
    key_worker_id: "",
    team_leader_id: "",
    placement_type: "",
    placement_start: "",
    risk_level: "low",
    status: "active",
    org_id: ORG_ID,
    social_worker_name: "",
    social_worker_org: "",
    iro_name: "",
    health_notes: "",
    service_type: defaultServiceType || "",
    accommodation_category: "",
    looked_after_child: "",
    care_leaver_status: "",
    legal_placement_basis: "",
    uasc: "",
    first_language: "",
    interpreter_required: "",
    annex_a_applicable: "",
    annex_a_override: false,
  });

  const update = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  // Auto-calculate Annex A applicability (16-17 year old in 16-17 accommodation context)
  const autoAnnexA = useMemo(() => {
    if (form.annex_a_override) return form.annex_a_applicable;
    const dob = new Date(form.dob);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    if (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate())) age--;
    return (age >= 16 && age <= 17 && form.accommodation_category === "self_contained") ? "true" : "false";
  }, [form.dob, form.accommodation_category, form.annex_a_override, form.annex_a_applicable]);

  const teamLeaders = staff.filter(s => s.role === "team_leader" && s.status === "active");
  const supportWorkers = staff.filter(s => s.role === "support_worker" && s.status === "active");

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.display_name?.trim()) errs.display_name = "Display name is required";
    if (!form.initials?.trim()) errs.initials = "Initials are required";
    if (!form.dob) errs.dob = "Date of birth is required";
    if (!form.gender) errs.gender = "Gender is required";
    if (!form.home_id) errs.home_id = "Please select a home";
    if (!form.team_leader_id) errs.team_leader_id = "Team leader is required";
    if (!form.key_worker_id) errs.key_worker_id = "Key worker is required";
    if (!form.service_type) errs.service_type = "Please select a service type";
    if (!form.placement_type) errs.placement_type = "Placement type is required";
    if (!form.placement_start) errs.placement_start = "Placement start date is required";
    if (!form.accommodation_category) errs.accommodation_category = "Accommodation category is required";
    if (form.looked_after_child === "") errs.looked_after_child = "Required";
    if (form.care_leaver_status === "") errs.care_leaver_status = "Required";
    if (!form.legal_placement_basis?.trim()) errs.legal_placement_basis = "Legal placement basis is required";
    if (form.uasc === "") errs.uasc = "Required";
    if (!form.first_language?.trim()) errs.first_language = "First language is required";
    if (form.interpreter_required === "") errs.interpreter_required = "Required";
    if (!form.nationality?.trim()) errs.nationality = "Nationality is required";
    if (!form.social_worker_org?.trim()) errs.social_worker_org = "Local authority is required";
    if (!form.social_worker_name?.trim()) errs.social_worker_name = "Social worker name is required";
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error("Please fill in all required fields"); return; }
    /** @type {Record<string, unknown>} */
    const cleaned = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === "" || v === undefined || v === null) continue;
      if (v === "true")  { cleaned[k] = true;  continue; }
      if (v === "false") { cleaned[k] = false; continue; }
      cleaned[k] = v;
    }
    cleaned.english_first_language = form.first_language.trim().toLowerCase() === "english";
    onSubmit(cleaned);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl border border-border w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Add New Young Person</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Display Name *</Label>
              <Input required value={form.display_name} onChange={e => update("display_name", e.target.value)} className={`mt-1.5 ${errors.display_name ? "border-destructive" : ""}`} placeholder="e.g. Alex T." />
              {errors.display_name && <p className="text-xs text-destructive mt-1">{errors.display_name}</p>}
            </div>
            <div>
              <Label>Initials *</Label>
              <Input value={form.initials} onChange={e => update("initials", e.target.value)} className={`mt-1.5 ${errors.initials ? "border-destructive" : ""}`} placeholder="AT" maxLength={3} />
              {errors.initials && <p className="text-xs text-destructive mt-1">{errors.initials}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date of Birth *</Label>
              <Input type="date" value={form.dob} onChange={e => update("dob", e.target.value)} className={`mt-1.5 ${errors.dob ? "border-destructive" : ""}`} />
              {errors.dob && <p className="text-xs text-destructive mt-1">{errors.dob}</p>}
            </div>
            <div>
              <Label>Gender *</Label>
              <NativeSelect value={form.gender} onValueChange={v => update("gender", v)} placeholder="Select" className={errors.gender ? "border-destructive" : ""}>
                {["Male","Female","Non-binary","Prefer not to say"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </NativeSelect>
              {errors.gender && <p className="text-xs text-destructive mt-1">{errors.gender}</p>}
            </div>
          </div>

          <div>
            <Label>Residence / Home *</Label>
            <NativeSelect value={form.home_id} onValueChange={v => update("home_id", v)} placeholder="Select home" className={errors.home_id ? "border-destructive" : ""}>
              {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
            </NativeSelect>
            {errors.home_id && <p className="text-xs text-destructive mt-1">{errors.home_id}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Team Leader *</Label>
              <NativeSelect value={form.team_leader_id} onValueChange={v => update("team_leader_id", v)} placeholder="Select" className={errors.team_leader_id ? "border-destructive" : ""}>
                {teamLeaders.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </NativeSelect>
              {errors.team_leader_id && <p className="text-xs text-destructive mt-1">{errors.team_leader_id}</p>}
            </div>
            <div>
              <Label>Key Worker *</Label>
              <NativeSelect value={form.key_worker_id} onValueChange={v => update("key_worker_id", v)} placeholder="Select" className={errors.key_worker_id ? "border-destructive" : ""}>
                {supportWorkers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
              </NativeSelect>
              {errors.key_worker_id && <p className="text-xs text-destructive mt-1">{errors.key_worker_id}</p>}
            </div>
          </div>

          <div>
            <Label>Service Type *</Label>
            <NativeSelect value={form.service_type} onValueChange={v => update("service_type", v)} placeholder="Select service type" className={errors.service_type ? "border-destructive" : ""}>
              <SelectItem value="outreach">Outreach</SelectItem>
              <SelectItem value="eighteen_plus">18+ Accommodation</SelectItem>
              <SelectItem value="twenty_four_hours">24 Hours Housing</SelectItem>
            </NativeSelect>
            {errors.service_type && <p className="text-xs text-destructive mt-1">{errors.service_type}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Placement Type *</Label>
              <NativeSelect value={form.placement_type} onValueChange={v => update("placement_type", v)} placeholder="Select" className={errors.placement_type ? "border-destructive" : ""}>
                <SelectItem value="outreach">Outreach</SelectItem>
                <SelectItem value="twenty_four_hours">24 Hours Housing</SelectItem>
                <SelectItem value="eighteen_plus">18+ Accommodation</SelectItem>
              </NativeSelect>
              {errors.placement_type && <p className="text-xs text-destructive mt-1">{errors.placement_type}</p>}
            </div>
            <div>
              <Label>Placement Start *</Label>
              <Input type="date" value={form.placement_start} onChange={e => update("placement_start", e.target.value)} className={`mt-1.5 ${errors.placement_start ? "border-destructive" : ""}`} />
              {errors.placement_start && <p className="text-xs text-destructive mt-1">{errors.placement_start}</p>}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Placement & Ofsted Details</p>
            <div className="space-y-3">
              <div>
                <Label>Accommodation Category *</Label>
                <NativeSelect value={form.accommodation_category} onValueChange={v => update("accommodation_category", v)} placeholder="Select" className={errors.accommodation_category ? "border-destructive" : ""}>
                  <SelectItem value="self_contained">Self-contained accommodation</SelectItem>
                  <SelectItem value="shared_ring_fenced">Shared accommodation ring-fenced</SelectItem>
                  <SelectItem value="shared_non_ring_fenced">Shared accommodation non-ring-fenced</SelectItem>
                </NativeSelect>
                {errors.accommodation_category && <p className="text-xs text-destructive mt-1">{errors.accommodation_category}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Looked-after child?</Label>
                  <NativeSelect value={form.looked_after_child} onValueChange={v => update("looked_after_child", v)} placeholder="Select" className={errors.looked_after_child ? "border-destructive" : ""}>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </NativeSelect>
                  {errors.looked_after_child && <p className="text-xs text-destructive mt-1">{errors.looked_after_child}</p>}
                </div>
                <div>
                  <Label>Care leaver?</Label>
                  <NativeSelect value={form.care_leaver_status} onValueChange={v => update("care_leaver_status", v)} placeholder="Select" className={errors.care_leaver_status ? "border-destructive" : ""}>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </NativeSelect>
                  {errors.care_leaver_status && <p className="text-xs text-destructive mt-1">{errors.care_leaver_status}</p>}
                </div>
              </div>

              <div>
                <Label>Legal placement basis</Label>
                <Input value={form.legal_placement_basis} onChange={e => update("legal_placement_basis", e.target.value)} className={`mt-1.5 ${errors.legal_placement_basis ? "border-destructive" : ""}`} placeholder="e.g. Section 20, Section 31" />
              {errors.legal_placement_basis && <p className="text-xs text-destructive mt-1">{errors.legal_placement_basis}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>UASC?</Label>
                  <NativeSelect value={form.uasc} onValueChange={v => update("uasc", v)} placeholder="Select" className={errors.uasc ? "border-destructive" : ""}>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </NativeSelect>
                  {errors.uasc && <p className="text-xs text-destructive mt-1">{errors.uasc}</p>}
                </div>
                <div>
                  <Label>First Language *</Label>
                  <AutocompleteInput value={form.first_language} onChange={v => update("first_language", v)} options={WORLD_LANGUAGES} placeholder="Search language..." />
                  {errors.first_language && <p className="text-xs text-destructive mt-1">{errors.first_language}</p>}
                </div>
              </div>

              <div>
                <Label>Interpreter required?</Label>
                <NativeSelect value={form.interpreter_required} onValueChange={v => update("interpreter_required", v)} placeholder="Select" className={errors.interpreter_required ? "border-destructive" : ""}>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </NativeSelect>
                {errors.interpreter_required && <p className="text-xs text-destructive mt-1">{errors.interpreter_required}</p>}
              </div>

              <div>
                <Label>Annex A applicable?</Label>
                <div className="flex items-center gap-3 mt-1.5">
                  <NativeSelect value={autoAnnexA} onValueChange={v => { update("annex_a_applicable", v); update("annex_a_override", true); }} placeholder="Select" className="flex-1">
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </NativeSelect>
                  <span className="text-xs text-muted-foreground">
                    {!form.annex_a_override && autoAnnexA === "true" ? "(auto-calculated)" : ""}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Nationality / Country of Origin</Label>
              <Input value={form.nationality} onChange={e => update("nationality", e.target.value)} className={`mt-1.5 ${errors.nationality ? "border-destructive" : ""}`} placeholder="e.g. Eritrea" />
              {errors.nationality && <p className="text-xs text-destructive mt-1">{errors.nationality}</p>}
            </div>
            <div>
              <Label>Date of Arrival to UK</Label>
              <Input type="date" value={form.uk_arrival_date || ""} onChange={e => update("uk_arrival_date", e.target.value)} className="mt-1.5" />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Local Authority & Professionals</p>
            <div className="space-y-3">
              <div>
                <Label>Local Authority (LA)</Label>
                <Input value={form.social_worker_org} onChange={e => update("social_worker_org", e.target.value)} className={`mt-1.5 ${errors.social_worker_org ? "border-destructive" : ""}`} placeholder="e.g. Birmingham City Council" />
              {errors.social_worker_org && <p className="text-xs text-destructive mt-1">{errors.social_worker_org}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Social Worker Name</Label>
                  <Input value={form.social_worker_name} onChange={e => update("social_worker_name", e.target.value)} className={`mt-1.5 ${errors.social_worker_name ? "border-destructive" : ""}`} placeholder="Full name" />
                  {errors.social_worker_name && <p className="text-xs text-destructive mt-1">{errors.social_worker_name}</p>}
                </div>
                <div>
                  <Label>IRO Name</Label>
                  <Input value={form.iro_name} onChange={e => update("iro_name", e.target.value)} className="mt-1.5" placeholder="Full name" />
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label>Brief Description / Notes</Label>
            <textarea
              value={form.health_notes}
              onChange={e => update("health_notes", e.target.value)}
              className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-none"
              placeholder="Any important background, needs or context about this young person..."
            />
          </div>

          <div>
            <Label>Risk Level</Label>
            <NativeSelect value={form.risk_level} onValueChange={v => update("risk_level", v)}>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </NativeSelect>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? "Saving..." : "Add Resident"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}