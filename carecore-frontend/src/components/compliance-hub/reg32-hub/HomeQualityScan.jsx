import { useState } from "react";
import { ArrowUp, ArrowDown, Minus, Flag } from "lucide-react";
import { STATUS_COLORS, getServiceTypeLabel } from "@/lib/reg32Scoring";

function ScoreBadge({ score, status }) {
  const sc = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${sc.bg} ${sc.text}`}>
      {score}
    </span>
  );
}

function TrendIcon({ trend }) {
  if (trend === "up") return <ArrowUp className="w-3 h-3 text-green-600" />;
  if (trend === "down") return <ArrowDown className="w-3 h-3 text-red-600" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
}

function HeatmapTile({ home, rank, onClick, selected }) {
  const sc = STATUS_COLORS[home.status];
  const colorClass = home.status === "Good" ? "bg-green-400 hover:bg-green-500" : home.status === "Requires Action" ? "bg-amber-400 hover:bg-amber-500" : "bg-red-500 hover:bg-red-600";
  return (
    <button
      onClick={() => onClick(home.homeId)}
      title={`${home.homeName}: ${home.score}/100 (${home.status})`}
      className={`w-full aspect-square rounded ${colorClass} transition-all hover:scale-110 hover:z-10 relative flex items-center justify-center text-white text-[10px] font-bold ${selected ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}
    >
      {rank}
    </button>
  );
}

export default function HomeQualityScan({ scores, homes, onHomeClick, selectedHomeIds, onOpenModal }) {
  const [showAll, setShowAll] = useState(false);
  const homeScores = scores.homeScores || [];
  const displayHomes = showAll ? homeScores : homeScores.slice(0, 10);

  return (
    <div className="space-y-3">
      {/* Ranked table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-3 py-2.5 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Home Quality Scan</h3>
          <p className="text-[10px] text-slate-400">{homeScores.length} homes ranked by quality score</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-2 py-1.5 font-semibold text-slate-500 w-8">#</th>
                <th className="text-left px-2 py-1.5 font-semibold text-slate-500">Home</th>
                <th className="text-left px-2 py-1.5 font-semibold text-slate-500 hidden sm:table-cell">Service</th>
                <th className="text-center px-2 py-1.5 font-semibold text-slate-500">Score</th>
                <th className="text-center px-2 py-1.5 font-semibold text-slate-500 hidden sm:table-cell">Flags</th>
                <th className="text-center px-2 py-1.5 font-semibold text-slate-500 hidden md:table-cell">Evidence</th>
                <th className="text-center px-2 py-1.5 font-semibold text-slate-500">Trend</th>
                <th className="text-center px-2 py-1.5 font-semibold text-slate-500">View</th>
              </tr>
            </thead>
            <tbody>
              {displayHomes.map((h, i) => (
                <tr
                  key={h.homeId}
                  onClick={() => onHomeClick(h.homeId)}
                  className={`border-b border-slate-50 last:border-0 hover:bg-blue-50/30 cursor-pointer ${selectedHomeIds.includes(h.homeId) ? "bg-blue-50/50" : ""}`}
                >
                  <td className="px-2 py-2 text-slate-400 font-mono">{i + 1}</td>
                  <td className="px-2 py-2 font-medium text-slate-800 max-w-[120px] truncate">{h.homeName}</td>
                  <td className="px-2 py-2 text-slate-500 hidden sm:table-cell">{h.serviceType}</td>
                  <td className="px-2 py-2 text-center"><ScoreBadge score={h.score} status={h.status} /></td>
                  <td className="px-2 py-2 text-center hidden sm:table-cell">
                    {h.flags > 0 ? <span className="inline-flex items-center gap-0.5 text-red-600"><Flag className="w-3 h-3" />{h.flags}</span> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-2 py-2 text-center text-slate-500 hidden md:table-cell">{h.evidenceCompleteness}</td>
                  <td className="px-2 py-2 text-center"><TrendIcon trend={h.trend} /></td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenModal?.(h); }}
                      className="text-[10px] px-2 py-0.5 rounded border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {homeScores.length > 10 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="w-full py-2 text-xs text-slate-500 hover:bg-slate-50 border-t border-slate-100"
          >
            {showAll ? "Show top 10" : `View all ${homeScores.length} homes`}
          </button>
        )}
      </div>

      {/* Quality Heatmap */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Quality Heatmap</h3>
        <p className="text-[10px] text-slate-400 mb-2">{homeScores.length} homes · Click a tile to filter</p>
        <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-12 gap-1">
          {homeScores.map((h, i) => (
            <HeatmapTile key={h.homeId} home={h} rank={i + 1} onClick={onHomeClick} selected={selectedHomeIds.includes(h.homeId)} />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-400" /> Good 80–100</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" /> Action 60–79</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-500" /> Critical &lt;60</span>
        </div>
      </div>

      {/* Org-wide Scan Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-3">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">Organisation-wide Scan Summary</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Homes scanned</span>
            <span className="font-bold text-slate-800">{scores.kpis.homesScanned}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Young people</span>
            <span className="font-bold text-slate-800">{scores.kpis.youngPeopleIncluded}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Total evidence</span>
            <span className="font-bold text-slate-800">{scores.kpis.totalEvidence}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
            <span className="text-red-600">Critical flags</span>
            <span className="font-bold text-red-700">{scores.findings.filter(f => f.category === "Critical").length}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
            <span className="text-amber-600">Action flags</span>
            <span className="font-bold text-amber-700">{scores.findings.filter(f => f.category === "Requires Evidence").length + scores.findings.filter(f => f.category === "Improvements").length}</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <span className="text-slate-500">Org average</span>
            <span className="font-bold text-slate-800">{scores.orgAvg}/100</span>
          </div>
        </div>
      </div>
    </div>
  );
}