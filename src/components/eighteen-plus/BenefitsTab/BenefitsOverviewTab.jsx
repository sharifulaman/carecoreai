import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useMemo } from "react";

export default function BenefitsOverviewTab({ residents, homes, benefits }) {
  const homeMap = Object.fromEntries(homes.map(h => [h.id, h]));

  // Compliance metrics
  const metrics = useMemo(() => {
    const stats = {
      uc_submitted: 0,
      uc_active: 0,
      housing_benefit_set: 0,
      council_tax_exempt: 0,
      setting_up_grant_received: 0,
      bursary_received: 0,
      no_record: 0,
    };

    residents.forEach(r => {
      const benefit = benefits.find(b => b.resident_id === r.id);
      if (!benefit) {
        stats.no_record++;
      } else {
        if (benefit.uc_claim_submitted) stats.uc_submitted++;
        if (benefit.uc_monthly_amount) stats.uc_active++;
        if (benefit.housing_benefit_amount) stats.housing_benefit_set++;
        if (benefit.council_tax_exempt) stats.council_tax_exempt++;
        if (benefit.setting_up_home_grant_received) stats.setting_up_grant_received++;
        if (benefit.care_leaver_bursary_received) stats.bursary_received++;
      }
    });

    return stats;
  }, [residents, benefits]);

  // Rows for table
  const rows = residents
    .map(r => {
      const benefit = benefits.find(b => b.resident_id === r.id);
      return { resident: r, benefit };
    })
    .sort((a, b) => {
      // Rows without records first
      if (!a.benefit && b.benefit) return -1;
      if (a.benefit && !b.benefit) return 1;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Compliance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <ComplianceCard
          title="Universal Credit"
          count={metrics.uc_active}
          total={residents.length}
          status={metrics.uc_active === residents.length ? "complete" : "incomplete"}
          icon={metrics.uc_active === residents.length ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
        />
        <ComplianceCard
          title="Housing Benefit"
          count={metrics.housing_benefit_set}
          total={residents.length}
          status={metrics.housing_benefit_set > 0 ? "partial" : "incomplete"}
          icon={metrics.housing_benefit_set > 0 ? <Clock className="w-5 h-5 text-amber-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
        />
        <ComplianceCard
          title="Council Tax Exempt"
          count={metrics.council_tax_exempt}
          total={residents.length}
          status={metrics.council_tax_exempt >= residents.length * 0.8 ? "complete" : "incomplete"}
          icon={metrics.council_tax_exempt >= residents.length * 0.8 ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
        />
        <ComplianceCard
          title="Setting Up Grant Applied"
          count={metrics.setting_up_grant_received}
          total={residents.length}
          status="partial"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
        />
        <ComplianceCard
          title="Care Leaver Bursary"
          count={metrics.bursary_received}
          total={residents.length}
          status="partial"
          icon={<Clock className="w-5 h-5 text-blue-600" />}
        />
        <ComplianceCard
          title="With Benefit Record"
          count={residents.length - metrics.no_record}
          total={residents.length}
          status={metrics.no_record === 0 ? "complete" : "incomplete"}
          icon={metrics.no_record === 0 ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
        />
      </div>

      {/* Resident Status Table */}
      <div className="bg-card border border-border rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-[1200px]">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-3 font-semibold">Resident</th>
              <th className="text-left px-4 py-3 font-semibold">Home</th>
              <th className="text-left px-4 py-3 font-semibold">UC Status</th>
              <th className="text-left px-4 py-3 font-semibold">Monthly Amount</th>
              <th className="text-left px-4 py-3 font-semibold">Housing Benefit</th>
              <th className="text-left px-4 py-3 font-semibold">Council Tax Exempt</th>
              <th className="text-left px-4 py-3 font-semibold">Last Reviewed</th>
              <th className="text-right px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.resident.id}
                className={`border-b border-border last:border-0 hover:bg-muted/50 ${!row.benefit ? "bg-red-50/30" : ""}`}
              >
                <td className="px-4 py-3 font-medium">{row.resident.display_name || row.resident.initials}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{homeMap[row.resident.home_id]?.name || "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {!row.benefit ? (
                    <span className="text-red-600 font-medium">No record</span>
                  ) : row.benefit.uc_claim_submitted ? (
                    <span className="text-green-600 font-medium">✓ Submitted</span>
                  ) : (
                    <span className="text-amber-600 font-medium">⚠ Pending</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {row.benefit?.uc_monthly_amount ? `£${row.benefit.uc_monthly_amount}` : "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {row.benefit?.housing_benefit_amount ? `£${row.benefit.housing_benefit_amount}` : "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {row.benefit?.council_tax_exempt ? <span className="text-green-600">✓ Yes</span> : "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {row.benefit?.last_reviewed_date ? new Date(row.benefit.last_reviewed_date).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      !row.benefit
                        ? "bg-red-500/10 text-red-600"
                        : row.benefit.uc_monthly_amount && row.benefit.council_tax_exempt
                        ? "bg-green-500/10 text-green-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {!row.benefit ? "No Record" : "Partial Setup"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComplianceCard({ title, count, total, status, icon }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-semibold text-sm">{title}</h3>
        {icon}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{count}</span>
        <span className="text-xs text-muted-foreground">of {total}</span>
      </div>
      <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all ${
            status === "complete" ? "bg-green-500" : status === "partial" ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">{pct}% complete</p>
    </div>
  );
}