import { useState } from "react";
import { GraduationCap, Plus, Pencil, Phone, Mail, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import EducationModal from "./EducationModal";
import { STATUS_OPTIONS, STATUS_COLOURS } from "./EducationModal";

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ResidentEducationCard({ resident, onEdit }) {
  const status = resident.education_status || "unknown";
  const label = STATUS_OPTIONS.find(o => o.value === status)?.label || "Unknown";
  const colour = STATUS_COLOURS[status] || "bg-gray-100 text-gray-600";
  const hasDetails = resident.education_provider || resident.education_course;

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{resident.display_name}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${colour}`}>
            <GraduationCap className="w-3 h-3" />
            {label}
          </span>
        </div>
        <button onClick={() => onEdit(resident)} className="text-muted-foreground hover:text-primary p-1 rounded">
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {hasDetails && (
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {resident.education_provider && (
            <p><span className="font-medium text-foreground">Provider:</span> {resident.education_provider}</p>
          )}
          {resident.education_course && (
            <p><span className="font-medium text-foreground">Course:</span> {resident.education_course}</p>
          )}
          <div className="flex gap-4 flex-wrap">
            {resident.education_enrolment_date && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Enrolled: {fmt(resident.education_enrolment_date)}</span>
            )}
            {resident.education_expected_end_date && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Ends: {fmt(resident.education_expected_end_date)}</span>
            )}
          </div>
          {resident.education_days_attended?.length > 0 && (
            <p><span className="font-medium text-foreground">Days:</span> {resident.education_days_attended.join(", ")}</p>
          )}
          {resident.education_contact_name && (
            <div className="pt-1 border-t border-border/50 space-y-0.5">
              <p className="font-medium text-foreground text-xs">Provider Contact</p>
              <p>{resident.education_contact_name}</p>
              {resident.education_contact_phone && (
                <a href={`tel:${resident.education_contact_phone}`} className="flex items-center gap-1 hover:text-primary">
                  <Phone className="w-3 h-3" /> {resident.education_contact_phone}
                </a>
              )}
              {resident.education_contact_email && (
                <a href={`mailto:${resident.education_contact_email}`} className="flex items-center gap-1 hover:text-primary">
                  <Mail className="w-3 h-3" /> {resident.education_contact_email}
                </a>
              )}
            </div>
          )}
          {resident.education_notes && (
            <p className="pt-1 border-t border-border/50 italic">{resident.education_notes}</p>
          )}
        </div>
      )}

      {!hasDetails && (
        <p className="text-xs text-muted-foreground italic">No provider details recorded. <button className="underline text-primary" onClick={() => onEdit(resident)}>Add details →</button></p>
      )}
    </div>
  );
}

export default function EducationTab({ residents = [] }) {
  const [editingResident, setEditingResident] = useState(null);

  const activeResidents = residents.filter(r => r.status === "active");

  // Summary counts
  const enrolled = activeResidents.filter(r => r.education_status === "enrolled_college" || r.education_status === "enrolled_school" || r.education_status === "training").length;
  const neet = activeResidents.filter(r => r.education_status === "neet").length;
  const employed = activeResidents.filter(r => r.education_status === "employed").length;
  const unknown = activeResidents.filter(r => !r.education_status || r.education_status === "unknown").length;

  return (
    <div className="mt-4 space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "In Education / Training", value: enrolled, colour: "text-green-600", bg: "bg-green-50" },
          { label: "NEET", value: neet, colour: "text-red-600", bg: "bg-red-50" },
          { label: "Employed", value: employed, colour: "text-teal-600", bg: "bg-teal-50" },
          { label: "Status Unknown", value: unknown, colour: "text-gray-500", bg: "bg-gray-50" },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-border`}>
            <p className={`text-2xl font-bold ${s.colour}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* YP list */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {activeResidents.length === 0 ? (
          <p className="text-sm text-muted-foreground col-span-full py-8 text-center">No active residents found.</p>
        ) : activeResidents.map(r => (
          <ResidentEducationCard key={r.id} resident={r} onEdit={setEditingResident} />
        ))}
      </div>

      {editingResident && (
        <EducationModal resident={editingResident} onClose={() => setEditingResident(null)} />
      )}
    </div>
  );
}