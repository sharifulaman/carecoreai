import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import PolicyLibraryTab from "./PolicyLibraryTab";
import PolicyAssignmentsTab from "./PolicyAssignmentsTab";
import PolicyAcknowledgementsTab from "./PolicyAcknowledgementsTab";
import PolicyReportsTab from "./PolicyReportsTab";
import UploadPolicyModal from "./UploadPolicyModal";
import AssignPolicyModal from "./AssignPolicyModal";
import CreateGroupModal from "./CreateGroupModal";
import ExportReportModal from "./ExportReportModal";
import PolicyHubKPIs from "./PolicyHubKPIs";
import { Upload, UserPlus, Users, BarChart2 } from "lucide-react";
import PolicyHubSeedButton from "./PolicyHubSeedButton";
import PolicyQuizTab from "./PolicyQuizTab";

const TABS = [
  { key: "library", label: "Policy Library" },
  { key: "assignments", label: "Assignments" },
  { key: "acknowledgements", label: "Acknowledgements" },
  { key: "reports", label: "Reports" },
  { key: "quizzes", label: "Quizzes" },
];

export default function PolicyHubMain({ staffProfile, user, staff = [], homes = [] }) {
  const [activeTab, setActiveTab] = useState("library");
  const [modal, setModal] = useState(null); // "upload"|"assign"|"group"|"export"
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey(k => k + 1);

  const isAdmin = staffProfile?.role === "admin" || staffProfile?.role === "admin_officer";
  const isTL = staffProfile?.role === "team_leader";
  const canManage = isAdmin || isTL;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">HR Module — Policy Hub</h2>
          <p className="text-sm text-slate-500">Upload, assign, track and evidence policy acknowledgements across the workforce.</p>
        </div>
        {canManage && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setModal("upload")} className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-colors">
              <Upload className="w-4 h-4" /> Upload Policy
            </button>
            <button onClick={() => setModal("assign")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
              <UserPlus className="w-4 h-4" /> Assign Policy
            </button>
            <button onClick={() => setModal("group")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
              <Users className="w-4 h-4" /> Create Group
            </button>
            <button onClick={() => setModal("export")} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">
              <BarChart2 className="w-4 h-4" /> Export Report
            </button>
          </div>
        )}
      </div>

      {/* Seed button — admin only */}
      {isAdmin && <PolicyHubSeedButton />}

      {/* KPI Cards */}
      <PolicyHubKPIs refreshKey={refreshKey} staffProfile={staffProfile} />

      {/* Tab navigation */}
      <div className="flex gap-0 border-b border-slate-200 overflow-x-auto scrollbar-none bg-white">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-teal-500 text-teal-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "library" && (
        <PolicyLibraryTab
          refreshKey={refreshKey}
          onRefresh={refresh}
          staffProfile={staffProfile}
          staff={staff}
          homes={homes}
          canManage={canManage}
          onAssign={() => setModal("assign")}
        />
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

      {/* Modals */}
      {modal === "upload" && (
        <UploadPolicyModal
          staffProfile={staffProfile}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
      {modal === "assign" && (
        <AssignPolicyModal
          staffProfile={staffProfile}
          staff={staff}
          homes={homes}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
      {modal === "group" && (
        <CreateGroupModal
          staffProfile={staffProfile}
          staff={staff}
          homes={homes}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); refresh(); }}
        />
      )}
      {modal === "export" && (
        <ExportReportModal
          staffProfile={staffProfile}
          staff={staff}
          homes={homes}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}