import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { PoundSterling, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function OccupancyFinanceTab({ homes, staffProfile }) {
  const { data: residents = [] } = useQuery({ queryKey: ["all-residents"], queryFn: () => secureGateway.filter("Resident", { status: "active" }, "-created_date", 500), staleTime: 3 * 60 * 1000 });
  const { data: bills = [] } = useQuery({ queryKey: ["bills-dashboard"], queryFn: () => secureGateway.filter("Bill"), staleTime: 3 * 60 * 1000 });

  const residentsByHome = residents.reduce((acc, r) => { if (r.home_id) acc[r.home_id] = (acc[r.home_id] || 0) + 1; return acc; }, {});
  const totalCapacity = homes.reduce((s, h) => s + (h.capacity || h.bed_spaces || 0), 0);
  const totalOccupied = Object.values(residentsByHome).reduce((s, v) => s + v, 0);
  const rate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;
  const totalBills = bills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);
  const pendingBills = bills.filter(b => b.status === "pending" || !b.status);
  const pendingTotal = pendingBills.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);

  return (
    <div className="p-5 space-y-5">
      <h2 className="text-lg font-bold text-slate-800">Occupancy & Finance</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[["Total Capacity", totalCapacity, "bg-blue-50 text-blue-700", Users], ["Occupied Beds", totalOccupied, "bg-green-50 text-green-700", Users], ["Occupancy Rate", `${rate}%`, "bg-teal-50 text-teal-700", TrendingUp], ["Outstanding Bills", `£${Math.round(pendingTotal).toLocaleString()}`, "bg-amber-50 text-amber-700", PoundSterling]].map(([label, val, cls, Icon]) => (
          <div key={label} className={`border rounded-2xl p-5 ${cls} border-opacity-40`}>
            <Icon className="w-5 h-5 mb-2 opacity-60" />
            <p className="text-2xl font-bold">{val}</p>
            <p className="text-xs font-semibold mt-1 opacity-70">{label}</p>
          </div>
        ))}
      </div>

      {/* Per-home occupancy */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800 text-sm">Occupancy by Home</h3></div>
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Home", "Type", "Capacity", "Occupied", "Available", "Rate"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>)}</tr>
          </thead>
          <tbody>
            {homes.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No homes available</td></tr>
              : homes.map(h => {
                const occ = residentsByHome[h.id] || 0;
                const cap = h.capacity || h.bed_spaces || 0;
                const avail = Math.max(0, cap - occ);
                const rate = cap ? Math.round((occ / cap) * 100) : 0;
                return (
                  <tr key={h.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-700">{h.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{h.type?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{cap || "—"}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold">{occ}</td>
                    <td className="px-4 py-3 text-slate-500">{cap ? avail : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rate >= 80 ? "bg-green-500" : rate >= 50 ? "bg-amber-500" : "bg-red-400"}`} style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-700">{cap ? `${rate}%` : "N/A"}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Bills summary */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100"><h3 className="font-bold text-slate-800 text-sm">Bills & Finance Summary</h3></div>
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>{["Home", "Supplier", "Type", "Amount", "Due Date", "Status"].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500">{h}</th>)}</tr>
          </thead>
          <tbody>
            {bills.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No bills found</td></tr>
              : bills.slice(0, 20).map(b => {
                const h = homes.find(x => x.id === b.home_id);
                const sCfg = { paid: "bg-green-100 text-green-700", pending: "bg-amber-100 text-amber-700", overdue: "bg-red-100 text-red-700" };
                return (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{h?.name || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{b.supplier || "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs capitalize">{b.bill_type?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-4 py-3 font-bold text-slate-800">£{Number(b.amount || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{b.due_date ? format(new Date(b.due_date), "dd MMM yyyy") : "—"}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sCfg[b.status] || sCfg.pending}`}>{b.status || "pending"}</span></td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
}