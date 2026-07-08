import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import KpiCards from "@/components/sw-dashboard/KpiCards";
import AssignedYPFilter from "@/components/sw-dashboard/AssignedYPFilter";
import DailyTasksMap from "@/components/sw-dashboard/DailyTasksMap";
import TodaysChecklist from "@/components/sw-dashboard/TodaysChecklist";
import SWShiftSummary from "@/components/sw-dashboard/SWShiftSummary";
import UpcomingAppointments from "@/components/sw-dashboard/UpcomingAppointments";
import RecentNotes from "@/components/sw-dashboard/RecentNotes";
import SWYPTaskModal from "@/components/sw-dashboard/SWYPTaskModal";
import ChecklistHistoryModal from "@/components/sw-dashboard/ChecklistHistoryModal";
import { useResidentTaskStatuses } from "@/components/sw-dashboard/useResidentTaskStatuses";
import { YPCard } from "@/components/residents/yp/YPCardView";

export default function SWDashboard() {
  const { user, staffProfile } = useOutletContext();
  const [highlightedId, setHighlightedId] = useState(() => {
    return localStorage.getItem("sw-dashboard-highlighted-yp") || "ALL";
  });

  useEffect(() => {
    if (highlightedId) {
      localStorage.setItem("sw-dashboard-highlighted-yp", highlightedId);
    } else {
      localStorage.removeItem("sw-dashboard-highlighted-yp");
    }
  }, [highlightedId]);
  const [activeTask, setActiveTask] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Fetch assigned homes via StaffServiceAssignment
  const { data: assignments = [] } = useQuery({
    queryKey: ['sw-assignments', staffProfile?.id],
    queryFn: () => secureGateway.filter('StaffServiceAssignment', { staff_id: staffProfile?.id, active: true }),
    enabled: !!staffProfile?.id,
  });
  const assignedHomeIds = useMemo(() => [...new Set(assignments.map(a => a.home_id))], [assignments]);

  // Fetch all active residents
  const { data: allResidents = [] } = useQuery({
    queryKey: ['sw-residents', staffProfile?.id],
    queryFn: () => secureGateway.filter('Resident', { status: 'active' }),
    enabled: !!staffProfile?.id,
  });

  // Filter to assigned residents (key worker or home-based)
  const assignedResidents = useMemo(() => 
    allResidents.filter(r =>
      r.key_worker_id === staffProfile?.id || assignedHomeIds.includes(r.home_id)
    ),
    [allResidents, staffProfile?.id, assignedHomeIds]
  );

  // Fetch homes
  const { data: homes = [] } = useQuery({
    queryKey: ["homes"],
    queryFn: () => secureGateway.filter('Home', { status: 'active' }),
    enabled: !!staffProfile?.id,
  });

  // Fetch today's data for KPI cards
  const { data: mfhRecords = [] } = useQuery({
    queryKey: ['sw-mfh'],
    queryFn: () => secureGateway.filter('MissingFromHome', {}, '-reported_missing_datetime', 50),
    enabled: !!staffProfile?.id,
  });

  const { data: todayAppointments = [] } = useQuery({
    queryKey: ['sw-appointments-today'],
    queryFn: () => secureGateway.filter('Appointment', {}, '-start_datetime', 50),
    enabled: !!staffProfile?.id,
  });

  const { data: pendingWorkflows = [] } = useQuery({
    queryKey: ['sw-pending-approvals', staffProfile?.id],
    queryFn: () => secureGateway.filter('ApprovalWorkflow', { submitted_by: staffProfile?.id }),
    enabled: !!staffProfile?.id,
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['sw-risks'],
    queryFn: () => secureGateway.filter('RiskAssessment', {}),
    enabled: !!staffProfile?.id,
  });

  const { data: recentNotes = [] } = useQuery({
    queryKey: ['sw-recent-notes'],
    queryFn: () => secureGateway.filter('DailyLog', {}, '-date', 50),
    enabled: !!staffProfile?.id,
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => secureGateway.filter('StaffProfile'),
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  // Map assigned residents to component shape
  const assignedYP = useMemo(() =>
    assignedResidents.map(r => ({
      id: r.id,
      name: r.display_name,
      age: r.dob ? Math.floor((new Date() - new Date(r.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
      home: homes.find(h => h.id === r.home_id)?.name || "—",
      initials: r.initials || r.display_name?.charAt(0) || "?",
      status: r.status || "active",
      statusType: "completed",
    })),
    [assignedResidents, homes]
  );

  const assignedIds = useMemo(() => assignedResidents.map(r => r.id), [assignedResidents]);

  const todayStr = new Date().toISOString().split('T')[0];

  const defaultChecklist = [
    { id: "c1", title: "Morning welfare checks completed", completed: false },
    { id: "c2", title: "Review new notes / handover", completed: false },
    { id: "c3", title: "Annex A critical checks reviewed", completed: false },
    { id: "c4", title: "Update health notes where needed", completed: false },
    { id: "c5", title: "Confirm today's appointments", completed: false },
    { id: "c6", title: "Missing episode checks completed", completed: false },
    { id: "c7", title: "Education / employment status verified", completed: false },
    { id: "c8", title: "Pathway plan progress reviewed", completed: false },
    { id: "c9", title: "End of day notes & handover", completed: false },
  ];

  const [checklist, setChecklist] = useState(defaultChecklist);

  // Use first resident as default highlighted if "ALL" is selected, so the tasks map doesn't break
  const effectiveHighlightedId = highlightedId === "ALL" ? assignedYP[0]?.id : (highlightedId || assignedYP[0]?.id);
  const selectedResident = assignedResidents.find(r => r.id === effectiveHighlightedId);

  const { data: dbChecklists = [], refetch: refetchChecklists } = useQuery({
    queryKey: ['daily-checklists', effectiveHighlightedId, todayStr],
    queryFn: () => secureGateway.filter('DailyChecklist', { resident_id: effectiveHighlightedId, date: todayStr }),
    enabled: !!effectiveHighlightedId,
  });

  const activeChecklistRecord = dbChecklists[0];

  // Load checklist from DB when resident changes or data loads
  React.useEffect(() => {
    if (!effectiveHighlightedId) return;

    if (activeChecklistRecord && activeChecklistRecord.items) {
      setChecklist(activeChecklistRecord.items);
    } else {
      setChecklist(defaultChecklist);
    }
  }, [effectiveHighlightedId, activeChecklistRecord]);

  const handleChecklistChange = async (newChecklist) => {
    setChecklist(newChecklist);
    if (effectiveHighlightedId) {
      try {
        const payload = {
          resident_id: effectiveHighlightedId,
          date: todayStr,
          items: newChecklist,
        };
        if (activeChecklistRecord?.id) {
          await secureGateway.update('DailyChecklist', activeChecklistRecord.id, payload);
        } else {
          await secureGateway.create('DailyChecklist', payload);
        }
        refetchChecklists();
      } catch (err) {
        console.error("Failed to save checklist to db", err);
      }
    }
  };

  // Queries for YPCardExpanded when a specific YP is selected
  const isSpecificYp = highlightedId !== "ALL" && !!selectedResident;
  
  const { data: visitReports = [] } = useQuery({
    queryKey: ['sw-recent-visit-reports'],
    queryFn: () => secureGateway.filter('VisitReport', {}, '-date', 50),
    enabled: !!staffProfile?.id,
  });

  const { data: supportPlans = [] } = useQuery({
    queryKey: ['support-plans', selectedResident?.id],
    queryFn: () => secureGateway.filter('SupportPlan', { resident_id: selectedResident?.id }),
    enabled: isSpecificYp,
  });

  const { data: ilsPlans = [] } = useQuery({
    queryKey: ['ils-plans', selectedResident?.id],
    queryFn: () => secureGateway.filter('ILSPlan', { resident_id: selectedResident?.id }),
    enabled: isSpecificYp,
  });

  const { data: transitions = [] } = useQuery({
    queryKey: ['transitions', selectedResident?.id],
    queryFn: () => secureGateway.filter('Transition', { resident_id: selectedResident?.id }),
    enabled: isSpecificYp,
  });

  const isAdminOrTL = ["team_leader", "registered_manager", "admin_manager", "admin"].includes(staffProfile?.role);

  // Live task statuses for the selected resident
  const { statuses } = useResidentTaskStatuses(effectiveHighlightedId);

  const handleTaskClick = (taskKey) => {
    if (!selectedResident) return;
    setActiveTask(taskKey);
  };

  const filteredAssignedYP = highlightedId === "ALL"
    ? assignedYP
    : assignedYP.filter(r => r.id === highlightedId);

  const filteredAssignedResidents = highlightedId === "ALL"
    ? assignedResidents
    : assignedResidents.filter(r => r.id === highlightedId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <main className="px-8 py-6">
        <div className="mb-5">
          <h1 className="text-3xl font-black tracking-tight text-slate-950">
            Support Worker Daily Dashboard
          </h1>
          <p className="mt-1 text-slate-500">
            Daily tasks, care checks and Annex A readiness for assigned young people
          </p>
        </div>

        <AssignedYPFilter
          residents={assignedYP}
          highlightedId={highlightedId}
          onHighlight={setHighlightedId}
        />

        <KpiCards assignedResidents={filteredAssignedYP} todayAppointments={todayAppointments} allStatuses={statuses} />

        {/* Selected YP indicator */}
        {selectedResident && (
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            Tasks below are for: <strong>{selectedResident.display_name}</strong>
            <span className="text-slate-400 text-xs">(select a different YP above to change)</span>
          </div>
        )}

        {isSpecificYp && selectedResident && (
          <div className="mb-5 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <YPCard
              resident={selectedResident}
              home={homes.find(h => h.id === selectedResident.home_id)}
              keyWorker={staff.find(s => s.id === selectedResident.key_worker_id)}
              dailyLogs={recentNotes}
              visitReports={visitReports.filter(v => v.resident_id === selectedResident.id)}
              supportPlans={supportPlans}
              ilsPlans={ilsPlans}
              transitions={transitions}
              staff={staff}
              isAdminOrTL={isAdminOrTL}
              myStaffProfile={staffProfile}
              appointments={todayAppointments}
            />
          </div>
        )}

        <div className="mt-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_400px]">
             <DailyTasksMap
               onTaskClick={handleTaskClick}
               selectedResident={selectedResident}
               statuses={statuses}
             />
  
             <div className="space-y-5">
               <TodaysChecklist 
                 checklist={checklist} 
                 setChecklist={handleChecklistChange}
                 disabled={highlightedId === "ALL"}
                 ypName={selectedResident?.display_name}
                 onViewHistory={() => setShowHistoryModal(true)}
               />
               <SWShiftSummary 
                 staffProfile={staffProfile} 
                 assignedResidents={assignedResidents} 
                 allStatuses={statuses} 
                 homes={homes} 
               />
             </div>
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
             <RecentNotes 
               assignedResidents={filteredAssignedResidents} 
               recentNotes={recentNotes}
               appointments={todayAppointments}
               mfhRecords={mfhRecords}
               visitReports={visitReports}
             />
             <UpcomingAppointments 
               assignedResidents={filteredAssignedResidents} 
               todayAppointments={todayAppointments}
               user={user}
               staffProfile={staffProfile}
               homes={homes}
               staff={staff}
             />
          </div>
        </div>
        </main>

        {/* Task modal — opened when a card is clicked */}
        {activeTask && selectedResident && (
         <SWYPTaskModal
           taskKey={activeTask}
           resident={selectedResident}
           residents={assignedResidents}
           homes={homes}
           staff={staff}
           user={user}
           staffProfile={staffProfile}
           mfhRecords={mfhRecords}
           todayAppointments={todayAppointments}
           onClose={() => setActiveTask(null)}
         />
        )}
        
        {/* Checklist History Modal */}
        {showHistoryModal && selectedResident && (
          <ChecklistHistoryModal 
            resident={selectedResident}
            onClose={() => setShowHistoryModal(false)}
          />
        )}
    </div>
  );
}