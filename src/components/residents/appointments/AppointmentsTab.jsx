import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Calendar, Plus, ChevronLeft, ChevronRight, Search, X, Filter, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import AppointmentForm from "./AppointmentForm";
import AppointmentDetailPanel from "./AppointmentDetailPanel";
import MonthView from "./views/MonthView";
import WeekView from "./views/WeekView";
import AgendaView from "./views/AgendaView";

const COLOUR_PALETTE = [
  "#2563EB", "#16A34A", "#DC2626",
  "#D97706", "#7C3AED", "#0D9488",
  "#DB2777", "#9333EA", "#EA580C",
  "#65A30D", "#0891B2", "#C2410C",
];

const VIEWS = ["Month", "Week", "Agenda"];

const APPOINTMENT_TYPE_LABELS = {
  gp_appointment: "GP Appointment",
  hospital_appointment: "Hospital Appointment",
  dental: "Dental",
  optician: "Optician",
  mental_health: "Mental Health",
  social_worker_visit: "Social Worker Visit",
  iro_review: "IRO Review",
  lac_review: "LAC Review",
  court_hearing: "Court Hearing",
  school_meeting: "School Meeting",
  college_meeting: "College Meeting",
  key_worker_session: "Key Worker Session",
  family_contact: "Family Contact",
  counselling: "Counselling",
  probation: "Probation",
  youth_offending: "Youth Offending",
  other: "Other",
};

const STATUS_OPTIONS = [
  ["scheduled", "Scheduled"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["did_not_attend", "Did Not Attend"],
];

const EMPTY_FILTERS = {
  types: [],
  statuses: [],
  residents: [],
  dateFrom: "",
  dateTo: "",
};

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ── Recurring expansion ──────────────────────────────────────────────────────
function expandRecurringAppointments(appointments) {
  const expanded = [];
  appointments.forEach(apt => {
    expanded.push(apt);
    if (!apt.is_recurring || apt.recurrence_pattern === "none" || !apt.recurrence_end_date) return;
    const baseStart = new Date(apt.start_datetime);
    const baseEnd = new Date(apt.end_datetime);
    const duration = baseEnd - baseStart;
    const endDate = new Date(apt.recurrence_end_date);
    endDate.setHours(23, 59, 59);
    const cancelledDates = new Set(Array.isArray(apt.cancelled_dates) ? apt.cancelled_dates : []);
    const getNextDate = (current) => {
      const next = new Date(current);
      switch (apt.recurrence_pattern) {
        case "daily": next.setDate(next.getDate() + 1); break;
        case "weekly": next.setDate(next.getDate() + 7); break;
        case "fortnightly": next.setDate(next.getDate() + 14); break;
        case "monthly": next.setMonth(next.getMonth() + 1); break;
        default: return null;
      }
      return next;
    };
    let current = getNextDate(baseStart);
    let count = 0;
    const MAX_INSTANCES = 104;
    while (current && current <= endDate && count < MAX_INSTANCES) {
      const instanceDateStr = current.toISOString().split("T")[0];
      if (!cancelledDates.has(instanceDateStr)) {
        expanded.push({
          ...apt,
          id: `${apt.id}_${count + 1}`,
          start_datetime: current.toISOString(),
          end_datetime: new Date(current.getTime() + duration).toISOString(),
          _isRecurringInstance: true,
          _baseId: apt.id,
          _instanceIndex: count + 1,
        });
      }
      current = getNextDate(current);
      count++;
    }
  });
  return expanded;
}

export default function AppointmentsTab({
  residents = [],
  staff = [],
  homes = [],
  user,
  staffProfile,
  isAdmin,
  isAdminOrTL,
}) {
  const queryClient = useQueryClient();
  const filterPanelRef = useRef(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [view, setView] = useState("Month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [initialDate, setInitialDate] = useState(null);
  const [initialResidentId, setInitialResidentId] = useState(null);

  // ── Search & Filter state ──────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });

  // Close filter panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showFilters]);

  const activeFilterCount = useMemo(() =>
    filters.types.length + filters.statuses.length + filters.residents.length +
    (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0),
    [filters]
  );

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const result = await secureGateway.filter("Appointment", {}, "-start_datetime", 500);
      return (result || []).filter(a => !a.is_deleted);
    },
    staleTime: 1000 * 60 * 2,
  });

  // ── Role-based filtering ───────────────────────────────────────────────────
  const myStaffId = staffProfile?.id;
  const staffRole = staffProfile?.role;

  const myTeamMemberIds = useMemo(() =>
    staff.filter(s => s.team_leader_id === myStaffId || s.reporting_manager_id === myStaffId).map(s => s.id),
    [staff, myStaffId]
  );

  const filteredAppointments = useMemo(() => {
    if (!appointments?.length) return [];
    return appointments.filter(apt => {
      if (apt.is_deleted) return false;
      if (!staffRole || isAdmin || staffRole === "admin" || staffRole === "admin_officer") return true;
      if (staffRole === "team_leader") {
        const visibleIds = new Set([myStaffId, ...myTeamMemberIds]);
        return visibleIds.has(apt.organiser_id) || (apt.attendees || []).some(a => visibleIds.has(a.staff_id));
      }
      return apt.organiser_id === myStaffId || (apt.attendees || []).some(a => a.staff_id === myStaffId);
    });
  }, [appointments, staffRole, isAdmin, myStaffId, myTeamMemberIds]);

  // ── Expand recurring ───────────────────────────────────────────────────────
  const displayAppointments = useMemo(() =>
    expandRecurringAppointments(filteredAppointments),
    [filteredAppointments]
  );

  // ── Search ─────────────────────────────────────────────────────────────────
  const searchedAppointments = useMemo(() => {
    if (!searchQuery.trim()) return displayAppointments;
    const q = searchQuery.toLowerCase();
    return displayAppointments.filter(apt =>
      apt.title?.toLowerCase().includes(q) ||
      apt.resident_name?.toLowerCase().includes(q) ||
      apt.location?.toLowerCase().includes(q) ||
      apt.organiser_name?.toLowerCase().includes(q) ||
      apt.description?.toLowerCase().includes(q) ||
      APPOINTMENT_TYPE_LABELS[apt.appointment_type]?.toLowerCase().includes(q)
    );
  }, [displayAppointments, searchQuery]);

  // ── Advanced filters ───────────────────────────────────────────────────────
  const fullyFilteredAppointments = useMemo(() => {
    let result = searchedAppointments;
    if (filters.types.length > 0)
      result = result.filter(a => filters.types.includes(a.appointment_type));
    if (filters.statuses.length > 0)
      result = result.filter(a => filters.statuses.includes(a.status));
    if (filters.residents.length > 0)
      result = result.filter(a => filters.residents.includes(a.resident_id));
    if (filters.dateFrom)
      result = result.filter(a => new Date(a.start_datetime) >= new Date(filters.dateFrom));
    if (filters.dateTo)
      result = result.filter(a => new Date(a.start_datetime) <= new Date(filters.dateTo + "T23:59:59"));
    return result;
  }, [searchedAppointments, filters]);

  // ── Colours ────────────────────────────────────────────────────────────────
  const getStaffColour = useCallback((staffId) => {
    if (!staffId) return "#6B7280";
    const uniqueIds = [...new Set(filteredAppointments.map(a => a.organiser_id).filter(Boolean))].sort();
    const index = uniqueIds.indexOf(staffId);
    return index >= 0 ? COLOUR_PALETTE[index % COLOUR_PALETTE.length] : "#6B7280";
  }, [filteredAppointments]);

  const getAppointmentColour = useCallback((apt) => {
    return apt.colour || getStaffColour(apt.organiser_id);
  }, [getStaffColour]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const navigate = (dir) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      if (view === "Month") d.setMonth(d.getMonth() + dir);
      else d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const headerLabel = () => {
    if (view === "Month")
      return currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (view === "Week") {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay() + 1);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    return currentDate.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportToCSV = () => {
    const rows = [
      ["Title", "Type", "Date", "Start Time", "End Time", "Status", "Young Person", "Location", "Organiser", "Attendees", "Description", "Outcome Notes", "Follow-up Required"]
    ];
    fullyFilteredAppointments.forEach(apt => {
      rows.push([
        apt.title || "",
        APPOINTMENT_TYPE_LABELS[apt.appointment_type] || apt.appointment_type || "",
        new Date(apt.start_datetime).toLocaleDateString("en-GB"),
        apt.all_day ? "All day" : formatTime(apt.start_datetime),
        apt.all_day ? "" : formatTime(apt.end_datetime),
        apt.status || "",
        apt.resident_name || "",
        apt.location || "",
        apt.organiser_name || "",
        (apt.attendees || []).map(a => a.staff_name).join("; "),
        apt.description || "",
        apt.outcome_notes || "",
        apt.follow_up_required ? "Yes" : "No",
      ]);
    });
    const csv = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Appointments_${new Date().toLocaleDateString("en-GB").replace(/\//g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${fullyFilteredAppointments.length} appointments`);
  };

  // ── Edit handler ───────────────────────────────────────────────────────────
  const handleEdit = async (apt) => {
    setSelectedAppointment(null);
    if (apt._editThisOnly) {
      setEditingAppointment({ ...apt, id: undefined, _isRecurringInstance: false, _baseId: undefined, _instanceIndex: undefined, _editThisOnly: undefined, is_recurring: false, recurrence_pattern: "none", recurrence_end_date: null });
      setShowForm(true);
      return;
    }
    if (apt._editThisAndFuture) {
      const baseId = apt._baseId;
      const instanceDate = apt.start_datetime?.split("T")[0];
      const dayBefore = new Date(instanceDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      await secureGateway.update("Appointment", baseId, { recurrence_end_date: dayBefore.toISOString().split("T")[0] });
      queryClient.invalidateQueries(["appointments"]);
      setEditingAppointment({ ...apt, id: undefined, _isRecurringInstance: false, _baseId: undefined, _instanceIndex: undefined, _editThisAndFuture: undefined });
      setShowForm(true);
      return;
    }
    setEditingAppointment(apt);
    setShowForm(true);
  };

  const handleDayClick = (date) => { setInitialDate(date); setInitialResidentId(null); setEditingAppointment(null); setShowForm(true); };
  const handleNewAppointment = () => { setInitialDate(null); setInitialResidentId(null); setEditingAppointment(null); setShowForm(true); };
  const handleSaved = () => { queryClient.invalidateQueries(["appointments"]); setShowForm(false); setEditingAppointment(null); };
  const handleCloseForm = () => { setShowForm(false); setEditingAppointment(null); };

  const toggleFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(value) ? prev[key].filter(v => v !== value) : [...prev[key], value],
    }));
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading appointments...</div>;
  if (error) return <div className="flex items-center justify-center h-64 text-red-500">Error loading appointments.</div>;

  const hasActiveSearch = searchQuery.trim().length > 0;
  const hasActiveFilters = activeFilterCount > 0;
  const showingFiltered = hasActiveSearch || hasActiveFilters;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-1.5 rounded hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs rounded border hover:bg-muted">
            Today
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="ml-2 font-semibold text-sm">{headerLabel()}</span>
        </div>

        <div className="flex-1" />

        {/* View switcher */}
        <div className="flex rounded-lg border overflow-hidden">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {v}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search appointments..."
            className="pl-9 pr-4 py-1.5 text-sm border rounded-lg w-48 focus:w-64 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filters button */}
        <div className="relative" ref={filterPanelRef}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg transition-colors ${
              activeFilterCount > 0 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-white text-blue-600 font-semibold">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Filter panel */}
          {showFilters && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-white border rounded-xl shadow-xl z-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">Filters</h3>
                {activeFilterCount > 0 && (
                  <button onClick={() => setFilters({ ...EMPTY_FILTERS })} className="text-xs text-red-500 hover:underline">
                    Clear all
                  </button>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Type</label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(APPOINTMENT_TYPE_LABELS).map(([v, l]) => (
                    <button key={v} onClick={() => toggleFilter("types", v)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        filters.types.includes(v) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Status</label>
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map(([v, l]) => (
                    <button key={v} onClick={() => toggleFilter("statuses", v)}
                      className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                        filters.statuses.includes(v) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 hover:bg-gray-50"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div>
                <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Date Range</label>
                <div className="flex gap-2 items-center">
                  <input type="date" value={filters.dateFrom}
                    onChange={e => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                    className="flex-1 border rounded px-2 py-1.5 text-sm" />
                  <span className="text-gray-400 text-xs shrink-0">to</span>
                  <input type="date" value={filters.dateTo}
                    onChange={e => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                    className="flex-1 border rounded px-2 py-1.5 text-sm" />
                </div>
              </div>

              {/* Young Person (admin/TL only) */}
              {isAdminOrTL && residents.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-gray-500 uppercase mb-2 block">Young Person</label>
                  <select
                    onChange={e => {
                      if (!e.target.value) return;
                      if (!filters.residents.includes(e.target.value))
                        setFilters(prev => ({ ...prev, residents: [...prev.residents, e.target.value] }));
                      e.target.value = "";
                    }}
                    className="w-full border rounded px-2 py-1.5 text-sm"
                    defaultValue=""
                  >
                    <option value="">Add resident filter...</option>
                    {residents.map(r => (
                      <option key={r.id} value={r.id}>{r.display_name}</option>
                    ))}
                  </select>
                  {filters.residents.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {filters.residents.map(rid => {
                        const r = residents.find(x => x.id === rid);
                        return r ? (
                          <span key={rid} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            {r.display_name}
                            <button onClick={() => setFilters(prev => ({ ...prev, residents: prev.residents.filter(x => x !== rid) }))}>×</button>
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}

              <button onClick={() => setShowFilters(false)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                Apply Filters
              </button>
            </div>
          )}
        </div>

        {/* Export (admin/TL only) */}
        {isAdminOrTL && (
          <button onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 bg-white">
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Export</span>
          </button>
        )}

        <Button size="sm" className="gap-1.5" onClick={handleNewAppointment}>
          <Plus className="w-4 h-4" /> New Appointment
        </Button>
      </div>

      {/* Search result banner */}
      {hasActiveSearch && (
        <div className="px-4 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center justify-between">
          <span>Showing <strong>{fullyFilteredAppointments.length}</strong> result(s) for "<em>{searchQuery}</em>"</span>
          <button onClick={() => setSearchQuery("")} className="ml-2 underline text-xs hover:text-yellow-900">Clear</button>
        </div>
      )}

      {/* Empty state */}
      {fullyFilteredAppointments.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
          <Calendar className="w-10 h-10 mb-3 opacity-30" />
          {showingFiltered ? (
            <>
              <p className="font-medium">No appointments match your filters</p>
              <button onClick={() => { setSearchQuery(""); setFilters({ ...EMPTY_FILTERS }); }} className="text-sm mt-2 text-blue-600 underline">
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <p className="font-medium">No appointments found</p>
              <p className="text-sm mt-1">Click "+ New Appointment" to get started</p>
            </>
          )}
        </div>
      )}

      {/* Views */}
      {view === "Month" && (
        <MonthView currentDate={currentDate} appointments={fullyFilteredAppointments}
          getAppointmentColour={getAppointmentColour}
          onSelectAppointment={setSelectedAppointment}
          onDayClick={handleDayClick} />
      )}
      {view === "Week" && (
        <WeekView currentDate={currentDate} appointments={fullyFilteredAppointments}
          getAppointmentColour={getAppointmentColour}
          onSelectAppointment={setSelectedAppointment}
          onDayClick={handleDayClick} />
      )}
      {view === "Agenda" && (
        <AgendaView appointments={fullyFilteredAppointments}
          getAppointmentColour={getAppointmentColour}
          onSelectAppointment={setSelectedAppointment}
          residents={residents} />
      )}

      {/* Form */}
      {showForm && (
        <AppointmentForm
          staffProfile={staffProfile}
          user={user}
          residents={residents}
          homes={homes}
          staff={staff}
          initialDate={initialDate}
          initialResidentId={initialResidentId}
          initialData={editingAppointment}
          onSave={handleSaved}
          onClose={handleCloseForm}
        />
      )}

      {/* Detail panel */}
      {selectedAppointment && (
        <AppointmentDetailPanel
          appointment={selectedAppointment}
          residents={residents}
          staff={staff}
          staffProfile={staffProfile}
          isAdmin={isAdmin}
          onClose={() => setSelectedAppointment(null)}
          onEdit={handleEdit}
          onUpdate={() => { queryClient.invalidateQueries(["appointments"]); setSelectedAppointment(null); }}
        />
      )}
    </div>
  );
}