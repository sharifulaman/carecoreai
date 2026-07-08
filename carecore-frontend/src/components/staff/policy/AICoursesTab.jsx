import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { toast } from "sonner";
import { Search, Brain, Eye, Edit, CheckCircle2, BookOpen, Users, TrendingUp, Clock, Loader2, X, ChevronDown, ChevronUp, Play, Award, GraduationCap } from "lucide-react";
import { format } from "date-fns";
import CourseEditorPanel from "./CourseEditorPanel";
import AdminCoursePreview from "./AdminCoursePreview";

function ModuleQuestionCount({ courseId, type }) {
  const { data = [] } = useQuery({
    queryKey: [`count-${type}-${courseId}`],
    queryFn: () => type === "modules"
      ? base44.entities.HRPolicyLearningModule.filter({ course_id: courseId }, "display_order", 50)
      : base44.entities.HRPolicyQuizQuestion.filter({ course_id: courseId }, "display_order", 50),
    staleTime: 120000,
  });
  return <span>{data.length}</span>;
}

const STATUS_COLORS = {
  Draft: "bg-slate-100 text-slate-600",
  "Under Review": "bg-blue-100 text-blue-700",
  "Changes Requested": "bg-amber-100 text-amber-700",
  Approved: "bg-teal-100 text-teal-700",
  Published: "bg-green-100 text-green-700",
  Archived: "bg-red-100 text-red-700",
};

function KPICard({ icon: Icon, label, value, color }) {
  const colors = { blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-600", amber: "bg-amber-50 text-amber-600", violet: "bg-violet-50 text-violet-600", red: "bg-red-50 text-red-600", teal: "bg-teal-50 text-teal-600" };
  const IconComp = Icon;
  return (
    <div className={`${colors[color]} rounded-2xl p-4`}>
      <IconComp className="w-5 h-5 mb-2" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

function PublishConfirmModal({ course, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-slate-800 text-base mb-3">Publish Course?</h3>
        <p className="text-sm text-slate-600 mb-4">Are you sure you want to publish <strong>{course.course_title}</strong>? Once published, staff can be assigned and completion evidence will be recorded against this policy version.</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Publish
          </button>
          <button onClick={onClose} className="px-4 border border-slate-200 rounded-xl text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function AICoursesTab({ staffProfile, staff = [], homes = [], canManage, refreshKey, onRefresh }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingCourse, setEditingCourse] = useState(null);
  const [previewCourse, setPreviewCourse] = useState(null);
  const [publishConfirm, setPublishConfirm] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["ai-learning-courses", refreshKey],
    queryFn: () => base44.entities.HRPolicyLearningCourse.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 60000,
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["learning-assignments", refreshKey],
    queryFn: () => base44.entities.HRPolicyLearningAssignment.filter({ org_id: ORG_ID }, "-created_date", 500),
    staleTime: 60000,
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ["quiz-attempts", refreshKey],
    queryFn: () => base44.entities.HRPolicyQuizAttempt.filter({ org_id: ORG_ID }, "-created_date", 500),
    staleTime: 60000,
  });

  const kpis = useMemo(() => {
    const published = courses.filter(c => c.status === "Published").length;
    const drafts = courses.filter(c => c.status === "Draft").length;
    const totalAssigned = assignments.length;
    const completed = assignments.filter(a => a.status === "Completed").length;
    const compRate = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
    const passing = attempts.filter(a => a.passed);
    const avgScore = passing.length > 0 ? Math.round(passing.reduce((s, a) => s + a.score_percentage, 0) / passing.length) : 0;
    const overdue = assignments.filter(a => a.due_date && a.due_date < new Date().toISOString().split("T")[0] && !["Completed", "Exempted"].includes(a.status)).length;
    return { total: courses.length, published, drafts, totalAssigned, compRate, avgScore, overdue };
  }, [courses, assignments, attempts]);

  const filtered = useMemo(() => courses.filter(c => {
    const q = search.toLowerCase();
    const matchQ = !q || c.course_title?.toLowerCase().includes(q) || c.policy_title?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchQ && matchStatus;
  }), [courses, search, filterStatus]);

  const getCourseAssignments = (courseId) => assignments.filter(a => a.course_id === courseId);
  const getCourseAttempts = (courseId) => attempts.filter(a => a.course_id === courseId);

  const handlePublish = async () => {
    if (!publishConfirm) return;
    setPublishing(true);
    await base44.entities.HRPolicyLearningCourse.update(publishConfirm.id, {
      status: "Published",
      published_by: staffProfile?.full_name || "Admin",
      published_at: new Date().toISOString(),
    });
    await base44.entities.HRPolicyAuditEvent.create({
      org_id: ORG_ID,
      event_type: "Course Published",
      entity_type: "HRPolicyLearningCourse",
      entity_id: publishConfirm.id,
      policy_id: publishConfirm.policy_id,
      policy_title: publishConfirm.policy_title,
      course_id: publishConfirm.id,
      course_title: publishConfirm.course_title,
      performed_by: staffProfile?.full_name || "Admin",
      event_description: `Course published: ${publishConfirm.course_title}`,
    }).catch(() => {});
    toast.success("Course published!");
    setPublishing(false);
    setPublishConfirm(null);
    queryClient.invalidateQueries({ queryKey: ["ai-learning-courses"] });
    onRefresh?.();
  };

  const handleStatusChange = async (course, newStatus) => {
    await base44.entities.HRPolicyLearningCourse.update(course.id, { status: newStatus });
    toast.success(`Course status updated to ${newStatus}`);
    queryClient.invalidateQueries({ queryKey: ["ai-learning-courses"] });
    onRefresh?.();
  };

  if (editingCourse) {
    return <CourseEditorPanel course={editingCourse} staffProfile={staffProfile} onClose={() => setEditingCourse(null)} onSaved={() => { setEditingCourse(null); queryClient.invalidateQueries({ queryKey: ["ai-learning-courses"] }); onRefresh?.(); }} />;
  }

  if (previewCourse) {
    return <AdminCoursePreview course={previewCourse} staffProfile={staffProfile} onClose={() => setPreviewCourse(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <KPICard icon={Brain} label="AI Courses Created" value={kpis.total} color="violet" />
        <KPICard icon={Edit} label="Draft Courses" value={kpis.drafts} color="amber" />
        <KPICard icon={CheckCircle2} label="Published" value={kpis.published} color="green" />
        <KPICard icon={Users} label="Staff Assigned" value={kpis.totalAssigned} color="blue" />
        <KPICard icon={TrendingUp} label="Completion Rate" value={`${kpis.compRate}%`} color="teal" />
        <KPICard icon={Award} label="Avg Quiz Score" value={`${kpis.avgScore}%`} color="violet" />
        <KPICard icon={Clock} label="Overdue Learning" value={kpis.overdue} color="red" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search courses…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
          <option value="all">All Statuses</option>
          {["Draft", "Under Review", "Changes Requested", "Approved", "Published", "Archived"].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["Course Title", "Linked Policy", "Category", "Status", "Modules", "Questions", "Pass Mark", "Assigned", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-16 text-center">
                  <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">No AI learning courses yet. Click "Create AI Learning Course" to get started.</p>
                </td></tr>
              )}
              {filtered.map(course => {
                const courseAssignments = getCourseAssignments(course.id);
                const courseAttempts = getCourseAttempts(course.id);
                const isExpanded = expandedRow === course.id;
                const completed = courseAssignments.filter(a => a.status === "Completed").length;
                const compPct = courseAssignments.length > 0 ? Math.round((completed / courseAssignments.length) * 100) : 0;
                const avgScore = courseAttempts.filter(a => a.passed).length > 0
                  ? Math.round(courseAttempts.filter(a => a.passed).reduce((s, a) => s + a.score_percentage, 0) / courseAttempts.filter(a => a.passed).length)
                  : 0;
                return (
                  <>
                    <tr key={course.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-violet-500 shrink-0" />
                          <button className="font-semibold text-slate-800 hover:text-violet-600 text-left transition-colors text-xs" onClick={() => setExpandedRow(isExpanded ? null : course.id)}>
                            {course.course_title}
                          </button>
                        </div>
                        {course.ai_generated && <span className="ml-6 text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-bold">AI Generated</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">{course.policy_title || "—"}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{course.policy_category || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[course.status] || "bg-slate-100 text-slate-600"}`}>{course.status}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600 text-center">{course.module_count ?? <ModuleQuestionCount courseId={course.id} type="modules" />}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 text-center">{course.question_count ?? <ModuleQuestionCount courseId={course.id} type="questions" />}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{course.pass_mark_percentage || 80}%</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{courseAssignments.length} staff · {compPct}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setPreviewCourse(course)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="Preview / Play Course">
                            <GraduationCap className="w-3.5 h-3.5" />
                          </button>
                          {canManage && (
                            <>
                              <button onClick={() => setEditingCourse(course)} className="p-1.5 hover:bg-violet-50 rounded-lg text-violet-600 transition-colors" title="Edit">
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              {course.status !== "Published" && course.status !== "Archived" && (
                                <button onClick={() => setPublishConfirm(course)} className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition-colors" title="Publish">
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {["Draft", "Under Review"].includes(course.status) && (
                                <button onClick={() => handleStatusChange(course, "Under Review")} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors" title="Submit for Review">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                          <button onClick={() => setExpandedRow(isExpanded ? null : course.id)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${course.id}-expanded`} className="bg-violet-50/30 border-b border-slate-100">
                        <td colSpan={9} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                              <p className="font-bold text-slate-500 mb-1">Course Summary</p>
                              <p className="text-slate-700 line-clamp-3">{course.course_summary || "—"}</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                              <p className="font-bold text-slate-500 mb-1">Target Audience</p>
                              <p className="text-slate-700">{course.target_audience || "—"}</p>
                              <p className="text-slate-500 mt-1">Duration: ~{course.estimated_duration_minutes || "?"} mins</p>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                              <p className="font-bold text-slate-500 mb-1">Completion</p>
                              <p className="text-slate-700">{completed}/{courseAssignments.length} staff</p>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full mt-1">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${compPct}%` }} />
                              </div>
                            </div>
                            <div className="bg-white rounded-xl p-3 border border-slate-200">
                              <p className="font-bold text-slate-500 mb-1">Quiz Performance</p>
                              <p className="text-slate-700">Avg score: {avgScore}%</p>
                              <p className="text-slate-500">{courseAttempts.filter(a => a.passed).length} passed · {courseAttempts.filter(a => !a.passed).length} failed</p>
                            </div>
                          </div>
                          {course.learning_objectives?.length > 0 && (
                            <div className="mt-3 bg-white rounded-xl p-3 border border-slate-200">
                              <p className="font-bold text-slate-500 text-xs mb-2">Learning Objectives</p>
                              <ul className="space-y-1">
                                {course.learning_objectives.map((obj, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" /> {obj}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {publishConfirm && (
        <PublishConfirmModal course={publishConfirm} onConfirm={handlePublish} onClose={() => setPublishConfirm(null)} loading={publishing} />
      )}
    </div>
  );
}