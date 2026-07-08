import { differenceInDays, parseISO, format } from "date-fns";
import { Shield, AlertTriangle, XCircle } from "lucide-react";

export default function RTWAlertsPanel({ staff = [] }) {
  const today = new Date();
  const activeStaff = staff.filter(s => s.status === "active");

  const notChecked = activeStaff.filter(s => !s.rtw_checked);

  const expired = activeStaff.filter(s => {
    if (!s.rtw_checked || !s.rtw_expiry_date) return false;
    return differenceInDays(parseISO(s.rtw_expiry_date), today) < 0;
  });

  const expiringSoon = activeStaff.filter(s => {
    if (!s.rtw_checked || !s.rtw_expiry_date) return false;
    const days = differenceInDays(parseISO(s.rtw_expiry_date), today);
    return days >= 0 && days <= 60;
  });

  const recheckDue = activeStaff.filter(s => {
    if (!s.rtw_checked || !s.rtw_follow_up_date) return false;
    const days = differenceInDays(parseISO(s.rtw_follow_up_date), today);
    return days >= 0 && days <= 30;
  });

  const totalAlerts = notChecked.length + expired.length + expiringSoon.length + recheckDue.length;
  if (totalAlerts === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-red-200 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-red-700 flex items-center gap-2">
        <Shield className="w-4 h-4" /> Right to Work Alerts
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">{totalAlerts}</span>
      </h3>

      <div className="space-y-1.5">
        {/* Critical: Expired */}
        {expired.map(s => (
          <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-100 border border-red-300">
            <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-red-800">{s.full_name}</span>
              <span className="text-red-700"> — RTW EXPIRED {s.rtw_expiry_date}. Employment must be suspended pending recheck.</span>
            </div>
          </div>
        ))}

        {/* Not checked */}
        {notChecked.map(s => (
          <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-red-50 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs">
              <span className="font-semibold">{s.full_name}</span>
              <span className="text-muted-foreground"> — No right to work check recorded</span>
            </p>
          </div>
        ))}

        {/* Expiring soon */}
        {expiringSoon.map(s => {
          const days = differenceInDays(parseISO(s.rtw_expiry_date), today);
          return (
            <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs">
                <span className="font-semibold">{s.full_name}</span>
                <span className="text-muted-foreground"> — RTW expires {format(parseISO(s.rtw_expiry_date), "dd MMM yyyy")} ({days}d)</span>
              </p>
            </div>
          );
        })}

        {/* Share code recheck due */}
        {recheckDue.map(s => {
          const days = differenceInDays(parseISO(s.rtw_follow_up_date), today);
          return (
            <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs">
                <span className="font-semibold">{s.full_name}</span>
                <span className="text-muted-foreground"> — Share code recheck due {format(parseISO(s.rtw_follow_up_date), "dd MMM yyyy")} ({days}d)</span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}