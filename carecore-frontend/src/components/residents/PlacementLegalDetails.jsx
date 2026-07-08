import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { SelectItem } from "@/components/ui/select";
import { AlertTriangle, Pencil, X } from "lucide-react";
import { secureGateway } from "@/lib/secureGateway";

export default function PlacementLegalDetails({ resident, staffProfile, isAuthorised, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    service_type: resident?.service_type || "",
    accommodation_category: resident?.accommodation_category || "",
    looked_after_child: resident?.looked_after_child ? "true" : "false",
    care_leaver_status: resident?.care_leaver_status ? "true" : "false",
    legal_placement_basis: resident?.legal_placement_basis || "",
    placing_local_authority: resident?.placing_local_authority || "",
    placement_start: resident?.placement_start || "",
    uasc: resident?.uasc ? "true" : "false",
    english_first_language: resident?.english_first_language ? "true" : "false",
    first_language: resident?.first_language || "",
    interpreter_required: resident?.interpreter_required ? "true" : "false",
    annex_a_applicable: resident?.annex_a_applicable ? "true" : "false",
  });

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const annexAReadinesGaps = useMemo(() => {
    const gaps = [];
    if (!resident?.dob) gaps.push("Date of birth");
    if (!resident?.placing_local_authority) gaps.push("Placing Local Authority");
    if (!resident?.accommodation_category) gaps.push("Accommodation Category");
    if (!resident?.service_type) gaps.push("Service Type");
    if (resident?.looked_after_child === undefined || resident?.looked_after_child === null) gaps.push("Looked-after/care leaver status");
    if (!resident?.placement_start) gaps.push("Date started living at provision");
    if (resident?.uasc === undefined || resident?.uasc === null) gaps.push("UASC status");
    if (resident?.english_first_language === undefined || resident?.english_first_language === null) gaps.push("English first language status");
    return gaps;
  }, [resident]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updateData = {
        service_type: form.service_type,
        accommodation_category: form.accommodation_category,
        looked_after_child: form.looked_after_child === "true",
        care_leaver_status: form.care_leaver_status === "true",
        legal_placement_basis: form.legal_placement_basis,
        placing_local_authority: form.placing_local_authority,
        placement_start: form.placement_start,
        uasc: form.uasc === "true",
        english_first_language: form.english_first_language === "true",
        first_language: form.first_language,
        interpreter_required: form.interpreter_required === "true",
        annex_a_applicable: form.annex_a_applicable === "true",
      };
      await secureGateway.update("Resident", resident.id, updateData);
      setEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-4">
        {/* Annex A Readiness Gaps */}
        {annexAReadinesGaps.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-amber-900 mb-2">Annex A Readiness Gaps</h4>
                <ul className="text-xs text-amber-800 space-y-1">
                  {annexAReadinesGaps.map(gap => (
                    <li key={gap}>• {gap}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Details View */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Placement & Legal Details</h3>
            {isAuthorised && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} className="gap-1.5">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Service Type</p>
              <p className="font-medium">{resident?.service_type ? resident.service_type.replace(/_/g, " ") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Accommodation Category</p>
              <p className="font-medium">{resident?.accommodation_category ? resident.accommodation_category.replace(/_/g, " ") : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Looked-after child?</p>
              <p className="font-medium">{resident?.looked_after_child ? "Yes" : resident?.looked_after_child === false ? "No" : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Care leaver?</p>
              <p className="font-medium">{resident?.care_leaver_status ? "Yes" : resident?.care_leaver_status === false ? "No" : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Legal placement basis</p>
              <p className="font-medium">{resident?.legal_placement_basis || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Placing Local Authority</p>
              <p className="font-medium">{resident?.placing_local_authority || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Date started at provision</p>
              <p className="font-medium">{resident?.placement_start || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">UASC?</p>
              <p className="font-medium">{resident?.uasc ? "Yes" : resident?.uasc === false ? "No" : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">English first language?</p>
              <p className="font-medium">{resident?.english_first_language ? "Yes" : resident?.english_first_language === false ? "No" : "—"}</p>
            </div>
            {resident?.english_first_language === false && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">First language</p>
                <p className="font-medium">{resident?.first_language || "—"}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground text-xs mb-1">Interpreter required?</p>
              <p className="font-medium">{resident?.interpreter_required ? "Yes" : resident?.interpreter_required === false ? "No" : "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Annex A applicable?</p>
              <p className="font-medium">{resident?.annex_a_applicable ? "Yes" : resident?.annex_a_applicable === false ? "No" : "—"}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Edit Placement & Legal Details</h3>
        <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-muted">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Service Type</Label>
          <NativeSelect value={form.service_type} onValueChange={v => update("service_type", v)} className="mt-1.5">
            <SelectItem value={null}>—</SelectItem>
            <SelectItem value="outreach">Outreach</SelectItem>
            <SelectItem value="eighteen_plus">18+ Accommodation</SelectItem>
            <SelectItem value="twenty_four_hours">24 Hours Housing</SelectItem>
          </NativeSelect>
        </div>

        <div>
          <Label>Accommodation Category</Label>
          <NativeSelect value={form.accommodation_category} onValueChange={v => update("accommodation_category", v)} className="mt-1.5">
            <SelectItem value={null}>—</SelectItem>
            <SelectItem value="self_contained">Self-contained accommodation</SelectItem>
            <SelectItem value="shared_ring_fenced">Shared accommodation ring-fenced</SelectItem>
            <SelectItem value="shared_non_ring_fenced">Shared accommodation non-ring-fenced</SelectItem>
          </NativeSelect>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Looked-after child?</Label>
            <NativeSelect value={form.looked_after_child} onValueChange={v => update("looked_after_child", v)} className="mt-1.5">
              <SelectItem value={null}>—</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </NativeSelect>
          </div>
          <div>
            <Label>Care leaver?</Label>
            <NativeSelect value={form.care_leaver_status} onValueChange={v => update("care_leaver_status", v)} className="mt-1.5">
              <SelectItem value={null}>—</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </NativeSelect>
          </div>
        </div>

        <div>
          <Label>Legal placement basis</Label>
          <Input value={form.legal_placement_basis} onChange={e => update("legal_placement_basis", e.target.value)} className="mt-1.5" placeholder="e.g. Section 20" />
        </div>

        <div>
          <Label>Placing Local Authority</Label>
          <Input value={form.placing_local_authority} onChange={e => update("placing_local_authority", e.target.value)} className="mt-1.5" placeholder="e.g. Birmingham City Council" />
        </div>

        <div>
          <Label>Date started at provision</Label>
          <Input type="date" value={form.placement_start} onChange={e => update("placement_start", e.target.value)} className="mt-1.5" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>UASC?</Label>
            <NativeSelect value={form.uasc} onValueChange={v => update("uasc", v)} className="mt-1.5">
              <SelectItem value={null}>—</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </NativeSelect>
          </div>
          <div>
            <Label>English first language?</Label>
            <NativeSelect value={form.english_first_language} onValueChange={v => update("english_first_language", v)} className="mt-1.5">
              <SelectItem value={null}>—</SelectItem>
              <SelectItem value="true">Yes</SelectItem>
              <SelectItem value="false">No</SelectItem>
            </NativeSelect>
          </div>
        </div>

        {form.english_first_language === "false" && (
          <div>
            <Label>First language</Label>
            <Input value={form.first_language} onChange={e => update("first_language", e.target.value)} className="mt-1.5" placeholder="e.g. Arabic" />
          </div>
        )}

        <div>
          <Label>Interpreter required?</Label>
          <NativeSelect value={form.interpreter_required} onValueChange={v => update("interpreter_required", v)} className="mt-1.5">
            <SelectItem value={null}>—</SelectItem>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </NativeSelect>
        </div>

        <div>
          <Label>Annex A applicable?</Label>
          <NativeSelect value={form.annex_a_applicable} onValueChange={v => update("annex_a_applicable", v)} className="mt-1.5">
            <SelectItem value={null}>—</SelectItem>
            <SelectItem value="true">Yes</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </NativeSelect>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}