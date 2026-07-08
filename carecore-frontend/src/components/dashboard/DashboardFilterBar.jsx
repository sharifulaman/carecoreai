import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PROPERTY_TYPES = [
  { value: "all", label: "All" },
  { value: "18_plus", label: "18+ Accommodation" },
  { value: "24_hours", label: "24 Hours Housing" },
  { value: "care", label: "Care Services" },
  { value: "outreach", label: "Outreach" },
];

const PT_COLORS = {
  "18_plus": "border-blue-400 bg-blue-50 text-blue-700",
  "24_hours": "border-purple-400 bg-purple-50 text-purple-700",
  "care": "border-emerald-400 bg-emerald-50 text-emerald-700",
  "outreach": "border-amber-400 bg-amber-50 text-amber-700",
  "all": "border-primary bg-primary/10 text-primary",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function DashboardFilterBar({ homes, propertyTypeFilter, setPropertyTypeFilter, homeFilter, setHomeFilter, onRefresh, lastUpdated, dateRangeStart, setDateRangeStart, dateRangeEnd, setDateRangeEnd }) {
  const now = new Date();
  const startMonth = dateRangeStart || now.getMonth();
  const endMonth = dateRangeEnd || now.getMonth();
  const rangeDisplay = startMonth === endMonth 
    ? MONTHS[startMonth]
    : `${MONTHS[startMonth]} to ${MONTHS[endMonth]}`;

  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Showing label */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>Showing: <span className="font-medium text-foreground">{rangeDisplay}</span></span>
        </div>

        <div className="w-px h-4 bg-border mx-1 hidden sm:block" />

        {/* Month range */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Month Range:</span>
          <Select value={String(startMonth)} onValueChange={(v) => setDateRangeStart(parseInt(v))}>
            <SelectTrigger className="h-7 text-xs w-24 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">to</span>
          <Select value={String(endMonth)} onValueChange={(v) => setDateRangeEnd(parseInt(v))}>
            <SelectTrigger className="h-7 text-xs w-24 border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="w-px h-4 bg-border mx-1 hidden sm:block" />

        {/* Property type pills */}
        <div className="flex flex-wrap gap-1">
          {PROPERTY_TYPES.map(pt => (
            <button
              key={pt.value}
              onClick={() => setPropertyTypeFilter(pt.value)}
              className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
                propertyTypeFilter === pt.value
                  ? PT_COLORS[pt.value]
                  : "border-border bg-transparent text-muted-foreground hover:bg-muted"
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {/* Home filter */}
        <Select value={homeFilter} onValueChange={setHomeFilter}>
          <SelectTrigger className="h-7 text-xs w-32 border-border">
            <SelectValue placeholder="All Homes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Homes</SelectItem>
            {homes.map(h => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}