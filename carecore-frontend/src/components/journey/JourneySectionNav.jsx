import { CheckCircle2, AlertCircle, Circle } from "lucide-react";

const SECTIONS = [
  { num: 1, key: "identity", label: "Identity & Origin" },
  { num: 2, key: "family", label: "Family Background" },
  { num: 3, key: "reason", label: "Reason for Leaving" },
  { num: 4, key: "route", label: "Journey Route Timeline" },
  { num: 5, key: "countries", label: "Countries Passed Through" },
  { num: 6, key: "documents", label: "Travel Methods & Documents" },
  { num: 7, key: "helpers", label: "People Who Helped" },
  { num: 8, key: "funding", label: "Journey Cost & Funding" },
  { num: 9, key: "asylum", label: "Previous Asylum Claims" },
  { num: 10, key: "arrival", label: "Arrival in the UK" },
  { num: 11, key: "fear", label: "Fear of Return" },
  { num: 12, key: "evidence", label: "Evidence & Documents" },
  { num: 13, key: "statement", label: "Statement Builder" },
];

function sectionStatus(key, record, stages, familyMembers, countries, claims, evidenceDocs) {
  if (!record) return "empty";
  switch (key) {
    case "identity": return record.country_of_origin && record.nationality ? "complete" : record.country_of_origin || record.nationality ? "partial" : "empty";
    case "family": return familyMembers.length > 0 ? "complete" : "empty";
    case "reason": return record.reason_for_leaving_summary || (record.reason_for_leaving_categories || []).length > 0 ? "complete" : "empty";
    case "route": return stages.length >= 2 ? "complete" : stages.length > 0 ? "partial" : "empty";
    case "countries": return countries.length > 0 ? "complete" : "empty";
    case "documents": return record.had_passport !== "unknown" ? "complete" : "partial";
    case "helpers": return record.journey_arranged_by ? "complete" : "partial";
    case "funding": return record.money_paid_for_journey !== "unknown" ? "complete" : "partial";
    case "asylum": return claims.length > 0 ? "complete" : "partial";
    case "arrival": return record.uk_arrival_date ? "complete" : record.uk_arrival_method ? "partial" : "empty";
    case "fear": return record.fear_of_return_summary || record.what_yp_fears_if_returned ? "complete" : "empty";
    case "evidence": return evidenceDocs.length > 0 ? "complete" : "empty";
    case "statement": return record.generated_statement ? "complete" : record.statement_status !== "draft" ? "partial" : "empty";
    default: return "empty";
  }
}

export { SECTIONS };

export default function JourneySectionNav({ activeSection, onSelect, completion, record, stages = [], familyMembers = [], countries = [], claims = [], evidenceDocs = [] }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">{completion}% Complete</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${completion}%` }} />
        </div>
      </div>
      <div className="divide-y divide-slate-50">
        {SECTIONS.map(s => {
          const status = sectionStatus(s.key, record, stages, familyMembers, countries, claims, evidenceDocs);
          const isActive = activeSection === s.key;
          return (
            <button
              key={s.key}
              onClick={() => onSelect(s.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-purple-50 ${isActive ? "bg-purple-50 border-r-2 border-purple-500" : ""}`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? "bg-purple-500 text-white" : "bg-slate-100 text-slate-500"}`}>
                {s.num}
              </span>
              <span className={`flex-1 text-xs font-medium ${isActive ? "text-purple-700" : "text-slate-600"}`}>{s.label}</span>
              {status === "complete" && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
              {status === "partial" && <AlertCircle className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
              {status === "empty" && <Circle className="w-3.5 h-3.5 text-slate-200 shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}