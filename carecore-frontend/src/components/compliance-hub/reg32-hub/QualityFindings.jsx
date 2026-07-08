import { useState } from "react";
import { Filter, AlertOctagon, FileQuestion, ThumbsUp, TrendingUp, StickyNote, Plus, CheckCircle, FileText } from "lucide-react";

const CATEGORY_CONFIG = {
  Critical: { icon: AlertOctagon, bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Critical" },
  "Requires Evidence": { icon: FileQuestion, bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: "Requires Evidence" },
  Strengths: { icon: ThumbsUp, bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: "Strength" },
  Improvements: { icon: TrendingUp, bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Improvement" },
};

const CATEGORY_ORDER = ["Critical", "Requires Evidence", "Improvements", "Strengths"];

function FindingRow({ finding, onAction }) {
  const cfg = CATEGORY_CONFIG[finding.category] || CATEGORY_CONFIG.Improvements;
  const Icon = cfg.icon;

  return (
    <div className={`border ${cfg.border} ${cfg.bg} rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        <div className={`w-7 h-7 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0 border ${cfg.border}`}>
          <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-800">{finding.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px] text-slate-500">
            <span className="font-medium">{finding.sourceModule}</span>
            {finding.affectedHomes?.length > 0 && (
              <span>· {finding.affectedHomes.slice(0, 3).join(", ")}{finding.affectedHomes.length > 3 ? ` +${finding.affectedHomes.length - 3}` : ""}</span>
            )}
            <span>· {finding.evidenceType}</span>
            <span>· {finding.owner}</span>
          </div>
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            <button onClick={() => onAction("note", finding)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
              <StickyNote className="w-2.5 h-2.5" /> Add Note
            </button>
            <button onClick={() => onAction("action", finding)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
              <Plus className="w-2.5 h-2.5" /> Create Action
            </button>
            <button onClick={() => onAction("resolve", finding)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-green-200 bg-green-50 hover:bg-green-100 text-green-700">
              <CheckCircle className="w-2.5 h-2.5" /> Mark Resolved
            </button>
            <button onClick={() => onAction("evidence", finding)} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600">
              <FileText className="w-2.5 h-2.5" /> View Evidence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QualityFindings({ scores, onAction }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [showFilter, setShowFilter] = useState(false);

  const findings = scores.findings || [];
  const filtered = activeCategory === "all" ? findings : findings.filter(f => f.category === activeCategory);

  const counts = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = findings.filter(f => f.category === cat).length;
    return acc;
  }, {});

  return (
    <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-full max-h-[calc(100vh-320px)]">
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Quality of Support Findings</h3>
          <p className="text-[10px] text-slate-400">{findings.length} findings from live data</p>
        </div>
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="flex items-center gap-1 text-xs px-2 py-1 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <Filter className="w-3 h-3" /> Filter
        </button>
      </div>

      {/* Category filter chips */}
      {showFilter && (
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 flex-wrap shrink-0">
          <button
            onClick={() => setActiveCategory("all")}
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${activeCategory === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            All ({findings.length})
          </button>
          {CATEGORY_ORDER.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${activeCategory === cat ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {CATEGORY_CONFIG[cat].label} ({counts[cat] || 0})
            </button>
          ))}
        </div>
      )}

      {/* Findings list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No findings in this category.
          </div>
        ) : (
          filtered.map(f => <FindingRow key={f.id} finding={f} onAction={onAction} />)
        )}
      </div>
    </div>
  );
}