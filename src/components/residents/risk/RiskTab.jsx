import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { ORG_ID } from "@/lib/roleConfig";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RiskAssessmentPanel from "./RiskAssessmentPanel";

const CATEGORIES = [
  { key: "suicide_self_harm", label: "Suicide / Self-harm", short: "Suicide / self-harm" },
  { key: "harm_to_others", label: "Harm to others / Damage to property", short: "Harm to others" },
  { key: "vulnerability", label: "Vulnerability", short: "Vulnerability" },
  { key: "criminal_exploitation", label: "Criminal exploitation", short: "Criminal exploitation" },
  { key: "sexual_exploitation", label: "Sexual activity / Exploitation", short: "Sexual exploitation" },
  { key: "missing_from_care", label: "Missing from care", short: "Missing from care" },
  { key: "substance_misuse", label: "Substance misuse", short: "Substance misuse" },
  { key: "communication_language", label: "Communication / Language barrier", short: "Comm / language" },
  { key: "online_safety", label: "Online safety", short: "Online safety" },
];

const RATING_CHIP = {
  none:    { label: "—", bg: "bg-green-100 text-green-700 border-green-200" },
  low:     { label: "L", bg: "bg-blue-100 text-blue-700 border-blue-200" },
  medium:  { label: "M", bg: "bg-amber-100 text-amber-700 border-amber-200" },
  high:    { label: "H", bg: "bg-red-100 text-red-700 border-red-200" },
  unknown: { label: "?", bg: "bg-gray-100 text-gray-500 border-gray-200" },
};

const RATING_BADGE = {
  none:    "bg-green-100 text-green-700",
  low:     "bg-blue-100 text-blue-700",
  medium:  "bg-amber-100 text-amber-700",
  high:    "bg-red-100 text-red-700",
  unknown: "bg-gray-100 text-gray-500",
};

function RatingChip({ rating, onClick }) {
  const chip = RATING_CHIP[rating] || RATING_CHIP.unknown;
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-lg border font-bold text-xs flex items-center justify-center transition-opacity hover:opacity-75 ${chip.bg}`}
    >
      {chip.label}
    </button>
  );
}

export default function RiskTab({ residents, homes, staff, user, staffProfile, isAdminOrTL }) {
  const qc = useQueryClient();
  const [view, setView] = useState("this_yp");
  const [panelState, setPanelState] = useState(null); // { resident, category, existing }
  const [filterResident, setFilterResident] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const readOnly = !isAdminOrTL;

  // Pick the first resident as "this YP" context when used from Residents page
  const thisYP = residents[0] || null;

  // Fetch all risk assessments for residents in this home context
  const homeIds = useMemo(() => [...new Set(residents.map(r => r.home_id).filter(Boolean))], [residents]);

  const { data: allAssessments = [] } = useQuery({
    queryKey: ["risk-assessments", homeIds.join(",")],
    queryFn: () => secureGateway.filter("RiskAssessment", {}, "-last_reviewed_at", 1000),
    enabled: residents.length > 0,
  });

  // Filter to only assessments for residents we know about
  const residentIds = useMemo(() => new Set(residents.map(r => r.id)), [residents]);
  const assessments = useMemo(() => allAssessments.filter(a => residentIds.has(a.resident_id)), [allAssessments, residentIds]);

  const getAssessment = (residentId, category) =>
    assessments.find(a => a.resident_id === residentId && a.category === category) || null;

  // --- "This YP" view ---
  const ThisYPView = () => {
    if (!thisYP) return <p className="text-sm text-muted-foreground mt-4">No resident selected.</p>;
    return (
      <div className="space-y-3 mt-4">
        {CATEGORIES.map(cat => {
          const assessment = getAssessment(thisYP.id, cat.key);
          const rating = assessment?.overall_rating || "unknown";
          const chip = RATING_CHIP[rating] || RATING_CHIP.unknown;
          const badge = RATING_BADGE[rating] || RATING_BADGE.unknown;
          return (
            <div key={cat.key} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold">{cat.label}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${badge}`}>
                    {rating === "none" ? "None" : rating.charAt(0).toUpperCase() + rating.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {assessment
                    ? `Last reviewed ${new Date(assessment.last_reviewed_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}${assessment.last_reviewed_by_name ? ` by ${assessment.last_reviewed_by_name}` : ""}`
                    : "Not yet assessed"}
                </p>
              </div>
              <button
                onClick={() => setPanelState({ resident: thisYP, category: cat.key, existing: assessment })}
                className="text-xs px-3 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 font-medium shrink-0"
              >
                {assessment ? (readOnly ? "View" : "Update") : (readOnly ? "View" : "Assess")}
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // --- "All residents" view ---
  const filteredResidents = useMemo(() => {
    let result = residents;
    if (filterResident !== "all") result = result.filter(r => r.id === filterResident);
    return result;
  }, [residents, filterResident]);

  const staffMap = useMemo(() => Object.fromEntries(staff.map(s => [s.id, s])), [staff]);

  const AllResidentsView = () => (
    <div className="mt-4 space-y-4">
      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> None</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> Low</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Medium</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> High</div>
        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-300 inline-block" /> Unknown</div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterResident} onValueChange={setFilterResident}>
          <SelectTrigger className="w-48 h-9 text-sm">
            <SelectValue placeholder="All residents" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All residents</SelectItem>
            {residents.map(r => <SelectItem key={r.id} value={r.id}>{r.display_name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-52 h-9 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.short}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Matrix table */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-40 min-w-[140px]">Young person</th>
              {(filterCategory === "all" ? CATEGORIES : CATEGORIES.filter(c => c.key === filterCategory)).map(cat => (
                <th key={cat.key} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground whitespace-pre-wrap max-w-[80px] leading-tight">
                  {cat.short.replace(" / ", " /\n")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResidents.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">No residents found.</td></tr>
            ) : filteredResidents.map(resident => {
              const kw = staffMap[resident.key_worker_id];
              return (
                <tr key={resident.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-sm">{resident.display_name}</p>
                    {kw && <p className="text-xs text-muted-foreground">KW: {kw.full_name.split(" ").map((n, i) => i === 0 ? n.charAt(0) + "." : n).join(" ")}</p>}
                  </td>
                  {(filterCategory === "all" ? CATEGORIES : CATEGORIES.filter(c => c.key === filterCategory)).map(cat => {
                    const assessment = getAssessment(resident.id, cat.key);
                    const rating = assessment?.overall_rating || "unknown";
                    return (
                      <td key={cat.key} className="px-2 py-3 text-center">
                        <RatingChip
                          rating={rating}
                          onClick={() => setPanelState({ resident, category: cat.key, existing: assessment })}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="mt-4">
      {/* Pill switcher */}
      <div className="inline-flex bg-muted rounded-lg p-1 gap-1">
        {[
          { key: "this_yp", label: "This YP" },
          { key: "all_residents", label: "All residents" },
        ].map(v => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              view === v.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === "this_yp" && <ThisYPView />}
      {view === "all_residents" && <AllResidentsView />}

      {panelState && (
        <RiskAssessmentPanel
          resident={panelState.resident}
          category={panelState.category}
          existing={panelState.existing}
          staffProfile={staffProfile}
          onClose={() => setPanelState(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ["risk-assessments"] })}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}