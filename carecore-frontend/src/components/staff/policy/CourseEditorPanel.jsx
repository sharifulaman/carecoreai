import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { ArrowLeft, Save, CheckCircle2, BookOpen, HelpCircle, Brain, Edit2, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export default function CourseEditorPanel({ course, staffProfile, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState("overview");
  const [saving, setSaving] = useState(false);
  const [courseData, setCourseData] = useState({ ...course });

  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ["course-modules", course.id],
    queryFn: () => base44.entities.HRPolicyLearningModule.filter({ course_id: course.id }, "display_order", 50),
    staleTime: 30000,
  });

  const { data: questions = [], isLoading: loadingQs } = useQuery({
    queryKey: ["course-questions", course.id],
    queryFn: () => base44.entities.HRPolicyQuizQuestion.filter({ course_id: course.id }, "display_order", 50),
    staleTime: 30000,
  });

  const [editingModule, setEditingModule] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);

  const handleSaveCourse = async () => {
    setSaving(true);
    await base44.entities.HRPolicyLearningCourse.update(course.id, {
      course_title: courseData.course_title,
      course_summary: courseData.course_summary,
      target_audience: courseData.target_audience,
      estimated_duration_minutes: courseData.estimated_duration_minutes,
      pass_mark_percentage: courseData.pass_mark_percentage,
      max_attempts: courseData.max_attempts,
      requires_acknowledgement: courseData.requires_acknowledgement,
      learning_objectives: courseData.learning_objectives,
      reviewer_notes: courseData.reviewer_notes,
    });
    await base44.entities.HRPolicyAuditEvent.create({
      org_id: ORG_ID,
      event_type: "Course Edited",
      entity_id: course.id,
      policy_id: course.policy_id,
      policy_title: course.policy_title,
      course_id: course.id,
      course_title: courseData.course_title,
      performed_by: staffProfile?.full_name || "Admin",
      event_description: `Course edited: ${courseData.course_title}`,
    }).catch(() => {});
    toast.success("Course saved");
    setSaving(false);
    queryClient.invalidateQueries({ queryKey: ["ai-learning-courses"] });
  };

  const handleSaveModule = async (mod) => {
    if (mod.id) {
      await base44.entities.HRPolicyLearningModule.update(mod.id, mod);
    } else {
      await base44.entities.HRPolicyLearningModule.create({ ...mod, org_id: ORG_ID, course_id: course.id });
    }
    queryClient.invalidateQueries({ queryKey: ["course-modules", course.id] });
    setEditingModule(null);
    toast.success("Module saved");
  };

  const handleSaveQuestion = async (q) => {
    if (q.id) {
      await base44.entities.HRPolicyQuizQuestion.update(q.id, q);
    } else {
      await base44.entities.HRPolicyQuizQuestion.create({ ...q, org_id: ORG_ID, course_id: course.id });
    }
    queryClient.invalidateQueries({ queryKey: ["course-questions", course.id] });
    setEditingQuestion(null);
    toast.success("Question saved");
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm("Delete this question?")) return;
    await base44.entities.HRPolicyQuizQuestion.delete(qId);
    queryClient.invalidateQueries({ queryKey: ["course-questions", course.id] });
  };

  const handleSubmitForReview = async () => {
    await base44.entities.HRPolicyLearningCourse.update(course.id, { status: "Under Review" });
    await base44.entities.HRPolicyAuditEvent.create({
      org_id: ORG_ID, event_type: "Submitted for Review",
      course_id: course.id, course_title: course.course_title,
      policy_id: course.policy_id, policy_title: course.policy_title,
      performed_by: staffProfile?.full_name,
      event_description: "Course submitted for review",
    }).catch(() => {});
    toast.success("Course submitted for review");
    onSaved();
  };

  const handleApprove = async () => {
    await base44.entities.HRPolicyLearningCourse.update(course.id, { status: "Approved", approved_by: staffProfile?.full_name, approved_at: new Date().toISOString() });
    toast.success("Course approved");
    onSaved();
  };

  const objStr = (courseData.learning_objectives || []).join("\n");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Brain className="w-4 h-4 text-violet-500" /> {courseData.course_title}</h3>
            <p className="text-xs text-slate-500">Policy: {course.policy_title} · {course.status}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSaveCourse} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save Draft
          </button>
          {course.status === "Draft" && <button onClick={handleSubmitForReview} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700"><CheckCircle2 className="w-3.5 h-3.5" /> Submit for Review</button>}
          {course.status === "Under Review" && <button onClick={handleApprove} className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 text-white rounded-xl text-xs font-semibold hover:bg-teal-700"><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200 overflow-x-auto scrollbar-none">
        {[{ key: "overview", label: "Overview", icon: Brain }, { key: "modules", label: `Modules (${modules.length})`, icon: BookOpen }, { key: "quiz", label: `Quiz (${questions.length} Qs)`, icon: HelpCircle }].map(t => (
          <button key={t.key} onClick={() => setActiveSection(t.key)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${activeSection === t.key ? "border-violet-500 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === "overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            {[
              { key: "course_title", label: "Course Title", type: "text" },
              { key: "target_audience", label: "Target Audience", type: "text" },
              { key: "estimated_duration_minutes", label: "Est. Duration (mins)", type: "number" },
              { key: "pass_mark_percentage", label: "Pass Mark (%)", type: "number" },
              { key: "max_attempts", label: "Max Quiz Attempts", type: "number" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
                <input type={type} value={courseData[key] || ""} onChange={e => setCourseData(d => ({ ...d, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-200" />
              </div>
            ))}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Requires Final Acknowledgement</label>
              <select value={courseData.requires_acknowledgement ? "yes" : "no"} onChange={e => setCourseData(d => ({ ...d, requires_acknowledgement: e.target.value === "yes" }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Course Summary</label>
              <textarea rows={4} value={courseData.course_summary || ""} onChange={e => setCourseData(d => ({ ...d, course_summary: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Learning Objectives (one per line)</label>
              <textarea rows={6} value={objStr} onChange={e => setCourseData(d => ({ ...d, learning_objectives: e.target.value.split("\n").filter(Boolean) }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none font-mono" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">Reviewer Notes</label>
              <textarea rows={3} value={courseData.reviewer_notes || ""} onChange={e => setCourseData(d => ({ ...d, reviewer_notes: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" />
            </div>
          </div>
        </div>
      )}

      {/* Modules */}
      {activeSection === "modules" && (
        <div className="space-y-3">
          {loadingModules && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-500" /></div>}
          {modules.map((mod, idx) => (
            <ModuleCard key={mod.id} mod={mod} idx={idx} onSave={handleSaveModule} />
          ))}
          <button onClick={() => setEditingModule({ module_number: modules.length + 1, module_title: "", module_summary: "", learning_content: "", key_points: [], staff_responsibilities: [], practical_example: "", compliance_reminder: "", estimated_duration_minutes: 10, display_order: modules.length + 1, is_required: true })}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors">
            <Plus className="w-4 h-4" /> Add Module
          </button>
          {editingModule && <ModuleEditModal mod={editingModule} onSave={handleSaveModule} onClose={() => setEditingModule(null)} />}
        </div>
      )}

      {/* Quiz */}
      {activeSection === "quiz" && (
        <div className="space-y-3">
          {loadingQs && <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-500" /></div>}
          {questions.map((q, idx) => (
            <QuestionCard key={q.id} q={q} idx={idx} onSave={handleSaveQuestion} onDelete={() => handleDeleteQuestion(q.id)} />
          ))}
          <button onClick={() => setEditingQuestion({ question_type: "Multiple Choice", question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_answer: "A", explanation: "", difficulty: "Medium", points: 1, display_order: questions.length + 1, is_required: true })}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-sm text-slate-500 hover:border-violet-300 hover:text-violet-600 transition-colors">
            <Plus className="w-4 h-4" /> Add Question
          </button>
          {editingQuestion && <QuestionEditModal q={editingQuestion} onSave={handleSaveQuestion} onClose={() => setEditingQuestion(null)} />}
        </div>
      )}
    </div>
  );
}

function ModuleCard({ mod, idx, onSave }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState({ ...mod });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(data);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors" onClick={() => setExpanded(e => !e)}>
        <div className="w-7 h-7 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">{mod.module_number || idx + 1}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800">{mod.module_title}</p>
          <p className="text-xs text-slate-500">{mod.estimated_duration_minutes} mins · {mod.key_points?.length || 0} key points</p>
        </div>
        <button onClick={e => { e.stopPropagation(); setEditing(true); setExpanded(true); }} className="p-1.5 hover:bg-violet-50 rounded-lg text-violet-500">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {expanded && !editing && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3 text-xs">
          {mod.module_summary && <p className="text-slate-600 italic">{mod.module_summary}</p>}
          {mod.learning_content && <div><p className="font-bold text-slate-500 mb-1">Content</p><p className="text-slate-700 whitespace-pre-wrap">{mod.learning_content}</p></div>}
          {mod.key_points?.length > 0 && <div><p className="font-bold text-slate-500 mb-1">Key Points</p><ul className="space-y-1">{mod.key_points.map((k, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-violet-500 font-bold">·</span>{k}</li>)}</ul></div>}
          {mod.practical_example && <div><p className="font-bold text-slate-500 mb-1">Practical Example</p><p className="text-slate-700 bg-amber-50 border border-amber-100 rounded-lg p-2">{mod.practical_example}</p></div>}
          {mod.compliance_reminder && <div><p className="font-bold text-slate-500 mb-1">Compliance Reminder</p><p className="text-slate-700 bg-blue-50 border border-blue-100 rounded-lg p-2">{mod.compliance_reminder}</p></div>}
        </div>
      )}
      {expanded && editing && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3">
          {[{ key: "module_title", label: "Module Title" }, { key: "module_summary", label: "Module Summary" }].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
              <input value={data[key] || ""} onChange={e => setData(d => ({ ...d, [key]: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" />
            </div>
          ))}
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Learning Content</label>
            <textarea rows={5} value={data.learning_content || ""} onChange={e => setData(d => ({ ...d, learning_content: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Key Points (one per line)</label>
            <textarea rows={3} value={(data.key_points || []).join("\n")} onChange={e => setData(d => ({ ...d, key_points: e.target.value.split("\n").filter(Boolean) }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Staff Responsibilities (one per line)</label>
            <textarea rows={3} value={(data.staff_responsibilities || []).join("\n")} onChange={e => setData(d => ({ ...d, staff_responsibilities: e.target.value.split("\n").filter(Boolean) }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Practical Example</label>
            <textarea rows={2} value={data.practical_example || ""} onChange={e => setData(d => ({ ...d, practical_example: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 mb-1 block">Compliance Reminder</label>
            <textarea rows={2} value={data.compliance_reminder || ""} onChange={e => setData(d => ({ ...d, compliance_reminder: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 disabled:opacity-60">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ModuleEditModal({ mod, onSave, onClose }) {
  const [data, setData] = useState({ ...mod });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => { setSaving(true); await onSave(data); setSaving(false); };
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm">New Module</h3>
          <button onClick={onClose}><BookOpen className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          {[{ key: "module_title", label: "Module Title *" }, { key: "module_summary", label: "Module Summary" }].map(({ key, label }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-500 mb-1 block">{label}</label>
              <input value={data[key] || ""} onChange={e => setData(d => ({ ...d, [key]: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" />
            </div>
          ))}
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Learning Content</label>
            <textarea rows={5} value={data.learning_content || ""} onChange={e => setData(d => ({ ...d, learning_content: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving || !data.module_title} className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-50">{saving ? "Saving…" : "Save Module"}</button>
            <button onClick={onClose} className="px-4 border border-slate-200 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionCard({ q, idx, onSave, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState({ ...q });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => { setSaving(true); await onSave(data); setSaving(false); setEditing(false); };
  const answerLabel = { A: q.option_a, B: q.option_b, C: q.option_c, D: q.option_d }[q.correct_answer];
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1">
          <span className="w-6 h-6 bg-violet-100 text-violet-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{q.display_order || idx + 1}</span>
          <div className="flex-1">
            {q.scenario_text && <p className="text-xs text-slate-500 italic mb-1 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">{q.scenario_text}</p>}
            <p className="text-sm font-medium text-slate-800">{q.question_text}</p>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {["A", "B", "C", "D"].map(opt => q[`option_${opt.toLowerCase()}`] && (
                <div key={opt} className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1.5 ${q.correct_answer === opt ? "bg-green-100 text-green-700 font-bold" : "bg-slate-50 text-slate-600"}`}>
                  <span className="font-bold">{opt}.</span> {q[`option_${opt.toLowerCase()}`]}
                </div>
              ))}
            </div>
            {q.explanation && <p className="text-xs text-blue-600 mt-1 italic">Explanation: {q.explanation}</p>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{q.difficulty}</span>
          <button onClick={() => setEditing(e => !e)} className="p-1 hover:bg-violet-50 rounded-lg text-violet-500"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded-lg text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      {editing && (
        <div className="border-t border-slate-100 pt-3 space-y-3">
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Question Type</label>
            <select value={data.question_type} onChange={e => setData(d => ({ ...d, question_type: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none">
              {["Multiple Choice", "Scenario Based", "True or False", "Multi Select"].map(t => <option key={t}>{t}</option>)}
            </select></div>
          {["Scenario Based"].includes(data.question_type) && <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Scenario</label>
            <textarea rows={2} value={data.scenario_text || ""} onChange={e => setData(d => ({ ...d, scenario_text: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none" /></div>}
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Question *</label>
            <textarea rows={2} value={data.question_text || ""} onChange={e => setData(d => ({ ...d, question_text: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none" /></div>
          <div className="grid grid-cols-2 gap-2">
            {["A", "B", "C", "D"].map(opt => (
              <div key={opt}><label className="text-xs font-semibold text-slate-500 mb-1 block">Option {opt}</label>
                <input value={data[`option_${opt.toLowerCase()}`] || ""} onChange={e => setData(d => ({ ...d, [`option_${opt.toLowerCase()}`]: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none" /></div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Correct Answer</label>
              <select value={data.correct_answer} onChange={e => setData(d => ({ ...d, correct_answer: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none">
                {["A", "B", "C", "D"].map(o => <option key={o}>{o}</option>)}
              </select></div>
            <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Difficulty</label>
              <select value={data.difficulty} onChange={e => setData(d => ({ ...d, difficulty: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none">
                {["Easy", "Medium", "Hard"].map(d => <option key={d}>{d}</option>)}
              </select></div>
          </div>
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Explanation</label>
            <textarea rows={2} value={data.explanation || ""} onChange={e => setData(d => ({ ...d, explanation: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none resize-none" /></div>
          <div className="flex gap-2"><button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-2 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700">{saving ? "Saving…" : "Save"}</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 border border-slate-200 rounded-xl text-xs">Cancel</button></div>
        </div>
      )}
    </div>
  );
}

function QuestionEditModal({ q, onSave, onClose }) {
  const [data, setData] = useState({ ...q });
  const [saving, setSaving] = useState(false);
  const handleSave = async () => { setSaving(true); await onSave(data); setSaving(false); };
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm">New Quiz Question</h3>
          <button onClick={onClose}><HelpCircle className="w-4 h-4 text-slate-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Question Type</label>
            <select value={data.question_type} onChange={e => setData(d => ({ ...d, question_type: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              {["Multiple Choice", "Scenario Based", "True or False"].map(t => <option key={t}>{t}</option>)}</select></div>
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Question *</label>
            <textarea rows={3} value={data.question_text || ""} onChange={e => setData(d => ({ ...d, question_text: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" /></div>
          <div className="grid grid-cols-2 gap-2">{["A","B","C","D"].map(o => (
            <div key={o}><label className="text-xs font-semibold text-slate-500 mb-1 block">Option {o}</label>
              <input value={data[`option_${o.toLowerCase()}`] || ""} onChange={e => setData(d => ({ ...d, [`option_${o.toLowerCase()}`]: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none" /></div>))}</div>
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Correct Answer</label>
            <select value={data.correct_answer} onChange={e => setData(d => ({ ...d, correct_answer: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
              {["A","B","C","D"].map(o => <option key={o}>{o}</option>)}</select></div>
          <div><label className="text-xs font-semibold text-slate-500 mb-1 block">Explanation</label>
            <textarea rows={2} value={data.explanation || ""} onChange={e => setData(d => ({ ...d, explanation: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none resize-none" /></div>
          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} disabled={saving || !data.question_text} className="flex-1 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-50">{saving ? "Saving…" : "Save Question"}</button>
            <button onClick={onClose} className="px-4 border border-slate-200 rounded-xl text-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}