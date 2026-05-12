import { useState, useMemo } from "react";
import { Calendar, Heart, Pill, User, Award } from "lucide-react";
import { format } from "date-fns";

function SectionCard({ title, icon: Icon, iconColor, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className={`w-4 h-4 ${iconColor || "text-teal-500"}`} />
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="text-sm text-slate-400 text-center py-6">{message}</p>;
}

export default function WorkspaceHealthTab({ resident, data, isAdminOrTL }) {
  const [selectedRecord, setSelectedRecord] = useState(null);

  const allergies = resident.allergies || [];
  const conditions = resident.medical_conditions || [];
  const today = new Date();

  const upcomingAppts = useMemo(() => (data.appointments || []).filter(a => {
    const dt = a.start_datetime || a.date;
    return dt && new Date(dt) >= today;
  }).sort((a, b) => (a.start_datetime || a.date || "").localeCompare(b.start_datetime || b.date || "")), [data.appointments, today]);

  const pastAppts = useMemo(() => (data.appointments || []).filter(a => {
    const dt = a.start_datetime || a.date;
    return dt && new Date(dt) < today;
  }).sort((a, b) => (b.start_datetime || b.date || "").localeCompare(a.start_datetime || a.date || "")), [data.appointments, today]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Health Summary */}
        <SectionCard title="Health Summary" icon={Heart} iconColor="text-red-400">
          <div className="space-y-2 text-xs">
            {[
              ["NHS Number", resident.nhs_number],
              ["GP", resident.gp_name],
              ["GP Practice", resident.gp_practice],
              ["GP Phone", resident.gp_phone],
              ["Dentist", resident.dentist_name],
              ["Dentist Practice", resident.dentist_practice],
              ["Last Health Check", resident.health_updated_at ? format(new Date(resident.health_updated_at), "dd MMM yyyy") : null],
            ].map(([k, v]) => v && (
              <div key={k} className="flex justify-between">
                <span className="text-slate-500">{k}</span>
                <span className="font-medium text-slate-700">{v}</span>
              </div>
            ))}
            {!resident.gp_name && !resident.nhs_number && <EmptyState message="No health details recorded" />}
          </div>
        </SectionCard>

        {/* Allergies */}
        <SectionCard title="Allergies & Medical Conditions" icon={Heart} iconColor="text-orange-400">
          {allergies.length === 0 && conditions.length === 0 ? (
            <EmptyState message="No allergies or conditions recorded" />
          ) : (
            <div className="space-y-3">
              {allergies.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">ALLERGIES</p>
                  <div className="flex flex-wrap gap-1.5">
                    {allergies.map((a, i) => (
                      <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${a.severity === "anaphylactic" || a.severity === "severe" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                        {a.allergen} ({a.severity})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {conditions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">CONDITIONS</p>
                  {conditions.map((c, i) => (
                    <div key={i} className="text-xs text-slate-600 py-1 border-b border-slate-50 last:border-0">
                      <span className="font-medium">{c.condition}</span>
                      {c.notes && <span className="text-slate-400 ml-2">— {c.notes}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </SectionCard>

        {/* Medication */}
        <SectionCard title="Medication" icon={Pill} iconColor="text-blue-400">
          {(data.medicationRecords || []).length === 0 ? (
            <EmptyState message="No medication records found" />
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-slate-100">
                <th className="text-left py-2 text-slate-400 font-semibold">Medication</th>
                <th className="text-left py-2 text-slate-400 font-semibold">Dose</th>
                <th className="text-left py-2 text-slate-400 font-semibold">Status</th>
              </tr></thead>
              <tbody>
                {(data.medicationRecords || []).slice(0, 6).map(m => (
                  <tr key={m.id} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 font-medium text-slate-700">{m.medication_name || m.name || "—"}</td>
                    <td className="py-2 text-slate-500">{m.dose || m.dosage || "—"}</td>
                    <td className="py-2"><span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 capitalize">{m.status || "Active"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>

        {/* Therapeutic Plan */}
        <SectionCard title="Therapeutic Plan" icon={Heart} iconColor="text-purple-400">
          {(data.therapeuticPlans || []).length === 0 ? (
            <EmptyState message="No therapeutic plan recorded" />
          ) : (data.therapeuticPlans || []).slice(0, 2).map(t => (
            <div key={t.id} className="border border-slate-100 rounded-xl p-3 mb-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700">{t.title || "Therapeutic Plan"}</span>
                <button onClick={() => setSelectedRecord({ ...t, _type: "Therapeutic Plan" })} className="text-xs text-teal-600 hover:underline">View</button>
              </div>
              <p className="text-xs text-slate-400 mt-1">{t.created_date ? format(new Date(t.created_date), "dd MMM yyyy") : "—"}</p>
            </div>
          ))}
        </SectionCard>
      </div>

      {/* Appointments */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-teal-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Appointments</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming</p>
            {upcomingAppts.length === 0 ? (
              <EmptyState message="No upcoming appointments" />
            ) : upcomingAppts.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{a.title || a.appointment_type || "Appointment"}</p>
                  <p className="text-xs text-slate-400">{a.start_datetime ? format(new Date(a.start_datetime), "dd MMM yyyy, HH:mm") : a.date}</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Scheduled</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Recent History</p>
            {pastAppts.length === 0 ? (
              <EmptyState message="No appointment history" />
            ) : pastAppts.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{a.title || a.appointment_type || "Appointment"}</p>
                  <p className="text-xs text-slate-400">{a.start_datetime ? format(new Date(a.start_datetime), "dd MMM yyyy") : a.date}</p>
                </div>
                <span className="text-xs text-slate-400">{a.status || "Done"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-amber-500" />
          <h3 className="font-semibold text-slate-800 text-sm">Achievements</h3>
        </div>
        {(data.achievements || []).length === 0 ? (
          <EmptyState message="No achievements recorded yet" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data.achievements || []).slice(0, 6).map(a => (
              <div key={a.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-sm font-semibold text-amber-800">{a.title}</p>
                <p className="text-xs text-amber-600 mt-0.5">{a.created_date ? format(new Date(a.created_date), "dd MMM yyyy") : "—"}</p>
                {a.description && <p className="text-xs text-amber-700 mt-1">{a.description.slice(0, 100)}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSelectedRecord(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-slate-800 mb-4">{selectedRecord._type}</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(selectedRecord).filter(([k, v]) => v && !["id", "org_id", "_type"].includes(k)).map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-slate-400 capitalize w-40 shrink-0">{k.replace(/_/g, " ")}</span>
                  <span className="text-slate-700 font-medium break-all">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setSelectedRecord(null)} className="mt-5 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}