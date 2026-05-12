import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, ChevronRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const STANDARDS = [
  { num: 1, name: "The care standard" },
  { num: 2, name: "Children's rights standard" },
  { num: 3, name: "The education standard" },
  { num: 4, name: "Enjoyment and achievement standard" },
  { num: 5, name: "Health and wellbeing standard" },
  { num: 6, name: "Positive relationships standard" },
  { num: 7, name: "Protection of children standard" },
  { num: 8, name: "Leadership and management standard" },
  { num: 9, name: "Care planning standard" },
];

const STEPS = [
  "Visit Details",
  "Previous Recommendations",
  "Quality Standards",
  "Key Findings",
  "New Recommendations",
  "Sign Off",
];

export default function Reg44Form({ home, staff, user, lastReport, onClose, onSave }) {
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().split("T")[0],
    inspector_name: "",
    inspector_organisation: "",
    inspector_contact: "",
    visit_duration_hours: "",
    residents_spoken_to: "",
    staff_spoken_to: "",
    records_reviewed: [],
    newRecord: "",
    quality_standards: STANDARDS.map(s => ({
      standard_number: s.num,
      standard_name: s.name,
      rating: "good",
      evidence: "",
      concerns: "",
      recommendations: "",
    })),
    overall_rating: "good",
    strengths: "",
    areas_for_improvement: "",
    serious_concerns: false,
    serious_concern_detail: "",
    previous_recommendations_actioned: lastReport?.new_recommendations?.map(r => ({
      recommendation: r.recommendation,
      status: "not_actioned",
      notes: "",
    })) || [],
    new_recommendations: [],
    newRec: { recommendation: "", priority: "medium", target_date: "", responsible_person: "" },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const visitMonth = new Date(form.visit_date).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      await secureGateway.create("Reg44Report", {
        org_id: ORG_ID,
        home_id: home.id,
        home_name: home.name,
        visit_date: form.visit_date,
        visit_month: visitMonth,
        inspector_name: form.inspector_name,
        inspector_organisation: form.inspector_organisation,
        inspector_contact: form.inspector_contact,
        visit_duration_hours: form.visit_duration_hours,
        residents_spoken_to: form.residents_spoken_to,
        staff_spoken_to: form.staff_spoken_to,
        records_reviewed: form.records_reviewed,
        quality_standards: form.quality_standards,
        overall_rating: form.overall_rating,
        strengths: form.strengths,
        areas_for_improvement: form.areas_for_improvement,
        serious_concerns: form.serious_concerns,
        serious_concern_detail: form.serious_concern_detail,
        previous_recommendations_reviewed: true,
        previous_recommendations_actioned: form.previous_recommendations_actioned,
        new_recommendations: form.new_recommendations,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });

      // Notify admin
      await secureGateway.create("Notification", {
        org_id: ORG_ID,
        type: "reg44_submitted",
        priority: "high",
        title: `Regulation 44 report for ${home.name} — ${visitMonth}`,
        message: "Please review and respond to the independent monitoring visit report.",
        recipient_role: "admin",
        is_read: false,
      });
    },
    onSuccess: () => {
      toast.success("Report submitted to manager for response");
      onSave();
      onClose();
    },
    onError: () => toast.error("Error submitting report"),
  });

  const handleNext = () => {
    if (step === 1 && (!form.visit_date || !form.inspector_name)) {
      toast.error("Visit date and inspector name required");
      return;
    }
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const handleAddRecord = () => {
    if (!form.newRecord.trim()) return;
    setForm(p => ({
      ...p,
      records_reviewed: [...p.records_reviewed, p.newRecord],
      newRecord: "",
    }));
  };

  const handleAddRec = () => {
    if (!form.newRec.recommendation.trim()) return;
    setForm(p => ({
      ...p,
      new_recommendations: [...p.new_recommendations, { id: Math.random().toString(), ...p.newRec }],
      newRec: { recommendation: "", priority: "medium", target_date: "", responsible_person: "" },
    }));
  };

  const handleSubmit = () => {
    if (!form.overall_rating) {
      toast.error("Overall rating required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <h2 className="text-lg font-bold">Regulation 44 Report</h2>
          <button onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 px-6 py-3 bg-muted/30 border-b border-border overflow-x-auto scrollbar-none">
          {STEPS.map((s, idx) => (
            <div key={idx} className="flex items-center shrink-0">
              <button
                onClick={() => setStep(idx + 1)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step > idx + 1 ? "bg-green-600 text-white" : step === idx + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
              >
                {step > idx + 1 ? "✓" : idx + 1}
              </button>
              {idx < STEPS.length - 1 && <div className={`w-3 h-0.5 mx-0.5 ${step > idx + 1 ? "bg-green-600" : "bg-muted"}`} />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4 min-h-[300px]">
          {step === 1 && (
            <>
              <div>
                <label className="text-sm font-medium">Visit Date *</label>
                <Input type="date" value={form.visit_date} onChange={e => setForm(p => ({ ...p, visit_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">Inspector Name *</label>
                <Input value={form.inspector_name} onChange={e => setForm(p => ({ ...p, inspector_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Organisation</label>
                  <Input value={form.inspector_organisation} onChange={e => setForm(p => ({ ...p, inspector_organisation: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Contact</label>
                  <Input value={form.inspector_contact} onChange={e => setForm(p => ({ ...p, inspector_contact: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Visit Duration (hours)</label>
                  <Input type="number" value={form.visit_duration_hours} onChange={e => setForm(p => ({ ...p, visit_duration_hours: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Residents Spoken To</label>
                  <Input type="number" value={form.residents_spoken_to} onChange={e => setForm(p => ({ ...p, residents_spoken_to: e.target.value }))} />
                </div>
                <div>
                  <label className="text-sm font-medium">Staff Spoken To</label>
                  <Input type="number" value={form.staff_spoken_to} onChange={e => setForm(p => ({ ...p, staff_spoken_to: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Records Reviewed</label>
                <div className="flex gap-2 mb-2">
                  <Input value={form.newRecord} onChange={e => setForm(p => ({ ...p, newRecord: e.target.value }))} placeholder="e.g. Care files, complaints log..." />
                  <Button onClick={handleAddRecord} size="sm" variant="outline"><Plus className="w-3 h-3" /></Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {form.records_reviewed.map((r, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted flex items-center gap-1">
                      {r}
                      <button onClick={() => setForm(p => ({ ...p, records_reviewed: p.records_reviewed.filter((_, idx) => idx !== i) }))}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-xs text-muted-foreground mb-2">Update status of previous recommendations</p>
              <div className="space-y-2">
                {form.previous_recommendations_actioned.map((rec, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <p className="font-medium text-sm">{rec.recommendation}</p>
                    <select
                      value={rec.status}
                      onChange={e => {
                        const updated = [...form.previous_recommendations_actioned];
                        updated[i].status = e.target.value;
                        setForm(p => ({ ...p, previous_recommendations_actioned: updated }));
                      }}
                      className="w-full px-2 py-1 border border-border rounded text-xs bg-card"
                    >
                      <option value="actioned">✓ Actioned</option>
                      <option value="in_progress">⏳ In Progress</option>
                      <option value="not_actioned">✗ Not Actioned</option>
                    </select>
                    <Input value={rec.notes} onChange={e => {
                      const updated = [...form.previous_recommendations_actioned];
                      updated[i].notes = e.target.value;
                      setForm(p => ({ ...p, previous_recommendations_actioned: updated }));
                    }} placeholder="Notes..." className="text-xs h-8" />
                  </div>
                ))}
                {form.previous_recommendations_actioned.length === 0 && <p className="text-xs text-muted-foreground">No previous recommendations to review.</p>}
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {form.quality_standards.map((std, i) => (
                <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                  <p className="font-medium text-sm">Standard {std.standard_number}: {std.standard_name}</p>
                  <div className="flex gap-2">
                    {["outstanding", "good", "requires_improvement", "inadequate"].map(r => (
                      <button
                        key={r}
                        onClick={() => {
                          const updated = [...form.quality_standards];
                          updated[i].rating = r;
                          setForm(p => ({ ...p, quality_standards: updated }));
                        }}
                        className={`px-2 py-1 rounded text-xs font-medium transition-colors ${form.quality_standards[i].rating === r ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                      >
                        {r.split("_").join(" ")}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={std.evidence}
                    onChange={e => {
                      const updated = [...form.quality_standards];
                      updated[i].evidence = e.target.value;
                      setForm(p => ({ ...p, quality_standards: updated }));
                    }}
                    placeholder="Evidence observed..."
                    className="w-full px-2 py-1 border border-border rounded text-xs h-16 bg-card"
                  />
                  <textarea
                    value={std.concerns}
                    onChange={e => {
                      const updated = [...form.quality_standards];
                      updated[i].concerns = e.target.value;
                      setForm(p => ({ ...p, quality_standards: updated }));
                    }}
                    placeholder="Any concerns..."
                    className="w-full px-2 py-1 border border-border rounded text-xs h-12 bg-card"
                  />
                  <textarea
                    value={std.recommendations}
                    onChange={e => {
                      const updated = [...form.quality_standards];
                      updated[i].recommendations = e.target.value;
                      setForm(p => ({ ...p, quality_standards: updated }));
                    }}
                    placeholder="Recommendations..."
                    className="w-full px-2 py-1 border border-border rounded text-xs h-12 bg-card"
                  />
                </div>
              ))}
            </div>
          )}

          {step === 4 && (
            <>
              <div>
                <label className="text-sm font-medium">Overall Rating *</label>
                <div className="flex gap-2">
                  {["outstanding", "good", "requires_improvement", "inadequate"].map(r => (
                    <button
                      key={r}
                      onClick={() => setForm(p => ({ ...p, overall_rating: r }))}
                      className={`px-3 py-2 rounded text-xs font-medium transition-colors ${form.overall_rating === r ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
                    >
                      {r.split("_").join(" ")}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Key Strengths</label>
                <Textarea value={form.strengths} onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))} rows={3} placeholder="What went well..." />
              </div>
              <div>
                <label className="text-sm font-medium">Areas for Improvement</label>
                <Textarea value={form.areas_for_improvement} onChange={e => setForm(p => ({ ...p, areas_for_improvement: e.target.value }))} rows={3} placeholder="Areas needing attention..." />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.serious_concerns} onChange={e => setForm(p => ({ ...p, serious_concerns: e.target.checked }))} />
                Any serious concerns?
              </label>
              {form.serious_concerns && (
                <Textarea value={form.serious_concern_detail} onChange={e => setForm(p => ({ ...p, serious_concern_detail: e.target.value }))} rows={2} placeholder="Detail of serious concerns..." />
              )}
            </>
          )}

          {step === 5 && (
            <>
              <div className="space-y-2">
                {form.new_recommendations.map((rec, i) => (
                  <div key={rec.id} className="flex items-start gap-2 p-2 bg-muted/30 rounded">
                    <div className="flex-1">
                      <p className="text-xs font-medium">{rec.recommendation}</p>
                      <p className="text-xs text-muted-foreground">{rec.priority} · Due {rec.target_date} · {rec.responsible_person}</p>
                    </div>
                    <button onClick={() => setForm(p => ({ ...p, new_recommendations: p.new_recommendations.filter((_, idx) => idx !== i) }))} className="text-red-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <div className="border border-border rounded-lg p-3 space-y-2 bg-muted/10">
                <textarea
                  value={form.newRec.recommendation}
                  onChange={e => setForm(p => ({ ...p, newRec: { ...p.newRec, recommendation: e.target.value } }))}
                  placeholder="Recommendation..."
                  className="w-full px-2 py-1 border border-border rounded text-xs h-12 bg-card"
                />
                <div className="grid grid-cols-3 gap-2">
                  <select value={form.newRec.priority} onChange={e => setForm(p => ({ ...p, newRec: { ...p.newRec, priority: e.target.value } }))} className="px-2 py-1 border border-border rounded text-xs bg-card">
                    <option value="immediate">Immediate</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                  </select>
                  <Input type="date" value={form.newRec.target_date} onChange={e => setForm(p => ({ ...p, newRec: { ...p.newRec, target_date: e.target.value } }))} className="text-xs h-8" />
                  <Input value={form.newRec.responsible_person} onChange={e => setForm(p => ({ ...p, newRec: { ...p.newRec, responsible_person: e.target.value } }))} placeholder="Responsible" className="text-xs h-8" />
                </div>
                <Button size="sm" onClick={handleAddRec} className="w-full gap-1"><Plus className="w-3 h-3" /> Add</Button>
              </div>
            </>
          )}

          {step === 6 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">Ready to submit report to registered manager for response?</p>
              <p className="text-xs text-muted-foreground mb-6">The manager will be notified and asked to respond to the findings and recommendations.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {step < STEPS.length ? (
            <Button onClick={handleNext} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}