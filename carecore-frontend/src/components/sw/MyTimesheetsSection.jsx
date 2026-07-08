import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Calendar } from "lucide-react";
import TimesheetCalendarPanel from "@/components/staff/TimesheetCalendarPanel";

export default function MyTimesheetsSection({ myProfile, org }) {
  const [viewTimesheet, setViewTimesheet] = useState(null);

  const { data: timesheets = [], isLoading: isLoadingTimesheets } = useQuery({
    queryKey: ["my-timesheets", myProfile?.id],
    queryFn: () => secureGateway.filter("Timesheet", { staff_id: myProfile.id }, "-period_end"),
    enabled: !!myProfile?.id,
    staleTime: 0,
  });

  const { data: attendanceLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: ["my-attendance-logs", myProfile?.id],
    queryFn: () => secureGateway.filter("AttendanceLog", { staff_id: myProfile.id }),
    enabled: !!myProfile?.id,
    staleTime: 60000,
  });

  const isLoading = isLoadingTimesheets || isLoadingLogs;

  if (isLoading) return <div className="py-10 text-center text-muted-foreground text-sm">Loading records…</div>;

  return (
    <div className="space-y-4 mt-2">
      {timesheets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">No timesheets found.</p>
          <p className="text-xs mt-1">Your timesheets will appear here once drafted or submitted.</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Period</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Actual Hours</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Overtime</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Gross Pay</th>
                <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map(ts => (
                <tr key={ts.id} className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer" onClick={() => setViewTimesheet(ts)}>
                  <td className="px-4 py-3 font-medium text-sm">{ts.pay_period_label}</td>
                  <td className="px-4 py-3 text-right">{(ts.total_actual_hours || 0).toFixed(2)}h</td>
                  <td className="px-4 py-3 text-right">{(ts.total_overtime_hours || 0).toFixed(2)}h</td>
                  <td className="px-4 py-3 text-right">£{(ts.gross_pay || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide
                      ${ts.status === 'draft' ? 'bg-slate-100 text-slate-600' : 
                        ts.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                        ts.status === 'paid' ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'}`}>
                      {ts.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewTimesheet && (
        <TimesheetCalendarPanel
          timesheet={viewTimesheet}
          attendanceLogs={attendanceLogs}
          onClose={() => setViewTimesheet(null)}
        />
      )}
    </div>
  );
}