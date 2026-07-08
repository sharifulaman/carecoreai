import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format, addDays, subDays } from "date-fns";
import { Loader2, Plus, DatabaseZap, LayoutTemplate, ChevronLeft, ChevronRight, User, CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ShiftTemplatesTab from "@/components/homes/tabs/ShiftTemplatesTab";
import { toast } from "sonner";
import { useModuleActions } from "@/lib/PermissionContext";

import HandoverShiftSummary from "./HandoverShiftSummary";
import HandoverProgressPanel from "./HandoverProgressPanel";
import HandoverSummaryTab from "./HandoverSummaryTab";
import HandoverYPTab from "./HandoverYPTab";
import HandoverTasksTab from "./HandoverTasksTab";
import HandoverIncidentsTab from "./HandoverIncidentsTab";
import HandoverMedicationTab from "./HandoverMedicationTab";
import HandoverEnvironmentTab from "./HandoverEnvironmentTab";
import HandoverDocumentsTab from "./HandoverDocumentsTab";
import HandoverSignoffBar from "./HandoverSignoffBar";

const TABS = [
  { key: "summary",     label: "Handover Summary" },
  { key: "yp",         label: "Young People" },
  { key: "tasks",      label: "Tasks & Reminders" },
  { key: "incidents",  label: "Incidents & Concerns" },
  { key: "medication", label: "Health & Medication" },
  { key: "environment",label: "Environment" },
  { key: "documents",  label: "Documents" },
];

const SHIFT_TIMES = {
  morning:   { start: "07:00", end: "15:00", nextShift: "afternoon", nextStart: "15:00", nextEnd: "23:00" },
  afternoon: { start: "15:00", end: "23:00", nextShift: "night",     nextStart: "23:00", nextEnd: "07:00" },
  night:     { start: "23:00", end: "07:00", nextShift: "morning",   nextStart: "07:00", nextEnd: "15:00" },
};

function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 7 && h < 15) return "morning";
  if (h >= 15 && h < 23) return "afternoon";
  return "night";
}

export default function ShiftHandoverPage({ home, user, staffProfile }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("summary");
  const { canAdd } = useModuleActions("homes");
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedShift, setSelectedShift] = useState(getCurrentShift());
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [incomingStaffId, setIncomingStaffId] = useState("");
  const [showRotaModal, setShowRotaModal] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  // Keep a ref to the latest handover so async functions always see fresh value
  const handoverRef = useRef(null);

  const { data: roleDefinitions = [] } = useQuery({ queryKey: ["role-definitions"], queryFn: () => base44.roles.fetchDefinitions() });
  const roleRank = roleDefinitions.find(r => r.role_name === staffProfile?.role)?.rank ?? (staffProfile?.role === "admin" ? 100 : (staffProfile?.role === "team_leader" ? 20 : 10));
  const isHighRank = roleRank > 10;

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: ORG_ID }),
    staleTime: 5 * 60 * 1000,
  });

  // Find shifts for selected date
  const { data: shifts = [] } = useQuery({
    queryKey: ["shifts-date", home?.id, selectedDate],
    queryFn: () => base44.entities.Shift.filter({ home_id: home?.id }),
    enabled: !!home?.id,
    select: d => d.filter(s => s.date === selectedDate || s.shift_date === selectedDate),
  });

  const { data: shiftTemplates = [] } = useQuery({
    queryKey: ["shift-templates", home?.id],
    queryFn: () => base44.entities.ShiftTemplate.filter({ home_id: home?.id }),
    enabled: !!home?.id,
  });

  const activeTemplates = useMemo(() => {
    const SHIFT_ORDER = { morning: 1, afternoon: 2, evening: 3, night: 4 };
    return shiftTemplates
      .filter(t => t.active !== false)
      .sort((a, b) => (SHIFT_ORDER[a.shift_type] || 5) - (SHIFT_ORDER[b.shift_type] || 5) || (a.time_start || "").localeCompare(b.time_start || ""));
  }, [shiftTemplates]);

  const availableShifts = useMemo(() => {
    return Array.from(new Set(activeTemplates.map(t => t.name || t.shift_type).filter(Boolean)));
  }, [activeTemplates]);

  const dynamicShiftTimes = useMemo(() => {
    if (activeTemplates.length === 0) return SHIFT_TIMES;
    const times = {};
    activeTemplates.forEach((t, i) => {
      const nextTemplate = activeTemplates[(i + 1) % activeTemplates.length];
      const key = t.name || t.shift_type;
      times[key] = {
        start: t.time_start || "00:00",
        end: t.time_end || "23:59",
        nextShift: nextTemplate.name || nextTemplate.shift_type,
        nextStart: nextTemplate.time_start || "00:00",
        nextEnd: nextTemplate.time_end || "23:59",
      };
    });
    return times;
  }, [activeTemplates]);

  useEffect(() => {
    if (availableShifts.length > 0 && !availableShifts.includes(selectedShift)) {
      setSelectedShift(availableShifts[0]);
    }
  }, [availableShifts, selectedShift]);

  const shiftTimes = dynamicShiftTimes[selectedShift] || SHIFT_TIMES[selectedShift] || SHIFT_TIMES.morning;

  // Find staff for current and next shift from actual shift records
  const currentShiftRecord = shifts.find(s => (s.shift_type || s.shift) === selectedShift);
  const nextShiftRecord = shifts.find(s => (s.shift_type || s.shift) === shiftTimes.nextShift);

  const currentStaff = staff.find(s => s.id === currentShiftRecord?.staff_id || s.id === currentShiftRecord?.worker_id);
  const nextStaff = staff.find(s => s.id === nextShiftRecord?.staff_id || s.id === nextShiftRecord?.worker_id);

  // Load or create handover record
  const { data: handovers = [], isLoading } = useQuery({
    queryKey: ["handover-records", home?.id, selectedDate, selectedShift],
    queryFn: () => base44.entities.HandoverRecord.filter({ home_id: home?.id, handover_date: selectedDate, shift: selectedShift }),
    enabled: !!home?.id,
  });

  const handover = handovers[0] || null;
  handoverRef.current = handover;

  // Load supporting data for progress calculation
  const { data: updates = [] } = useQuery({
    queryKey: ["handover-updates", handover?.id],
    queryFn: () => base44.entities.HandoverUpdate.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });
  const { data: ypSummaries = [] } = useQuery({
    queryKey: ["handover-yp", handover?.id],
    queryFn: () => base44.entities.HandoverYPSummary.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });
  const { data: tasks = [] } = useQuery({
    queryKey: ["handover-tasks", handover?.id],
    queryFn: () => base44.entities.HandoverTask.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });
  const { data: documents = [] } = useQuery({
    queryKey: ["handover-documents", handover?.id],
    queryFn: () => base44.entities.HandoverDocument.filter({ handover_id: handover?.id }),
    enabled: !!handover?.id,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["handover-records", home?.id, selectedDate, selectedShift] });
    qc.invalidateQueries({ queryKey: ["handover-updates", handover?.id] });
    qc.invalidateQueries({ queryKey: ["handover-yp", handover?.id] });
    qc.invalidateQueries({ queryKey: ["handover-tasks", handover?.id] });
    qc.invalidateQueries({ queryKey: ["handover-documents", handover?.id] });
  };

  const createOrGetHandover = async () => {
    // Always use ref for freshest value
    if (handoverRef.current) return handoverRef.current;
    const chosenIncoming = staff.find(s => s.id === incomingStaffId) || nextStaff;
    const created = await base44.entities.HandoverRecord.create({
      org_id: ORG_ID,
      home_id: home.id,
      home_name: home.name,
      handover_date: selectedDate,
      shift: selectedShift,
      outgoing_staff_id: currentStaff?.id || "",
      outgoing_staff_name: currentStaff?.full_name || user?.full_name || "Current Staff",
      outgoing_shift_start: shiftTimes.start,
      outgoing_shift_end: shiftTimes.end,
      incoming_staff_id: chosenIncoming?.id || "",
      incoming_staff_name: chosenIncoming?.full_name || "Incoming Staff",
      incoming_shift_start: shiftTimes.nextStart,
      incoming_shift_end: shiftTimes.nextEnd,
      status: "draft",
      progress_percent: 0,
    });
    handoverRef.current = created;
    await qc.invalidateQueries({ queryKey: ["handover-records", home?.id, selectedDate, selectedShift] });
    return created;
  };

  const handleStartHandover = async () => {
    setStarting(true);
    try {
      await createOrGetHandover();
      toast.success("Handover started!");
      refresh();
    } catch (e) {
      toast.error("Failed to start handover: " + e.message);
    } finally {
      setStarting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await createOrGetHandover();
      if (handover) {
        await base44.entities.HandoverRecord.update(handover.id, { status: "draft" });
      }
      toast.success("Handover saved as draft.");
      refresh();
    } catch (e) {
      toast.error("Failed to save: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteHandover = async () => {
    setCompleting(true);
    try {
      const h = await createOrGetHandover();
      // Validate required sections
      const missing = [];
      if (!h.daily_overview && !updates.some(u => u.update_type === "daily_overview")) missing.push("Daily Overview");
      if (ypSummaries.length === 0) missing.push("Young People Summary");
      if (!h.no_incidents_confirmed && !updates.some(u => u.update_type === "incident")) missing.push("Incidents & Concerns (confirm or add)");
      if (!h.no_medication_issues_confirmed && !updates.some(u => u.update_type === "medication")) missing.push("Health & Medication (confirm or add)");
      if (!h.no_environment_concerns_confirmed && !updates.some(u => u.update_type === "environment")) missing.push("Environment (confirm or add)");

      if (missing.length > 0) {
        toast.error(`Please complete: ${missing.join(", ")}`, { duration: 5000 });
        setCompleting(false);
        return;
      }

      await base44.entities.HandoverRecord.update(h.id, {
        status: "submitted",
        submitted_by_staff_id: user?.id || "",
        submitted_by_name: user?.full_name || "",
        submitted_at: new Date().toISOString(),
        outgoing_declaration: true,
        locked_at: new Date().toISOString(),
      });
      toast.success("Handover submitted successfully!");
      refresh();
    } catch (e) {
      toast.error("Failed to complete handover: " + e.message);
    } finally {
      setCompleting(false);
    }
  };

  const handleConfirmNoIncidents = async () => {
    const h = await createOrGetHandover();
    await base44.entities.HandoverRecord.update(h.id, { no_incidents_confirmed: true });
    refresh();
    toast.success("Confirmed: no incidents this shift");
  };

  const handleConfirmNoMedIssues = async () => {
    const h = await createOrGetHandover();
    await base44.entities.HandoverRecord.update(h.id, { no_medication_issues_confirmed: true });
    refresh();
    toast.success("Confirmed: no medication issues this shift");
  };

  const handleConfirmNoEnvConcerns = async () => {
    const h = await createOrGetHandover();
    await base44.entities.HandoverRecord.update(h.id, { no_environment_concerns_confirmed: true });
    refresh();
    toast.success("Confirmed: no environment concerns this shift");
  };

  const isLocked = handover && ["submitted", "acknowledged", "manager_signed_off", "closed"].includes(handover.status);
  const isAdmin = user?.role === "admin";

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await base44.functions.invoke("seedHandoverData", {});
      toast.success(`Seeded ${res.data?.handovers ?? 0} handovers for "${res.data?.home}"`);
      refresh();
    } catch (e) {
      toast.error("Seed failed: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  // Build handover object with fallback staff from shift data
  const handoverDisplay = handover || {
    outgoing_staff_name: currentStaff?.full_name || user?.full_name || "Current Staff",
    outgoing_shift_start: shiftTimes.start,
    outgoing_shift_end: shiftTimes.end,
    incoming_staff_name: nextStaff?.full_name || "TBC",
    incoming_shift_start: shiftTimes.nextStart,
    incoming_shift_end: shiftTimes.nextEnd,
    status: "draft",
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Shift Handover</h2>
          <p className="text-sm text-slate-500 mt-0.5">Ensure a safe and consistent handover between shifts</p>
        </div>
        <div className="flex items-center gap-2">
          {isHighRank && (
            <button
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-teal-700 hover:border-teal-300 transition-colors shadow-sm"
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              Shift Templates
            </button>
          )}
        </div>
      </div>

      {/* Shift Templates Panel */}
      {showTemplates && (
        <div className="mb-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">Shift Templates</h3>
            <button onClick={() => setShowTemplates(false)} className="text-xs text-slate-400 hover:text-slate-600 font-semibold">Close ✕</button>
          </div>
          <div className="p-4">
            <ShiftTemplatesTab homeId={home?.id} homeName={home?.name} />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <label className="text-xs font-semibold text-slate-500">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="text-sm font-semibold text-slate-700 focus:outline-none bg-transparent cursor-pointer"
          />
        </div>
        {availableShifts.length > 0 && (
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1 py-1 shadow-sm">
            {availableShifts.map(s => (
              <button
                key={s}
                onClick={() => setSelectedShift(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  selectedShift === s ? "bg-teal-600 text-white" : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {!handover && !isLoading && availableShifts.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Incoming staff dropdown — only shown if not in rota */}
            {!nextStaff && (
              <select
                value={incomingStaffId}
                onChange={e => setIncomingStaffId(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                <option value="">Incoming staff (select)...</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
            )}
            {canAdd && (
              <button
                onClick={() => handleStartHandover()}
                disabled={starting}
                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-60"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Start Handover
              </button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
        </div>
      ) : (
        <div className="flex gap-5 items-start">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Shift summary card */}
            <HandoverShiftSummary handover={handoverDisplay} />

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              {/* Tab bar */}
              <div className="overflow-x-auto border-b border-slate-100">
                <div className="flex gap-0 min-w-max">
                  {TABS.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-3.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                        activeTab === tab.key
                          ? "border-teal-500 text-teal-600"
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-5">
                {activeTab === "summary" && (
                  <HandoverSummaryTab handover={handover} homeId={home?.id} locked={isLocked || !canAdd} />
                )}
                {activeTab === "yp" && (
                  <HandoverYPTab handover={handover} homeId={home?.id} locked={isLocked || !canAdd} />
                )}
                {activeTab === "tasks" && (
                  <HandoverTasksTab handover={handover} homeId={home?.id} locked={isLocked || !canAdd} />
                )}
                {activeTab === "incidents" && (
                  <HandoverIncidentsTab
                    handover={handover} homeId={home?.id} handoverDate={selectedDate}
                    locked={isLocked || !canAdd} onConfirmNoIncidents={handleConfirmNoIncidents}
                  />
                )}
                {activeTab === "medication" && (
                  <HandoverMedicationTab
                    handover={handover} homeId={home?.id} handoverDate={selectedDate}
                    locked={isLocked || !canAdd} onConfirmNoMedIssues={handleConfirmNoMedIssues}
                  />
                )}
                {activeTab === "environment" && (
                  <HandoverEnvironmentTab
                    handover={handover} homeId={home?.id} handoverDate={selectedDate}
                    locked={isLocked || !canAdd} onConfirmNoEnvConcerns={handleConfirmNoEnvConcerns}
                  />
                )}
                {activeTab === "documents" && (
                  <HandoverDocumentsTab handover={handover} locked={isLocked || !canAdd} />
                )}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72 shrink-0 hidden lg:block">
            <HandoverProgressPanel
              handover={handoverDisplay}
              updates={updates}
              ypSummaries={ypSummaries}
              tasks={tasks}
              documents={documents}
              onAddIncident={() => setActiveTab("incidents")}
              onAddMedNote={() => setActiveTab("medication")}
              onAddTask={() => setActiveTab("tasks")}
              onUploadDoc={() => setActiveTab("documents")}
              onViewRota={() => setShowRotaModal(true)}
              onViewActions={() => setShowActionsModal(true)}
            />
          </div>
        </div>
      )}

      {/* Sticky bottom bar */}
      <HandoverSignoffBar
        handover={handover}
        onSaveDraft={handleSaveDraft}
        onComplete={handleCompleteHandover}
        saving={saving}
        completing={completing}
        readOnly={!canAdd}
      />

      <HandoverRotaModal
        isOpen={showRotaModal}
        onClose={() => setShowRotaModal(false)}
        home={home}
        staff={staff}
      />

      <HandoverActionsModal
        isOpen={showActionsModal}
        onClose={() => setShowActionsModal(false)}
        handover={handover}
        updates={updates}
        ypSummaries={ypSummaries}
        tasks={tasks}
        documents={documents}
        onNavigateToTab={(tab) => {
          setActiveTab(tab);
          setShowActionsModal(false);
        }}
      />
    </div>
  );
}

function HandoverRotaModal({ isOpen, onClose, home, staff }) {
  const [weekStart, setWeekStart] = useState(() => {
    const base = new Date();
    const start = new Date(base);
    start.setDate(base.getDate() - ((base.getDay() + 6) % 7)); // Monday
    return start;
  });

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["handover-rota-shifts", home?.id, weekStartStr],
    queryFn: () => base44.entities.Shift.filter({ home_id: home?.id }),
    enabled: !!home?.id && isOpen,
    select: (data) => data.filter(s => {
      const d = s.date || s.shift_date;
      return d >= weekStartStr && d <= weekEndStr;
    }),
  });

  const handlePrevWeek = () => setWeekStart(d => subDays(d, 7));
  const handleNextWeek = () => setWeekStart(d => addDays(d, 7));
  const handleCurrentWeek = () => {
    const base = new Date();
    const start = new Date(base);
    start.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    setWeekStart(start);
  };

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    return {
      dateStr: format(date, "yyyy-MM-dd"),
      label: format(date, "EEEE, d MMM"),
      isToday: format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden bg-white rounded-2xl border border-slate-200">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <DialogTitle className="text-lg font-bold text-slate-800">Weekly Rota — {home?.name}</DialogTitle>
            <p className="text-xs text-slate-500 mt-0.5">Scheduled team shifts and coverage details</p>
          </div>
          <div className="flex items-center gap-2 mr-6">
            <button 
              onClick={handlePrevWeek} 
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <button 
              onClick={handleCurrentWeek}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Today's Week
            </button>
            <button 
              onClick={handleNextWeek} 
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
            <p className="text-xs text-slate-400 font-medium">Loading shifts rota...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {daysOfWeek.map(day => {
                const dayShifts = shifts.filter(s => (s.date || s.shift_date) === day.dateStr);
                return (
                  <div 
                    key={day.dateStr} 
                    className={`border rounded-xl p-3 flex flex-col min-h-[160px] transition-colors ${
                      day.isToday ? "bg-teal-50/30 border-teal-200" : "bg-slate-50/50 border-slate-200"
                    }`}
                  >
                    <div className="mb-2">
                      <p className={`text-xs font-bold ${day.isToday ? "text-teal-600" : "text-slate-800"}`}>
                        {day.label.split(",")[0]}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{day.label.split(",")[1]}</p>
                    </div>

                    <div className="flex-1 space-y-2">
                      {dayShifts.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200 rounded-lg p-2 min-h-[80px]">
                          <p className="text-[10px] text-slate-400 text-center font-medium">No shifts scheduled</p>
                        </div>
                      ) : (
                        dayShifts.map((s, idx) => {
                          const assignedStaff = staff.find(st => st.id === s.staff_id || st.id === s.worker_id);
                          return (
                            <div key={idx} className="bg-white border border-slate-200 rounded-lg p-2 text-xs hover:shadow-sm transition-shadow">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-[10px] uppercase text-teal-700">
                                  {s.shift_type || s.shift || "Shift"}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {s.time_start || "—"} - {s.time_end || "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-slate-100">
                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                  <User className="w-2.5 h-2.5 text-slate-400" />
                                </div>
                                <span className="text-[10px] font-semibold text-slate-600 truncate flex-1">
                                  {assignedStaff ? assignedStaff.full_name : "Unassigned"}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HandoverActionsModal({ isOpen, onClose, handover, updates, ypSummaries, tasks, documents, onNavigateToTab }) {
  const sections = [
    { key: "daily_overview", label: "Daily Overview", done: !!handover?.daily_overview || updates?.some(u => u.update_type === "daily_overview"), tab: "summary", desc: "A narrative overview of the shift events." },
    { key: "yp_summary", label: "Young People", done: ypSummaries?.length > 0, tab: "yp", desc: "Individual summaries for resident young people." },
    { key: "tasks", label: "Tasks & Reminders", done: tasks?.length > 0, tab: "tasks", desc: "Tasks, follow-ups, and calendar alerts." },
    { key: "incidents", label: "Incidents & Concerns", done: handover?.no_incidents_confirmed || updates?.some(u => u.update_type === "incident" || u.update_type === "concern"), tab: "incidents", desc: "Incident reports or safety concerns." },
    { key: "medication", label: "Health & Medication", done: handover?.no_medication_issues_confirmed || updates?.some(u => u.update_type === "medication"), tab: "medication", desc: "Medication compliance and health notes." },
    { key: "environment", label: "Environment", done: handover?.no_environment_concerns_confirmed || updates?.some(u => u.update_type === "environment"), tab: "environment", desc: "Environment checklists and logs." },
    { key: "documents", label: "Documents", done: documents?.length > 0, tab: "documents", desc: "Shift hand-over documents or attachments." },
  ];

  const incomplete = sections.filter(s => !s.done);
  const completed = sections.filter(s => s.done);
  const pct = Math.round((completed.length / sections.length) * 100);

  const concernUpdates = updates?.filter(u => u.update_type === "concern" || u.severity === "high" || u.severity === "critical") || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden bg-white rounded-2xl border border-slate-200">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-lg font-bold text-slate-800">Handover Checklist &amp; Actions</DialogTitle>
          <p className="text-xs text-slate-500 mt-0.5">Ensure all mandatory items are reviewed before submission</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-5 pr-1">
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-700">Flight-Check Progress</p>
              <p className="text-xs text-slate-400 mt-0.5">{completed.length} of {sections.length} sections completed</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-teal-600 h-full transition-all duration-300" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs font-bold text-teal-700">{pct}%</span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Required Handover Sections ({incomplete.length})</h4>
            {incomplete.length === 0 ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <p className="text-xs font-semibold text-emerald-800">All mandatory sections have been completed or confirmed!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {incomplete.map(s => (
                  <div key={s.key} className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-slate-300 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800">{s.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigateToTab(s.tab)}
                      className="flex items-center gap-1 text-[10px] font-bold text-teal-600 hover:text-teal-700 transition-colors hover:underline cursor-pointer ml-3 shrink-0"
                    >
                      Fill Section <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {concernUpdates.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recorded Concerns &amp; Alerts ({concernUpdates.length})</h4>
              <div className="space-y-2">
                {concernUpdates.map((c, i) => (
                  <div key={i} className="bg-red-50/50 border border-red-100 rounded-xl p-3 flex items-start gap-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">{c.title || "Concern Alert"}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{c.summary}</p>
                      {c.severity && (
                        <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 mt-1 rounded bg-red-100 text-red-800 uppercase">
                          {c.severity}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}