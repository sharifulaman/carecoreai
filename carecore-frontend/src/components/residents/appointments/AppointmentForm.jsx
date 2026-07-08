import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useWorkflowTrigger } from "@/hooks/useWorkflowTrigger";

const APPOINTMENT_TYPES = [
  { value: "gp_appointment", label: "GP Appointment" },
  { value: "hospital_appointment", label: "Hospital Appointment" },
  { value: "dental", label: "Dental" },
  { value: "optician", label: "Optician" },
  { value: "mental_health", label: "Mental Health" },
  { value: "social_worker_visit", label: "Social Worker Visit" },
  { value: "iro_review", label: "IRO Review" },
  { value: "lac_review", label: "LAC Review" },
  { value: "court_hearing", label: "Court Hearing" },
  { value: "school_meeting", label: "School Meeting" },
  { value: "college_meeting", label: "College Meeting" },
  { value: "key_worker_session", label: "Key Worker Session" },
  { value: "family_contact", label: "Family Contact" },
  { value: "counselling", label: "Counselling" },
  { value: "probation", label: "Probation" },
  { value: "youth_offending", label: "Youth Offending" },
  { value: "other", label: "Other" },
];

const COLOURS = ["#2563EB", "#16A34A", "#DC2626", "#D97706", "#7C3AED", "#0D9488", "#DB2777", "#9333EA"];

function toDateStr(iso) {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
}
function toTimeStr(iso) {
  if (!iso) return "09:00";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function AppointmentForm({
  staffProfile,
  user,
  residents = [],
  homes = [],
  staff = [],
  initialDate,
  initialResidentId,
  initialData,
  onSave,
  onClose,
}) {
  const queryClient = useQueryClient();
  const { triggerWorkflow } = useWorkflowTrigger({ staffProfile });
  const isEditing = !!initialData?.id;
  const [isPending, setIsPending] = useState(false);

  const todayStr = new Date().toISOString().split("T")[0];
  const defaultStart = initialDate ? new Date(initialDate).toISOString().split("T")[0] : todayStr;

  const [formData, setFormData] = useState(() => {
    if (initialData) {
      return {
        title: initialData.title || "",
        appointment_type: initialData.appointment_type || "other",
        description: initialData.description || "",
        start_date: toDateStr(initialData.start_datetime) || defaultStart,
        start_time: toTimeStr(initialData.start_datetime),
        end_date: toDateStr(initialData.end_datetime) || defaultStart,
        end_time: toTimeStr(initialData.end_datetime),
        all_day: initialData.all_day || false,
        location: initialData.location || "",
        location_type: initialData.location_type || "in_person",
        resident_id: initialData.resident_id || "",
        home_id: initialData.home_id || "",
        attendees: initialData.attendees || [],
        external_attendees: initialData.external_attendees || [],
        is_recurring: initialData.is_recurring || false,
        recurrence_pattern: initialData.recurrence_pattern || "weekly",
        recurrence_end_date: initialData.recurrence_end_date || "",
        reminder_minutes_before: initialData.reminder_minutes_before ?? 15,
        colour: initialData.colour || "#2563EB",
        is_private: initialData.is_private || false,
        follow_up_required: initialData.follow_up_required || false,
        follow_up_notes: initialData.follow_up_notes || "",
      };
    }
    return {
      title: "",
      appointment_type: "other",
      description: "",
      start_date: defaultStart,
      start_time: "09:00",
      end_date: defaultStart,
      end_time: "10:00",
      all_day: false,
      location: "",
      location_type: "in_person",
      resident_id: initialResidentId || "",
      home_id: "",
      attendees: [],
      external_attendees: [],
      is_recurring: false,
      recurrence_pattern: "weekly",
      recurrence_end_date: "",
      reminder_minutes_before: 15,
      colour: "#2563EB",
      is_private: false,
      follow_up_required: false,
      follow_up_notes: "",
    };
  });

  const [errors, setErrors] = useState({});
  const set = (key, value) => { setFormData(prev => ({ ...prev, [key]: value })); setErrors(e => ({ ...e, [key]: undefined })); };

  // ── Attendee search ──────────────────────────────────────────────────────────
  const [attendeeSearch, setAttendeeSearch] = useState("");
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  const filteredStaff = useMemo(() => {
    const residentMatch = residents.find(r => r.id === formData.resident_id);
    const targetHomeId = residentMatch?.home_id;

    // Filter active, non-self, non-invited staff
    const baseStaff = (staff || []).filter(s =>
      s.status === "active" &&
      s.id !== staffProfile?.id &&
      !formData.attendees.some(a => a.staff_id === s.id)
    );

    // Filter by search query if any
    const query = attendeeSearch.trim().toLowerCase();
    const searched = query
      ? baseStaff.filter(s => s.full_name?.toLowerCase().includes(query))
      : baseStaff;

    // Partition into home staff and others
    const homeStaff = searched.filter(s => Array.isArray(s.home_ids) && targetHomeId && s.home_ids.includes(targetHomeId));
    const otherStaff = searched.filter(s => !Array.isArray(s.home_ids) || !targetHomeId || !s.home_ids.includes(targetHomeId));

    // Combine them with section markers
    const items = [];
    if (homeStaff.length > 0) {
      items.push({ isHeader: true, label: "Assigned Home Staff" });
      homeStaff.forEach(s => items.push({ ...s, isHomeStaff: true }));
    }
    if (otherStaff.length > 0) {
      items.push({ isHeader: true, label: query ? "Other Staff" : "All Staff" });
      otherStaff.forEach(s => items.push({ ...s, isHomeStaff: false }));
    }
    return items;
  }, [attendeeSearch, staff, formData.attendees, staffProfile, formData.resident_id, residents]);

  const addAttendee = (member) => {
    set("attendees", [
      ...formData.attendees,
      { staff_id: member.id, staff_name: member.full_name, role: member.role, response_status: "pending" }
    ]);
    setAttendeeSearch("");
    setShowStaffDropdown(false);
  };

  const removeAttendee = (staffId) => {
    set("attendees", formData.attendees.filter(a => a.staff_id !== staffId));
  };

  // ── External attendees ───────────────────────────────────────────────────────
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalForm, setExternalForm] = useState({ name: "", email: "", organisation: "", role: "" });

  const addExternalAttendee = () => {
    if (!externalForm.name.trim()) { toast.error("Name is required"); return; }
    set("external_attendees", [...formData.external_attendees, { ...externalForm }]);
    setExternalForm({ name: "", email: "", organisation: "", role: "" });
    setShowExternalForm(false);
  };

  // ── Build payload ────────────────────────────────────────────────────────────
  const buildPayload = () => {
    const startTimeStr = formData.all_day ? "00:00" : (formData.start_time || "09:00");
    const endDateStr = formData.end_date || formData.start_date;
    const endTimeStr = formData.all_day ? "23:59" : (formData.end_time || "10:00");
    const start_datetime = new Date(`${formData.start_date}T${startTimeStr}:00`).toISOString();
    const end_datetime = new Date(`${endDateStr}T${endTimeStr}:00`).toISOString();
    const residentMatch = residents.find(r => r.id === formData.resident_id);

    return {
      org_id: staffProfile?.org_id || initialData?.org_id || "default_org",
      title: formData.title.trim(),
      start_datetime,
      end_datetime,
      status: initialData?.status || "scheduled",
      appointment_type: formData.appointment_type || "other",
      all_day: formData.all_day || false,
      organiser_id: isEditing ? initialData.organiser_id : (staffProfile?.id || null),
      organiser_name: isEditing ? initialData.organiser_name : (staffProfile?.full_name || user?.email || "Unknown"),
      resident_id: formData.resident_id || null,
      resident_name: residentMatch?.display_name || initialData?.resident_name || "",
      location: formData.location || "",
      location_type: formData.location_type || "in_person",
      home_id: residentMatch?.home_id || formData.home_id || staffProfile?.home_ids?.[0] || null,
      attendees: Array.isArray(formData.attendees) ? formData.attendees : [],
      external_attendees: Array.isArray(formData.external_attendees) ? formData.external_attendees : [],
      description: formData.description || "",
      colour: formData.colour || "#2563EB",
      is_private: formData.is_private || false,
      is_recurring: formData.is_recurring || false,
      recurrence_pattern: formData.is_recurring ? (formData.recurrence_pattern || "weekly") : "none",
      recurrence_end_date: formData.is_recurring ? (formData.recurrence_end_date || null) : null,
      cancelled_dates: initialData?.cancelled_dates || [],
      reminder_minutes_before: formData.reminder_minutes_before ?? 15,
      reminder_sent: initialData?.reminder_sent || false,
      follow_up_required: formData.follow_up_required || false,
      follow_up_notes: formData.follow_up_notes || "",
      outcome_notes: initialData?.outcome_notes || "",
      cancellation_reason: initialData?.cancellation_reason || "",
      is_deleted: false,
    };
  };

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!formData.title?.trim()) errs.title = "Title is required";
    if (!formData.appointment_type) errs.appointment_type = "Please select an appointment type";
    if (!formData.resident_id) errs.resident_id = "Please select a young person";
    if (!formData.start_date) errs.start_date = "Start date is required";
    if (!formData.all_day && !formData.start_time) errs.start_time = "Start time is required";
    if (!formData.all_day && !formData.end_date) errs.end_date = "End date is required";
    if (!formData.all_day && !formData.end_time) errs.end_time = "End time is required";
    if (!formData.location?.trim()) errs.location = "Location is required";
    if (!formData.location_type) errs.location_type = "Please select a location type";
    if (!formData.all_day) {
      const endDateStr = formData.end_date || formData.start_date;
      const start_dt = new Date(`${formData.start_date}T${formData.start_time || "09:00"}:00`);
      const end_dt = new Date(`${endDateStr}T${formData.end_time || "10:00"}:00`);
      if (end_dt <= start_dt) errs.end_time = "End time must be after start time";
    }
    if (formData.is_recurring && !formData.recurrence_end_date) errs.recurrence_end_date = "Recurrence end date is required";
    return errs;
  };

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = async (sendInvites = false) => {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); toast.error("Please fill in all required fields"); return; }

    const startTimeStr = formData.all_day ? "00:00" : (formData.start_time || "09:00");
    const endDateStr = formData.end_date || formData.start_date;
    const endTimeStr = formData.all_day ? "23:59" : (formData.end_time || "10:00");
    const start_datetime = new Date(`${formData.start_date}T${startTimeStr}:00`).toISOString();
    const end_datetime = new Date(`${endDateStr}T${endTimeStr}:00`).toISOString();

    const payload = buildPayload();
    setIsPending(true);

    try {
      let result;
      if (isEditing) {
        result = await secureGateway.update("Appointment", initialData.id, payload);
      } else {
        result = await secureGateway.create("Appointment", payload);
      }

      // Send in-app invitations
      if (sendInvites && payload.attendees.length > 0) {
        const aptId = result?.id || initialData?.id;
        await Promise.allSettled(
          payload.attendees.map(attendee => {
            const staffMember = staff.find(s => s.id === attendee.staff_id);
            return secureGateway.create("Notification", {
              org_id: payload.org_id,
              recipient_id: attendee.staff_id,
              recipient_email: staffMember?.email || "",
              title: `Appointment Invitation: ${payload.title}`,
              body: `${payload.organiser_name} has invited you to: ${payload.title} on ${new Date(payload.start_datetime).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} at ${new Date(payload.start_datetime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.`,
              type: "appointment_invite",
              link: "/residents?tab=appointments",
              read: false,
            });
          })
        );
        toast.success(`Appointment saved and ${payload.attendees.length} invitation(s) sent`);
        triggerWorkflow({
          workflowType: "life_community_appointments",
          entityId: result?.id || initialData?.id || "",
          entityRef: result?.id ? `APT-${result.id.slice(0, 8)}` : "",
          title: payload.title,
          description: `${APPOINTMENT_TYPES[payload.appointment_type] || payload.appointment_type} — ${payload.resident_name}`,
          homeId: payload.home_id || "",
          homeName: "",
          priority: "routine",
        });
      } else {
        toast.success(isEditing ? "Appointment updated" : "Appointment saved");
        triggerWorkflow({
          workflowType: "life_community_appointments",
          entityId: result?.id || initialData?.id || "",
          entityRef: result?.id ? `APT-${result.id.slice(0, 8)}` : "",
          title: payload.title,
          description: `${APPOINTMENT_TYPES[payload.appointment_type] || payload.appointment_type} — ${payload.resident_name}`,
          homeId: payload.home_id || "",
          homeName: "",
          priority: "routine",
        });
      }

      queryClient.invalidateQueries(["appointments"]);
      onSave && onSave();
      onClose();
    } catch (err) {
      toast.error("Failed to save: " + (err?.message || "Unknown error"));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0">
          <h2 className="text-lg font-bold">{isEditing ? "Edit Appointment" : "New Appointment"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 pb-4 space-y-4 overflow-y-auto flex-1">

          {/* Title */}
          <div>
            <input type="text" value={formData.title} onChange={e => set("title", e.target.value)}
              placeholder="Add a title *" autoFocus
              className={`w-full text-xl font-semibold border-b-2 pb-2 outline-none bg-transparent ${errors.title ? "border-red-500" : "border-blue-500"}`} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Appointment Type <span className="text-red-500">*</span></label>
            <select value={formData.appointment_type} onChange={e => set("appointment_type", e.target.value)}
              className={`w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.appointment_type ? "border-red-400" : "border-gray-300"}`}>
              <option value="">Select type...</option>
              {APPOINTMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {errors.appointment_type && <p className="text-xs text-red-500 mt-1">{errors.appointment_type}</p>}
          </div>

          {/* All day */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={formData.all_day} onChange={e => set("all_day", e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">All day</span>
          </label>

          {/* Start */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Start <span className="text-red-500">*</span></label>
            <div className="flex gap-2">
              <input type="date" value={formData.start_date} onChange={e => set("start_date", e.target.value)}
                className={`border rounded-lg p-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.start_date ? "border-red-400" : "border-gray-300"}`} />
              {!formData.all_day && (
                <input type="time" value={formData.start_time} onChange={e => set("start_time", e.target.value)}
                  className={`border rounded-lg p-2 w-28 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.start_time ? "border-red-400" : "border-gray-300"}`} />
              )}
            </div>
            {(errors.start_date || errors.start_time) && <p className="text-xs text-red-500 mt-1">{errors.start_date || errors.start_time}</p>}
          </div>

          {/* End */}
          {!formData.all_day && (
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">End <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input type="date" value={formData.end_date} onChange={e => set("end_date", e.target.value)}
                  className={`border rounded-lg p-2 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.end_date ? "border-red-400" : "border-gray-300"}`} />
                <input type="time" value={formData.end_time} onChange={e => set("end_time", e.target.value)}
                  className={`border rounded-lg p-2 w-28 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.end_time ? "border-red-400" : "border-gray-300"}`} />
              </div>
              {(errors.end_date || errors.end_time) && <p className="text-xs text-red-500 mt-1">{errors.end_date || errors.end_time}</p>}
            </div>
          )}

          {/* Young Person */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Young Person <span className="text-red-500">*</span></label>
            <select value={formData.resident_id} onChange={e => set("resident_id", e.target.value)}
              className={`w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.resident_id ? "border-red-400" : "border-gray-300"}`}>
              <option value="">Select young person...</option>
              {residents.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
            </select>
            {errors.resident_id && <p className="text-xs text-red-500 mt-1">{errors.resident_id}</p>}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Location Type <span className="text-red-500">*</span></label>
              <select value={formData.location_type} onChange={e => set("location_type", e.target.value)}
                className={`w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.location_type ? "border-red-400" : "border-gray-300"}`}>
                <option value="">Select type...</option>
                <option value="in_person">In Person</option>
                <option value="virtual">Virtual</option>
                <option value="phone">Phone</option>
                <option value="home_visit">Home Visit</option>
              </select>
              {errors.location_type && <p className="text-xs text-red-500 mt-1">{errors.location_type}</p>}
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Location <span className="text-red-500">*</span></label>
              <input type="text" value={formData.location} onChange={e => set("location", e.target.value)}
                placeholder="Add location"
                className={`w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.location ? "border-red-400" : "border-gray-300"}`} />
              {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
            </div>
          </div>

          {/* ── Internal Attendees ─────────────────────────────────────────── */}
          <div className="relative">
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">Invite Staff Attendees</label>

            {formData.attendees.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {formData.attendees.map(a => (
                  <div key={a.staff_id} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
                    <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      {a.staff_name?.charAt(0)}
                    </div>
                    <span>{a.staff_name}</span>
                    <button type="button" onClick={() => removeAttendee(a.staff_id)} className="ml-1 hover:text-red-500">×</button>
                  </div>
                ))}
              </div>
            )}

            <input
              type="text"
              value={attendeeSearch}
              onChange={e => { setAttendeeSearch(e.target.value); setShowStaffDropdown(true); }}
              onFocus={() => setShowStaffDropdown(true)}
              onBlur={() => setTimeout(() => setShowStaffDropdown(false), 150)}
              placeholder="Search staff to invite..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {showStaffDropdown && filteredStaff.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredStaff.map((member, idx) => {
                  if (member.isHeader) {
                    return (
                      <div key={`header-${idx}`} className="px-3 py-1 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-100 first:border-t-0">
                        {member.label}
                      </div>
                    );
                  }
                  return (
                    <button key={member.id} type="button" onMouseDown={() => addAttendee(member)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left text-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {member.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate flex items-center gap-2">
                          <span>{member.full_name}</span>
                          {member.isHomeStaff && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold shrink-0">
                              Assigned Home
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{member.role?.replace(/_/g, " ")}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── External Attendees ─────────────────────────────────────────── */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase mb-1 block">External Attendees</label>

            {formData.external_attendees.map((ea, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b text-sm">
                <div>
                  <span className="font-medium">{ea.name}</span>
                  {ea.role && <span className="text-gray-500 ml-2">{ea.role}</span>}
                  {ea.organisation && <span className="text-gray-400 text-xs block">{ea.organisation}</span>}
                </div>
                <button type="button" onClick={() => set("external_attendees", formData.external_attendees.filter((_, idx) => idx !== i))}
                  className="text-red-400 hover:text-red-600 text-xs">Remove</button>
              </div>
            ))}

            {showExternalForm ? (
              <div className="border border-gray-200 rounded-lg p-3 mt-2 bg-gray-50 space-y-2">
                <input type="text" placeholder="Full name *" value={externalForm.name}
                  onChange={e => setExternalForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                <input type="text" placeholder="Role (e.g. Social Worker, IRO, Solicitor)" value={externalForm.role}
                  onChange={e => setExternalForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                <input type="text" placeholder="Organisation" value={externalForm.organisation}
                  onChange={e => setExternalForm(p => ({ ...p, organisation: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                <input type="email" placeholder="Email (optional)" value={externalForm.email}
                  onChange={e => setExternalForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm" />
                <div className="flex gap-2">
                  <button type="button" onClick={addExternalAttendee}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs">Add</button>
                  <button type="button" onClick={() => setShowExternalForm(false)}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs text-gray-600">Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setShowExternalForm(true)}
                className="mt-1 text-xs text-blue-600 hover:underline">+ Add external attendee</button>
            )}
          </div>

          {/* Recurring */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_recurring} onChange={e => set("is_recurring", e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium">Recurring appointment</span>
            </label>
            {formData.is_recurring && (
              <div className="space-y-3 pl-6">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Repeats</label>
                  <select value={formData.recurrence_pattern} onChange={e => set("recurrence_pattern", e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="fortnightly">Fortnightly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Repeat until</label>
                  <input type="date" value={formData.recurrence_end_date} min={formData.start_date}
                    onChange={e => set("recurrence_end_date", e.target.value)}
                    className={`w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.recurrence_end_date ? "border-red-400" : "border-gray-300"}`} />
                  {errors.recurrence_end_date && <p className="text-xs text-red-500 mt-1">{errors.recurrence_end_date}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Notes</label>
            <textarea value={formData.description} onChange={e => set("description", e.target.value)}
              placeholder="Add notes or details..." rows={3}
              className="w-full border border-gray-300 rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Colour */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-2">Colour</label>
            <div className="flex gap-2">
              {COLOURS.map(colour => (
                <button key={colour} type="button" onClick={() => set("colour", colour)}
                  className="w-6 h-6 rounded-full border-2 transition-transform"
                  style={{ backgroundColor: colour, borderColor: formData.colour === colour ? "#1B2A4A" : "transparent", transform: formData.colour === colour ? "scale(1.25)" : "scale(1)" }} />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 shrink-0 rounded-b-2xl">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
            Cancel
          </button>
          {formData.attendees.length > 0 ? (
            <>
              <button type="button" onClick={() => handleSave(false)} disabled={isPending}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {isPending ? "Saving..." : "Save"}
              </button>
              <button type="button" onClick={() => handleSave(true)} disabled={isPending}
                className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {isPending ? "Saving..." : `Save & Invite (${formData.attendees.length})`}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => handleSave(false)} disabled={isPending}
              className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {isPending ? "Saving..." : (isEditing ? "Save Changes" : "Save Appointment")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}