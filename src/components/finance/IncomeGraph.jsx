import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { PROPERTY_TYPE_LABELS, getMonthBounds } from "@/lib/ukLocalAuthorities";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const CustomTooltip = ({ active, payload, label, homes, residents, placements, invoices, pettyCashTx }) => {
  if (!active || !payload?.length) return null;
  const home = homes.find(h => h.name.split(" ")[0] === label);
  const homeResidents = residents.filter(r => r.home_id === home?.id && r.status === "active");
  const homePlacements = placements.filter(p => p.home_id === home?.id && p.status === "active");

  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg p-3 text-sm max-w-xs">
      <p className="font-semibold mb-2">{label}</p>
      <p className="text-xs text-muted-foreground mb-2">{homeResidents.length} active residents</p>
      {payload.map(entry => (
        <div key={entry.name} className="mb-1">
          <span className="font-medium">{entry.name}:</span>{" "}
          <span style={{ color: entry.color }}>£{(entry.value || 0).toLocaleString("en-GB", { minimumFractionDigits: 2 })}</span>
        </div>
      ))}
      {payload.find(p => p.name === "Expected") && homePlacements.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border text-xs">
          {homePlacements.map(fee => {
            const res = homeResidents.find(r => r.id === fee.resident_id);
            return res ? (
              <div key={fee.id}>{res.initials || res.display_name?.charAt(0)} — £{(fee.monthly_equivalent || 0).toLocaleString("en-GB", { minimumFractionDigits: 0 })}/mo</div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};

export default function IncomeGraph({ homes, residents, placements, invoices, bills, pettyCashTx, staffProfile, isAdmin }) {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState("all");

  const { from, to } = getMonthBounds(selectedYear, selectedMonth);

  const visibleHomes = useMemo(() => {
    let list = [...homes].sort((a, b) => a.name.localeCompare(b.name));
    if (filterType !== "all") list = list.filter(h => h.property_type === filterType);
    if (!isAdmin && staffProfile) {
      list = list.filter(h => (staffProfile.home_ids || []).includes(h.id));
    } else if (viewMode === "my" && staffProfile) {
      list = list.filter(h => (staffProfile.home_ids || []).includes(h.id));
    }
    return list;
  }, [homes, filterType, viewMode, isAdmin, staffProfile]);

  const data = useMemo(() => {
    return visibleHomes.map(home => {
      const homeResidents = residents.filter(r => r.home_id === home.id && r.status === "active");
      const homePlacements = placements.filter(p => p.home_id === home.id && p.status === "active");
      const expected = homePlacements.reduce((s, p) => s + (p.monthly_equivalent || 0), 0);

      const received = invoices
        .filter(inv =>
          inv.home_id === home.id &&
          inv.status === "paid" &&
          inv.period_from >= from &&
          inv.period_from <= to
        )
        .reduce((s, inv) => s + (inv.total_amount || 0), 0);

      const billExpenses = bills
        .filter(b => {
          const due = b.due_date || "";
          return b.home_id === home.id && due >= from && due <= to;
        })
        .reduce((s, b) => s + (b.amount || 0), 0);

      const pettyCashOut = (pettyCashTx || [])
        .filter(tx => tx.home_id === home.id && tx.transaction_type === "cash_out" && tx.date >= from && tx.date <= to)
        .reduce((s, tx) => s + (tx.amount || 0), 0);

      const residentCount = homeResidents.length;

      return {
        name: home.name.split(" ")[0],
        fullName: home.name,
        Expected: Math.round(expected),
        Received: Math.round(received),
        Expenses: Math.round(billExpenses + pettyCashOut),
        residents: residentCount,
      };
    });
  }, [visibleHomes, residents, placements, invoices, bills, pettyCashTx, from, to]);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-base font-semibold">Income by Property</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* Month */}
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(Number(v))}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Year */}
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          {/* Property type filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Property Types</SelectItem>
              <SelectItem value="18plus_accommodation">18+ Accommodation</SelectItem>
              <SelectItem value="24hours_housing">24 Hours Housing</SelectItem>
              <SelectItem value="care_services">Care Services</SelectItem>
              <SelectItem value="outreach">Outreach</SelectItem>
            </SelectContent>
          </Select>
          {/* View toggle (admin only) */}
          {isAdmin && (
            <div className="flex rounded-lg border border-border overflow-hidden">
              {["all","my"].map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 text-xs ${viewMode === v ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`}
                >
                  {v === "all" ? "All Homes" : "My Homes"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No homes to display</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 30, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              label={null}
            />
            <YAxis
              tickFormatter={v => `£${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip homes={homes} residents={residents} placements={placements} invoices={invoices} pettyCashTx={pettyCashTx} />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="Expected" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Received" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Resident count below */}
      {data.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-1">
          {data.map(d => (
            <span key={d.fullName} className="text-xs text-muted-foreground">{d.fullName}: <span className="font-medium">{d.residents} residents</span></span>
          ))}
        </div>
      )}
    </div>
  );
}