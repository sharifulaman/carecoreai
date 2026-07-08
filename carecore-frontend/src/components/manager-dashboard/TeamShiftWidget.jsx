import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { format, parseISO, differenceInHours, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { scopeHomesList, scopeStaffToHomes, scopeToHomes } from "@/lib/managerHomeScope";
import { WidgetErrorBlock, WidgetLoadingBlock } from "./WidgetStatus";

function ShiftStatusDot({ status }) {
  const map = {
    "On shift": "bg-green-500",
    "Break": "bg-amber-400",
    "Handover due": "bg-orange-500",
  };
  return <span className={`w-2 h-2 rounded-full inline-block ${map[status] || "bg-slate-300"}`} />;
}

export default function TeamShiftWidget({ orgId = ORG_ID, homeIds = null }) {
  const qStaff = useQuery({
    queryKey: ["mgr-staff-direct", orgId],
    queryFn: () => base44.entities.StaffProfile.filter({ org_id: orgId }),
    staleTime: 2 * 60 * 1000,
  });

  // "On shift" only ever needs today's (and, for overnight/waking-night shifts that
  // clocked in the day before, yesterday's) attendance logs — same query as
  // ManagerKPIBanner.jsx, so they share one cached fetch instead of two. Fetching
  // full history here would risk the default row cap pushing today's clock-ins out
  // of view once a home has enough historical attendance data.
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const qAttendance = useQuery({
    queryKey: ["mgr-attendance-today-direct", orgId, todayStr],
    queryFn: () => base44.entities.AttendanceLog.filter({ org_id: orgId, date: [yesterdayStr, todayStr] }),
    staleTime: 60 * 1000,
  });

  const qHomes = useQuery({
    queryKey: ["mgr-homes-direct", orgId],
    queryFn: () => base44.entities.Home.filter({ org_id: orgId, status: "active" }),
    staleTime: 2 * 60 * 1000,
  });

  const queries = [qStaff, qAttendance, qHomes];
  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);
  const retryAll = () => queries.forEach(q => q.refetch());

  const staff = scopeStaffToHomes(qStaff.data || [], homeIds);
  const attendanceLogs = scopeToHomes(qAttendance.data || [], homeIds);
  const homes = scopeHomesList(qHomes.data || [], homeIds);

  const staffOnShift = useMemo(() => {
    const clockedIn = attendanceLogs.filter(l => !l.clock_out_time);
    return clockedIn.map(log => {
      const member = staff.find(s => s.id === log.staff_id);
      const home = homes.find(h => h.id === log.home_id);
      let hoursIn = 0;
      try { hoursIn = differenceInHours(new Date(), parseISO(log.clock_in_time)); } catch {}
      const status = hoursIn > 10 ? "Handover due" : hoursIn > 8 ? "Break" : "On shift";
      return {
        id: log.id,
        name: log.staff_name || member?.full_name || "Unknown",
        role: member?.role?.replace(/_/g, " ") || "Support Worker",
        home: home?.name?.split(" - ")[0] || "—",
        status,
        clockIn: (() => { try { return format(parseISO(log.clock_in_time), "HH:mm"); } catch { return "—"; } })(),
      };
    }).slice(0, 8);
  }, [staff, attendanceLogs, homes]);

  const handoverPending = useMemo(() => staffOnShift.filter(s => s.status === "Handover due").length, [staffOnShift]);
  const activeStaff = useMemo(() => staff.filter(s => s.status === "active").length, [staff]);

  if (isError) return <WidgetErrorBlock onRetry={retryAll} />;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Team & Shift Status</h3>
          {/* Staff.jsx's "Time & Attendance" tab (default sub: Availability) is the
              actual rota/schedule view — plain /staff lands on the HR Dashboard tab. */}
          <Link to="/staff?tab=time-attendance" className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
            Full rota <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {isLoading ? (
          <WidgetLoadingBlock />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "On shift now", value: staffOnShift.length, color: "text-slate-800" },
                { label: "Handover pending", value: handoverPending, color: "text-orange-600" },
                { label: "Total active staff", value: activeStaff, color: "text-blue-600" },
              ].map((s, i) => (
                <div key={i} className="text-center">
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-slate-400 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-slate-500 mb-1 font-medium">Rota Coverage (illustrative)</p>
              <div className="relative h-5 bg-slate-100 rounded-lg overflow-hidden flex text-[9px]">
                <div className="bg-red-300 flex items-center justify-center text-white font-medium" style={{ width: "20%" }}>Under</div>
                <div className="bg-amber-300 flex items-center justify-center text-white font-medium" style={{ width: "25%" }}>Optimal</div>
                <div className="bg-green-400 flex items-center justify-center text-white font-medium" style={{ width: "35%" }}>Over</div>
                <div className="bg-blue-300 flex items-center justify-center text-white font-medium flex-1">Planned</div>
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Staff On Shift</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-3 py-2 text-slate-500 font-medium">Name</th>
                <th className="text-left px-2 py-2 text-slate-500 font-medium">Role</th>
                <th className="text-left px-2 py-2 text-slate-500 font-medium">Home</th>
                <th className="text-left px-2 py-2 text-slate-500 font-medium">Status</th>
                <th className="text-left px-2 py-2 text-slate-500 font-medium">Clock In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400">Loading...</td></tr>
              )}
              {!isLoading && staffOnShift.map(s => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{s.name}</td>
                  <td className="px-2 py-2 text-slate-500 capitalize">{s.role}</td>
                  <td className="px-2 py-2 text-slate-500 truncate max-w-[80px]">{s.home}</td>
                  <td className="px-2 py-2">
                    <span className="flex items-center gap-1">
                      <ShiftStatusDot status={s.status} />
                      <span className="text-slate-600">{s.status}</span>
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-400">{s.clockIn}</td>
                </tr>
              ))}
              {!isLoading && staffOnShift.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400">No staff currently clocked in</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
