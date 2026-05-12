import { Sparkles, AlertCircle, AlertTriangle, HelpCircle, ChevronRight } from "lucide-react";

function computeMissing(record, stages, claims) {
  const missing = [];
  if (!record?.uk_arrival_place) missing.push("UK arrival location");
  if (!record?.money_paid_for_journey || record.money_paid_for_journey === "unknown") missing.push("Journey cost and who paid");
  if (!record?.solicitor_name) missing.push("Solicitor details");
  if (!record?.home_office_reference) missing.push("Home Office reference number");
  if (claims.length === 0) missing.push("Previous asylum history (none recorded)");
  if (!record?.uk_asylum_claim_date) missing.push("UK asylum claim date");
  if (!record?.fear_of_return_summary) missing.push("Fear of return details");
  return missing;
}

function computeRiskFlags(record, stages) {
  const flags = [];
  if (record?.smuggler_involved === "yes") flags.push("Used smuggler/agent for journey");
  if (stages.some(s => (s.travel_methods || []).some(m => m.toLowerCase().includes("small boat")))) flags.push("Travelled by small boat (high risk crossing)");
  if (record?.debt_outstanding === "yes") flags.push("Outstanding journey debt recorded");
  if (record?.document_taken_away === "yes") flags.push("Passport or document taken during journey");
  if (stages.some(s => s.harm_experienced)) flags.push("Harm experienced during journey");
  if (stages.some(s => (s.travelled_with || "").toLowerCase().includes("unknown"))) flags.push("Travelled with unknown adults at some stage");
  if ((record?.exploitation_indicators || []).length > 0) flags.push("Possible trafficking/exploitation concern");
  if (record?.threat_due_to_debt === "yes") flags.push("Threat due to outstanding journey debt");
  return flags;
}

function computeInconsistencies(record, stages, countries, claims) {
  const items = [];
  const hasEU = countries.some(c => ["France", "Italy", "Germany", "Greece", "Spain", "Belgium"].includes(c.country));
  if (hasEU && claims.length === 0) {
    items.push("No asylum history recorded but journey route includes EU countries.");
  }
  if (record?.travelled_by_air === "yes" && (record?.had_passport === "no" || record?.had_passport === "unknown")) {
    items.push("Air travel recorded but passport status is unknown or no passport.");
  }
  if (record?.uk_arrival_date && stages.length > 0) {
    const lastStage = [...stages].sort((a, b) => (b.stage_number || 0) - (a.stage_number || 0))[0];
    if (lastStage && lastStage.to_country !== "United Kingdom") {
      items.push("Final journey stage does not end in the United Kingdom.");
    }
  }
  return items;
}

function computeQuestions(record, stages, claims) {
  const qs = [];
  if (claims.length === 0) qs.push("Has the young person applied for asylum in any other country?");
  const hasEU = stages.some(s => ["France", "Italy", "Germany", "Greece", "Spain", "Belgium"].includes(s.to_country));
  if (hasEU) qs.push("Was the young person fingerprinted in any country before the UK?");
  if (record?.debt_outstanding === "yes" || record?.debt_outstanding === "unknown") qs.push("Is there outstanding journey debt or threat because of the journey?");
  qs.push("Has NRM (National Referral Mechanism) referral been considered?");
  if (record?.age_assessed !== "yes") qs.push("Is age assessment complete or pending?");
  if (!record?.solicitor_name) qs.push("Has a solicitor been assigned to the young person?");
  return qs.slice(0, 5);
}

export default function JourneyAIReviewPanel({ record, stages = [], countries = [], claims = [], onViewFull }) {
  const missing = computeMissing(record, stages, claims);
  const riskFlags = computeRiskFlags(record, stages);
  const inconsistencies = computeInconsistencies(record, stages, countries, claims);
  const questions = computeQuestions(record, stages, claims);

  return (
    <div className="space-y-3">
      {/* AI Review */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <h3 className="text-sm font-bold text-slate-800">AI Review</h3>
        </div>

        {/* Missing */}
        {missing.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-orange-600 mb-2 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Missing Information
            </p>
            <div className="space-y-1.5">
              {missing.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk */}
        {riskFlags.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Risk / Safeguarding Indicators
            </p>
            <div className="space-y-1.5">
              {riskFlags.map((flag, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                  {flag}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inconsistencies */}
        {inconsistencies.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-purple-600 mb-2">Possible Inconsistencies</p>
            <div className="space-y-1.5">
              {inconsistencies.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  "{item}"
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Solicitor Questions */}
        {questions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold text-blue-600 mb-2 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Questions for Solicitor
            </p>
            <div className="space-y-1.5">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                  {q}
                </div>
              ))}
            </div>
          </div>
        )}

        {missing.length === 0 && riskFlags.length === 0 && inconsistencies.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No issues detected. Record appears complete.</p>
        )}

        <button onClick={onViewFull} className="w-full mt-3 py-2 text-xs font-semibold border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1">
          View Full AI Review <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Data sensitivity notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <p className="font-semibold mb-1">📋 Recording guidance</p>
        <p>Information should be recorded as provided by the young person and reviewed sensitively. Staff should avoid leading questions and should record uncertainty clearly.</p>
      </div>
    </div>
  );
}