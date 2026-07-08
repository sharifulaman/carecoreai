import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import {
  Calendar, Plus, Search, X, MapPin, User, Clock,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, DatabaseZap, Loader2
} from "lucide-react";
import { toast } from "sonner";
import AppointmentForm from "@/components/residents/appointments/AppointmentForm";
import AppointmentDetailPanel from "@/components/residents/appointments/AppointmentDetailPanel";
import { useModuleActions } from "@/lib/PermissionContext";

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

const STATUS_CFG = {
  scheduled: { label: "Scheduled", cls: "bg-blue-100 text-blue-700", icon: Clock },
  completed: { label: "Completed", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-500", icon: XCircle },
  did_not_attend: { label: "Did Not Attend", cls: "bg-red-100 text-red-700", icon: AlertCircle },
};

const TYPE_COLORS = {
  gp_appointment: "bg-blue-50 text-blue-700 border-blue-100",
  hospital_appointment: "bg-purple-50 text-purple-700 border-purple-100",
  dental: "bg-teal-50 text-teal-700 border-teal-100",
  mental_health: "bg-rose-50 text-rose-700 border-rose-100",
  social_worker_visit: "bg-amber-50 text-amber-700 border-amber-100",
  iro_review: "bg-indigo-50 text-indigo-700 border-indigo-100",
  lac_review: "bg-violet-50 text-violet-700 border-violet-100",
  court_hearing: "bg-red-50 text-red-700 border-red-100",
  school_meeting: "bg-green-50 text-green-700 border-green-100",
};

const FILTER_TABS = ["all", "today", "past", "upcoming"];

function AppointmentCard({ apt, residents, staff, staffProfile, isAdmin, onSelect, onUpdate }) {
  const stCfg = STATUS_CFG[apt.status] || STATUS_CFG.scheduled;
  const StatusIcon = stCfg.icon;
  const typeColor = TYPE_COLORS[apt.appointment_type] || "bg-slate-50 text-slate-600 border-slate-100";
  const startDate = apt.start_datetime ? new Date(apt.start_datetime) : null;

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onSelect(apt)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Date block */}
          <div className="shrink-0 w-12 text-center bg-slate-50 rounded-xl border border-slate-100 py-1.5">
            {startDate ? (
              <>
                <div className="text-xs font-bold text-slate-500 uppercase leading-none">
                  {format(startDate, "MMM")}
                </div>
                <div className="text-xl font-bold text-slate-800 leading-none mt-0.5">
                  {format(startDate, "d")}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-400">—</div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeColor}`}>
                {APPOINTMENT_TYPE_LABELS[apt.appointment_type] || apt.appointment_type || "Appointment"}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${stCfg.cls}`}>
                <StatusIcon className="w-2.5 h-2.5" />
                {stCfg.label}
              </span>
            </div>
            <p className="font-semibold text-sm text-slate-800 truncate">{apt.title || "Appointment"}</p>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500">
              {startDate && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {apt.all_day ? "All day" : format(startDate, "HH:mm")}
                </span>
              )}
              {apt.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {apt.location}
                </span>
              )}
              {apt.resident_name && (
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {apt.resident_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomeMeetingsAppointmentsTab({ homeId, homeName, user, staffProfile, staff = [], residents = [] }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { canAdd } = useModuleActions("homes");
  const [filterTab, setFilterTab] = useState("all");
  const [filterType, setFilterType] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingAppt, setEditingAppt] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const isAdmin = staffProfile?.role === "admin" || staffProfile?.role === "admin_officer";

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["home-appointments", homeId],
    queryFn: () => base44.entities.Appointment.filter({ org_id: ORG_ID, home_id: homeId }, "-start_datetime", 200),
    enabled: !!homeId,
    staleTime: 60 * 1000,
  });

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const startOfToday = new Date(`${todayStr}T00:00:00`);
  const endOfToday = new Date(`${todayStr}T23:59:59.999`);

  const filtered = useMemo(() => {
    let list = appointments.filter(a => !a.is_deleted);

    if (filterTab === "upcoming") list = list.filter(a => a.start_datetime && new Date(a.start_datetime) > endOfToday);
    else if (filterTab === "today") list = list.filter(a => a.start_datetime && a.start_datetime.startsWith(todayStr));
    else if (filterTab === "past") list = list.filter(a => a.start_datetime && new Date(a.start_datetime) < startOfToday);

    if (filterType) list = list.filter(a => a.appointment_type === filterType);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        (a.title || "").toLowerCase().includes(q) ||
        (a.resident_name || "").toLowerCase().includes(q) ||
        (a.location || "").toLowerCase().includes(q) ||
        (APPOINTMENT_TYPE_LABELS[a.appointment_type] || "").toLowerCase().includes(q)
      );
    }

    return filterTab === "upcoming"
      ? list.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      : list.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
  }, [appointments, filterTab, filterType, search, startOfToday, endOfToday, todayStr]);

  const counts = useMemo(() => ({
    upcoming: appointments.filter(a => !a.is_deleted && a.start_datetime && new Date(a.start_datetime) > endOfToday).length,
    today: appointments.filter(a => !a.is_deleted && a.start_datetime && a.start_datetime.startsWith(todayStr)).length,
    past: appointments.filter(a => !a.is_deleted && a.start_datetime && new Date(a.start_datetime) < startOfToday).length,
    all: appointments.filter(a => !a.is_deleted).length,
  }), [appointments, startOfToday, endOfToday, todayStr]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await base44.functions.invoke("seedAppointments", {});
      qc.invalidateQueries({ queryKey: ["home-appointments", homeId] });
      toast.success("Appointment data seeded.");
    } catch (e) {
      toast.error("Seed failed: " + e.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleSaved = () => {
    qc.invalidateQueries({ queryKey: ["home-appointments", homeId] });
    setShowForm(false);
    setEditingAppt(null);
  };

  const homeResidents = residents.filter(r => r.home_id === homeId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold text-slate-900">Meetings &amp; Appointments</h3>
        <div className="flex items-center gap-2">

          {canAdd && (
            <button
              onClick={() => { setEditingAppt(null); setShowForm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> New Appointment
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Tab filters */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
          {FILTER_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${filterTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}
            >
              {tab} {counts[tab] > 0 && <span className="ml-1 text-[10px] font-bold opacity-60">{counts[tab]}</span>}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-600 focus:outline-none"
        >
          <option value="">All Types</option>
          {Object.entries(APPOINTMENT_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Search */}
        <div className="relative flex items-center ml-auto">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search appointments..."
            className="w-48 pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5">
              <X className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Calendar className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No {filterTab} appointments found</p>
          {filterTab !== "all" && (
            <button onClick={() => setFilterTab("all")} className="text-xs text-primary mt-2 hover:underline">
              View all appointments
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(apt => (
            <AppointmentCard
              key={apt.id}
              apt={apt}
              residents={residents}
              staff={staff}
              staffProfile={staffProfile}
              isAdmin={isAdmin}
              onSelect={setSelectedAppt}
              onUpdate={() => qc.invalidateQueries({ queryKey: ["home-appointments", homeId] })}
            />
          ))}
        </div>
      )}

      {/* New/Edit Form */}
      {showForm && (
        <AppointmentForm
          staffProfile={staffProfile}
          user={user}
          residents={homeResidents}
          homes={[{ id: homeId, name: homeName }]}
          staff={staff}
          initialData={editingAppt}
          onSave={handleSaved}
          onClose={() => { setShowForm(false); setEditingAppt(null); }}
        />
      )}

      {/* Detail Panel */}
      {selectedAppt && (
        <AppointmentDetailPanel
          appointment={selectedAppt}
          residents={residents}
          staff={staff}
          staffProfile={staffProfile}
          isAdmin={isAdmin}
          onClose={() => setSelectedAppt(null)}
          onEdit={(apt) => { setSelectedAppt(null); setEditingAppt(apt); setShowForm(true); }}
          onUpdate={() => { qc.invalidateQueries({ queryKey: ["home-appointments", homeId] }); setSelectedAppt(null); }}
        />
      )}
    </div>
  );
}