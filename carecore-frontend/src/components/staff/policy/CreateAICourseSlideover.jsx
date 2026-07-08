import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { X, Search, FileText, Loader2, Sparkles, ChevronRight, ChevronLeft, CheckCircle2, AlertTriangle, Brain } from "lucide-react";

const STEPS = ["Select Policy", "Policy Text", "Course Settings", "Generate"];

const TONE_OPTIONS = [
  { value: "staff_friendly", label: "Simple staff-friendly language" },
  { value: "formal_hr", label: "Formal HR/compliance language" },
  { value: "care_sector", label: "Care-sector practical language" },
  { value: "scenario_based", label: "Scenario-based training" },
];

const DEFAULT_SETTINGS = {
  course_title: "",
  target_audience: "All Care Staff",
  num_modules: 5,
  num_questions: 10,
  pass_mark: 80,
  max_attempts: 3,
  estimated_duration: 45,
  requires_acknowledgement: true,
  tone: "care_sector",
};

export default function CreateAICourseSlideover({ policies: propPolicies = [], staffProfile, onClose, onCreated }) {
  // Fetch policies directly inside the slideover so they're always fresh
  const { data: fetchedPolicies = [], isLoading: loadingPolicies } = useQuery({
    queryKey: ["hr-policies-slideover"],
    queryFn: () => base44.entities.HRPolicy.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 30000,
  });
  const policies = fetchedPolicies.length > 0 ? fetchedPolicies : propPolicies;
  const [step, setStep] = useState(0);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [policySearch, setPolicySearch] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractFailed, setExtractFailed] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [generating, setGenerating] = useState(false);
  const [generatedCourse, setGeneratedCourse] = useState(null);
  const [generationError, setGenerationError] = useState(null);

  const filteredPolicies = policies.filter(p =>
    p.policy_title?.toLowerCase().includes(policySearch.toLowerCase()) && p.status !== "Archived"
  );

  const handleSelectPolicy = (policy) => {
    setSelectedPolicy(policy);
    setSettings(s => ({ ...s, course_title: `${policy.policy_title}: Staff E-Learning Course` }));
  };

  const handleExtract = async () => {
    if (!selectedPolicy?.current_file_url) {
      setExtractFailed(true);
      return;
    }
    setExtracting(true);
    setExtractFailed(false);
    try {
      // Try to fetch and read the PDF via LLM with file_urls
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract all readable text from this policy document. Return the complete policy text as plain text, preserving structure where possible. Do not summarise — return the full content.`,
        file_urls: [selectedPolicy.current_file_url],
        response_json_schema: {
          type: "object",
          properties: {
            extracted_text: { type: "string" },
            success: { type: "boolean" },
            notes: { type: "string" }
          }
        }
      });
      if (result?.extracted_text && result.extracted_text.length > 100) {
        setPolicyText(result.extracted_text);
        setExtractFailed(false);
        toast.success("Policy text extracted successfully");
      } else {
        setExtractFailed(true);
      }
    } catch (e) {
      setExtractFailed(true);
    }
    setExtracting(false);
  };

  const handleGenerate = async () => {
    if (!policyText.trim()) { toast.error("Please provide policy text first"); return; }
    setGenerating(true);
    setGenerationError(null);
    try {
      const toneLabel = TONE_OPTIONS.find(t => t.value === settings.tone)?.label || "care-sector practical language";
      const prompt = `You are an expert HR and care-sector compliance trainer. Convert the following policy into a structured staff e-learning course.

POLICY TITLE: ${selectedPolicy?.policy_title || "Policy"}
TONE: ${toneLabel}
NUMBER OF MODULES: ${settings.num_modules}
NUMBER OF QUIZ QUESTIONS: ${settings.num_questions}
PASS MARK: ${settings.pass_mark}%

POLICY TEXT:
${policyText.substring(0, 6000)}

INSTRUCTIONS:
- Keep the policy meaning accurate. Do not invent obligations not in the policy.
- Rewrite in clear ${toneLabel}.
- Focus on: what staff must know, what they must do, when to escalate, what to record, who to inform, what evidence to keep.
- Create practical care-sector examples and scenario-based quiz questions.
- Each module must have: title, summary, full learning content (3-5 paragraphs), 3-5 key points, 2-3 staff responsibilities, a practical example, and a compliance reminder.
- Quiz questions must be scenario-based where possible. Include correct answer and explanation for each.

Return a JSON object with this exact structure:
{
  "course_title": "string",
  "course_summary": "string (2-3 sentences)",
  "learning_objectives": ["string", ...],
  "target_audience": "string",
  "estimated_duration_minutes": number,
  "modules": [
    {
      "module_number": number,
      "module_title": "string",
      "module_summary": "string",
      "learning_content": "string (full plain-text content, 3-5 paragraphs)",
      "key_points": ["string", ...],
      "staff_responsibilities": ["string", ...],
      "practical_example": "string",
      "compliance_reminder": "string",
      "estimated_duration_minutes": number
    }
  ],
  "quiz_questions": [
    {
      "question_number": number,
      "question_type": "Scenario Based|Multiple Choice|True or False",
      "scenario_text": "string or null",
      "question_text": "string",
      "option_a": "string",
      "option_b": "string",
      "option_c": "string",
      "option_d": "string",
      "correct_answer": "A|B|C|D",
      "explanation": "string",
      "difficulty": "Easy|Medium|Hard"
    }
  ],
  "acknowledgement_wording": "string"
}`;

      const rawResult = await base44.integrations.Core.InvokeLLM({
        prompt: prompt + "\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code blocks, no explanation. Just the raw JSON object.",
        model: "claude_sonnet_4_6",
      });

      // Parse the result — claude_sonnet returns a string when no schema is used
      let result;
      if (typeof rawResult === "string") {
        const jsonMatch = rawResult.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Could not parse AI response as JSON");
        result = JSON.parse(jsonMatch[0]);
      } else {
        result = rawResult;
      }

      if (!result?.course_title) throw new Error("Invalid AI response — missing course_title");

      // Save to DB
      const now = new Date().toISOString();
      const course = await base44.entities.HRPolicyLearningCourse.create({
        org_id: ORG_ID,
        policy_id: selectedPolicy.id,
        policy_title: selectedPolicy.policy_title,
        policy_category: selectedPolicy.category,
        policy_version: selectedPolicy.current_version_number || "1.0",
        course_title: result.course_title,
        course_summary: result.course_summary,
        learning_objectives: result.learning_objectives || [],
        target_audience: result.target_audience || settings.target_audience,
        estimated_duration_minutes: result.estimated_duration_minutes || settings.estimated_duration,
        pass_mark_percentage: settings.pass_mark,
        max_attempts: settings.max_attempts,
        allow_retake: true,
        requires_acknowledgement: settings.requires_acknowledgement,
        ai_generated: true,
        ai_model_used: "claude_sonnet_4_6",
        status: "Draft",
        created_by: staffProfile?.full_name || "Admin",
      });

      // Save modules
      for (const mod of (result.modules || [])) {
        await base44.entities.HRPolicyLearningModule.create({
          org_id: ORG_ID,
          course_id: course.id,
          module_number: mod.module_number,
          module_title: mod.module_title,
          module_summary: mod.module_summary,
          learning_content: mod.learning_content,
          key_points: mod.key_points || [],
          staff_responsibilities: mod.staff_responsibilities || [],
          practical_example: mod.practical_example,
          compliance_reminder: mod.compliance_reminder,
          estimated_duration_minutes: mod.estimated_duration_minutes || 10,
          display_order: mod.module_number,
          is_required: true,
        });
      }

      // Save quiz questions
      let qOrder = 1;
      for (const q of (result.quiz_questions || [])) {
        await base44.entities.HRPolicyQuizQuestion.create({
          org_id: ORG_ID,
          course_id: course.id,
          question_type: q.question_type || "Multiple Choice",
          question_text: q.question_text,
          scenario_text: q.scenario_text || "",
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
          difficulty: q.difficulty || "Medium",
          points: 1,
          display_order: qOrder++,
          is_required: true,
        });
      }

      // Audit event
      await base44.entities.HRPolicyAuditEvent.create({
        org_id: ORG_ID,
        event_type: "AI Course Generated",
        entity_type: "HRPolicyLearningCourse",
        entity_id: course.id,
        policy_id: selectedPolicy.id,
        policy_title: selectedPolicy.policy_title,
        course_id: course.id,
        course_title: course.course_title,
        performed_by: staffProfile?.full_name || "Admin",
        event_description: `AI e-learning course generated for policy: ${selectedPolicy.policy_title}`,
      });

      setGeneratedCourse({ ...course, moduleCount: result.modules?.length || 0, questionCount: result.quiz_questions?.length || 0 });
      toast.success("AI learning course created successfully!");
    } catch (e) {
      console.error(e);
      await base44.entities.HRPolicyAuditEvent.create({
        org_id: ORG_ID,
        event_type: "AI Generation Failed",
        policy_id: selectedPolicy?.id,
        policy_title: selectedPolicy?.policy_title,
        performed_by: staffProfile?.full_name || "Admin",
        event_description: `AI generation failed: ${e.message}`,
      }).catch(() => {});
      setGenerationError(e.message || "Unknown error occurred");
      toast.error("Course generation failed. Please try again.");
    }
    setGenerating(false);
  };

  const canProceed = () => {
    if (step === 0) return !!selectedPolicy;
    if (step === 1) return policyText.trim().length > 50;
    if (step === 2) return settings.course_title.trim().length > 3;
    return true;
  };

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-white text-base">Create AI Learning Course</h2>
              <p className="text-violet-200 text-xs">Convert a policy into an interactive e-learning course</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-6 py-3 bg-slate-50 border-b border-slate-200 gap-0">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-0">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${i === step ? "bg-violet-100 text-violet-700" : i < step ? "text-green-600" : "text-slate-400"}`}>
                {i < step ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[10px]">{i + 1}</span>}
                {s}
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-slate-300 mx-1" />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* Step 0: Select Policy */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Step 1 — Select a Policy</h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={policySearch} onChange={e => setPolicySearch(e.target.value)} placeholder="Search policies…" className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {loadingPolicies && <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>}
                {!loadingPolicies && filteredPolicies.length === 0 && <p className="text-sm text-slate-400 text-center py-8">No policies found. Upload a policy first or use "Seed Demo Data" to generate sample policies.</p>}
                {filteredPolicies.map(p => {
                  const isSelected = selectedPolicy?.id === p.id;
                  return (
                    <button key={p.id} onClick={() => handleSelectPolicy(p)}
                      className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${isSelected ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-violet-200 hover:bg-slate-50"}`}>
                      <FileText className={`w-5 h-5 shrink-0 ${isSelected ? "text-violet-500" : "text-red-400"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-800 truncate">{p.policy_title}</p>
                        <p className="text-xs text-slate-500">{p.category} · v{p.current_version_number || "1.0"} · {p.status}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-violet-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {selectedPolicy && (
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2">
                  <h4 className="font-bold text-violet-800 text-sm">Selected Policy Details</h4>
                  {[
                    ["Title", selectedPolicy.policy_title],
                    ["Category", selectedPolicy.category],
                    ["Version", `v${selectedPolicy.current_version_number || "1.0"}`],
                    ["Status", selectedPolicy.status],
                    ["Has File", selectedPolicy.current_file_url ? "Yes — PDF available" : "No file uploaded"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-violet-600 font-medium">{k}</span>
                      <span className="text-violet-900 font-semibold">{v || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 1: Policy Text */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Step 2 — Policy Text</h3>
              <p className="text-xs text-slate-500">We need the policy text to generate the course. We'll try to extract it from the PDF automatically, or you can paste it manually.</p>

              {selectedPolicy?.current_file_url && !extractFailed && (
                <button onClick={handleExtract} disabled={extracting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                  {extracting ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting text from PDF…</> : <><FileText className="w-4 h-4" /> Extract PDF Text</>}
                </button>
              )}

              {extractFailed && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">We could not extract readable text from this PDF. Please upload a searchable PDF or paste the policy text manually below.</p>
                  </div>
                </div>
              )}

              {policyText && !extractFailed && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-700 font-semibold">✓ Text extracted ({policyText.length.toLocaleString()} characters)</p>
                  <p className="text-xs text-green-600 mt-1 line-clamp-3">{policyText.substring(0, 200)}…</p>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 block">Policy Text (paste or edit)</label>
                <textarea value={policyText} onChange={e => setPolicyText(e.target.value)}
                  rows={12}
                  placeholder="Paste the full policy text here, or use the Extract button above to pull it from the PDF…"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
                <p className="text-xs text-slate-400 mt-1">{policyText.length.toLocaleString()} characters</p>
              </div>
            </div>
          )}

          {/* Step 2: Settings */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Step 3 — Course Settings</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Course Title *</label>
                  <input value={settings.course_title} onChange={e => setSettings(s => ({ ...s, course_title: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-1 block">Target Audience</label>
                  <input value={settings.target_audience} onChange={e => setSettings(s => ({ ...s, target_audience: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "num_modules", label: "Number of Modules", min: 2, max: 10 },
                    { key: "num_questions", label: "Quiz Questions", min: 5, max: 20 },
                    { key: "pass_mark", label: "Pass Mark (%)", min: 50, max: 100 },
                    { key: "max_attempts", label: "Max Attempts", min: 1, max: 5 },
                    { key: "estimated_duration", label: "Duration (mins)", min: 15, max: 180 },
                  ].map(({ key, label, min, max }) => (
                    <div key={key}>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">{label}</label>
                      <input type="number" min={min} max={max} value={settings[key]}
                        onChange={e => setSettings(s => ({ ...s, [key]: Number(e.target.value) }))}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                    </div>
                  ))}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Final Acknowledgement</label>
                    <select value={settings.requires_acknowledgement ? "yes" : "no"}
                      onChange={e => setSettings(s => ({ ...s, requires_acknowledgement: e.target.value === "yes" }))}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300">
                      <option value="yes">Yes — Required</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 mb-2 block">Tone & Style</label>
                  <div className="space-y-2">
                    {TONE_OPTIONS.map(t => (
                      <label key={t.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${settings.tone === t.value ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:bg-slate-50"}`}>
                        <input type="radio" value={t.value} checked={settings.tone === t.value} onChange={e => setSettings(s => ({ ...s, tone: e.target.value }))} className="accent-violet-600" />
                        <span className="text-sm text-slate-700">{t.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Generate */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Step 4 — Generate Course</h3>

              {generationError && !generating && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-2">
                  <p className="text-xs font-semibold text-red-700 mb-1">Generation failed</p>
                  <p className="text-xs text-red-600">{generationError}</p>
                  <p className="text-xs text-red-500 mt-1">Please try again. If the error persists, try shortening the policy text.</p>
                </div>
              )}

              {!generatedCourse && !generating && (
                <div className="space-y-4">
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide">Course Summary</h4>
                    {[
                      ["Policy", selectedPolicy?.policy_title],
                      ["Course Title", settings.course_title],
                      ["Modules", settings.num_modules],
                      ["Quiz Questions", settings.num_questions],
                      ["Pass Mark", `${settings.pass_mark}%`],
                      ["Max Attempts", settings.max_attempts],
                      ["Duration", `~${settings.estimated_duration} mins`],
                      ["Acknowledgement Required", settings.requires_acknowledgement ? "Yes" : "No"],
                      ["Policy Text", `${policyText.length.toLocaleString()} characters`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs border-b border-slate-100 pb-1 last:border-0">
                        <span className="text-slate-500">{k}</span>
                        <span className="font-semibold text-slate-700">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                    <p className="text-xs text-violet-700 leading-relaxed">
                      <strong>Note:</strong> This will use AI (Claude Sonnet) to generate a full e-learning course from your policy text. 
                      The generated course will remain in <strong>Draft</strong> status until you review and publish it. 
                      This uses integration credits.
                    </p>
                  </div>
                  <button onClick={handleGenerate}
                    className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg">
                    <Sparkles className="w-5 h-5" /> Generate AI Learning Course
                  </button>
                </div>
              )}

              {generating && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-violet-600 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-slate-800">Generating e-learning content…</p>
                    <p className="text-sm text-slate-500 mt-1">Converting your policy into modules, learning content, and quiz questions. This may take a moment. Please do not close this panel.</p>
                  </div>
                </div>
              )}

              {generatedCourse && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-300 rounded-2xl p-5 text-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
                    <h4 className="font-bold text-green-800 text-base">Course Created Successfully!</h4>
                    <p className="text-sm text-green-600 mt-1">{generatedCourse.course_title}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Modules", value: generatedCourse.moduleCount },
                      { label: "Quiz Questions", value: generatedCourse.questionCount },
                      { label: "Status", value: "Draft" },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-slate-50 rounded-xl p-3 text-center">
                        <div className="font-bold text-slate-800 text-lg">{value}</div>
                        <div className="text-xs text-slate-500">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-700">The course is now in <strong>Draft</strong> status. Review and edit it in the AI Learning Courses tab, then publish before assigning to staff.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { onCreated && onCreated(); onClose(); }}
                      className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors">
                      View Course & Edit
                    </button>
                    <button onClick={() => { onCreated && onCreated(); onClose(); }}
                      className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
                      Assign to Staff Later
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer navigation — hidden while generating or after success */}
        {!generatedCourse && !generating && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-between items-center bg-slate-50">
            <button onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors">
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? "Cancel" : "Back"}
            </button>
            {step < 3 && (
              <button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}
                className="flex items-center gap-1.5 px-5 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-40 transition-colors">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}