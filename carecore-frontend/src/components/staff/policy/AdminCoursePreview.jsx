import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Brain, CheckCircle2, Award, Play, ChevronRight, Loader2, BookOpen } from "lucide-react";

export default function AdminCoursePreview({ course, staffProfile, onClose }) {
  const { data: modules = [], isLoading: loadingMods } = useQuery({
    queryKey: ["course-modules-preview", course.id],
    queryFn: () => base44.entities.HRPolicyLearningModule.filter({ course_id: course.id }, "display_order", 50),
    staleTime: 30000,
  });

  const { data: questions = [], isLoading: loadingQs } = useQuery({
    queryKey: ["course-questions-preview", course.id],
    queryFn: () => base44.entities.HRPolicyQuizQuestion.filter({ course_id: course.id }, "display_order", 50),
    staleTime: 30000,
  });

  const [activeStep, setActiveStep] = useState("overview");
  const [completedModuleIds, setCompletedModuleIds] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizResult, setQuizResult] = useState(null);

  const loading = loadingMods || loadingQs;
  const allModulesDone = modules.length > 0 && modules.every(m => completedModuleIds.includes(m.id));
  const activeModule = modules.find(m => m.id === activeStep);

  const handleMarkDone = (moduleId) => {
    const newDone = [...completedModuleIds, moduleId];
    setCompletedModuleIds(newDone);
    const idx = modules.findIndex(m => m.id === moduleId);
    if (idx < modules.length - 1) {
      setActiveStep(modules[idx + 1].id);
    } else {
      setActiveStep("quiz");
    }
  };

  const handleSubmitQuiz = () => {
    const correct = questions.filter(q => selectedAnswers[q.id] === q.correct_answer).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= (course.pass_mark_percentage || 80);
    setQuizResult({ score, passed, correct, total: questions.length });
    setQuizSubmitted(true);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  const noContent = modules.length === 0 && questions.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-violet-600 to-indigo-600 shrink-0">
        <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-white text-sm truncate">{course.course_title}</h2>
            <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold shrink-0">Admin Preview</span>
          </div>
          <p className="text-violet-200 text-xs">{course.policy_title} · {completedModuleIds.length}/{modules.length} modules</p>
        </div>
        <div className="text-xs text-white/80">{modules.length > 0 ? Math.round((completedModuleIds.length / modules.length) * 100) : 0}% complete</div>
      </div>

      {noContent ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
          <BookOpen className="w-16 h-16 text-slate-200" />
          <div>
            <h3 className="font-bold text-slate-700 text-lg mb-2">No Course Content Yet</h3>
            <p className="text-slate-500 text-sm max-w-md">This course has no modules or quiz questions. Use the <strong>Edit</strong> button to add content, or use the <strong>"Load AI Courses Demo"</strong> button to seed full demo content with modules and questions.</p>
          </div>
          <button onClick={onClose} className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700">
            Back to Courses
          </button>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
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
            {questions.length > 0 && (
              <button disabled={!allModulesDone} onClick={() => setActiveStep("quiz")} className={`w-full flex items-center gap-2 px-4 py-2.5 text-xs text-left transition-colors mt-2 ${activeStep === "quiz" ? "bg-violet-50 text-violet-700 font-bold" : allModulesDone ? "text-slate-600 hover:bg-slate-100" : "text-slate-300 cursor-not-allowed"}`}>
                <Award className="w-3.5 h-3.5" /> Quiz ({questions.length} Qs) {!allModulesDone && "(complete modules first)"}
              </button>
            )}
          </div>

          {/* Main content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Overview */}
            {activeStep === "overview" && (
              <div className="max-w-2xl space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-amber-700 font-semibold">👁 Admin Preview Mode — progress is not saved</p>
                </div>
                <h2 className="text-xl font-bold text-slate-800">{course.course_title}</h2>
                {course.course_summary && <p className="text-slate-600">{course.course_summary}</p>}
                <div className="grid grid-cols-3 gap-3">
                  {[["Duration", `~${course.estimated_duration_minutes || "?"} mins`], ["Modules", modules.length], ["Pass Mark", `${course.pass_mark_percentage || 80}%`]].map(([k, v]) => (
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
                <button onClick={() => setActiveStep(modules[0]?.id || "quiz")} className="flex items-center gap-2 px-5 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700">
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
                {!completedModuleIds.includes(activeModule.id) ? (
                  <button onClick={() => handleMarkDone(activeModule.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4" /> Mark Complete & Continue
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 py-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-bold text-center">✓ Module Completed</div>
                    {allModulesDone && modules.findIndex(m => m.id === activeModule.id) === modules.length - 1 && questions.length > 0 && (
                      <button onClick={() => setActiveStep("quiz")} className="flex items-center gap-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600">
                        Take Quiz <Award className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quiz */}
            {activeStep === "quiz" && questions.length > 0 && (
              <div className="max-w-2xl space-y-4">
                {!quizStarted && !quizSubmitted && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-800">Course Quiz</h2>
                    <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                      <p className="text-sm text-violet-700">{questions.length} questions · Pass mark: {course.pass_mark_percentage || 80}% · Max {course.max_attempts || 3} attempts</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-xs text-amber-700">👁 Admin preview — answers and scores will not be saved</p>
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
                            <button onClick={handleSubmitQuiz} disabled={Object.keys(selectedAnswers).length < questions.length} className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-40">
                              <CheckCircle2 className="w-4 h-4" /> Submit Quiz
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
                      <p className={`font-bold text-lg mt-2 ${quizResult.passed ? "text-green-800" : "text-red-800"}`}>{quizResult.passed ? "Pass! 🎉" : "Not passed"}</p>
                      <p className="text-sm mt-1 text-slate-600">{quizResult.correct} of {quizResult.total} correct</p>
                    </div>
                    <div className="space-y-3">
                      {questions.map((q, i) => {
                        const sel = selectedAnswers[q.id];
                        const isCorrect = sel === q.correct_answer;
                        return (
                          <div key={q.id} className={`rounded-xl border p-4 text-sm ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                            <p className="font-semibold text-slate-800 mb-1">{i + 1}. {q.question_text}</p>
                            <p className={`text-xs ${isCorrect ? "text-green-700" : "text-red-700"}`}>Your answer: {sel || "Not answered"} · Correct: {q.correct_answer}</p>
                            {q.explanation && <p className="text-xs text-slate-600 mt-1 italic">{q.explanation}</p>}
                          </div>
                        );
                      })}
                    </div>
                    <button onClick={onClose} className="w-full py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700">
                      Close Preview
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}