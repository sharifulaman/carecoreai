import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { X, ChevronDown, ChevronUp, Plus, Trash2, Mic, FileText, Sparkles, Maximize2, Loader2, CheckCircle2, RotateCcw, Lock, Send, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";

const DEFAULT_QUESTIONS = [
  "How have you been supporting young people to integrate and build positive relationships in their community?",
  "How do you adapt your approach to meet the cultural or emotional needs of an asylum-seeking young person?",
  "What challenges have you encountered engaging young people in support or activities, and how have you addressed them?",
  "In what ways are you promoting independence and life-skills development?",
  "How do you assess and respond to individual needs when planning activities?",
  "How do you manage conflict between young people from different backgrounds?",
  "Which aspects of your job bring you joy and satisfaction?",
];

const WELLBEING_DRIVER_OPTIONS = [
  { key: "specific_incident", label: "Specific incident" },
  { key: "workload", label: "Workload" },
  { key: "team_dynamics", label: "Team dynamics" },
  { key: "personal", label: "Personal" },
  { key: "sleep_affected", label: "Sleep affected" },
];

const AI_SCHEMA = {
  type: "object",
  properties: {
    wellbeing_mood: { type: "string", enum: ["good", "ok", "stressed", "struggling"] },
    stress_rag: { type: "string", enum: ["low", "moderate", "high"] },
    wellbeing_drivers: { type: "array", items: { type: "string" } },
    wellbeing_note: { type: "string" },
    workload_status: { type: "string", enum: ["manageable", "stretched", "overloaded"] },
    reflective_questions: {
      type: "array",
      items: { type: "object", properties: { question: { type: "string" }, response: { type: "string" } } },
    },
    safeguarding_confidence: { type: "number" },
    safeguarding_support_needed: { type: "boolean" },
    safeguarding_note: { type: "string" },
    training_needs: { type: "array", items: { type: "string" } },
    suggested_actions: {
      type: "array",
      items: { type: "object", properties: { text: { type: "string" }, type: { type: "string" }, due_date: { type: "string" } } },
    },
  },
};

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-teal-50 hover:bg-teal-100 transition-colors text-left">
        <span className="text-sm font-semibold text-teal-800">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-teal-600" /> : <ChevronDown className="w-4 h-4 text-teal-600" />}
      </button>
      {open && <div className="px-4 py-3 bg-card space-y-3">{children}</div>}
    </div>
  );
}

function Chip({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
        active ? "bg-teal-600 text-white border-teal-600" : "bg-card text-muted-foreground border-border hover:border-teal-400"
      }`}>
      {label}
    </button>
  );
}

function ExpandButton({ text, onExpanded }) {
  const [loading, setLoading] = useState(false);
  const expand = async () => {
    if (!text?.trim()) return;
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Rewrite the following shorthand supervision note into a concise, professional reflective-supervision paragraph in UK English. Keep it factual and person-centred. Return only the rewritten paragraph, no preamble.\n\nShorthand: ${text}`,
        add_context_from_internet: false,
      });
      onExpanded(typeof result === "string" ? result : result?.text || text);
    } finally {
      setLoading(false);
    }
  };
  return (
    <button type="button" onClick={expand} disabled={loading || !text?.trim()} title="Expand with AI"
      className="ml-1 shrink-0 text-[10px] flex items-center gap-0.5 text-teal-600 hover:text-teal-800 disabled:opacity-40 font-medium">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Maximize2 className="w-3 h-3" />}
      {loading ? "" : "Expand"}
    </button>
  );
}

function buildSummary(form) {
  const lines = [];
  if (form.supervision_type && form.supervision_type !== "standard") lines.push(`Type: ${form.supervision_type.replace(/_/g, " ")}`);
  if (form.agenda_items?.length) lines.push(`Agenda: ${form.agenda_items.join("; ")}`);
  if (form.wellbeing_mood) lines.push(`Mood: ${form.wellbeing_mood}`);
  if (form.stress_rag) lines.push(`Stress: ${form.stress_rag}`);
  if (form.wellbeing_drivers?.length) lines.push(`Drivers: ${form.wellbeing_drivers.join(", ")}`);
  if (form.wellbeing_note) lines.push(`Wellbeing note: ${form.wellbeing_note}`);
  if (form.workload_status) lines.push(`Workload: ${form.workload_status}`);
  if (form.reflective_questions?.length) form.reflective_questions.forEach(q => { if (q.response) lines.push(`Q: ${q.question}\nA: ${q.response}`); });
  if (form.safeguarding_confidence) lines.push(`Safeguarding confidence: ${form.safeguarding_confidence}/5`);
  if (form.safeguarding_support_needed) lines.push("Safeguarding support needed: Yes");
  if (form.safeguarding_note) lines.push(`Safeguarding note: ${form.safeguarding_note}`);
  if (form.training_needs?.length) lines.push(`Training needs: ${form.training_needs.join(", ")}`);
  return lines.join("\n");
}

function emptyAction(superviseeId) {
  return { text: "", type: "practice", owner_id: superviseeId || "", due_date: "", status: "open", training_requirement_id: "" };
}

export default function SupervisionLogForm({ initialData, staff, myProfile, onClose, onSubmit, isAdminOrHR = false }) {
  const today = new Date().toISOString().split("T")[0];
  const fileInputRef = useRef(null);

  const [form, setForm] = useState(() => {
    const d = initialData || {};
    return {
      supervisee_id: d.supervisee_id || "",
      supervisor_id: d.supervisor_id || myProfile?.id || "",
      session_date: d.session_date || today,
      status: d.status || "completed",
      next_supervision_date: d.next_supervision_date || "",
      notes: d.notes || "",
      action_points: d.action_points || "",
      supervision_type: d.supervision_type || "standard",
      agenda_items: d.agenda_items || [],
      wellbeing_mood: d.wellbeing_mood || "",
      stress_rag: d.stress_rag || "",
      wellbeing_drivers: d.wellbeing_drivers || [],
      wellbeing_note: d.wellbeing_note || "",
      workload_status: d.workload_status || "",
      reflective_questions: d.reflective_questions?.length ? d.reflective_questions : DEFAULT_QUESTIONS.map(q => ({ question: q, response: "" })),
      safeguarding_confidence: d.safeguarding_confidence || 0,
      safeguarding_support_needed: d.safeguarding_support_needed || false,
      safeguarding_note: d.safeguarding_note || "",
      training_needs: d.training_needs || [],
      actions: d.actions || [],
      transcript: d.transcript || "",
      audio_file_url: d.audio_file_url || "",
      ai_structured: d.ai_structured || false,
      signoff_status: d.signoff_status || "draft",
      supervisor_signed: d.supervisor_signed || false,
      supervisor_signed_at: d.supervisor_signed_at || "",
      supervisee_signed: d.supervisee_signed || false,
      supervisee_signed_at: d.supervisee_signed_at || "",
    };
  });

  // Carry-forward previous open actions
  const [prevOpenActions, setPrevOpenActions] = useState([]);
  const [loadingPrev, setLoadingPrev] = useState(false);

  useEffect(() => {
    if (!form.supervisee_id || initialData?.id) return; // skip on edit
    setLoadingPrev(true);
    secureGateway.filter("SupervisionRecord", { supervisee_id: form.supervisee_id })
      .then(records => {
        const completed = records
          .filter(r => r.status === "completed" && r.id !== initialData?.id)
          .sort((a, b) => b.session_date?.localeCompare(a.session_date));
        const prev = completed[0];
        if (prev?.actions?.length) {
          setPrevOpenActions(prev.actions.filter(a => a.status === "open").map(a => ({ ...a, _fromPrev: true })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrev(false));
  }, [form.supervisee_id]);

  // AI capture bar state
  const [transcript, setTranscript] = useState(form.transcript || "");
  const [audioUrl, setAudioUrl] = useState(form.audio_file_url || "");
  const [uploading, setUploading] = useState(false);
  const [structuring, setStructuring] = useState(false);
  const [aiDrafted, setAiDrafted] = useState(form.ai_structured || false);
  const [sendingSignoff, setSendingSignoff] = useState(false);

  const [newAgendaItem, setNewAgendaItem] = useState("");
  const [newTrainingNeed, setNewTrainingNeed] = useState("");
  const [newDriver, setNewDriver] = useState("");

  const [errors, setErrors] = useState({});
  const f = (k, v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(e => ({ ...e, [k]: false }));
  };

  const isLocked = form.signoff_status === "signed" && !isAdminOrHR;

  const handleSave = () => {
    const errs = {};
    if (!form.supervisee_id) errs.supervisee_id = true;
    if (!form.session_date) errs.session_date = true;
    if (!form.status) errs.status = true;
    if (!form.supervision_type) errs.supervision_type = true;

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return toast.error("Please fill in all required fields.");
    }

    const summary = buildSummary(form);
    const finalNotes = form.notes?.trim() ? form.notes : summary;
    onSubmit({ ...form, notes: finalNotes, transcript, audio_file_url: audioUrl, ai_structured: aiDrafted });
  };

  // File upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setAudioUrl(file_url);
      if (file.type.startsWith("text/") || file.name.endsWith(".txt") || file.name.endsWith(".vtt") || file.name.endsWith(".srt")) {
        const text = await file.text();
        setTranscript(text);
      }
    } finally {
      setUploading(false);
    }
  };

  // Structure with AI
  const handleStructure = async () => {
    if (!transcript.trim()) return;
    setStructuring(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a supervision record assistant for a UK children's care organisation. Analyse the following supervision session transcript and extract structured data. Match responses to the reflective practice questions below where possible.\n\nReflective practice questions:\n${DEFAULT_QUESTIONS.join("\n")}\n\nTranscript:\n${transcript}\n\nReturn only the JSON structure requested.`,
        add_context_from_internet: false,
        response_json_schema: AI_SCHEMA,
      });
      if (result) {
        setForm(prev => ({
          ...prev,
          wellbeing_mood: result.wellbeing_mood || prev.wellbeing_mood,
          stress_rag: result.stress_rag || prev.stress_rag,
          wellbeing_drivers: result.wellbeing_drivers?.length ? result.wellbeing_drivers : prev.wellbeing_drivers,
          wellbeing_note: result.wellbeing_note || prev.wellbeing_note,
          workload_status: result.workload_status || prev.workload_status,
          reflective_questions: result.reflective_questions?.length ? result.reflective_questions : prev.reflective_questions,
          safeguarding_confidence: result.safeguarding_confidence ?? prev.safeguarding_confidence,
          safeguarding_support_needed: result.safeguarding_support_needed ?? prev.safeguarding_support_needed,
          safeguarding_note: result.safeguarding_note || prev.safeguarding_note,
          training_needs: result.training_needs?.length ? result.training_needs : prev.training_needs,
          actions: result.suggested_actions?.length
            ? result.suggested_actions.map(a => ({ text: a.text, type: a.type || "practice", owner_id: prev.supervisee_id, due_date: a.due_date || "", status: "open", training_requirement_id: "" }))
            : prev.actions,
        }));
        setAiDrafted(true);
      }
    } finally {
      setStructuring(false);
    }
  };

  // Sign as supervisor
  const handleSignSupervisor = () => {
    const now = new Date().toISOString();
    const bothSigned = form.supervisee_signed;
    setForm(p => ({
      ...p,
      supervisor_signed: true,
      supervisor_signed_at: now,
      signoff_status: bothSigned ? "signed" : p.signoff_status,
    }));
  };

  // Send for sign-off
  const handleSendForSignoff = async () => {
    setSendingSignoff(true);
    try {
      const supervisee = staff.find(s => s.id === form.supervisee_id);
      f("signoff_status", "awaiting_signoff");
      if (supervisee?.user_id) {
        await base44.functions.invoke("createNotification", {
          recipient_user_id: supervisee.user_id,
          recipient_staff_id: supervisee.id,
          title: "Supervision record awaiting your sign-off",
          body: `Your supervision record dated ${form.session_date} is ready for your review and sign-off.`,
          type: "general",
          link: "/my-hr",
        });
      }
    } finally {
      setSendingSignoff(false);
    }
  };

  // Carry-forward action
  const carryOver = (action) => {
    const newAction = { ...action, _fromPrev: undefined, status: "open" };
    delete newAction._fromPrev;
    f("actions", [...form.actions, newAction]);
    setPrevOpenActions(p => p.filter(a => a !== action));
  };
  const closePrevAction = (action) => setPrevOpenActions(p => p.filter(a => a !== action));

  // Actions CRUD
  const updateAction = (i, field, val) => {
    const updated = form.actions.map((a, idx) => idx === i ? { ...a, [field]: val } : a);
    f("actions", updated);
  };
  const addAction = () => f("actions", [...form.actions, emptyAction(form.supervisee_id)]);
  const removeAction = (i) => f("actions", form.actions.filter((_, idx) => idx !== i));

  // Agenda helpers
  const addAgendaItem = () => { if (!newAgendaItem.trim()) return; f("agenda_items", [...form.agenda_items, newAgendaItem.trim()]); setNewAgendaItem(""); };
  const removeAgendaItem = (i) => f("agenda_items", form.agenda_items.filter((_, idx) => idx !== i));

  // Driver toggle
  const toggleDriver = (key) => {
    const cur = form.wellbeing_drivers || [];
    f("wellbeing_drivers", cur.includes(key) ? cur.filter(d => d !== key) : [...cur, key]);
  };
  const addCustomDriver = () => { if (!newDriver.trim()) return; f("wellbeing_drivers", [...(form.wellbeing_drivers || []), newDriver.trim()]); setNewDriver(""); };

  // Training needs
  const addTrainingNeed = () => { if (!newTrainingNeed.trim()) return; f("training_needs", [...form.training_needs, newTrainingNeed.trim()]); setNewTrainingNeed(""); };
  const removeTrainingNeed = (i) => f("training_needs", form.training_needs.filter((_, idx) => idx !== i));

  // Reflective questions
  const updateQuestion = (i, field, val) => f("reflective_questions", form.reflective_questions.map((q, idx) => idx === i ? { ...q, [field]: val } : q));
  const addQuestion = () => f("reflective_questions", [...form.reflective_questions, { question: "", response: "" }]);
  const removeQuestion = (i) => f("reflective_questions", form.reflective_questions.filter((_, idx) => idx !== i));

  const ACTION_TYPES = ["practice", "safeguarding", "wellbeing", "training"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-2xl rounded-xl shadow-xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base">{initialData ? "Edit Supervision" : "Log Supervision"}</h3>
            {isLocked && <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium"><Lock className="w-3 h-3" /> Signed — read only</span>}
          </div>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* ── AI Capture Bar ── */}
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-violet-800">AI Capture</span>
              <span className="text-xs text-violet-500 ml-auto">Paste or upload a transcript, then structure with AI</span>
            </div>
            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              disabled={isLocked}
              className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 min-h-[80px] bg-white focus:outline-none focus:ring-1 focus:ring-violet-400 placeholder:text-violet-300 disabled:opacity-60"
              placeholder="Paste supervision transcript here…"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input ref={fileInputRef} type="file" accept="audio/*,.txt,.vtt,.srt,.doc,.docx" className="hidden" onChange={handleFileUpload} />
              <Button type="button" size="sm" variant="outline" className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-100"
                onClick={() => fileInputRef.current?.click()} disabled={uploading || isLocked}>
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mic className="w-3.5 h-3.5" />}
                {uploading ? "Uploading…" : "Upload audio / file"}
              </Button>
              {audioUrl && <span className="text-xs text-violet-600 flex items-center gap-1"><FileText className="w-3 h-3" /> File attached</span>}
              <Button type="button" size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white ml-auto"
                onClick={handleStructure} disabled={structuring || !transcript.trim() || isLocked}>
                {structuring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {structuring ? "Structuring…" : "Structure with AI"}
              </Button>
            </div>
            {aiDrafted && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                <Sparkles className="w-3 h-3 shrink-0" /> AI-drafted — review and edit all fields before saving.
              </div>
            )}
          </div>

          {/* ── Carry-forward: previous open actions ── */}
          {!initialData?.id && prevOpenActions.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-2">
              <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Open actions from previous supervision
              </p>
              {prevOpenActions.map((a, i) => (
                <div key={i} className="flex items-start gap-2 bg-white border border-orange-100 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 truncate">{a.text}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{a.type} {a.due_date ? `· Due ${a.due_date}` : ""}</p>
                  </div>
                  <button type="button" onClick={() => closePrevAction(a)} title="Mark closed"
                    className="shrink-0 text-[10px] text-green-600 font-semibold hover:underline flex items-center gap-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Close
                  </button>
                  <button type="button" onClick={() => carryOver(a)} title="Carry to this session"
                    className="shrink-0 text-[10px] text-blue-600 font-semibold hover:underline flex items-center gap-0.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Carry over
                  </button>
                </div>
              ))}
              {loadingPrev && <p className="text-xs text-orange-500">Loading previous actions…</p>}
            </div>
          )}

          {/* Core fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Supervisee *</label>
              <Select value={form.supervisee_id} onValueChange={v => f("supervisee_id", v)} disabled={isLocked}>
                <SelectTrigger className={`mt-1 ${errors.supervisee_id ? "border-destructive" : ""}`}><SelectValue placeholder="Select staff" /></SelectTrigger>
                <SelectContent>{staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Date *</label>
              <Input type="date" className={`mt-1 ${errors.session_date ? "border-destructive" : ""}`} value={form.session_date} onChange={e => f("session_date", e.target.value)} disabled={isLocked} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Status *</label>
              <Select value={form.status} onValueChange={v => f("status", v)} disabled={isLocked}>
                <SelectTrigger className={`mt-1 ${errors.status ? "border-destructive" : ""}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="scheduled">Scheduled (future)</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Supervision Type *</label>
              <Select value={form.supervision_type} onValueChange={v => f("supervision_type", v)} disabled={isLocked}>
                <SelectTrigger className={`mt-1 ${errors.supervision_type ? "border-destructive" : ""}`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="probation">Probation</SelectItem>
                  <SelectItem value="return_to_work">Return to Work</SelectItem>
                  <SelectItem value="safeguarding_focus">Safeguarding Focus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 1. Agenda */}
          <Section title="1. Agenda" defaultOpen={true}>
            <div className="space-y-1.5">
              {form.agenda_items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-foreground">{item}</span>
                  {!isLocked && <button type="button" onClick={() => removeAgendaItem(i)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" /></button>}
                </div>
              ))}
            </div>
            {!isLocked && (
              <div className="flex gap-2 mt-1">
                <Input placeholder="Add agenda item…" value={newAgendaItem} onChange={e => setNewAgendaItem(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addAgendaItem())} className="text-sm" />
                <Button type="button" size="sm" variant="outline" onClick={addAgendaItem}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </Section>

          {/* 2. Wellbeing */}
          <Section title="2. Wellbeing Check">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Mood</p>
              <div className="flex flex-wrap gap-2">
                {["good","ok","stressed","struggling"].map(m => (
                  <button key={m} type="button" disabled={isLocked}
                    onClick={() => f("wellbeing_mood", form.wellbeing_mood === m ? "" : m)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium capitalize transition-colors ${
                      form.wellbeing_mood === m
                        ? m === "good" ? "bg-green-500 text-white border-green-500" : m === "ok" ? "bg-blue-500 text-white border-blue-500" : m === "stressed" ? "bg-amber-500 text-white border-amber-500" : "bg-red-500 text-white border-red-500"
                        : "bg-card border-border text-muted-foreground hover:border-teal-400 disabled:opacity-60"
                    }`}>
                    {m === "good" ? "😊 Good" : m === "ok" ? "🙂 Ok" : m === "stressed" ? "😰 Stressed" : "😔 Struggling"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Stress Level</p>
              <div className="flex gap-2">
                {[{v:"low",label:"Low",cls:"bg-green-500 text-white border-green-500"},{v:"moderate",label:"Moderate",cls:"bg-amber-500 text-white border-amber-500"},{v:"high",label:"High",cls:"bg-red-500 text-white border-red-500"}].map(({v,label,cls}) => (
                  <button key={v} type="button" disabled={isLocked}
                    onClick={() => f("stress_rag", form.stress_rag === v ? "" : v)}
                    className={`text-xs px-4 py-1.5 rounded-full border font-medium transition-colors ${form.stress_rag === v ? cls : "bg-card border-border text-muted-foreground hover:border-teal-400"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Drivers</p>
              <div className="flex flex-wrap gap-2">
                {WELLBEING_DRIVER_OPTIONS.map(({ key, label }) => (
                  <Chip key={key} label={label} active={(form.wellbeing_drivers || []).includes(key)} onClick={() => !isLocked && toggleDriver(key)} />
                ))}
                {(form.wellbeing_drivers || []).filter(d => !WELLBEING_DRIVER_OPTIONS.find(o => o.key === d)).map((d, i) => (
                  <span key={i} className="text-xs px-3 py-1.5 rounded-full border font-medium bg-teal-600 text-white border-teal-600 flex items-center gap-1">
                    {d}
                    {!isLocked && <button type="button" onClick={() => f("wellbeing_drivers", form.wellbeing_drivers.filter(x => x !== d))}><X className="w-3 h-3" /></button>}
                  </span>
                ))}
              </div>
              {!isLocked && (
                <div className="flex gap-2 mt-2">
                  <Input placeholder="Add custom driver…" value={newDriver} onChange={e => setNewDriver(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomDriver())} className="text-sm" />
                  <Button type="button" size="sm" variant="outline" onClick={addCustomDriver}><Plus className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs text-muted-foreground">Wellbeing note (optional)</label>
                {!isLocked && <ExpandButton text={form.wellbeing_note} onExpanded={v => f("wellbeing_note", v)} />}
              </div>
              <textarea disabled={isLocked}
                className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                value={form.wellbeing_note} onChange={e => f("wellbeing_note", e.target.value)} placeholder="Any additional context…" />
            </div>
          </Section>

          {/* 3. Workload */}
          <Section title="3. Workload & Caseload">
            <div className="flex gap-2">
              {["manageable","stretched","overloaded"].map(w => (
                <button key={w} type="button" disabled={isLocked}
                  onClick={() => f("workload_status", form.workload_status === w ? "" : w)}
                  className={`flex-1 text-xs py-2.5 rounded-lg border font-semibold capitalize transition-colors ${
                    form.workload_status === w
                      ? w === "manageable" ? "bg-green-500 text-white border-green-500" : w === "stretched" ? "bg-amber-500 text-white border-amber-500" : "bg-red-500 text-white border-red-500"
                      : "bg-card border-border text-muted-foreground hover:border-teal-400"
                  }`}>{w}</button>
              ))}
            </div>
          </Section>

          {/* 4. Reflective Practice */}
          <Section title="4. Reflective Practice">
            <div className="space-y-4">
              {form.reflective_questions.map((q, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-start gap-2">
                    <Input value={q.question} onChange={e => updateQuestion(i, "question", e.target.value)} className="text-xs flex-1" placeholder="Question…" disabled={isLocked} />
                    {!isLocked && <button type="button" onClick={() => removeQuestion(i)} className="mt-1 shrink-0"><Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" /></button>}
                  </div>
                  <div className="flex items-start gap-1">
                    <textarea value={q.response} onChange={e => updateQuestion(i, "response", e.target.value)} disabled={isLocked}
                      className="flex-1 text-sm border border-input rounded-md px-3 py-2 min-h-[64px] bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60" placeholder="Response…" />
                    {!isLocked && <ExpandButton text={q.response} onExpanded={v => updateQuestion(i, "response", v)} />}
                  </div>
                </div>
              ))}
              {!isLocked && (
                <Button type="button" size="sm" variant="outline" onClick={addQuestion} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add question
                </Button>
              )}
            </div>
          </Section>

          {/* 5. Safeguarding */}
          <Section title="5. Safeguarding">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Confidence level (1–5)</p>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" disabled={isLocked}
                    onClick={() => f("safeguarding_confidence", form.safeguarding_confidence === n ? 0 : n)}
                    className={`w-9 h-9 rounded-full text-sm font-bold border transition-colors ${form.safeguarding_confidence >= n ? "bg-teal-600 text-white border-teal-600" : "bg-card border-border text-muted-foreground hover:border-teal-400"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" disabled={isLocked}
                onClick={() => f("safeguarding_support_needed", !form.safeguarding_support_needed)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${form.safeguarding_support_needed ? "bg-teal-600" : "bg-muted"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${form.safeguarding_support_needed ? "translate-x-4" : "translate-x-0"}`} />
              </button>
              <span className="text-sm text-foreground">Support needed</span>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs text-muted-foreground">Safeguarding note (optional)</label>
                {!isLocked && <ExpandButton text={form.safeguarding_note} onExpanded={v => f("safeguarding_note", v)} />}
              </div>
              <textarea disabled={isLocked}
                className="w-full text-sm border border-input rounded-md px-3 py-2 min-h-[60px] bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                value={form.safeguarding_note} onChange={e => f("safeguarding_note", e.target.value)} placeholder="Any safeguarding concerns or context…" />
            </div>
          </Section>

          {/* 6. Training & Development */}
          <Section title="6. Training & Development">
            <div className="flex flex-wrap gap-2">
              {form.training_needs.map((t, i) => (
                <span key={i} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-teal-600 text-white font-medium">
                  {t}
                  {!isLocked && <button type="button" onClick={() => removeTrainingNeed(i)}><X className="w-3 h-3" /></button>}
                </span>
              ))}
            </div>
            {!isLocked && (
              <div className="flex gap-2">
                <Input placeholder="Add training need…" value={newTrainingNeed} onChange={e => setNewTrainingNeed(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTrainingNeed())} className="text-sm" />
                <Button type="button" size="sm" variant="outline" onClick={addTrainingNeed}><Plus className="w-3.5 h-3.5" /></Button>
              </div>
            )}
          </Section>

          {/* 7. Actions */}
          <Section title="7. Actions" defaultOpen={true}>
            <div className="space-y-2">
              {form.actions.length === 0 && <p className="text-xs text-muted-foreground">No actions yet.</p>}
              {form.actions.map((action, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center bg-muted/30 rounded-lg p-2">
                  <div className="col-span-12 sm:col-span-4">
                    <Input value={action.text} onChange={e => updateAction(i, "text", e.target.value)} placeholder="Action…" className="text-xs" disabled={isLocked} />
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Select value={action.type} onValueChange={v => updateAction(i, "type", v)} disabled={isLocked}>
                      <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    <Select value={action.owner_id || form.supervisee_id} onValueChange={v => updateAction(i, "owner_id", v)} disabled={isLocked}>
                      <SelectTrigger className="text-xs h-8"><SelectValue placeholder="Owner" /></SelectTrigger>
                      <SelectContent>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name.split(" ")[0]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-5 sm:col-span-2">
                    <Input type="date" value={action.due_date} onChange={e => updateAction(i, "due_date", e.target.value)} className="text-xs h-8" disabled={isLocked} />
                  </div>
                  <div className="col-span-5 sm:col-span-1">
                    <Select value={action.status || "open"} onValueChange={v => updateAction(i, "status", v)} disabled={isLocked}>
                      <SelectTrigger className="text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {!isLocked && (
                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <button type="button" onClick={() => removeAction(i)}><X className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" /></button>
                    </div>
                  )}
                </div>
              ))}
              {!isLocked && (
                <Button type="button" size="sm" variant="outline" onClick={addAction} className="gap-1 mt-1">
                  <Plus className="w-3.5 h-3.5" /> Add action
                </Button>
              )}
            </div>
          </Section>

          {/* Legacy: General Notes & Action Points */}
          <div className="space-y-3 pt-1 border-t border-border">
            <div>
              <label className="text-xs text-muted-foreground">General notes</label>
              <textarea disabled={isLocked}
                className="mt-1 w-full text-sm border border-input rounded-md px-3 py-2 min-h-[72px] bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-60"
                value={form.notes} onChange={e => f("notes", e.target.value)} placeholder="Leave blank to auto-generate from sections above…" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Action Points <span className="text-muted-foreground/50">(legacy)</span></label>
              <Input className="mt-1" value={form.action_points} onChange={e => f("action_points", e.target.value)} disabled={isLocked} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Next Supervision Date</label>
              <Input type="date" className="mt-1" value={form.next_supervision_date} onChange={e => f("next_supervision_date", e.target.value)} disabled={isLocked} />
            </div>
          </div>

          {/* ── Sign-off Bar ── */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><PenLine className="w-3.5 h-3.5" /> Sign-off</p>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Supervisor */}
              <div className={`flex-1 rounded-lg border px-3 py-2 ${form.supervisor_signed ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"}`}>
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Supervisor</p>
                {form.supervisor_signed ? (
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signed {form.supervisor_signed_at ? `· ${new Date(form.supervisor_signed_at).toLocaleDateString("en-GB")}` : ""}
                  </p>
                ) : (
                  <Button type="button" size="sm" variant="outline" className="mt-1 text-xs h-7 gap-1" onClick={handleSignSupervisor} disabled={isLocked}>
                    <PenLine className="w-3 h-3" /> Sign as supervisor
                  </Button>
                )}
              </div>
              {/* Supervisee */}
              <div className={`flex-1 rounded-lg border px-3 py-2 ${form.supervisee_signed ? "border-green-300 bg-green-50" : "border-slate-200 bg-white"}`}>
                <p className="text-[10px] text-muted-foreground font-medium mb-0.5">Supervisee</p>
                {form.supervisee_signed ? (
                  <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Signed {form.supervisee_signed_at ? `· ${new Date(form.supervisee_signed_at).toLocaleDateString("en-GB")}` : ""}
                  </p>
                ) : (
                  <span className="text-xs text-slate-400">Awaiting sign-off</span>
                )}
              </div>
            </div>
            {/* Send for sign-off */}
            {!form.supervisee_signed && form.signoff_status !== "awaiting_signoff" && !isLocked && (
              <Button type="button" size="sm" variant="outline" className="gap-1.5 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                onClick={handleSendForSignoff} disabled={sendingSignoff}>
                {sendingSignoff ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {sendingSignoff ? "Sending…" : "Send for supervisee sign-off"}
              </Button>
            )}
            {form.signoff_status === "awaiting_signoff" && !form.supervisee_signed && (
              <p className="text-xs text-blue-600 font-medium">✉ Sign-off request sent to supervisee</p>
            )}
            {isLocked && isAdminOrHR && (
              <Button type="button" size="sm" variant="outline" className="gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => f("signoff_status", "draft")}>
                <Lock className="w-3 h-3" /> Unlock record
              </Button>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-5 py-4 border-t border-border shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          {!isLocked && <Button size="sm" onClick={handleSave}>Save</Button>}
          {isLocked && isAdminOrHR && <Button size="sm" onClick={handleSave}>Save (Admin override)</Button>}
        </div>
      </div>
    </div>
  );
}