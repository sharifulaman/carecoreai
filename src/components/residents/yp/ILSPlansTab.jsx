import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";

const todayStr = new Date().toISOString().split("T")[0];

const PRESET_SKILLS = ["cooking", "budgeting", "hygiene", "transport", "health", "relationships", "employment", "education"];
const SKILL_LABELS = {
  cooking: "Cooking", budgeting: "Budgeting", hygiene: "Hygiene", transport: "Transport",
  health: "Health", relationships: "Relationships", employment: "Employment", education: "Education",
};
const LEVEL_LABELS = {
  no_awareness: "No awareness", developing: "Developing", needs_support: "Needs support",
  independent_with_prompts: "Independent with prompts", fully_independent: "Fully independent",
};

function addDays(dateStr, n) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function daysAgoLabel(dateStr) {
  if (!dateStr) return "—";
  const d = Math.round((new Date(todayStr) - new Date(dateStr)) / 86400000);
  if (d === 0) return "Today"; if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

function MiniProgressBar({ label, value, maxWidth }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  return (
    <div className="flex flex-col items-center gap-1" style={{ width: maxWidth || 48 }}>
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-green-600" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-muted-foreground text-center" style={{ fontSize: "9px" }}>{label}</p>
    </div>
  );
}

function SkillAccordion({ skill, section, onChange, onRemove, isCustom }) {
  const [open, setOpen] = useState(false);
  const label = isCustom ? (section.custom_skill_name || "Custom skill") : (SKILL_LABELS[skill] || skill);
  const level = section.current_level;
  const pct = section.progress_percentage || 0;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/10 hover:bg-muted/20 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
        type="button"
      >
        <span className="font-medium text-sm flex-1">{label}</span>
        {level && <span className="text-xs text-muted-foreground capitalize">{LEVEL_LABELS[level] || level}</span>}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
          {isCustom && <button type="button" onClick={e => { e.stopPropagation(); onRemove?.(); }} className="text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3">
          {isCustom && (
            <div className="space-y-1">
              <Label className="text-xs">Custom skill name *</Label>
              <Input value={section.custom_skill_name || ""} onChange={e => onChange("custom_skill_name", e.target.value)} className="h-8 text-sm" placeholder="e.g. Pet care" />
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-xs">Current level</Label>
            <Select value={section.current_level || ""} onValueChange={v => onChange("current_level", v)}>
              <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                {Object.entries(LEVEL_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Progress toward goal (%) <span className="text-muted-foreground">{pct}%</span></Label>
            <input type="range" min={0} max={100} value={pct} onChange={e => onChange("progress_percentage", parseInt(e.target.value))} className="w-full accent-green-600" />
          </div>
          {[
            { key: "current_ability", label: "Current ability", prompt: "Where are they now in this skill area?" },
            { key: "goal", label: "Goal", prompt: "What are they working toward?" },
            { key: "support_needed", label: "Support needed", prompt: "What do staff need to do?" },
            { key: "actions", label: "Actions", prompt: "Specific agreed steps" },
          ].map(({ key, label: l, prompt }) => (
            <div key={key} className="space-y-1">
              <Label className="text-xs">{l}</Label>
              <Textarea value={section[key] || ""} onChange={e => onChange(key, e.target.value)} placeholder={prompt} className="text-sm min-h-[60px]" />
            </div>
          ))}
          <div className="space-y-1">
            <Label className="text-xs">Target date</Label>
            <Input type="date" value={section.target_date || ""} onChange={e => onChange("target_date", e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Textarea value={section.notes || ""} onChange={e => onChange("notes", e.target.value)} className="text-sm min-h-[48px]" />
          </div>
        </div>
      )}
    </div>
  );
}

function ILSPlanForm({ resident, home, plan, existingSections, isAdminOrTL, onClose, myStaffProfile }) {
  const qc = useQueryClient();
  const isNew = !plan;
  const [effective_date, setEffectiveDate] = useState(plan?.effective_date || todayStr);
  const [review_due_date, setReviewDueDate] = useState(plan?.review_due_date || addDays(todayStr, 90));
  const [overall_notes, setOverallNotes] = useState(plan?.overall_notes || "");

  const [sections, setSections] = useState(() => {
    const existing = {};
    (existingSections || []).forEach(s => { existing[s.skill_area === "custom" ? `custom_${s.id}` : s.skill_area] = { ...s }; });
    const result = {};
    PRESET_SKILLS.forEach(s => { result[s] = existing[s] || { skill_area: s, progress_percentage: 0 }; });
    // Custom sections
    (existingSections || []).filter(s => s.skill_area === "custom").forEach(s => {
      result[`custom_${s.id}`] = { ...s };
    });
    return result;
  });

  const [customKeys, setCustomKeys] = useState(
    (existingSections || []).filter(s => s.skill_area === "custom").map(s => `custom_${s.id}`)
  );

  const addCustom = () => {
    const key = `custom_new_${Date.now()}`;
    setSections(prev => ({ ...prev, [key]: { skill_area: "custom", custom_skill_name: "", progress_percentage: 0 } }));
    setCustomKeys(prev => [...prev, key]);
  };

  const removeCustom = (key) => {
    setSections(prev => { const n = { ...prev }; delete n[key]; return n; });
    setCustomKeys(prev => prev.filter(k => k !== key));
  };

  const updateSection = (key, field, value) => {
    setSections(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const avgProgress = () => {
    const vals = Object.values(sections).map(s => s.progress_percentage || 0);
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (status) => {
      let planId = plan?.id;
      const planData = { org_id: ORG_ID, resident_id: resident.id, home_id: home?.id, created_by: myStaffProfile?.id, effective_date, review_due_date, overall_notes, status };
      if (isNew) {
        const created = await base44.entities.ILSPlan.create({ ...planData, version: 1 });
        planId = created.id;
      } else {
        await base44.entities.ILSPlan.update(plan.id, { ...planData, status });
      }
      // Save/update sections
      await Promise.all(Object.entries(sections).map(async ([key, sec]) => {
        const sdata = { ...sec, org_id: ORG_ID, ils_plan_id: planId, resident_id: resident.id, last_updated_by: myStaffProfile?.id };
        if (sec.id) {
          return base44.entities.ILSPlanSection.update(sec.id, sdata);
        } else if (sec.goal || sec.current_ability || sec.actions || (sec.progress_percentage > 0)) {
          return base44.entities.ILSPlanSection.create(sdata);
        }
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ils-plans"] });
      qc.invalidateQueries({ queryKey: ["ils-sections"] });
      toast.success("ILS plan saved");
      onClose();
    },
  });

  return (
    <div className="h-full flex flex-col">
      <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
        <div>
          <p className="font-semibold text-base">{resident.display_name} — ILS Plan</p>
          <p className="text-xs text-muted-foreground">{home?.name} · {isNew ? "New plan" : `Version ${plan.version}`}</p>
        </div>
        <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      {/* Mini progress overview */}
      <div className="px-6 py-3 border-b border-border bg-muted/10">
        <p className="text-xs text-muted-foreground mb-2">Progress overview — overall {avgProgress()}%</p>
        <div className="flex gap-3 flex-wrap">
          {PRESET_SKILLS.map(s => (
            <MiniProgressBar key={s} label={SKILL_LABELS[s]} value={sections[s]?.progress_percentage} maxWidth={52} />
          ))}
          {customKeys.map(k => (
            <MiniProgressBar key={k} label={(sections[k]?.custom_skill_name || "Custom").slice(0, 8)} value={sections[k]?.progress_percentage} maxWidth={52} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Effective date</Label>
            <Input type="date" value={effective_date} onChange={e => { setEffectiveDate(e.target.value); setReviewDueDate(addDays(e.target.value, 90)); }} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Review due date</Label>
            <Input type="date" value={review_due_date} onChange={e => setReviewDueDate(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Overall notes (optional)</Label>
          <Textarea value={overall_notes} onChange={e => setOverallNotes(e.target.value)} className="text-sm min-h-[60px]" placeholder="General notes about this ILS plan..." />
        </div>

        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Skill areas</h3>
        <div className="space-y-2">
          {PRESET_SKILLS.map(s => (
            <SkillAccordion
              key={s}
              skill={s}
              section={sections[s] || { skill_area: s, progress_percentage: 0 }}
              onChange={(field, val) => updateSection(s, field, val)}
              isCustom={false}
            />
          ))}
          {customKeys.map(k => (
            <SkillAccordion
              key={k}
              skill={k}
              section={sections[k] || { skill_area: "custom", progress_percentage: 0 }}
              onChange={(field, val) => updateSection(k, field, val)}
              onRemove={() => removeCustom(k)}
              isCustom={true}
            />
          ))}
        </div>
        <button type="button" onClick={addCustom} className="flex items-center gap-2 text-xs text-primary hover:underline mt-2">
          <Plus className="w-3.5 h-3.5" /> Add custom skill area
        </button>
      </div>

      <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex gap-2 justify-end">
        <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
        <Button variant="outline" size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate("draft")}>Save as Draft</Button>
        {isAdminOrTL && (
          <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate("active")}>Activate Plan</Button>
        )}
      </div>
    </div>
  );
}

export default function ILSPlansTab({ residents, homes, staff, isAdminOrTL, myStaffProfile, defaultResidentId }) {
  const homeMap = useMemo(() => Object.fromEntries(homes.map(h => [h.id, h])), [homes]);
  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const [filterHomeId, setFilterHomeId] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState(defaultResidentId || null);
  const [panelOpen, setPanelOpen] = useState(!!defaultResidentId);

  const { data: allPlans = [] } = useQuery({
    queryKey: ["ils-plans"],
    queryFn: () => base44.entities.ILSPlan.filter({ org_id: ORG_ID }),
  });

  const { data: allSections = [] } = useQuery({
    queryKey: ["ils-sections-all"],
    queryFn: () => base44.entities.ILSPlanSection.filter({ org_id: ORG_ID }),
  });

  const activePlanByResident = useMemo(() => {
    const m = {};
    allPlans.forEach(p => { if (p.status === "active" || !m[p.resident_id]) m[p.resident_id] = p; });
    return m;
  }, [allPlans]);

  const avgProgressByResident = useMemo(() => {
    const m = {};
    residents.forEach(r => {
      const plan = activePlanByResident[r.id];
      if (!plan) { m[r.id] = null; return; }
      const secs = allSections.filter(s => s.ils_plan_id === plan.id);
      m[r.id] = secs.length ? Math.round(secs.reduce((a, s) => a + (s.progress_percentage || 0), 0) / secs.length) : 0;
    });
    return m;
  }, [residents, activePlanByResident, allSections]);

  const filtered = residents.filter(r => {
    if (filterHomeId !== "all" && r.home_id !== filterHomeId) return false;
    if (search && !r.display_name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedResident = residents.find(r => r.id === selectedResidentId);
  const selectedPlan = selectedResidentId ? activePlanByResident[selectedResidentId] : null;
  const selectedSections = selectedPlan ? allSections.filter(s => s.ils_plan_id === selectedPlan.id) : [];

  return (
    <div className="flex gap-4 mt-3">
      <div className={`flex-1 min-w-0 ${panelOpen ? "hidden lg:block" : ""}`}>
        <div className="flex flex-wrap gap-2 mb-3">
          <Input placeholder="Search resident…" value={search} onChange={e => setSearch(e.target.value)} className="h-8 text-sm w-48" />
          <Select value={filterHomeId} onValueChange={setFilterHomeId}>
            <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="All homes" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All homes</SelectItem>{homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-border bg-muted/10">
                {["Resident", "Home", "Plan status", "Overall progress", "Last updated", "Review due", "Action"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">No residents found.</td></tr>
              ) : filtered.map((r, i) => {
                const plan = activePlanByResident[r.id];
                const progress = avgProgressByResident[r.id];
                const isOverdue = plan?.status === "active" && plan?.review_due_date < todayStr;
                const statusLabel = !plan ? "No plan" : isOverdue ? "Overdue" : plan.status;
                const statusColor = !plan ? "text-muted-foreground bg-muted/30" : isOverdue ? "text-red-600 bg-red-50" : plan.status === "active" ? "text-green-700 bg-green-50" : "text-amber-700 bg-amber-50";
                return (
                  <tr key={r.id} className={`border-b border-border/50 last:border-0 ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">{r.initials || r.display_name?.charAt(0)}</div>
                        <span className="text-sm font-medium">{r.display_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{homeMap[r.home_id]?.name || "—"}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColor}`}>{statusLabel}</span></td>
                    <td className="px-4 py-3">
                      {progress !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-green-600" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{progress}%</span>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{plan ? daysAgoLabel(plan.updated_date || plan.created_date) : "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {plan?.review_due_date ? (
                        <span className={plan.review_due_date < todayStr ? "text-red-600 font-medium" : "text-muted-foreground"}>
                          {new Date(plan.review_due_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => { setSelectedResidentId(r.id); setPanelOpen(true); }} className="text-xs text-primary hover:underline font-medium">
                        {!plan ? "Create" : "View"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {panelOpen && selectedResident && (
        <div className="w-full lg:w-[560px] shrink-0 bg-card rounded-xl border border-border overflow-hidden flex flex-col" style={{ maxHeight: "80vh" }}>
          <ILSPlanForm
            resident={selectedResident}
            home={homeMap[selectedResident.home_id]}
            plan={selectedPlan}
            existingSections={selectedSections}
            isAdminOrTL={isAdminOrTL}
            myStaffProfile={myStaffProfile}
            onClose={() => { setPanelOpen(false); setSelectedResidentId(null); }}
          />
        </div>
      )}
    </div>
  );
}