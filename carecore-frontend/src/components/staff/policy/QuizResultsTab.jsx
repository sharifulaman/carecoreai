import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { Search, Award, CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const STATUS_COLORS = {
  Completed: "bg-green-100 text-green-700",
  Passed: "bg-teal-100 text-teal-700",
  Failed: "bg-red-100 text-red-700",
  "In Progress": "bg-blue-100 text-blue-700",
  "Not Started": "bg-slate-100 text-slate-500",
  "Quiz Pending": "bg-amber-100 text-amber-700",
  Overdue: "bg-red-100 text-red-700",
};

export default function QuizResultsTab({ staffProfile, staff = [], homes = [], canManage, refreshKey }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPassed, setFilterPassed] = useState("all");
  const [expandedAttempt, setExpandedAttempt] = useState(null);

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["quiz-attempts-all", refreshKey],
    queryFn: () => base44.entities.HRPolicyQuizAttempt.filter({ org_id: ORG_ID }, "-submitted_at", 500),
    staleTime: 60000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["learning-assignments", refreshKey],
    queryFn: () => base44.entities.HRPolicyLearningAssignment.filter({ org_id: ORG_ID }, "-created_date", 500),
    staleTime: 60000,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["ai-learning-courses", refreshKey],
    queryFn: () => base44.entities.HRPolicyLearningCourse.filter({ org_id: ORG_ID }, "-created_date", 100),
    staleTime: 60000,
  });

  const courseMap = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses]);
  const assignmentMap = useMemo(() => Object.fromEntries(assignments.map(a => [a.id, a])), [assignments]);

  // Group attempts by staff+course
  const grouped = useMemo(() => {
    const map = {};
    attempts.forEach(a => {
      const key = `${a.staff_id}_${a.course_id}`;
      if (!map[key]) map[key] = { staff_id: a.staff_id, staff_name: a.staff_name, course_id: a.course_id, attempts: [] };
      map[key].attempts.push(a);
    });
    return Object.values(map).map(g => {
      const sorted = g.attempts.sort((a, b) => b.attempt_number - a.attempt_number);
      const best = sorted.reduce((prev, curr) => curr.score_percentage > prev.score_percentage ? curr : prev, sorted[0]);
      const latest = sorted[0];
      const course = courseMap[g.course_id];
      const assignment = assignments.find(a => a.assigned_to_staff_id === g.staff_id && a.course_id === g.course_id);
      return { ...g, best, latest, course, assignment, passed: sorted.some(a => a.passed) };
    });
  }, [attempts, courseMap, assignments]);

  const filtered = useMemo(() => grouped.filter(g => {
    const q = search.toLowerCase();
    const matchQ = !q || g.staff_name?.toLowerCase().includes(q) || g.course?.course_title?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || g.assignment?.status === filterStatus;
    const matchPassed = filterPassed === "all" || (filterPassed === "passed" && g.passed) || (filterPassed === "failed" && !g.passed);
    return matchQ && matchStatus && matchPassed;
  }), [grouped, search, filterStatus, filterPassed]);

  const kpis = useMemo(() => {
    const passed = attempts.filter(a => a.passed).length;
    const failed = attempts.filter(a => !a.passed).length;
    const avgScore = attempts.length > 0 ? Math.round(attempts.reduce((s, a) => s + a.score_percentage, 0) / attempts.length) : 0;
    const completedStaff = new Set(attempts.filter(a => a.passed).map(a => a.staff_id)).size;
    return { total: attempts.length, passed, failed, avgScore, completedStaff };
  }, [attempts]);

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Attempts", value: kpis.total, color: "text-slate-700", bg: "bg-slate-50" },
          { label: "Passed", value: kpis.passed, color: "text-green-700", bg: "bg-green-50" },
          { label: "Failed", value: kpis.failed, color: "text-red-700", bg: "bg-red-50" },
          { label: "Avg Score", value: `${kpis.avgScore}%`, color: "text-violet-700", bg: "bg-violet-50" },
          { label: "Staff Passed", value: kpis.completedStaff, color: "text-teal-700", bg: "bg-teal-50" },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-2xl p-4`}>
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search staff or course…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="all">All Statuses</option>
          {["Completed", "Passed", "Failed", "In Progress", "Quiz Pending", "Overdue"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPassed} onChange={e => setFilterPassed(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="all">Passed & Failed</option>
          <option value="passed">Passed Only</option>
          <option value="failed">Failed Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Staff Name", "Course", "Policy Version", "Status", "Attempts", "Best Score", "Latest Score", "Passed At", "Due Date"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={9} className="py-16 text-center">
                  <Award className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No quiz attempts yet.</p>
                </td></tr>
              )}
              {filtered.map((g, idx) => (
                <>
                  <tr key={`${g.staff_id}_${g.course_id}`} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedAttempt(expandedAttempt === `${g.staff_id}_${g.course_id}` ? null : `${g.staff_id}_${g.course_id}`)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-violet-100 rounded-full flex items-center justify-center text-violet-700 text-xs font-bold shrink-0">
                          {g.staff_name?.charAt(0) || "?"}
                        </div>
                        <span className="font-semibold text-sm text-slate-800">{g.staff_name || g.staff_id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{g.course?.course_title || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{g.assignment?.policy_version || "1.0"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[g.assignment?.status] || "bg-slate-100 text-slate-600"}`}>{g.assignment?.status || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-center text-slate-600">{g.attempts.length}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${g.best?.score_percentage >= (g.course?.pass_mark_percentage || 80) ? "text-green-700" : "text-red-600"}`}>
                        {g.best?.score_percentage?.toFixed(0) || 0}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{g.latest?.score_percentage?.toFixed(0) || 0}%</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {g.passed && g.best?.submitted_at ? format(new Date(g.best.submitted_at), "dd MMM yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{g.assignment?.due_date || "—"}</td>
                  </tr>
                  {expandedAttempt === `${g.staff_id}_${g.course_id}` && (
                    <tr key={`${g.staff_id}_${g.course_id}-detail`} className="bg-violet-50/30 border-b border-slate-100">
                      <td colSpan={9} className="px-4 py-4">
                        <p className="text-xs font-bold text-slate-500 mb-2">Attempt History</p>
                        <div className="space-y-2">
                          {g.attempts.map(attempt => (
                            <div key={attempt.id} className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 px-4 py-2 text-xs">
                              <span className="font-bold text-slate-500">#{attempt.attempt_number}</span>
                              <span className={`font-bold ${attempt.passed ? "text-green-700" : "text-red-600"}`}>
                                {attempt.passed ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : <XCircle className="w-3.5 h-3.5 inline mr-1" />}
                                {attempt.score_percentage?.toFixed(0)}%
                              </span>
                              <span className="text-slate-500">{attempt.correct_answers}/{attempt.total_questions} correct</span>
                              {attempt.submitted_at && <span className="text-slate-400">{format(new Date(attempt.submitted_at), "dd MMM yyyy HH:mm")}</span>}
                              {attempt.time_taken_minutes && <span className="text-slate-400">{attempt.time_taken_minutes} mins</span>}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}