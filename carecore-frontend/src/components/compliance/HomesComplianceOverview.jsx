import { useMemo } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function HomesComplianceOverview({ homes, data }) {
  const homeCompliance = useMemo(() => {
    return homes.map(home => {
      const reg44Reports = data?.reg44Reports?.filter(r => r.home_id === home.id) || [];
      const lastReg44 = reg44Reports.sort((a, b) => b.visit_date?.localeCompare(a.visit_date))[0];
      const today = new Date();
      const lastVisitDays = lastReg44 ? Math.floor((today - new Date(lastReg44.visit_date)) / (1000 * 60 * 60 * 24)) : null;

      const homeChecks = data?.homeChecks?.filter(c => c.home_id === home.id) || [];
      const last7Days = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const checksLast7 = homeChecks.filter(c => new Date(c.check_date) >= last7Days).length;

      const handovers = data?.handovers?.filter(h => h.home_id === home.id) || [];
      const handoversLast7 = handovers.filter(h => new Date(h.date) >= last7Days && h.status === "acknowledged").length;
      const handoverRate = Math.round((handoversLast7 / (3 * 7)) * 100); // 3 shifts per day

      const sleepChecks = data?.sleepChecks?.filter(s => s.home_id === home.id) || [];
      const sleepLast7 = sleepChecks.filter(s => new Date(s.date) >= last7Days && s.status === "completed").length;
      const sleepRate = Math.round((sleepLast7 / 7) * 100);

      const staff = data?.staff?.filter(s => s.home_ids?.includes(home.id)) || [];
      const trained = staff.filter(s => {
        const trainingRecords = data?.trainingRecords?.filter(t => t.staff_id === s.id) || [];
        return trainingRecords.some(t => new Date(t.expiry_date) > today);
      }).length;
      const trainingRate = staff.length > 0 ? Math.round((trained / staff.length) * 100) : 0;

      return {
        id: home.id,
        name: home.name,
        reg44Status: lastVisitDays !== null ? `${lastVisitDays} days ago` : "Never",
        reg44Due: lastVisitDays ? lastVisitDays >= 30 : true,
        homeChecksLast7: checksLast7,
        handoverRate,
        sleepRate,
        trainingRate,
      };
    });
  }, [homes, data]);

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Homes Compliance</h3>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 font-semibold">Home</th>
              <th className="text-left px-3 py-2 font-semibold">Reg44</th>
              <th className="text-left px-3 py-2 font-semibold">Checks (7d)</th>
              <th className="text-left px-3 py-2 font-semibold">Handovers</th>
              <th className="text-left px-3 py-2 font-semibold">Sleep Checks</th>
              <th className="text-left px-3 py-2 font-semibold">Training</th>
            </tr>
          </thead>
          <tbody>
            {homeCompliance.map((h, i) => (
              <tr key={h.id} className={`border-b border-border/50 last:border-0 ${i % 2 !== 0 ? "bg-muted/10" : ""}`}>
                <td className="px-3 py-2 font-medium">{h.name}</td>
                <td className={`px-3 py-2 ${h.reg44Due ? "text-red-600 font-bold" : "text-green-600"}`}>{h.reg44Status}</td>
                <td className="px-3 py-2">{h.homeChecksLast7} checks</td>
                <td className={`px-3 py-2 ${h.handoverRate < 70 ? "text-amber-600" : "text-green-600"}`}>{h.handoverRate}%</td>
                <td className={`px-3 py-2 ${h.sleepRate < 70 ? "text-amber-600" : "text-green-600"}`}>{h.sleepRate}%</td>
                <td className={`px-3 py-2 ${h.trainingRate < 80 ? "text-amber-600" : "text-green-600"}`}>{h.trainingRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}