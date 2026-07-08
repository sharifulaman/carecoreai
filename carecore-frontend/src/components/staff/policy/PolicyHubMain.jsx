import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import PolicyLibraryTab from "./PolicyLibraryTab";
import PolicyAssignmentsTab from "./PolicyAssignmentsTab";
import PolicyAcknowledgementsTab from "./PolicyAcknowledgementsTab";
import PolicyReportsTab from "./PolicyReportsTab";
import UploadPolicyModal from "./UploadPolicyModal";
import AssignPolicyModal from "./AssignPolicyModal";
import CreateGroupModal from "./CreateGroupModal";
import ExportReportModal from "./ExportReportModal";
import PolicyHubKPIs from "./PolicyHubKPIs";
import { Upload, UserPlus, Users, BarChart2, Brain } from "lucide-react";
import PolicyQuizTab from "./PolicyQuizTab";
import AICoursesTab from "./AICoursesTab";
import QuizResultsTab from "./QuizResultsTab";
import PolicyAuditTrailTab from "./PolicyAuditTrailTab";
import MyLearningTab from "./MyLearningTab";
import CreateAICourseSlideover from "./CreateAICourseSlideover";

const ADMIN_TABS = [
  { key: "library", label: "Policies" },
  { key: "assignments", label: "Assignments" },
  { key: "acknowledgements", label: "Acknowledgements" },
  { key: "ai-courses", label: "AI Learning Courses" },
  { key: "quiz-results", label: "Quiz Results" },
  { key: "quizzes", label: "Policy Versions" },
  // { key: "audit-trail", label: "Audit Trail" },
  { key: "reports", label: "Reports" },
];

const STAFF_TABS = [
  { key: "my-learning", label: "My Policy Learning" },
  { key: "library", label: "Policies" },
  { key: "acknowledgements", label: "My Acknowledgements" },
];

export default function PolicyHubMain({ staffProfile, user, staff = [], homes = [] }) {
  const isAdminOrHR = ['admin', 'admin_officer', 'admin_manager', 'hr_officer', 'hr_manager', 'team_manager', 'team_leader', 'rsm', 'regional_manager'].includes(staffProfile?.role);
  const TABS = isAdminOrHR ? ADMIN_TABS : STAFF_TABS;

  const [activeTab, setActiveTab] = useState(isAdminOrHR ? "library" : "my-learning");
  const [modal, setModal] = useState(null);
  const [showAICourseSlideover, setShowAICourseSlideover] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  const canManage = ['admin', 'admin_officer', 'admin_manager', 'hr_officer', 'hr_manager', 'team_manager', 'team_leader', 'rsm', 'regional_manager'].includes(staffProfile?.role);
  const canAssign = ['admin', 'admin_manager', 'hr_officer', 'hr_manager', 'rsm'].includes(staffProfile?.role);
  const canUpload = ['admin', 'admin_manager', 'hr_manager', 'rsm'].includes(staffProfile?.role);
  const canGenerateCourse = ['admin', 'admin_manager', 'hr_manager', 'hr_officer', 'rsm'].includes(staffProfile?.role);

  // Load policies for the AI course slideover dropdown
  const { data: policies = [] } = useQuery({
    queryKey: ["hr-policies", refreshKey],
    queryFn: () => base44.entities.HRPolicy.filter({ org_id: ORG_ID }, "-created_date", 200),
    staleTime: 60000,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">HR Module — Policy Hub</h2>
          <p className="text-sm text-slate-500">Upload, assign, track and evidence policy acknowledgements across the workforce.</p>
        </div>
        {(canUpload || canAssign || canManage) && (
          <div className="flex flex-wrap gap-2">
            {canUpload && (
              <button onClick={() => setModal("upload")} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
                <Upload className="w-4 h-4" /> Upload Policy
              </button>
            )}
            {canAssign && (
              <button onClick={() => setModal("assign")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
                <UserPlus className="w-4 h-4" /> Assign Policy
              </button>
            )}
            {/* {canAssign && (
              <button onClick={() => setModal("group")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
                <Users className="w-4 h-4" /> Create Group
              </button>
            )} */}
            {canManage && (
              <button onClick={() => setModal("export")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
                <BarChart2 className="w-4 h-4" /> Export Report
              </button>
            )}
            {canGenerateCourse && (
              <button onClick={() => setShowAICourseSlideover(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-sm">
                <Brain className="w-4 h-4" /> Create AI Learning Course
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards — only for admin/HR views */}
      {isAdminOrHR && <PolicyHubKPIs refreshKey={refreshKey} staffProfile={staffProfile} />}

      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-slate-200 overflow-x-auto scrollbar-none bg-white">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.key
                ? tab.key === "ai-courses" || tab.key === "my-learning"
                  ? "border-violet-500 text-violet-600"
                  : "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
          >
            {tab.label}
            {(tab.key === "ai-courses" || tab.key === "my-learning") && (
              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full font-bold">AI</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "library" && (
        <PolicyLibraryTab refreshKey={refreshKey} onRefresh={refresh} staffProfile={staffProfile} staff={staff} homes={homes} canManage={canManage} onAssign={() => setModal("assign")} />
      )}
      {activeTab === "assignments" && (
        <PolicyAssignmentsTab refreshKey={refreshKey} staffProfile={staffProfile} staff={staff} homes={homes} canManage={canManage} onRefresh={refresh} />
      )}
      {activeTab === "acknowledgements" && (
        <PolicyAcknowledgementsTab refreshKey={refreshKey} staffProfile={staffProfile} staff={staff} canManage={canManage} onRefresh={refresh} />
      )}
      {activeTab === "reports" && (
        <PolicyReportsTab refreshKey={refreshKey} staffProfile={staffProfile} staff={staff} homes={homes} />
      )}
      {activeTab === "quizzes" && (
        <PolicyQuizTab staffProfile={staffProfile} staff={staff} canManage={canManage} />
      )}
      {activeTab === "ai-courses" && (
        <AICoursesTab staffProfile={staffProfile} staff={staff} homes={homes} canManage={canManage} refreshKey={refreshKey} onRefresh={refresh} />
      )}
      {activeTab === "quiz-results" && (
        <QuizResultsTab staffProfile={staffProfile} staff={staff} homes={homes} canManage={canManage} refreshKey={refreshKey} />
      )}
      {/* {activeTab === "audit-trail" && (
        <PolicyAuditTrailTab refreshKey={refreshKey} />
      )} */}
      {activeTab === "my-learning" && (
        <MyLearningTab staffProfile={staffProfile} refreshKey={refreshKey} />
      )}

      {/* Modals */}
      {modal === "upload" && (
        <UploadPolicyModal staffProfile={staffProfile} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {modal === "assign" && (
        <AssignPolicyModal staffProfile={staffProfile} staff={staff} homes={homes} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {modal === "group" && (
        <CreateGroupModal staffProfile={staffProfile} staff={staff} homes={homes} onClose={() => setModal(null)} onSaved={() => { setModal(null); refresh(); }} />
      )}
      {modal === "export" && (
        <ExportReportModal staffProfile={staffProfile} staff={staff} homes={homes} onClose={() => setModal(null)} />
      )}

      {/* AI Course Slideover */}
      {showAICourseSlideover && (
        <CreateAICourseSlideover
          policies={policies}
          staffProfile={staffProfile}
          onClose={() => setShowAICourseSlideover(false)}
          onCreated={() => { refresh(); setActiveTab("ai-courses"); }}
        />
      )}
    </div>
  );
}