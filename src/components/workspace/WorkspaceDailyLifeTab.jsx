import { useState } from "react";
import { GraduationCap, Users, Home, PoundSterling, Activity } from "lucide-react";
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

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-slate-50 last:border-0 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value || <span className="text-slate-300">Not recorded</span>}</span>
    </div>
  );
}

export default function WorkspaceDailyLifeTab({ resident, data, isAdminOrTL }) {
  const [selectedRecord, setSelectedRecord] = useState(null);

  const eduDays = (resident.education_days_attended || []).join(", ");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Education */}
      <SectionCard title="Education / Training" icon={GraduationCap} iconColor="text-blue-500">
        <InfoRow label="Status" value={resident.education_status?.replace(/_/g, " ")?.replace(/\b\w/g, c => c.toUpperCase())} />
        <InfoRow label="Provider" value={resident.education_provider} />
        <InfoRow label="Course" value={resident.education_course} />
        <InfoRow label="Enrolled" value={resident.education_enrolment_date ? format(new Date(resident.education_enrolment_date), "dd MMM yyyy") : null} />
        <InfoRow label="Expected End" value={resident.education_expected_end_date ? format(new Date(resident.education_expected_end_date), "dd MMM yyyy") : null} />
        <InfoRow label="Attendance Days" value={eduDays || null} />
        <InfoRow label="Contact" value={resident.education_contact_name} />
        <InfoRow label="Contact Phone" value={resident.education_contact_phone} />
        {resident.education_notes && (
          <div className="mt-3 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">{resident.education_notes}</div>
        )}
      </SectionCard>

      {/* Family Contacts */}
      <SectionCard title="Family Contacts" icon={Users} iconColor="text-purple-500">
        {(data.familyContacts || []).length === 0 && (resident.family_contacts || []).length === 0 ? (
          <EmptyState message="No family contacts recorded" />
        ) : (
          <div className="space-y-3">
            {[...(resident.family_contacts || []), ...(data.familyContacts || [])].slice(0, 5).map((f, i) => (
              <div key={i} className="border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{f.name || f.contact_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{f.relationship}</p>
                  </div>
                  {f.approved !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${f.approved ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                      {f.approved ? "Approved" : "Pending"}
                    </span>
                  )}
                </div>
                {f.phone && <p className="text-xs text-slate-500 mt-1">{f.phone}</p>}
                {f.contact_date && <p className="text-xs text-slate-400 mt-1">Last contact: {format(new Date(f.contact_date), "dd MMM yyyy")}</p>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Leisure & Activities */}
      <SectionCard title="Activities & Interests" icon={Activity} iconColor="text-teal-500">
        <InfoRow label="Gym" value={resident.leisure_gym_enrolled ? `${resident.leisure_gym_name || "Enrolled"}` : "Not enrolled"} />
        <InfoRow label="Football" value={resident.leisure_football_enrolled ? (resident.leisure_football_club || "Enrolled") : "Not enrolled"} />
        <InfoRow label="Leisure Centre" value={resident.leisure_leisure_centre_enrolled ? (resident.leisure_leisure_centre || "Enrolled") : "Not enrolled"} />
        {(resident.leisure_other_clubs || []).length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-500 mb-2">Other Activities</p>
            {(resident.leisure_other_clubs || []).map((c, i) => (
              <div key={i} className="text-xs text-slate-600 py-1">{c.name} — {c.type} {c.day ? `(${c.day})` : ""}</div>
            ))}
          </div>
        )}
        {resident.leisure_interests && (
          <div className="mt-2 p-3 bg-slate-50 rounded-xl text-xs text-slate-600">{resident.leisure_interests}</div>
        )}
      </SectionCard>

      {/* Housing & Transitions */}
      <SectionCard title="Housing & Transitions" icon={Home} iconColor="text-green-500">
        <InfoRow label="Placement Type" value={resident.placement_type?.replace(/_/g, " ")} />
        <InfoRow label="Date Placed" value={resident.placement_start ? format(new Date(resident.placement_start), "dd MMM yyyy") : null} />
        <InfoRow label="Contracted Visits/Wk" value={resident.contracted_visits_per_week} />
        <InfoRow label="Min Contact Hours/Wk" value={resident.minimum_contact_hours_per_week} />
        {resident.visit_frequency_notes && (
          <div className="mt-2 p-3 bg-green-50 rounded-xl text-xs text-green-700">{resident.visit_frequency_notes}</div>
        )}
        {(data.pathwayPlans || []).length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-slate-500 mb-2">Pathway Plans</p>
            {(data.pathwayPlans || []).slice(0, 2).map(p => (
              <div key={p.id} className="flex justify-between text-xs py-1.5 border-b border-slate-50">
                <span className="text-slate-700 font-medium">{p.title || "Pathway Plan"}</span>
                <button onClick={() => setSelectedRecord({ ...p, _type: "Pathway Plan" })} className="text-teal-600 hover:underline">View</button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Finance & Legal */}
      <div className="lg:col-span-2">
        <SectionCard title="Finance & Legal" icon={PoundSterling} iconColor="text-amber-500">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Banking</p>
              <InfoRow label="Account Name" value={resident.bank_account_name} />
              <InfoRow label="Bank" value={resident.bank_name} />
              <InfoRow label="Sort Code" value={resident.bank_sort_code ? "••-••-••" : null} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Legal</p>
              <InfoRow label="Solicitor" value={resident.solicitor_name} />
              <InfoRow label="Firm" value={resident.solicitor_firm} />
              <InfoRow label="Case Ref" value={resident.solicitor_case_ref} />
            </div>
          </div>
          {!resident.bank_name && !resident.solicitor_name && <EmptyState message="No finance or legal details recorded" />}
        </SectionCard>
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