import { AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HRDashboardComplianceInsights({
  workingTimeCompliance,
  runningWTR,
  rtwAlerts,
  dbsExpiringTop5,
  dbsExpiringTotal,
  onViewRTWAlerts,
  onViewDBSAlerts,
  onRunWTRCheck,
}) {
  return (
    <>
    <div className="grid lg:grid-cols-4 gap-4">
      {/* Working Time Compliance Summary */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600" />
          Working Time Regulations (WTR)
        </h3>
        <div className="space-y-3">
          <div>
            {workingTimeCompliance ? (
              <>
                <p className="text-3xl font-bold text-green-600">{workingTimeCompliance.complianceScore}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {workingTimeCompliance.compliantCount} / {workingTimeCompliance.totalStaff} staff compliant
                </p>
                <p className="text-xs text-muted-foreground">
                  Checked {new Date(workingTimeCompliance.checkedAt).toLocaleDateString('en-GB')}, {new Date(workingTimeCompliance.checkedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-muted-foreground">—</p>
                <p className="text-xs text-muted-foreground mt-1">Not yet run</p>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onRunWTRCheck}
            disabled={runningWTR}
          >
            {runningWTR ? "Running check…" : "Run full compliance check"}
          </Button>
        </div>
      </div>

      {/* Right to Work Alerts Summary */}
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Right to Work Alerts
        </h3>
        <div className="space-y-2 mb-4">
          {rtwAlerts.map((alert) => (
            <button
              key={alert.severity}
              onClick={() => onViewRTWAlerts?.(alert.severity)}
              className="flex items-center justify-between w-full text-left p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    alert.severity === "Critical"
                      ? "bg-red-500"
                      : alert.severity === "High"
                      ? "bg-orange-500"
                      : "bg-amber-500"
                  }`}
                />
                <span className="text-sm font-medium">{alert.severity}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{alert.count}</span>
                <span className="text-xs text-muted-foreground">{alert.description}</span>
              </div>
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={onViewRTWAlerts}
        >
          View all alerts →
        </Button>
      </div>

      {/* DBS Expiring in Next 90 Days */}
      <div className="bg-card rounded-xl border border-border p-5 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">DBS Expiring in Next 90 Days</h3>
          <span className="text-xs text-muted-foreground">Total expiring: {dbsExpiringTotal}</span>
        </div>
        <div className="space-y-2 mb-4">
          {dbsExpiringTop5.map((staff) => (
            <div key={staff.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
              <span className="font-medium">{staff.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-xs">{staff.expiryDate}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                  staff.daysRemaining <= 30
                    ? "bg-red-100 text-red-600"
                    : "bg-amber-100 text-amber-600"
                }`}>
                  {staff.daysRemaining} days
                </span>
              </div>
            </div>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={onViewDBSAlerts}
        >
          View all →
        </Button>
      </div>
    </div>
    </>
  );
}