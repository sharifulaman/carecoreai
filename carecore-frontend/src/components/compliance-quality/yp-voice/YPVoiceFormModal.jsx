import { useState, useMemo, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { X, Save, Send, ChevronRight, ChevronLeft, AlertTriangle, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const RESPONSE_OPTIONS = ["Yes", "No", "Sometimes", "Not Sure", "Prefer not to say"];

const VOICE_FEEDBACK_QUESTIONS = [
  "Do you feel safe and comfortable in your home and neighbourhood?",
  "Do you feel listened to and respected by your support worker?",
  "Do you feel confident that the adults supporting you understand you, have the right skills, and work well together to meet your needs?",
  "Do you have your own space that you feel proud of and live in comfortable, well-maintained, and stable accommodation?",
  "Do you receive high-quality support from your worker who advocates for you and helps maintain your health and wellbeing?",
  "Do you have a strong, trusting, and meaningful support system with the adults around you, and can you rely on them for support?",
  "Do you feel supported to learn and develop the skills you need for independent living?",
  "Do you feel positive about your future and the opportunities available to you because of the support you have received?",
];

const MEETING_TOPICS = [
  "Health & Safety", "House Rules", "Cleaning & Maintenance", "Education / Employment",
  "Wellbeing", "Safeguarding", "Independent Living Skills", "Other",
];

const QUESTIONNAIRE_SECTIONS = [
  { title: "About You", questions: ["How would you describe how things are going for you right now, in general?"] },
  { title: "Feeling Safe and Supported", questions: [
    "Do you feel safe in the place where you live?",
    "Can you tell us more about why or why not?",
    "Who do you feel you can talk to when something is bothering you?",
    "Is there anything that would make you feel safer or more comfortable where you live?",
  ]},
  { title: "Daily Life and Wellbeing", questions: [
    "What do you enjoy most about your day-to-day life?",
    "What things are hard or stressful now?",
    "Is there something you wish was different about your school, college, or training?",
  ]},
  { title: "Relationships and Support", questions: [
    "Who makes you feel supported, heard, or cared about?",
    "Are there times you feel left out or not listened to?",
    "Can you share what happened?",
  ]},
  { title: "Your Voice Matters", questions: [
    "If there's one thing the organisation could do better for you, what would it be?",
    "What helps you feel included in decisions about your care and your life?",
    "Have you had any experiences with us, good or bad, that you'd like to tell us about?",
  ]},
  { title: "Final Thoughts", questions: ["Is there anything else you'd like to share with us?"] },
];


// ── Searchable staff combobox ─────────────────────────────────────────────────
function StaffCombobox({ staff = [], value, onChange, placeholder = "Search staff..." }) {
  const [query, setQuery]     = useState(value || "");
  const [open, setOpen]       = useState(false);
  const containerRef          = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return staff.slice(0, 20);
    const q = query.toLowerCase();
    return staff.filter(s => (s.full_name || s.display_name || "").toLowerCase().includes(q)).slice(0, 15);
  }, [staff, query]);

  const select = (name) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        className="w-full h-9 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder={placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((s, i) => {
            const name = s.full_name || s.display_name || "";
            const role = s.role_title || s.role || "";
            return (
              <button
                key={s.id || i}
                type="button"
                onMouseDown={() => select(name)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">{name}</p>
                  {role && <p className="text-[10px] text-muted-foreground capitalize">{role.replace(/_/g, " ")}</p>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

// ── Multi-select resident combobox ────────────────────────────────────────────
function ResidentMultiSelect({ residents = [], value = [], onChange, placeholder = "Search young people..." }) {
  const [query, setQuery] = useState("");
  const [open, setOpen]   = useState(false);
  const containerRef      = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = Array.isArray(value) ? value : (value ? [value] : []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return residents
      .filter(r => {
        const name = r.display_name || r.full_name || "";
        return name.toLowerCase().includes(q) && !selected.includes(name);
      })
      .slice(0, 15);
  }, [residents, query, selected]);

  const add = (name) => {
    onChange([...selected, name]);
    setQuery("");
  };

  const remove = (name) => onChange(selected.filter(n => n !== name));

  return (
    <div ref={containerRef} className="relative">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-1.5">
          {selected.map(name => (
            <span key={name} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-medium px-2 py-0.5 rounded-full">
              {name}
              <button type="button" onMouseDown={() => remove(name)} className="text-primary/60 hover:text-primary leading-none">&times;</button>
            </span>
          ))}
        </div>
      )}
      {/* Search input */}
      <input
        type="text"
        className="w-full h-9 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        placeholder={selected.length ? "Add more..." : placeholder}
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((r, i) => {
            const name = r.display_name || r.full_name || "";
            return (
              <button
                key={r.id || i}
                type="button"
                onMouseDown={() => add(name)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors flex items-center gap-2.5"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {name.charAt(0).toUpperCase()}
                </div>
                <p className="text-xs font-medium text-foreground">{name}</p>
              </button>
            );
          })}
        </div>
      )}
      {open && filtered.length === 0 && query && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-xl px-3 py-2">
          <p className="text-xs text-muted-foreground italic">No matching young people found</p>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

export default function YPVoiceFormModal({ templates, defaultCategory, residents, homes, staffProfile, staff = [], editRecord, onClose, onSaved }) {
  const [step, setStep] = useState(editRecord ? 2 : 1);
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory || "voice_feedback");
  const [selectedResidentId, setSelectedResidentId] = useState(editRecord?.resident_id || "");
  const [selectedHomeId, setSelectedHomeId] = useState(editRecord?.home_id || "");
  const [responses, setResponses] = useState(editRecord?.response_json || { date: format(new Date(), "yyyy-MM-dd") });
  const [concernFlagged, setConcernFlagged] = useState(editRecord?.concern_flagged || false);
  const [actionRequired, setActionRequired] = useState(editRecord?.action_required || false);
  const [meetingTopics, setMeetingTopics] = useState(editRecord?.response_json?.topics_discussed || []);
  const [meetingActions, setMeetingActions] = useState(editRecord?.response_json?.agreed_actions || [{ action: "", responsible: "", target_date: "", status: "pending" }]);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeTemplate = useMemo(() =>
    templates.find(t => t.category === selectedCategory && t.status === "active"),
    [templates, selectedCategory]
  );

  const selectedResident = residents.find(r => r.id === selectedResidentId);
  const selectedHome     = homes.find(h => h.id === selectedHomeId);

  const setResponse = (key, val) => setResponses(prev => ({ ...prev, [key]: val }));

  const buildPayload = (status) => {
    const topicsData = selectedCategory === "meeting_record"
      ? { ...responses, topics_discussed: meetingTopics, agreed_actions: meetingActions }
      : responses;

    // Ensure date is always captured in response_json
    const finalData = { ...topicsData };
    if (!finalData.date) finalData.date = format(new Date(), "yyyy-MM-dd");

    return {
      org_id: ORG_ID,
      template_id: activeTemplate?.id || "",
      template_name: activeTemplate?.name || selectedCategory,
      template_category: selectedCategory,
      template_version: activeTemplate?.active_version_number || "1.0",
      resident_id: selectedResidentId || "",
      resident_name: selectedResident?.display_name || "",
      home_id: selectedHomeId || "",
      home_name: selectedHome?.name || "",
      submitted_by_id: staffProfile?.id || "",
      submitted_by_name: staffProfile?.full_name || staffProfile?.display_name || "",
      submitted_at: status === "submitted" ? new Date().toISOString() : (editRecord?.submitted_at || null),
      last_updated_by_id: staffProfile?.id || "",
      last_updated_by_name: staffProfile?.full_name || staffProfile?.display_name || "",
      status,
      response_json: finalData,
      concern_flagged: concernFlagged,
      action_required: actionRequired,
    };
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      if (editRecord?.id) {
        await base44.entities.YPFeedbackSubmission.update(editRecord.id, buildPayload("draft"));
      } else {
        await base44.entities.YPFeedbackSubmission.create(buildPayload("draft"));
      }
      toast.success("Draft saved");
      onSaved();
    } catch(e) { toast.error("Save failed"); }
    setSaving(false);
  };

  const handleSubmit = async () => {
    if (!selectedResidentId && selectedCategory !== "meeting_record") {
      toast.error("Please select a young person"); return;
    }
    setSubmitting(true);
    try {
      if (editRecord?.id) {
        await base44.entities.YPFeedbackSubmission.update(editRecord.id, buildPayload("submitted"));
      } else {
        await base44.entities.YPFeedbackSubmission.create(buildPayload("submitted"));
      }
      toast.success("Submitted successfully");
      onSaved();
    } catch(e) { toast.error("Submit failed"); }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-card border border-border rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h2 className="font-bold text-base">New Submission</h2>
            {step === 2 && <p className="text-xs text-muted-foreground mt-0.5">{activeTemplate?.name || selectedCategory}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          {/* Step 1: Select template */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Select a form type to complete.</p>
              <div className="space-y-2">
                {["voice_feedback", "meeting_record", "questionnaire"].map(cat => {
                  const tmpl = templates.find(t => t.category === cat && t.status === "active");
                  if (!tmpl) return null;
                  return (
                    <button key={cat} onClick={() => { setSelectedCategory(cat); setStep(2); }}
                      className={`w-full text-left border rounded-xl p-4 hover:border-primary/40 hover:bg-primary/5 transition-all flex items-center justify-between ${selectedCategory === cat ? "border-primary bg-primary/5" : "border-border"}`}
                    >
                      <div>
                        <p className="text-sm font-semibold">{tmpl.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{tmpl.frequency} · v{tmpl.active_version_number}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Fill form */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Back button */}
              {!editRecord && (
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
              )}

              {/* Resident + Home selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedCategory !== "meeting_record" && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Young Person</label>
                    <Select value={selectedResidentId} onValueChange={setSelectedResidentId}>
                      <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select YP (optional)" /></SelectTrigger>
                      <SelectContent>
                        {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Home / Placement</label>
                  <Select value={selectedHomeId} onValueChange={setSelectedHomeId}>
                    <SelectTrigger className="text-sm h-9"><SelectValue placeholder="Select home" /></SelectTrigger>
                    <SelectContent>
                      {homes.map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Date</label>
                  <Input
                    type="date"
                    className="h-9 text-sm"
                    value={responses.date || format(new Date(), "yyyy-MM-dd")}
                    onChange={e => setResponse("date", e.target.value)}
                  />
                </div>
              </div>

              {/* Voice Feedback Questions */}
              {selectedCategory === "voice_feedback" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground italic border-l-4 border-primary/30 pl-3">
                    Please share your thoughts on the support you receive. Your feedback helps us understand how well we are supporting you and where we can improve.
                  </p>
                  {VOICE_FEEDBACK_QUESTIONS.map((q, i) => (
                    <div key={i} className="border border-border rounded-xl p-3 space-y-2">
                      <p className="text-xs font-medium">{i + 1}. {q}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={responses[`q${i+1}_response`] || ""} onValueChange={v => setResponse(`q${i+1}_response`, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select response" /></SelectTrigger>
                          <SelectContent>
                            {RESPONSE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Input placeholder="Comments (optional)" className="h-8 text-xs" value={responses[`q${i+1}_comment`] || ""} onChange={e => setResponse(`q${i+1}_comment`, e.target.value)} />
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Signature (optional)" className="text-sm" value={responses.signature || ""} onChange={e => setResponse("signature", e.target.value)} />
                    <Input placeholder="Staff signature (optional)" className="text-sm" value={responses.staff_signature || ""} onChange={e => setResponse("staff_signature", e.target.value)} />
                  </div>
                </div>
              )}

              {/* Meeting Record */}
              {selectedCategory === "meeting_record" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground italic border-l-4 border-purple-300 pl-3">
                    This meeting provides young people with the opportunity to share their views, wishes, concerns, and suggestions regarding their accommodation, support, safety, wellbeing, and independent living skills.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Staff Position Facilitating</label>
                      <StaffCombobox
                        staff={staff}
                        value={responses.facilitator_position || ""}
                        onChange={v => setResponse("facilitator_position", v)}
                        placeholder="Search staff..."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Young People Attending</label>
                      <ResidentMultiSelect
                        residents={selectedHomeId ? residents.filter(r => r.home_id === selectedHomeId) : []}
                        value={responses.yp_attending_list || []}
                        onChange={v => { setResponse("yp_attending_list", v); setResponse("yp_attending", v.join(", ")); }}
                        placeholder={selectedHomeId ? "Search young people..." : "Select home first..."}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Young People Absent</label>
                      <ResidentMultiSelect
                        residents={selectedHomeId ? residents.filter(r => r.home_id === selectedHomeId) : []}
                        value={responses.yp_absent_list || []}
                        onChange={v => { setResponse("yp_absent_list", v); setResponse("yp_absent", v.join(", ")); }}
                        placeholder={selectedHomeId ? "Search young people..." : "Select home first..."}
                      />
                    </div>
                  </div>
                  <div><label className="text-xs font-medium block mb-2">Topics Discussed</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MEETING_TOPICS.map(t => (
                        <label key={t} className="flex items-center gap-2 text-xs cursor-pointer">
                          <input type="checkbox" checked={meetingTopics.includes(t)}
                            onChange={e => setMeetingTopics(prev => e.target.checked ? [...prev, t] : prev.filter(x => x !== t))}
                            className="rounded" />
                          {t}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div><label className="text-xs font-medium block mb-1">Issues Raised / Discussions</label>
                    <textarea rows={3} className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                      placeholder="Note issues raised, suggestions and young people's views..."
                      value={responses.issues_raised || ""}
                      onChange={e => setResponse("issues_raised", e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-2">Agreed Actions</label>
                    <div className="space-y-2">
                      {meetingActions.map((row, i) => (
                        <div key={i} className="grid grid-cols-3 gap-1.5">
                          <Input placeholder="Action" className="text-xs h-8" value={row.action || ""} onChange={e => { const a = [...meetingActions]; a[i].action = e.target.value; setMeetingActions(a); }} />
                          <Input placeholder="Responsible" className="text-xs h-8" value={row.responsible || ""} onChange={e => { const a = [...meetingActions]; a[i].responsible = e.target.value; setMeetingActions(a); }} />
                          <Input type="date" className="text-xs h-8" value={row.target_date || ""} onChange={e => { const a = [...meetingActions]; a[i].target_date = e.target.value; setMeetingActions(a); }} />
                        </div>
                      ))}
                      <button onClick={() => setMeetingActions(prev => [...prev, { action: "", responsible: "", target_date: "", status: "pending" }])}
                        className="text-xs text-primary hover:underline">+ Add Action</button>
                    </div>
                  </div>
                  <div><label className="text-xs font-medium block mb-1">Any Other Comments</label>
                    <textarea rows={2} className="w-full text-sm border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                      value={responses.other_comments || ""}
                      onChange={e => setResponse("other_comments", e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Staff Name</label>
                      <StaffCombobox
                        staff={staff}
                        value={responses.staff_name || ""}
                        onChange={v => setResponse("staff_name", v)}
                        placeholder="Search staff..."
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">Chairperson Name</label>
                      <StaffCombobox
                        staff={staff}
                        value={responses.chair_name || ""}
                        onChange={v => setResponse("chair_name", v)}
                        placeholder="Search staff..."
                      />
                    </div>
                    <div><label className="text-xs text-muted-foreground block mb-1">Next Meeting Date</label><Input type="date" className="h-8 text-sm" value={responses.next_meeting_date || ""} onChange={e => setResponse("next_meeting_date", e.target.value)} /></div>
                  </div>
                </div>
              )}

              {/* Questionnaire */}
              {selectedCategory === "questionnaire" && (
                <div className="space-y-4">
                  <p className="text-xs text-muted-foreground italic border-l-4 border-orange-300 pl-3">
                    We care about how you feel and what you think. This is your space to share anything you want. We're listening.
                  </p>
                  {QUESTIONNAIRE_SECTIONS.map((sec, si) => (
                    <div key={si} className="border border-border rounded-xl p-3 space-y-2">
                      <h4 className="text-xs font-semibold text-foreground">{sec.title}</h4>
                      {sec.questions.map((q, qi) => (
                        <div key={qi}>
                          <label className="text-xs text-muted-foreground block mb-1">{q}</label>
                          <textarea rows={2} className="w-full text-xs border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                            value={responses[`s${si+1}_q${qi+1}`] || ""}
                            onChange={e => setResponse(`s${si+1}_q${qi+1}`, e.target.value)} />
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground block mb-1">YP Signature (optional)</label><Input className="h-8 text-sm" value={responses.yp_signature || ""} onChange={e => setResponse("yp_signature", e.target.value)} /></div>
                  </div>
                </div>
              )}

              {/* Flags */}
              <div className="flex items-center gap-4 border-t border-border pt-3">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={concernFlagged} onChange={e => setConcernFlagged(e.target.checked)} className="rounded" />
                  <Flag className="w-3.5 h-3.5 text-red-500" /> Flag concern
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={actionRequired} onChange={e => setActionRequired(e.target.checked)} className="rounded" />
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Action required
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 2 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-border sticky bottom-0 bg-card">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleSaveDraft} disabled={saving}>
              <Save className="w-3.5 h-3.5" /> {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={handleSubmit} disabled={submitting}>
              <Send className="w-3.5 h-3.5" /> {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}