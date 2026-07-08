import { RefreshCw } from "lucide-react";
import { format, subMonths } from "date-fns";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-600 border-slate-300",
  complete: "bg-green-100 text-green-700 border-green-300",
  submitted: "bg-blue-100 text-blue-700 border-blue-300",
};

export default function FilterBar({ periodStart, setPeriodStart, periodEnd, setPeriodEnd, status, lastSaved, onRefresh }) {
  const handlePill = (pill) => {
    const now = new Date();
    if (pill === "6m") {
      setPeriodStart(format(subMonths(now, 6), "yyyy-MM-dd"));
      setPeriodEnd(format(now, "yyyy-MM-dd"));
    } else if (pill === "nov-apr") {
      const year = now.getMonth() >= 4 ? now.getFullYear() : now.getFullYear() - 1;
      setPeriodStart(`${year}-11-01`);
      setPeriodEnd(`${year + 1}-04-30`);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground text-xs font-medium">Review period</span>
        <input
          type="date"
          value={periodStart}
          onChange={e => setPeriodStart(e.target.value)}
          className="border border-border rounded-md px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <span className="text-muted-foreground text-xs">to</span>
        <input
          type="date"
          value={periodEnd}
          onChange={e => setPeriodEnd(e.target.value)}
          className="border border-border rounded-md px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex gap-1.5">
        {[
          { key: "6m", label: "Last 6m" },
          { key: "nov-apr", label: "Nov–Apr" },
        ].map(p => (
          <button
            key={p.key}
            onClick={() => handlePill(p.key)}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_COLORS[status] || STATUS_COLORS.draft}`}>
          {status || "Draft"}
        </span>
        {lastSaved && (
          <span className="text-xs text-muted-foreground">Last saved {lastSaved}</span>
        )}
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-primary hover:opacity-70 font-medium"
        >
          <RefreshCw className="w-3 h-3" /> Refresh scan
        </button>
      </div>
    </div>
  );
}