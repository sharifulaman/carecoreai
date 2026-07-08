import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { BookOpen, Brain, CheckCircle2, Clock, Award, Loader2, Play, ChevronRight, Star, X } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  "Not Started": "bg-slate-100 text-slate-600",
  "In Progress": "bg-blue-100 text-blue-700",
  "Quiz Pending": "bg-amber-100 text-amber-700",
  Failed: "bg-red-100 text-red-700",
  Passed: "bg-teal-100 text-teal-700",
  "Acknowledgement Pending": "bg-orange-100 text-orange-700",
  Completed: "bg-green-100 text-green-700",
  Overdue: "bg-red-100 text-red-700",
};

function CoursePlayer({ course, modules, questions, assignment, progress, staffProfile, onClose, onCompleted }) {
  const queryClient = useQueryClient();
  const [activeStep, setActiveStep] = useState("overview"); // "overview" | moduleId | "quiz" | "ack"
  const [completedModuleIds, setCompletedModuleIds] = useState(progress?.completed_module_ids || []);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [sigName, setSigName] = useState(staffProfile?.full_name || "");
  const [acknowledging, setAcknowledging] = useState(false);

  const allModulesDone = modules.every(m => completedModuleIds.includes(m.id));
  const quizUnlocked = allModulesDone;

  const handleMarkModuleDone = async (moduleId) => {
    if (completedModuleIds.includes(moduleId)) return;
    const newCompleted = [...completedModuleIds, moduleId];
    setCompletedModuleIds(newCompleted);
    const totalModules = modules.length;
    const doneCount = newCompleted.length;
    const pct = Math.round((doneCount / totalModules) * 100);
    const isAllDone = doneCount === totalModules;
    const now = new Date().toISOString();

    if (progress?.id) {
      await base44.entities.HRPolicyLearningProgress.update(progress.id, {
        completed_module_ids: newCompleted,
        completed_modules_count: doneCount,
        progress_percentage: pct,
        last_accessed_at: now,
        status: isAllDone ? "Quiz Pending" : "In Progress",
      });
    } else {
      await base44.entities.HRPolicyLearningProgress.create({
        org_id: ORG_ID,
        assignment_id: assignment.id,
        course_id: course.id,
        policy_id: assignment.policy_id,
        staff_id: staffProfile.id || staffProfile.user_id,
        started_at: now,
        last_accessed_at: now,
        completed_module_ids: newCompleted,
        completed_modules_count: doneCount,
        total_modules_count: totalModules,
        progress_percentage: pct,
        status: isAllDone ? "Quiz Pending" : "In Progress",
      });
    }
    if (isAllDone) {
      await base44.entities.HRPolicyLearningAssignment.update(assignment.id, { status: "Quiz Pending" });
    } else {
      await base44.entities.HRPolicyLearningAssignment.update(assignment.id, { status: "In Progress" });
    }
    await base44.entities.HRPolicyAuditEvent.create({
      org_id: ORG_ID,
      event_type: "Module Completed",
      course_id: course.id,
      course_title: course.course_title,
      staff_id: staffProfile.id,
      staff_name: staffProfile.full_name,
      performed_by: staffProfile.full_name,
      event_description: `Module completed`,
    }).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["my-learning"] });
    toast.success("Module marked complete!");
    if (isAllDone) setActiveStep("quiz");
  };

  const handleSubmitQuiz = async () => {
    setSubmitting(true);
    const correct = questions.filter(q => selectedAnswers[q.id] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (course.pass_mark_percentage || 80);
    const now = new Date().toISOString();
    const attemptNum = (progress?.quiz_attempts || 0) + 1;

    const attempt = await base44.entities.HRPolicyQuizAttempt.create({
      org_id: ORG_ID,
      assignment_id: assignment.id,
      course_id: course.id,
      policy_id: assignment.policy_id,
      staff_id: staffProfile.id,
      staff_name: staffProfile.full_name,
      attempt_number: attemptNum,
      started_at: now,
      submitted_at: now,
      score_percentage: score,
      total_questions: questions.length,
      correct_answers: correct,
      incorrect_answers: questions.length - correct,
      passed,
      answers: Object.entries(selectedAnswers).map(([qid, ans]) => ({
        question_id: qid,
        selected_answer: ans,
        is_correct: ans === questions.find(q => q.id === qid)?.correct_answer,
      })),
    });

    if (progress?.id) {
      await base44.entities.HRPolicyLearningProgress.update(progress.id, {
        quiz_attempts: attemptNum,
        latest_score: score,
        highest_score: Math.max(score, progress.highest_score || 0),
        quiz_passed: passed,
        passed_at: passed ? now : null,
        status: passed ? (course.requires_acknowledgement ? "Acknowledgement Pending" : "Completed") : "Failed",
      });
    }

    const newStatus = passed ? (course.requires_acknowledgement ? "Acknowledgement Pending" : "Completed") : (attemptNum >= (course.max_attempts || 3) ? "Failed" : "In Progress");
    await base44.entities.HRPolicyLearningAssignment.update(assignment.id, { status: newStatus, ...(passed ? { completed_at: now } : {}) });

    await base44.entities.HRPolicyAuditEvent.create({
      org_id: ORG_ID,
      event_type: passed ? "Quiz Passed" : "Quiz Failed",
      course_id: course.id,
      course_title: course.course_title,
      staff_id: staffProfile.id,
      staff_name: staffProfile.full_name,
      performed_by: staffProfile.full_name,
      event_description: `Quiz ${passed ? "passed" : "failed"} with score ${score}%`,
    }).catch(() => {});

    setQuizResult({ score, passed, correct, total: questions.length });
    setQuizSubmitted(true);
    setSubmitting(false);
    queryClient.invalidateQueries({ queryKey: ["my-learning"] });
  };

  const handleAcknowledge = async () => {
    if (!ackChecked || !sigName.trim()) { toast.error("Please confirm and enter your name"); return; }
    setAcknowledging(true);
    const now = new Date().toISOString();
    await base44.entities.HRPolicyELearningAck.create({
      org_id: ORG_ID,
      assignment_id: assignment.id,
      policy_id: assignment.policy_id,
      course_id: course.id,
      staff_id: staffProfile.id,
      staff_name: staffProfile.full_name,
      policy_version: assignment.policy_version,
      policy_title: assignment.policy_title,
      course_title: course.course_title,
      acknowledgement_type: "Quiz Passed and Acknowledged",
      acknowledgement_text: "I confirm that I have read, understood, and completed the learning for this policy. I understand my responsibilities under this policy and agree to follow the required procedures.",
      quiz_required: true,
      quiz_passed: true,
      final_score: quizResult?.score,
      acknowledged: true,
      acknowledged_at: now,
      signature_name: sigName,
    });
    await base44.entities.HRPolicyLearningAssignment.update(assignment.id, { status: "Completed", completed_at: now });
    await base44.entities.HRPolicyAuditEvent.create({
      org_id: ORG_ID,
      event_type: "Policy Acknowledged",
      course_id: course.id,
      course_title: course.course_title,
      policy_id: assignment.policy_id,
      policy_title: assignment.policy_title,
      staff_id: staffProfile.id,
      staff_name: staffProfile.full_name,
      performed_by: staffProfile.full_name,
      event_description: "Policy e-learning acknowledged after quiz pass",
    }).catch(() => {});
    toast.success("Policy acknowledged! Course completed.");
    setAcknowledging(false);
    queryClient.invalidateQueries({ queryKey: ["my-learning"] });
    onCompleted?.();
    onClose();
  };

  const activeModule = modules.find(m => m.id === activeStep);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0">
        <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        <div className="flex-1">
          <h2 className="font-bold text-white text-sm">{course.course_title}</h2>
          <p className="text-violet-200 text-xs">{assignment.policy_title} · {completedModuleIds.length}/{modules.length} modules</p>
        </div>
        <div className="text-xs text-white/80">{Math.round((completedModuleIds.length / Math.max(1, modules.length)) * 100)}% complete</div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: module list */}
        <div className="w-56 border-r border-slate-200 overflow-y-auto py-4 shrink-0 bg-slate-50">
          <button onClick={() => setActiveStep("overview")} className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors ${activeStep === "overview" ? "bg-violet-50 text-violet-700 font-bold" : "text-slate-600 hover:bg-slate-100"}`}>
            <Brain className="w-3.5 h-3.5" /> Course Overview
          </button>
          <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-2">Modules</div>
          {modules.map((m, i) => {
            const done = completedModuleIds.includes(m.id);
            return (
              <button key={m.id} onClick={() => setActiveStep(m.id)} className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors ${activeStep === m.id ? "bg-violet-50 text-violet-700 font-bold" : "text-slate-600 hover:bg-slate-100"}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" /> : <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0 flex items-center justify-center text-[9px]">{i + 1}</span>}
                <span className="truncate">{m.module_title}</span>
              </button>
            );
          })}
          <button disabled={!quizUnlocked} onClick={() => setActiveStep("quiz")} className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors mt-2 ${activeStep === "quiz" ? "bg-violet-50 text-violet-700 font-bold" : quizUnlocked ? "text-slate-600 hover:bg-slate-100" : "text-slate-300 cursor-not-allowed"}`}>
            <Award className="w-3.5 h-3.5" /> Quiz {!quizUnlocked && "(complete modules first)"}
          </button>
          {quizResult?.passed && course.requires_acknowledgement && (
            <button onClick={() => setActiveStep("ack")} className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors ${activeStep === "ack" ? "bg-violet-50 text-violet-700 font-bold" : "text-slate-600 hover:bg-slate-100"}`}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledgement
            </button>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview */}
          {activeStep === "overview" && (
            <div className="max-w-2xl space-y-4">
              <h2 className="text-xl font-bold text-slate-800">{course.course_title}</h2>
              {course.course_summary && <p className="text-slate-600">{course.course_summary}</p>}
              <div className="grid grid-cols-3 gap-3">
                {[["Duration", `~${course.estimated_duration_minutes} mins`], ["Modules", modules.length], ["Pass Mark", `${course.pass_mark_percentage}%`]].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl p-3 text-center">
                    <div className="font-bold text-slate-700 text-lg">{v}</div>
                    <div className="text-xs text-slate-500">{k}</div>
                  </div>
                ))}
              </div>
              {course.learning_objectives?.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-700 mb-2 text-sm">Learning Objectives</h3>
                  <ul className="space-y-1.5">
                    {course.learning_objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button onClick={() => setActiveStep(modules[0]?.id || "quiz")} className="flex items-center gap-2 px-5 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors">
                <Play className="w-4 h-4" /> Start Course
              </button>
            </div>
          )}

          {/* Module */}
          {activeModule && (
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-violet-100 text-violet-700 rounded-lg text-xs font-bold">Module {activeModule.module_number}</span>
                {completedModuleIds.includes(activeModule.id) && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold">✓ Completed</span>}
              </div>
              <h2 className="text-xl font-bold text-slate-800">{activeModule.module_title}</h2>
              {activeModule.module_summary && <p className="text-slate-600 italic">{activeModule.module_summary}</p>}
              {activeModule.learning_content && (
                <div className="text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">{activeModule.learning_content}</div>
              )}
              {activeModule.key_points?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <h4 className="font-bold text-blue-800 text-sm mb-2">Key Points</h4>
                  <ul className="space-y-1">{activeModule.key_points.map((k, i) => <li key={i} className="flex items-start gap-2 text-sm text-blue-700"><span className="font-bold">·</span>{k}</li>)}</ul>
                </div>
              )}
              {activeModule.staff_responsibilities?.length > 0 && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                  <h4 className="font-bold text-teal-800 text-sm mb-2">Your Responsibilities</h4>
                  <ul className="space-y-1">{activeModule.staff_responsibilities.map((r, i) => <li key={i} className="flex items-start gap-2 text-sm text-teal-700"><CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />{r}</li>)}</ul>
                </div>
              )}
              {activeModule.practical_example && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-bold text-amber-800 text-sm mb-1">Practical Example</h4>
                  <p className="text-sm text-amber-700">{activeModule.practical_example}</p>
                </div>
              )}
              {activeModule.compliance_reminder && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-600 text-sm mb-1">Compliance Reminder</h4>
                  <p className="text-sm text-slate-600">{activeModule.compliance_reminder}</p>
                </div>
              )}
              {!completedModuleIds.includes(activeModule.id) && (
                <button onClick={() => handleMarkModuleDone(activeModule.id)}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors">
                  <CheckCircle2 className="w-4 h-4" /> Mark Module Complete
                </button>
              )}
              {completedModuleIds.includes(activeModule.id) && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-bold text-center">✓ Module Completed</div>
                  {modules.findIndex(m => m.id === activeModule.id) < modules.length - 1 && (
                    <button onClick={() => setActiveStep(modules[modules.findIndex(m => m.id === activeModule.id) + 1].id)}
                      className="flex items-center gap-1 px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700">
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                  {allModulesDone && modules.findIndex(m => m.id === activeModule.id) === modules.length - 1 && (
                    <button onClick={() => setActiveStep("quiz")} className="flex items-center gap-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600">
                      Take Quiz <Award className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quiz */}
          {activeStep === "quiz" && (
            <div className="max-w-2xl space-y-4">
              {!quizStarted && !quizSubmitted && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-slate-800">Course Quiz</h2>
                  <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                    <p className="text-sm text-violet-700">{questions.length} questions · Pass mark: {course.pass_mark_percentage}% · Max {course.max_attempts} attempts</p>
                  </div>
                  <button onClick={() => setQuizStarted(true)} className="flex items-center gap-2 px-5 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700">
                    <Play className="w-4 h-4" /> Start Quiz
                  </button>
                </div>
              )}
              {quizStarted && !quizSubmitted && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-slate-800">Question {currentQ + 1} of {questions.length}</h2>
                    <div className="w-32 h-2 bg-slate-100 rounded-full"><div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} /></div>
                  </div>
                  {questions[currentQ] && (
                    <div className="space-y-3">
                      {questions[currentQ].scenario_text && <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 italic">{questions[currentQ].scenario_text}</div>}
                      <p className="font-semibold text-slate-800">{questions[currentQ].question_text}</p>
                      <div className="space-y-2">
                        {["A", "B", "C", "D"].map(opt => questions[currentQ][`option_${opt.toLowerCase()}`] && (
                          <button key={opt} onClick={() => setSelectedAnswers(a => ({ ...a, [questions[currentQ].id]: opt }))}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm transition-all ${selectedAnswers[questions[currentQ].id] === opt ? "border-violet-400 bg-violet-50 font-semibold text-violet-700" : "border-slate-200 hover:border-violet-200 hover:bg-slate-50"}`}>
                            <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0 ${selectedAnswers[questions[currentQ].id] === opt ? "border-violet-500 bg-violet-500 text-white" : "border-slate-300"}`}>{opt}</span>
                            {questions[currentQ][`option_${opt.toLowerCase()}`]}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-3 pt-2">
                        {currentQ > 0 && <button onClick={() => setCurrentQ(q => q - 1)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm">Previous</button>}
                        {currentQ < questions.length - 1 ? (
                          <button onClick={() => setCurrentQ(q => q + 1)} disabled={!selectedAnswers[questions[currentQ].id]} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-40">Next</button>
                        ) : (
                          <button onClick={handleSubmitQuiz} disabled={submitting || Object.keys(selectedAnswers).length < questions.length} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-40">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Submit Quiz
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {quizSubmitted && quizResult && (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-6 text-center ${quizResult.passed ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <div className={`text-4xl font-bold ${quizResult.passed ? "text-green-700" : "text-red-700"}`}>{quizResult.score}%</div>
                    <p className={`font-bold text-lg mt-2 ${quizResult.passed ? "text-green-800" : "text-red-800"}`}>{quizResult.passed ? "Congratulations! You passed!" : "Not passed — please try again"}</p>
                    <p className="text-sm mt-1 text-slate-600">{quizResult.correct} of {quizResult.total} correct</p>
                  </div>
                  {/* Show answers */}
                  <div className="space-y-3">
                    {questions.map((q, i) => {
                      const sel = selectedAnswers[q.id];
                      const correct = sel === q.correct_answer;
                      return (
                        <div key={q.id} className={`rounded-xl border p-4 text-sm ${correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                          <p className="font-semibold text-slate-800 mb-1">{i + 1}. {q.question_text}</p>
                          <p className={`text-xs ${correct ? "text-green-700" : "text-red-700"}`}>Your answer: {sel} · Correct: {q.correct_answer}</p>
                          {q.explanation && <p className="text-xs text-slate-600 mt-1 italic">{q.explanation}</p>}
                        </div>
                      );
                    })}
                  </div>
                  {quizResult.passed && course.requires_acknowledgement && (
                    <button onClick={() => setActiveStep("ack")} className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700">
                      Proceed to Acknowledgement <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Acknowledgement */}
          {activeStep === "ack" && (
            <div className="max-w-xl space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <h2 className="font-bold text-slate-800 text-lg">Policy Acknowledgement</h2>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-sm">
                {[["Staff Name", staffProfile?.full_name], ["Policy", assignment.policy_title], ["Policy Version", assignment.policy_version || "1.0"], ["Course", course.course_title], ["Completion Date", format(new Date(), "dd MMMM yyyy")], ["Final Score", `${quizResult?.score}%`]].map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800">{v || "—"}</span></div>
                ))}
              </div>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                <p className="text-sm text-violet-800 leading-relaxed">I confirm that I have read, understood, and completed the learning for this policy. I understand my responsibilities under this policy and agree to follow the required procedures.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-3 border border-slate-200 rounded-xl hover:bg-slate-50">
                <input type="checkbox" checked={ackChecked} onChange={e => setAckChecked(e.target.checked)} className="mt-0.5 accent-violet-600" />
                <span className="text-sm text-slate-700 font-medium">I confirm the above statement</span>
              </label>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1 block">Your Full Name (Signature) *</label>
                <input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Type your full name…" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
              </div>
              <button onClick={handleAcknowledge} disabled={!ackChecked || !sigName.trim() || acknowledging}
                className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 transition-colors">
                {acknowledging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Submit Acknowledgement
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyLearningTab({ staffProfile, refreshKey }) {
  const queryClient = useQueryClient();
  const [activeCourse, setActiveCourse] = useState(null);

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["my-learning", staffProfile?.id, refreshKey],
    queryFn: () => base44.entities.HRPolicyLearningAssignment.filter(
      { assigned_to_staff_id: staffProfile?.id || staffProfile?.user_id },
      "-created_date", 100
    ),
    staleTime: 30000,
    enabled: !!staffProfile,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["ai-learning-courses-pub"],
    queryFn: () => base44.entities.HRPolicyLearningCourse.filter({ org_id: ORG_ID }, "-created_date", 100),
    staleTime: 60000,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["my-progress", staffProfile?.id, refreshKey],
    queryFn: () => base44.entities.HRPolicyLearningProgress.filter({ staff_id: staffProfile?.id }, "-created_date", 100),
    staleTime: 30000,
    enabled: !!staffProfile,
  });

  const courseMap = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses]);
  const progressMap = useMemo(() => Object.fromEntries(progress.map(p => [p.assignment_id, p])), [progress]);

  const kpis = useMemo(() => {
    const inProgress = assignments.filter(a => a.status === "In Progress").length;
    const completed = assignments.filter(a => a.status === "Completed").length;
    const overdue = assignments.filter(a => a.due_date && a.due_date < new Date().toISOString().split("T")[0] && !["Completed", "Exempted"].includes(a.status)).length;
    return { total: assignments.length, inProgress, completed, overdue };
  }, [assignments]);

  // When opening a course, we need modules and questions
  const [courseModules, setCourseModules] = useState([]);
  const [courseQuestions, setCourseQuestions] = useState([]);
  const [loadingCourse, setLoadingCourse] = useState(false);

  const handleOpenCourse = async (assignment) => {
    const course = courseMap[assignment.course_id];
    if (!course) { toast.error("Course not found — it may have been removed or is not yet published."); return; }
    setLoadingCourse(true);
    const [mods, qs] = await Promise.all([
      base44.entities.HRPolicyLearningModule.filter({ course_id: course.id }, "display_order", 50),
      base44.entities.HRPolicyQuizQuestion.filter({ course_id: course.id }, "display_order", 50),
    ]);
    if (mods.length === 0 && qs.length === 0) {
      toast.error("This course has no content yet. An admin needs to add modules and quiz questions before it can be taken.");
      setLoadingCourse(false);
      return;
    }
    setCourseModules(mods);
    setCourseQuestions(qs);
    setActiveCourse({ course, assignment, progress: progressMap[assignment.id] });
    setLoadingCourse(false);
  };

  if (activeCourse) {
    return (
      <CoursePlayer
        course={activeCourse.course}
        modules={courseModules}
        questions={courseQuestions}
        assignment={activeCourse.assignment}
        progress={activeCourse.progress}
        staffProfile={staffProfile}
        onClose={() => { setActiveCourse(null); queryClient.invalidateQueries({ queryKey: ["my-learning"] }); }}
        onCompleted={() => { setActiveCourse(null); queryClient.invalidateQueries({ queryKey: ["my-learning"] }); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Assigned Courses", value: kpis.total, color: "bg-violet-50 text-violet-600" },
          { label: "In Progress", value: kpis.inProgress, color: "bg-blue-50 text-blue-600" },
          { label: "Completed", value: kpis.completed, color: "bg-green-50 text-green-600" },
          { label: "Overdue", value: kpis.overdue, color: "bg-red-50 text-red-600" },
        ].map(k => (
          <div key={k.label} className={`${k.color} rounded-2xl p-4`}>
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs font-semibold mt-0.5 opacity-80">{k.label}</div>
          </div>
        ))}
      </div>

      {isLoading && <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-violet-500" /></div>}

      {!isLoading && assignments.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
          <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No learning courses assigned to you yet.</p>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {assignments.map(assignment => {
          const course = courseMap[assignment.course_id];
          const prog = progressMap[assignment.id];
          const isOverdue = assignment.due_date && assignment.due_date < new Date().toISOString().split("T")[0] && !["Completed", "Exempted"].includes(assignment.status);
          const status = isOverdue && assignment.status !== "Completed" ? "Overdue" : assignment.status;
          return (
            <div key={assignment.id} className={`bg-white border rounded-2xl p-5 space-y-3 hover:shadow-md transition-all ${isOverdue ? "border-red-200" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Brain className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{assignment.course_title || course?.course_title || "Loading…"}</p>
                    <p className="text-xs text-slate-500">{assignment.policy_title}</p>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${STATUS_COLORS[status] || "bg-slate-100 text-slate-600"}`}>{status}</span>
              </div>
              {prog && (
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Progress</span>
                    <span>{prog.progress_percentage}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full">
                    <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${prog.progress_percentage}%` }} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                {assignment.due_date && <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> Due {assignment.due_date}</div>}
                {prog?.quiz_passed && <div className="flex items-center gap-1"><Award className="w-3 h-3 text-green-500" /> Quiz: {prog.highest_score}%</div>}
              </div>
              {!["Completed", "Exempted"].includes(assignment.status) && (
                <button onClick={() => handleOpenCourse(assignment)} disabled={loadingCourse || !course}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  {loadingCourse ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  {assignment.status === "Not Started" || assignment.status === "Assigned" ? "Start Course" : "Continue"}
                </button>
              )}
              {assignment.status === "Completed" && (
                <div className="flex items-center justify-center gap-2 py-2.5 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Course Completed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}