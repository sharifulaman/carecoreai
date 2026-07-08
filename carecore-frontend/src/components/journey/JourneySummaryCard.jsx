import { Globe, MapPin, Calendar, User } from "lucide-react";
import { format, differenceInYears } from "date-fns";

const STATUS_STYLE = {
  draft: "bg-blue-100 text-blue-700",
  submitted: "bg-amber-100 text-amber-700",
  under_review: "bg-purple-100 text-purple-700",
  changes_requested: "bg-orange-100 text-orange-700",
  reviewed: "bg-teal-100 text-teal-700",
  statement_ready: "bg-green-100 text-green-700",
};
const STATUS_LABEL = {
  draft: "Draft", submitted: "Submitted", under_review: "Under Review",
  changes_requested: "Changes Requested", reviewed: "Reviewed", statement_ready: "Statement Ready",
};

export default function JourneySummaryCard({ resident, record, onSaveDraft, onSubmit, onGenerateStatement, onExportPDF, staffProfile }) {
  if (!resident) return null;
  const age = resident.dob ? differenceInYears(new Date(), new Date(resident.dob)) : null;
  const status = record?.statement_status || "draft";
  const completion = record?.completion_percentage || 0;

  function InfoPill({ icon: PillIcon, label, value }) {
    return (
      <div className="flex items-center gap-1.5">
        <PillIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="text-[10px] text-slate-400">{label}:</span>
        <span className="text-xs font-semibold text-slate-700">{value || "—"}</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="flex flex-wrap gap-5 items-start">
        {/* Avatar */}
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden">
          {resident.photo_url
            ? <img src={resident.photo_url} alt="" className="w-full h-full object-cover" />
            : (resident.initials || resident.display_name?.charAt(0) || "?")}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h2 className="text-lg font-bold text-slate-900">{resident.display_name}</h2>
            {age && <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">Age {age}</span>}
            {record?.interpreter_needed && (
              <span className="px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold flex items-center gap-1">🔊 Interpreter Needed</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-1.5 gap-x-4">
            <InfoPill icon={User} label="Resident ID" value={`YP-${resident.id?.slice(0, 8)}`} />
            <InfoPill icon={Calendar} label="Date of Birth" value={resident.dob ? format(new Date(resident.dob), "dd MMM yyyy") : null} />
            <InfoPill icon={User} label="Gender" value={resident.gender} />
            <InfoPill icon={Globe} label="Nationality" value={record?.nationality || resident.nationality} />
            <InfoPill icon={Globe} label="Language" value={record?.language_spoken || resident.language} />
            <InfoPill icon={MapPin} label="Country of Origin" value={record?.country_of_origin} />
            <InfoPill icon={MapPin} label="Home Town" value={record?.home_town} />
            <InfoPill icon={Calendar} label="Arrival in UK" value={record?.uk_arrival_date ? format(new Date(record.uk_arrival_date), "dd MMM yyyy") : null} />
          </div>
        </div>

        {/* Right: status + completion */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className="text-xs text-slate-500">Asylum Claimed:</span>
                <span className={`text-xs font-semibold ${record?.asylum_claimed_in_uk === "yes" ? "text-green-600" : record?.asylum_claimed_in_uk === "no" ? "text-red-500" : "text-slate-400"}`}>
                  {record?.asylum_claimed_in_uk === "yes" ? "Yes" : record?.asylum_claimed_in_uk === "no" ? "No" : "Unknown"}
                </span>
              </div>
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className="text-xs text-slate-500">Solicitor Assigned:</span>
                <span className={`text-xs font-semibold ${record?.solicitor_assigned ? "text-green-600" : "text-red-500"}`}>
                  {record?.solicitor_assigned ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xs text-slate-500">Status:</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[status] || STATUS_STYLE.draft}`}>
                  {STATUS_LABEL[status] || "Draft"}
                </span>
              </div>
            </div>
            {/* Completion circle */}
            <div className="flex flex-col items-center">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                  <circle cx="32" cy="32" r="26" stroke="#8b5cf6" strokeWidth="6" fill="none"
                    strokeDasharray={`${2 * Math.PI * 26}`}
                    strokeDashoffset={`${2 * Math.PI * 26 * (1 - completion / 100)}`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-slate-800">{completion}%</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">Completion</span>
            </div>
          </div>
          {record?.updated_by_name && (
            <p className="text-[10px] text-slate-400 text-right">
              Last updated {record?.updated_at ? format(new Date(record.updated_at), "dd MMM yyyy") : "—"}<br />
              by {record.updated_by_name}
            </p>
          )}
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
        <button onClick={onSaveDraft} className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
          💾 Save Draft
        </button>
        {(status === "draft" || status === "changes_requested") && (
          <button onClick={onSubmit} className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors">
            📤 Submit for Review
          </button>
        )}
        <button onClick={onGenerateStatement} className="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          ✨ Generate Draft Statement
        </button>
        <button onClick={onExportPDF} className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
          📄 Export PDF
        </button>
      </div>
    </div>
  );
}