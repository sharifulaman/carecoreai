import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";
import { toast } from "sonner";

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default function VisitRiskAssessmentForm({ resident, home, staff, user, onClose, onSave }) {
  const { data: existingAssessment } = useQuery({
    queryKey: ["risk-assessment", resident.id],
    queryFn: () => secureGateway.filter("VisitRiskAssessment", { resident_id: resident.id, is_deleted: false }, "-assessment_date", 1),
  });

  const [form, setForm] = useState({
    address_known_to_others_of_concern: false,
    other_people_present_risk: false,
    pet_risk: false,
    environmental_hazards: false,
    neighbourhood_risk: false,
    location_risk_details: "",
    verbal_aggression_risk: false,
    physical_aggression_risk: false,
    self_harm_risk: false,
    substance_use_present: false,
    resident_risk_details: "",
    two_worker_visit_required: false,
    visit_duration_limit_minutes: null,
    specific_precautions: "",
    emergency_exit_plan: "",
    overall_risk_level: "low",
  });

  useEffect(() => {
    if (existingAssessment?.[0]) {
      const a = existingAssessment[0];
      setForm({
        address_known_to_others_of_concern: a.address_known_to_others_of_concern,
        other_people_present_risk: a.other_people_present_risk,
        pet_risk: a.pet_risk,
        environmental_hazards: a.environmental_hazards,
        neighbourhood_risk: a.neighbourhood_risk,
        location_risk_details: a.location_risk_details || "",
        verbal_aggression_risk: a.verbal_aggression_risk,
        physical_aggression_risk: a.physical_aggression_risk,
        self_harm_risk: a.self_harm_risk,
        substance_use_present: a.substance_use_present,
        resident_risk_details: a.resident_risk_details || "",
        two_worker_visit_required: a.two_worker_visit_required,
        visit_duration_limit_minutes: a.visit_duration_limit_minutes || null,
        specific_precautions: a.specific_precautions || "",
        emergency_exit_plan: a.emergency_exit_plan || "",
        overall_risk_level: a.overall_risk_level,
      });
    }
  }, [existingAssessment]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const data = {
        org_id: ORG_ID,
        resident_id: resident.id,
        resident_name: resident.display_name,
        home_id: home.id,
        assessed_by_id: user.id,
        assessed_by_name: user.full_name,
        assessment_date: new Date().toISOString().split("T")[0],
        review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        ...form,
      };

      if (existingAssessment?.[0]) {
        await secureGateway.update("VisitRiskAssessment", existingAssessment[0].id, data);
      } else {
        await secureGateway.create("VisitRiskAssessment", data);
      }
    },
    onSuccess: () => {
      toast.success("Risk assessment saved");
      onSave();
    },
    onError: () => toast.error("Error saving assessment"),
  });

  const riskCount = [
    form.address_known_to_others_of_concern,
    form.other_people_present_risk,
    form.pet_risk,
    form.environmental_hazards,
    form.neighbourhood_risk,
    form.verbal_aggression_risk,
    form.physical_aggression_risk,
    form.self_harm_risk,
    form.substance_use_present,
  ].filter(Boolean).length;

  const autoRiskLevel = riskCount >= 4 ? "high" : riskCount >= 2 ? "medium" : "low";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Visit Risk Assessment — {resident.display_name}</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Location Risks */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Visit Location Risks</h3>
            <div className="space-y-2">
              <CheckboxField label="Address known to people of concern" checked={form.address_known_to_others_of_concern} onChange={v => setForm(p => ({ ...p, address_known_to_others_of_concern: v }))} />
              <CheckboxField label="Risk from other people present at address" checked={form.other_people_present_risk} onChange={v => setForm(p => ({ ...p, other_people_present_risk: v }))} />
              <CheckboxField label="Pet risk" checked={form.pet_risk} onChange={v => setForm(p => ({ ...p, pet_risk: v }))} />
              <CheckboxField label="Environmental hazards (fire, structural, utilities)" checked={form.environmental_hazards} onChange={v => setForm(p => ({ ...p, environmental_hazards: v }))} />
              <CheckboxField label="Neighbourhood risk (gangs, drug dealing, etc.)" checked={form.neighbourhood_risk} onChange={v => setForm(p => ({ ...p, neighbourhood_risk: v }))} />
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium">Details</label>
              <Textarea value={form.location_risk_details} onChange={e => setForm(p => ({ ...p, location_risk_details: e.target.value }))} rows={2} placeholder="Describe location risks..." />
            </div>
          </div>

          {/* Resident Risks */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Resident Risks During Visits</h3>
            <div className="space-y-2">
              <CheckboxField label="Verbal aggression risk" checked={form.verbal_aggression_risk} onChange={v => setForm(p => ({ ...p, verbal_aggression_risk: v }))} />
              <CheckboxField label="Physical aggression risk" checked={form.physical_aggression_risk} onChange={v => setForm(p => ({ ...p, physical_aggression_risk: v }))} />
              <CheckboxField label="Self-harm risk" checked={form.self_harm_risk} onChange={v => setForm(p => ({ ...p, self_harm_risk: v }))} />
              <CheckboxField label="Substance use present (alcohol/drugs)" checked={form.substance_use_present} onChange={v => setForm(p => ({ ...p, substance_use_present: v }))} />
            </div>
            <div className="mt-3">
              <label className="text-xs font-medium">Details</label>
              <Textarea value={form.resident_risk_details} onChange={e => setForm(p => ({ ...p, resident_risk_details: e.target.value }))} rows={2} placeholder="Describe resident risks..." />
            </div>
          </div>

          {/* Precautions */}
          <div className="border border-border rounded-lg p-4">
            <h3 className="font-semibold text-sm mb-3">Safety Precautions</h3>
            <div className="space-y-3">
              <CheckboxField label="Two-worker visit required" checked={form.two_worker_visit_required} onChange={v => setForm(p => ({ ...p, two_worker_visit_required: v }))} />
              <div>
                <label className="text-xs font-medium">Visit duration limit (minutes)</label>
                <Input type="number" value={form.visit_duration_limit_minutes || ""} onChange={e => setForm(p => ({ ...p, visit_duration_limit_minutes: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Leave blank for no limit" />
              </div>
              <div>
                <label className="text-xs font-medium">Specific precautions</label>
                <Textarea value={form.specific_precautions} onChange={e => setForm(p => ({ ...p, specific_precautions: e.target.value }))} rows={2} placeholder="e.g. Do not accept refreshments, keep door unlocked..." />
              </div>
              <div>
                <label className="text-xs font-medium">Emergency exit plan</label>
                <Textarea value={form.emergency_exit_plan} onChange={e => setForm(p => ({ ...p, emergency_exit_plan: e.target.value }))} rows={2} placeholder="Plan if evacuation needed..." />
              </div>
            </div>
          </div>

          {/* Overall Risk Level */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-900">Overall Risk Level</p>
                <p className="text-xs text-blue-800 mt-1">Detected: <span className="font-bold">{autoRiskLevel}</span> ({riskCount} risk factors)</p>
              </div>
              <Select value={form.overall_risk_level} onValueChange={v => setForm(p => ({ ...p, overall_risk_level: v }))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="border-t border-border px-6 py-4 flex justify-end gap-2 bg-muted/30">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-1">
            <Save className="w-4 h-4" /> Save Assessment
          </Button>
        </div>
      </div>
    </div>
  );
}