import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, RefreshCw } from "lucide-react";
import Reg32ReportModal from "./Reg32ReportModal";

const TONE_OPTIONS = ["Professional", "Reflective", "Concise"];
const LENGTH_OPTIONS = ["Standard", "Brief", "Detailed"];
const FORMAT_OPTIONS = ["Narrative prose", "Bullet points", "Mixed"];

function EventPicker({ items, selected, onToggle, onAdd, placeholder }) {
  const [custom, setCustom] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const sel = selected.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              className={`text-xs px-2.5 py-1 rounded border font-medium transition-colors text-left ${sel ? "bg-primary/10 text-primary border-primary/40" : "bg-muted text-muted-foreground border-border"}`}
            >
              {sel ? "☑ " : "☐ "}{item.label}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={placeholder}
          value={custom}
          onChange={e => setCustom(e.target.value)}
          className="flex-1 border border-border rounded-lg px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          onClick={() => { if (custom.trim()) { onAdd(custom.trim()); setCustom(""); } }}
          className="text-xs text-muted-foreground border border-border rounded px-2 py-1 hover:bg-muted"
        >
          + Add
        </button>
        <span className="text-xs text-muted-foreground flex items-center gap-1">AI <Sparkles className="w-3 h-3" /></span>
      </div>
    </div>
  );
}

export default function AIReportGenerator({
  clearFlags, criticalFlags, attentionFlags,
  reviewerName, reviewerOrg, completedDate, setCompletedDate,
  periodStart, periodEnd, selectedYPs, residents, homes, orgName,
  strengthsNarrative, setStrengthsNarrative,
  improvementsNarrative, setImprovementsNarrative,
  actionPlanNarrative, setActionPlanNarrative,
  selectedStrengthEvents, setSelectedStrengthEvents,
  selectedIssueEvents, setSelectedIssueEvents,
  selectedActionEvents, setSelectedActionEvents,
}) {
  const [tone, setTone] = useState("Professional");
  const [length, setLength] = useState("Standard");
  const [format, setFormat] = useState("Narrative prose");
  const [generating, setGenerating] = useState(null);
  const [showReport, setShowReport] = useState(false);

  const strengthItems = [
    ...clearFlags.map(f => ({ id: f.id, label: f.text.slice(0, 60) })),
  ];
  const issueItems = [
    ...criticalFlags.map(f => ({ id: f.id, label: f.text.slice(0, 60) })),
    ...attentionFlags.map(f => ({ id: f.id, label: f.text.slice(0, 60) })),
  ];
  const actionItems = issueItems.map(i => ({ id: `action-${i.id}`, label: `Resolve: ${i.label.slice(0, 50)}` }));

  const buildContext = (section) => {
    const ypNames = selectedYPs.map(id => {
      const r = residents.find(r => r.id === id);
      return r?.display_name || r?.initials || id;
    }).join(", ");
    const homeNames = homes.map(h => h.name).join(", ");
    return `
Organisation: ${orgName || "Evolvix Digital Ltd"}
Review period: ${periodStart} to ${periodEnd}
Homes: ${homeNames}
Young people: ${ypNames}
Independent reviewer: ${reviewerName} (${reviewerOrg})
Tone: ${tone} | Length: ${length} | Format: ${format}
Critical issues: ${criticalFlags.map(f => f.text).join(" | ")}
Attention items: ${attentionFlags.map(f => f.text).join(" | ")}
Clear/strengths: ${clearFlags.map(f => f.text).join(" | ")}
Section requested: ${section}
Write a Regulation 32 Quality of Support Review narrative for the "${section}" section only. Use UK care sector language. Be evidence-based.`;
  };

  const generate = async (section) => {
    setGenerating(section);
    try {
      const prompt = buildContext(section);
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      if (section === "strengths" || section === "all") setStrengthsNarrative(typeof res === "string" ? res : res.text || "");
      if (section === "improvements" || section === "all") {
        const prompt2 = buildContext("areas for improvement");
        const res2 = await base44.integrations.Core.InvokeLLM({ prompt: prompt2 });
        setImprovementsNarrative(typeof res2 === "string" ? res2 : res2.text || "");
      }
      if (section === "actions" || section === "all") {
        const prompt3 = buildContext("action plan next 6 months");
        const res3 = await base44.integrations.Core.InvokeLLM({ prompt: prompt3 });
        setActionPlanNarrative(typeof res3 === "string" ? res3 : res3.text || "");
      }
    } finally {
      setGenerating(null);
    }
  };

  const isLoading = (s) => generating === s || generating === "all";

  return (
    <div className="rounded-xl overflow-hidden border border-purple-200" style={{ background: "#EEEDFE" }}>
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-purple-200">
        <div className="flex items-center gap-2 font-semibold text-sm text-purple-900">
          <Sparkles className="w-4 h-4 text-purple-600" />
          AI report generator — Regulation 32 Quality of Support Review
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {[
            { label: "Tone", value: tone, setter: setTone, options: TONE_OPTIONS },
            { label: "Length", value: length, setter: setLength, options: LENGTH_OPTIONS },
            { label: "Format", value: format, setter: setFormat, options: FORMAT_OPTIONS },
          ].map(({ label, value, setter, options }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="text-xs text-purple-700">{label}</span>
              <select
                value={value}
                onChange={e => setter(e.target.value)}
                className="text-xs border border-purple-300 rounded-md px-2 py-1 bg-white focus:outline-none"
              >
                {options.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <div className="flex items-center gap-1">
            <span className="text-xs text-purple-700">Completed</span>
            <input
              type="date"
              value={completedDate}
              onChange={e => setCompletedDate(e.target.value)}
              className="text-xs border border-purple-300 rounded-md px-2 py-1 bg-white focus:outline-none"
            />
          </div>
          <button
            onClick={() => generate("all")}
            disabled={!!generating}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            {isLoading("all") ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Generate all sections
          </button>
        </div>
      </div>

      {/* Three columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-purple-200">
        {/* Section 1 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-purple-900">1. Strengths &amp; quality of support</p>
            <button
              onClick={() => generate("strengths")}
              disabled={!!generating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50"
            >
              {isLoading("strengths") ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Regen
            </button>
          </div>
          <textarea
            value={strengthsNarrative}
            onChange={e => setStrengthsNarrative(e.target.value)}
            placeholder="AI-generated narrative will appear here. Click generate to populate."
            rows={8}
            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs bg-white resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-700 mb-2">Events included — click to toggle</p>
            <EventPicker
              items={strengthItems}
              selected={selectedStrengthEvents}
              onToggle={id => setSelectedStrengthEvents(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
              onAdd={label => setSelectedStrengthEvents(p => [...p, label])}
              placeholder="Add event or note..."
            />
          </div>
        </div>

        {/* Section 2 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-purple-900">2. Areas for improvement</p>
            <button
              onClick={() => generate("improvements")}
              disabled={!!generating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50"
            >
              {isLoading("improvements") ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Regen
            </button>
          </div>
          <textarea
            value={improvementsNarrative}
            onChange={e => setImprovementsNarrative(e.target.value)}
            placeholder="AI-generated narrative will appear here..."
            rows={8}
            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs bg-white resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-700 mb-2">Issues included — click to toggle</p>
            <EventPicker
              items={issueItems}
              selected={selectedIssueEvents}
              onToggle={id => setSelectedIssueEvents(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
              onAdd={label => setSelectedIssueEvents(p => [...p, label])}
              placeholder="Add incident, event, or issue..."
            />
          </div>
        </div>

        {/* Section 3 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-purple-900">3. Action plan — next 6 months</p>
            <button
              onClick={() => generate("actions")}
              disabled={!!generating}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold disabled:opacity-50"
            >
              {isLoading("actions") ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Regen
            </button>
          </div>
          <textarea
            value={actionPlanNarrative}
            onChange={e => setActionPlanNarrative(e.target.value)}
            placeholder="AI-generated action plan will appear here..."
            rows={8}
            className="w-full border border-purple-200 rounded-lg px-3 py-2 text-xs bg-white resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
          />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-700 mb-2">Actions included — click to toggle</p>
            <EventPicker
              items={actionItems}
              selected={selectedActionEvents}
              onToggle={id => setSelectedActionEvents(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])}
              onAdd={label => setSelectedActionEvents(p => [...p, label])}
              placeholder="Add a new action item..."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-t border-purple-200 bg-purple-50/50">
        <button
          onClick={() => setShowReport(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-sm font-semibold"
        >
          <Sparkles className="w-3.5 h-3.5" /> Preview &amp; Export Report for Ofsted
        </button>
        {["Send to all LAs", "Check completeness", "Compare with previous", "Browse all events"].map(label => (
          <button key={label} className="text-sm text-purple-700 hover:text-purple-900 underline-offset-2 hover:underline">
            {label} ↗
          </button>
        ))}
      </div>

      {showReport && (
        <Reg32ReportModal
          open={showReport}
          onClose={() => setShowReport(false)}
          orgName={orgName || "Evolvix Digital Ltd"}
          reviewerName={reviewerName}
          reviewerOrg={reviewerOrg}
          completedDate={completedDate}
          periodStart={periodStart}
          periodEnd={periodEnd}
          strengthsNarrative={strengthsNarrative}
          improvementsNarrative={improvementsNarrative}
          actionPlanNarrative={actionPlanNarrative}
          selectedYPs={selectedYPs}
          residents={residents}
          homes={homes}
        />
      )}
    </div>
  );
}