import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { SAFEGUARDING_QUIZ_FULL } from "@/lib/safeguardingQuiz";
import { format } from "date-fns";
import {
  CheckCircle2, XCircle, PlayCircle, Users, Award,
  ChevronRight, ChevronLeft, Search, Printer, ArrowLeft
} from "lucide-react";
import { toast } from "sonner";

// Only show first 5 questions for demo
const SAFEGUARDING_QUIZ = {
  ...SAFEGUARDING_QUIZ_FULL,
  questions: SAFEGUARDING_QUIZ_FULL.questions.slice(0, 5)
};

// ── Quiz Player ──────────────────────────────────────────────────────────────
function QuizPlayer({ quiz, staffId, staffName, staffRole, onBack }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const qc = useQueryClient();

  const totalQ = quiz.questions.length;
  const q = quiz.questions[current];
  const allAnswered = Object.keys(answers).length === totalQ;

  const handleSelect = (optIdx) => {
    if (submitted) return;
    setAnswers(a => ({ ...a, [current]: optIdx }));
  };

  const handleSubmit = async () => {
    if (!allAnswered) { toast.error("Please answer all questions before submitting."); return; }
    const correct = quiz.questions.filter((item, i) => answers[i] === item.answer).length;
    const score = Math.round((correct / totalQ) * 100);
    const passed = score >= quiz.pass_threshold;
    setResult({ correct, score, passed });
    setSubmitted(true);

    try {
      await base44.entities.PolicyQuizResult.create({
        org_id: ORG_ID,
        quiz_id: quiz.id,
        quiz_title: quiz.title,
        staff_id: staffId,
        staff_name: staffName,
        staff_role: staffRole || "support_worker",
        assigned_by_id: staffId,
        assigned_by_name: staffName,
        score,
        correct_answers: correct,
        total_questions: totalQ,
        passed,
        pass_threshold: quiz.pass_threshold,
        answers: quiz.questions.map((_, i) => ({
          question_index: i,
          selected: answers[i] ?? -1,
          correct: answers[i] === quiz.questions[i].answer
        })),
        completed_at: new Date().toISOString(),
        attempt_number: 1,
        status: "completed"
      });
      if (passed) {
        await base44.entities.SWPerformanceKPI.create({
          org_id: ORG_ID,
          worker_id: staffId,
          worker_name: staffName,
          date: new Date().toISOString().split("T")[0],
          month: new Date().toISOString().slice(0, 7),
          activity_type: "home_check_completed",
          source_entity: "PolicyQuizResult",
          notes: `QUIZ PASSED: ${quiz.title} — Score: ${score}%`,
        });
      }
      qc.invalidateQueries({ queryKey: ["quiz-results"] });
    } catch (err) {
      toast.error("Failed to save result: " + err.message);
    }
  };

  // ── Result Screen ──────────────────────────────────────────────────────────
  if (submitted && result) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="flex flex-col items-center text-center mb-8">
          {result.passed
            ? <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
            : <XCircle className="w-16 h-16 text-red-500 mb-4" />
          }
          <h2 className="text-2xl font-bold mb-2">
            {result.passed ? "🎉 Quiz Passed!" : "Quiz Not Passed"}
          </h2>
          <p className="text-5xl font-extrabold mb-1" style={{ color: result.passed ? "#22c55e" : "#ef4444" }}>
            {result.score}%
          </p>
          <p className="text-slate-500 mb-1">{result.correct} / {totalQ} correct</p>
          <p className="text-xs text-slate-400 mb-4">Pass threshold: {quiz.pass_threshold}%</p>

          {result.passed
            ? <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-3 text-sm text-green-700 font-medium mb-6">
                ✅ Result recorded. This has been logged in your compliance record.
              </div>
            : <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-3 text-sm text-red-700 font-medium mb-6">
                ❌ Score below {quiz.pass_threshold}%. Please review the safeguarding policy and retake when ready.
              </div>
          }

          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Printer className="w-4 h-4" /> Print Result
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Quiz Tab
            </button>
          </div>
        </div>

        <div className="w-full space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm mb-3">Answer Review</h3>
          {quiz.questions.map((qItem, i) => {
            const isCorrect = answers[i] === qItem.answer;
            return (
              <div key={i} className={`rounded-xl border p-4 ${isCorrect ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <p className="text-xs font-semibold text-slate-700 mb-2">{i + 1}. {qItem.q}</p>
                {qItem.options.map((opt, oi) => (
                  <div key={oi} className={`text-xs py-1 px-2 rounded flex items-center gap-2 ${
                    oi === qItem.answer ? "text-green-700 font-semibold" :
                    oi === answers[i] && !isCorrect ? "text-red-600" : "text-slate-500"
                  }`}>
                    {oi === qItem.answer ? "✓" : oi === answers[i] && !isCorrect ? "✗" : "○"} {opt}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Question Screen ────────────────────────────────────────────────────────
  const progress = ((current + 1) / totalQ) * 100;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">{quiz.title}</h2>
          <p className="text-xs text-slate-400">Question {current + 1} of {totalQ}</p>
        </div>
        <button onClick={onBack} className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg">Exit</button>
      </div>

      <div className="h-2 bg-slate-100 rounded-full mb-6 overflow-hidden">
        <div className="h-full bg-primary transition-all rounded-full" style={{ width: `${progress}%` }} />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 mb-4">
        <p className="text-sm font-semibold text-slate-800 mb-5 leading-relaxed">{q.q}</p>
        <div className="space-y-3">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                answers[current] === i
                  ? "border-primary bg-primary/5 text-primary font-semibold"
                  : "border-slate-200 hover:border-primary/40 hover:bg-slate-50 text-slate-700"
              }`}
            >
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" /> Previous
        </button>

        <div className="flex gap-1">
          {quiz.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-7 h-7 rounded-full text-[10px] font-bold transition-colors ${
                i === current ? "bg-primary text-white" :
                answers[i] !== undefined ? "bg-green-100 text-green-700" :
                "bg-slate-100 text-slate-400"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {current < totalQ - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            Submit Quiz
          </button>
        )}
      </div>

      <p className="text-xs text-center text-slate-400 mt-4">
        {Object.keys(answers).length} / {totalQ} answered
      </p>
    </div>
  );
}

// ── Assign Quiz Modal ────────────────────────────────────────────────────────
function AssignQuizModal({ quiz, staffProfile, allStaff, onClose, onSaved }) {
  const [scope, setScope] = useState("all");
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [selectedRole, setSelectedRole] = useState("support_worker");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const getTargetStaff = () => {
    if (scope === "self") return [staffProfile];
    if (scope === "individual") return allStaff.filter(s => selectedStaffIds.includes(s.id));
    if (scope === "department") return allStaff.filter(s => s.role === selectedRole);
    return allStaff;
  };

  const handleAssign = async () => {
    const targets = getTargetStaff();
    if (targets.length === 0) { toast.error("No staff selected"); return; }
    setSaving(true);
    try {
      const records = targets.map(s => ({
        org_id: ORG_ID,
        quiz_id: quiz.id,
        quiz_title: quiz.title,
        staff_id: s.id,
        staff_name: s.full_name,
        staff_role: s.role,
        assigned_by_id: staffProfile?.id,
        assigned_by_name: staffProfile?.full_name,
        score: 0,
        correct_answers: 0,
        total_questions: quiz.questions.length,
        passed: false,
        pass_threshold: quiz.pass_threshold,
        answers: [],
        status: "assigned",
        attempt_number: 0,
      }));
      await base44.entities.PolicyQuizResult.bulkCreate(records);
      qc.invalidateQueries({ queryKey: ["quiz-results"] });
      toast.success(`Quiz assigned to ${targets.length} staff member(s)`);
      onSaved?.();
    } catch (err) {
      toast.error("Failed to assign: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 mb-1">Assign Quiz</h3>
        <p className="text-xs text-slate-400 mb-5">{quiz.title}</p>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Assign to</label>
            <div className="grid grid-cols-2 gap-2">
              {[["self", "Myself only"], ["all", "All Staff"], ["department", "By Role/Dept"], ["individual", "Select Individuals"]].map(([v, l]) => (
                <button key={v} onClick={() => setScope(v)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border transition-colors ${scope === v ? "border-primary bg-primary/5 text-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          {scope === "department" && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Role / Department</label>
              <select className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                <option value="support_worker">Support Workers</option>
                <option value="team_leader">Team Leaders</option>
                <option value="admin_officer">Admin Officers</option>
                <option value="admin">Admin</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">{allStaff.filter(s => s.role === selectedRole).length} staff in this role</p>
            </div>
          )}
          {scope === "individual" && (
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">Select Staff</label>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-xl p-2">
                {allStaff.map(s => (
                  <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs">
                    <input type="checkbox" checked={selectedStaffIds.includes(s.id)}
                      onChange={e => setSelectedStaffIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id => id !== s.id))} />
                    <span className="font-medium text-slate-700">{s.full_name}</span>
                    <span className="text-slate-400 capitalize">{s.role?.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1">{selectedStaffIds.length} selected</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={handleAssign} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50">
            {saving ? "Assigning…" : `Assign to ${getTargetStaff().length} staff`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Results Table ────────────────────────────────────────────────────────────
function ResultsTable({ results }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => results.filter(r => {
    const matchSearch = !search || r.staff_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ||
      (filter === "passed" && r.passed && r.status === "completed") ||
      (filter === "failed" && !r.passed && r.status === "completed") ||
      (filter === "assigned" && r.status === "assigned");
    return matchSearch && matchFilter;
  }), [results, search, filter]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-1 focus:ring-primary" />
        </div>
        {["all", "passed", "failed", "assigned"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border capitalize transition-colors ${filter === f ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {f}
          </button>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Staff Member</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Role</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Score</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Result</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600">Completed</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400">No results found</td></tr>
            )}
            {filtered.map((r, i) => (
              <tr key={r.id || i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{r.staff_name}</td>
                <td className="px-4 py-3 text-slate-500 capitalize">{r.staff_role?.replace(/_/g, " ")}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                    r.status === "completed" ? "bg-blue-100 text-blue-700" :
                    r.status === "assigned" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}>{r.status}</span>
                </td>
                <td className="px-4 py-3">
                  {r.status === "completed" ? (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.score >= 80 ? "bg-green-500" : "bg-red-400"}`} style={{ width: `${r.score}%` }} />
                      </div>
                      <span className="font-semibold text-slate-700">{r.score}%</span>
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  {r.status === "completed" ? (
                    r.passed
                      ? <span className="flex items-center gap-1 text-green-600 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Passed</span>
                      : <span className="flex items-center gap-1 text-red-500 font-semibold"><XCircle className="w-3.5 h-3.5" /> Failed</span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3 text-slate-400">
                  {r.completed_at ? format(new Date(r.completed_at), "dd MMM yyyy, HH:mm") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main PolicyQuizTab ────────────────────────────────────────────────────────
export default function PolicyQuizTab({ staffProfile, staff = [], canManage }) {
  const [view, setView] = useState("overview");
  const [showAssignModal, setShowAssignModal] = useState(false);

  const quiz = SAFEGUARDING_QUIZ;

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["quiz-results", quiz.id],
    queryFn: () => base44.entities.PolicyQuizResult.filter({ quiz_id: quiz.id }),
    staleTime: 30 * 1000,
  });

  const myResults = results.filter(r => r.staff_id === staffProfile?.id && r.status === "completed");
  const myBest = myResults.reduce((best, r) => (!best || r.score > best.score) ? r : best, null);
  const completedResults = results.filter(r => r.status === "completed");
  const passedCount = completedResults.filter(r => r.passed).length;
  const failedCount = completedResults.filter(r => !r.passed).length;
  const assignedCount = results.filter(r => r.status === "assigned").length;

  if (view === "take") {
    return (
      <QuizPlayer
        quiz={quiz}
        staffId={staffProfile?.id}
        staffName={staffProfile?.full_name}
        staffRole={staffProfile?.role}
        onBack={() => setView("overview")}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-slate-800">Policy Quizzes</h3>
          <p className="text-xs text-slate-500 mt-0.5">Compliance knowledge assessments — {quiz.pass_threshold}% required to pass</p>
        </div>
        {canManage && (
          <button onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
            <Users className="w-4 h-4" /> Assign Quiz
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Assigned", value: results.length, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
          { label: "Completed", value: completedResults.length, color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
          { label: "Passed", value: passedCount, color: "text-green-700", bg: "bg-green-50 border-green-200" },
          { label: "Failed / Pending", value: failedCount + assignedCount, color: "text-red-600", bg: "bg-red-50 border-red-200" },
        ].map(s => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.bg}`}>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm">{quiz.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{quiz.description}</p>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="text-xs text-slate-400">{quiz.questions.length} questions (demo)</span>
              <span className="text-xs text-slate-400">Pass threshold: {quiz.pass_threshold}%</span>
              {myBest && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${myBest.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {myBest.passed ? `✓ Passed (${myBest.score}%)` : `✗ Best: ${myBest.score}%`}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setView("take")}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shrink-0"
        >
          <PlayCircle className="w-4 h-4" />
          {myBest?.passed ? "Retake Quiz" : "Start Quiz"}
        </button>
      </div>

      <div>
        <h4 className="font-bold text-slate-700 text-sm mb-3">Quiz Results — All Staff</h4>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResultsTable results={results} />
        )}
      </div>

      {showAssignModal && (
        <AssignQuizModal
          quiz={quiz}
          staffProfile={staffProfile}
          allStaff={staff}
          onClose={() => setShowAssignModal(false)}
          onSaved={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
}