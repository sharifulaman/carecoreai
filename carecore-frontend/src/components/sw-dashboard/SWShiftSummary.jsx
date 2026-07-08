import { Clock, Home, Users, AlertTriangle, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";

export default function SWShiftSummary({ staffProfile, assignedResidents = [], allStatuses = {}, homes = [] }) {
  const navigate = useNavigate();
  const now = new Date();

  // Determine primary home name
  const primaryHome = homes.find((h) => h.id === staffProfile?.primary_home_id) 
    || homes.find((h) => assignedResidents.some(r => r.home_id === h.id));
  const homeName = primaryHome ? primaryHome.name : "—";

  // Clock-in status (fetched from AttendanceLog database table)
  const { data: activeLog } = useQuery({
    queryKey: ["active-clock", staffProfile?.id],
    queryFn: async () => {
      if (!staffProfile?.id) return null;
      const logs = await secureGateway.filter("AttendanceLog", { staff_id: staffProfile.id });
      return logs.find(l => l.clock_in_time && !l.clock_out_time) || null;
    },
    enabled: !!staffProfile?.id,
    refetchInterval: 30000,
  });

  const clockedIn = !!activeLog;
  const clockInTime = activeLog?.clock_in_time
    ? format(new Date(activeLog.clock_in_time), "HH:mm")
    : "";

  // Handover due at ~20:00
  const handoverHour = 20;
  const handoverDue = format(new Date().setHours(handoverHour, 0, 0, 0), "HH:mm");
  const isHandoverOverdue = now.getHours() >= handoverHour;

  const missedChecks = Object.values(allStatuses).filter((s) => s === "overdue").length;
  const activeYP = assignedResidents.length;

  const rows = [
    {
      icon: Clock,
      label: "Clock-in status",
      value: clockedIn ? `Clocked in` : "Not clocked in",
      sub: clockInTime,
      color: clockedIn ? "text-emerald-600" : "text-red-500",
    },
    {
      icon: Home,
      label: "Current Home",
      value: homeName,
      color: "text-slate-700",
    },
    {
      icon: Users,
      label: "Active Young People",
      value: activeYP,
      color: "text-slate-700",
    },
    {
      icon: Clock,
      label: "Handover Due",
      value: handoverDue,
      color: isHandoverOverdue ? "text-red-600" : "text-slate-700",
      urgent: isHandoverOverdue,
    },
    {
      icon: AlertTriangle,
      label: "Missed Checks",
      value: missedChecks,
      color: missedChecks > 0 ? "text-red-600" : "text-emerald-600",
      urgent: missedChecks > 0,
    },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="text-sm font-bold text-slate-900">Shift Summary</div>
      </div>
      <div className="divide-y divide-slate-50">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
              <Icon size={13} className={row.color} />
              <span className="flex-1 text-xs text-slate-500">{row.label}</span>
              <span className={`text-xs font-bold ${row.color}`}>
                {row.urgent && row.label === "Handover Due" ? (
                  <span className="text-red-600">{row.value}</span>
                ) : (
                  row.value
                )}
                {row.sub && <span className="ml-1 text-[10px] font-normal text-slate-400">{row.sub}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-slate-100">
        <button
          onClick={() => navigate("/shifts")}
          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
        >
          View shift details <ChevronRight size={12} />
        </button>
      </div>
    </section>
  );
}