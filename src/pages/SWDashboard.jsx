import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";

import SWKPICards from "@/components/sw-dashboard/SWKPICards";
import SWCurrentShift from "@/components/sw-dashboard/SWCurrentShift";
import SWMyYoungPeople from "@/components/sw-dashboard/SWMyYoungPeople";
import SWTasksTable from "@/components/sw-dashboard/SWTasksTable";
import SWChecksCard from "@/components/sw-dashboard/SWChecksCard";
import SWHandoverNotes from "@/components/sw-dashboard/SWHandoverNotes";
import SWComplianceCard from "@/components/sw-dashboard/SWComplianceCard";
import SWMessagesCard from "@/components/sw-dashboard/SWMessagesCard";
import { DailyLogModal, AddIncidentModal, RecordCheckModal, HandoverModal, ListModal } from "@/components/sw-dashboard/SWModals";

export default function SWDashboard() {
  const { user, staffProfile } = useOutletContext();
  const [activeModal, setActiveModal] = useState(null);
  const today = format(new Date(), "yyyy-MM-dd");

  // Fetch staff profile for SW
  const { data: myProfile } = useQuery({
    queryKey: ["sw-profile", staffProfile?.id],
    queryFn: () => secureGateway.filter("StaffProfile", { email: user?.email }),
    enabled: !!user?.email,
    select: (data) => data?.[0] || staffProfile,
  });

  const profile = myProfile || staffProfile;
  const homeIds = profile?.home_ids || [];

  // Fetch assigned residents
  const { data: residents = [] } = useQuery({
    queryKey: ["sw-residents", homeIds.join(",")],
    queryFn: () => secureGateway.filter("Resident", { status: "active" }),
    enabled: homeIds.length > 0,
    select: (data) => data.filter(r => homeIds.includes(r.home_id)),
  });

  // Fetch homes
  const { data: homes = [] } = useQuery({
    queryKey: ["sw-homes", homeIds.join(",")],
    queryFn: () => base44.entities.Home.filter({ org_id: ORG_ID }),
    select: (data) => data.filter(h => homeIds.includes(h.id)),
  });

  // Fetch today's shifts
  const { data: todayShifts = [] } = useQuery({
    queryKey: ["sw-shifts-today", profile?.id],
    queryFn: () => secureGateway.filter("Shift", { date: today }),
    enabled: !!profile?.id,
    select: (data) => data.filter(s => (s.assigned_staff || []).includes(profile?.id) || s.lead_staff_id === profile?.id),
  });

  // Fetch attendance/clock-in
  const { data: clockIns = [] } = useQuery({
    queryKey: ["sw-clockin", profile?.id, today],
    queryFn: () => secureGateway.filter("AttendanceLog", { staff_id: profile?.id, date: today }),
    enabled: !!profile?.id,
  });

  // Fetch today's tasks (visit reports due)
  const { data: tasks = [] } = useQuery({
    queryKey: ["sw-tasks", profile?.id, today],
    queryFn: () => secureGateway.filter("VisitReport", { worker_id: profile?.id }),
    enabled: !!profile?.id,
  });

  // Fetch house checks
  const { data: homeChecks = [] } = useQuery({
    queryKey: ["sw-homechecks", homeIds.join(","), today],
    queryFn: () => secureGateway.filter("HomeCheck", {}),
    enabled: homeIds.length > 0,
    select: (data) => data.filter(c => homeIds.includes(c.home_id)),
  });

  // Fetch incidents
  const { data: incidents = [] } = useQuery({
    queryKey: ["sw-incidents", homeIds.join(",")],
    queryFn: () => secureGateway.filter("SignificantEvent", { is_deleted: false }),
    enabled: homeIds.length > 0,
    select: (data) => data.filter(e => homeIds.includes(e.home_id)).slice(0, 10),
  });

  // Fetch handover notes
  const { data: handovers = [] } = useQuery({
    queryKey: ["sw-handovers", homeIds.join(",")],
    queryFn: () => secureGateway.filter("ShiftHandover", { is_deleted: false }),
    enabled: homeIds.length > 0,
    select: (data) => data.filter(h => homeIds.includes(h.home_id)).sort((a,b) => new Date(b.created_date||0) - new Date(a.created_date||0)).slice(0, 5),
  });

  // Fetch policy assignments (compliance)
  const { data: policyAssignments = [] } = useQuery({
    queryKey: ["sw-policies", profile?.id],
    queryFn: () => secureGateway.filter("HRPolicyStaffAssignment", { staff_id: profile?.id }),
    enabled: !!profile?.id,
  });

  // Fetch training records
  const { data: trainingRecords = [] } = useQuery({
    queryKey: ["sw-training", profile?.id],
    queryFn: () => secureGateway.filter("TrainingRecord", { staff_id: profile?.id }),
    enabled: !!profile?.id,
  });

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["sw-notifications", profile?.id],
    queryFn: () => secureGateway.filter("Notification", { recipient_staff_id: profile?.id }),
    enabled: !!profile?.id,
    select: (data) => data.slice(0, 10),
  });

  const currentShift = todayShifts[0] || null;
  const currentClockIn = clockIns[0] || null;
  const currentHome = homes[0] || null;

  const pendingTasks = tasks.filter(t => !["approved", "submitted"].includes(t.status));
  const unreviewedIncidents = incidents.filter(i => !i.review_completed);
  const dueTraining = trainingRecords.filter(t => t.training_status === "expiring_soon" || t.training_status === "expired" || t.status === "in_progress");
  const medChecks = homeChecks.filter(c => c.check_type === "medication_check");
  const fireChecks = homeChecks.filter(c => c.check_type === "fire_check");
  const roomChecks = homeChecks.filter(c => c.check_type === "home_check" || !c.check_type);

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">
            Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"},{" "}
            {profile?.preferred_name || profile?.full_name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")} · {homes.length > 0 ? homes.map(h => h.name).join(", ") : "No home assigned"}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <SWKPICards
        residents={residents}
        tasks={pendingTasks}
        healthChecks={medChecks}
        incidents={unreviewedIncidents}
        training={dueTraining}
        onOpen={setActiveModal}
      />

      {/* Current Shift */}
      <SWCurrentShift
        shift={currentShift}
        clockIn={currentClockIn}
        home={currentHome}
        profile={profile}
        onStartLog={() => setActiveModal("daily-log")}
        onAddIncident={() => setActiveModal("incident")}
        onRecordCheck={() => setActiveModal("check")}
        onOpenHandover={() => setActiveModal("handover")}
      />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-4">
          <SWMyYoungPeople residents={residents} homes={homes} onViewAll={() => setActiveModal("residents")} onViewResident={() => setActiveModal("residents")} />
          <SWTasksTable tasks={tasks} residents={residents} onViewAll={() => setActiveModal("tasks")} onViewTask={() => setActiveModal("tasks")} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <SWChecksCard
            homeChecks={roomChecks}
            fireChecks={fireChecks}
            medChecks={medChecks}
            onViewAll={() => setActiveModal("checks-list")}
          />
          <SWComplianceCard policyAssignments={policyAssignments} trainingRecords={trainingRecords} onViewCompliance={() => setActiveModal("compliance")} />
          <SWHandoverNotes handovers={handovers} onViewAll={() => setActiveModal("handovers-list")} onViewHandover={() => setActiveModal("handovers-list")} />
          <SWMessagesCard notifications={notifications} onViewAll={() => setActiveModal("messages")} onViewMessage={() => setActiveModal("messages")} />
        </div>
      </div>

      {/* Modals */}
      {activeModal === "daily-log" && (
        <DailyLogModal residents={residents} staffProfile={profile} homeId={currentHome?.id} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "incident" && (
        <AddIncidentModal residents={residents} staffProfile={profile} homeId={currentHome?.id} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "check" && (
        <RecordCheckModal staffProfile={profile} homeId={currentHome?.id} residents={residents} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "handover" && (
        <HandoverModal staffProfile={profile} homeId={currentHome?.id} residents={residents} onClose={() => setActiveModal(null)} />
      )}
      {activeModal === "incidents-list" && (
        <ListModal title="Incidents to Review" items={incidents} onClose={() => setActiveModal(null)} renderItem={i => (
          <div className="p-3 border border-slate-100 rounded-xl text-sm">
            <p className="font-semibold text-slate-700">{i.event_type?.replace(/_/g, " ")}</p>
            <p className="text-slate-400 text-xs">{i.summary}</p>
          </div>
        )} />
      )}
      {activeModal === "handovers-list" && (
        <ListModal title="Handover Notes" items={handovers} onClose={() => setActiveModal(null)} renderItem={h => (
          <div className="p-3 border border-slate-100 rounded-xl text-sm">
            <p className="font-semibold text-slate-700">{h.submitted_by_name} — {h.handover_date}</p>
            <p className="text-slate-400 text-xs">{h.current_shift_summary}</p>
          </div>
        )} />
      )}
    </div>
  );
}