import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CalendarClock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const SEV_STYLES = {
  critical: "bg-red-500/10 text-red-700",
  high: "bg-amber-500/10 text-amber-700",
  medium: "bg-yellow-400/10 text-yellow-700",
  low: "bg-green-500/10 text-green-600",
};

const TRANSITION_TYPE_LABELS = {
  move_on: "Move On",
  step_up: "Step Up",
  step_down: "Step Down",
  independent_living: "Independent Living",
  hospital: "Hospital",
  other: "Other",
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.ceil((d - now) / 86400000);
}

function formatDateUK(str) {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("en-GB");
}

export default function OperationsSection({ flaggedLogs, transitions, residents, homes, user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const getResident = id => residents.find(r => r.id === id);
  const getHome = id => homes.find(h => h.id === id);

  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(); in30.setDate(in30.getDate() + 30);
  const in30Str = in30.toISOString().split("T")[0];

  const unackLogs = useMemo(() => {
    return [...flaggedLogs]
      .filter(l => l.flagged && !l.acknowledged_by)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 6);
  }, [flaggedLogs]);

  const upcomingTransitions = useMemo(() => {
    return [...transitions]
      .filter(t => t.status === "active" && t.planned_date && t.planned_date <= in30Str)
      .sort((a, b) => (a.planned_date || "").localeCompare(b.planned_date || ""))
      .slice(0, 5);
  }, [transitions]);

  const handleAcknowledge = async (log) => {
    await base44.entities.DailyLog.update(log.id, {
      acknowledged_by: user?.email || "admin",
      acknowledged_at: new Date().toISOString(),
    });
    queryClient.invalidateQueries({ queryKey: ["flagged-logs"] });
  };

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">Operations</h2>
      <div className="grid grid-cols-1 gap-3">
        {/* 4A — Flagged Logs */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium">Unacknowledged Flagged Logs</p>
          </div>
          {unackLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No unacknowledged flagged logs. ✓</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Shift</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Resident</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Home</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Severity</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {unackLogs.map(log => {
                    const res = getResident(log.resident_id);
                    const home = getHome(log.home_id);
                    return (
                      <tr key={log.id} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2">{formatDateUK(log.date)}</td>
                        <td className="px-3 py-2 capitalize">{log.shift || "—"}</td>
                        <td className="px-3 py-2">{res?.initials || "—"}</td>
                        <td className="px-3 py-2 truncate max-w-[90px]">{home?.name || "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 rounded capitalize ${SEV_STYLES[log.flag_severity] || "bg-muted text-muted-foreground"}`}>
                            {log.flag_severity || "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => handleAcknowledge(log)}>
                            Acknowledge
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4B — Upcoming Transitions */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">Upcoming Transitions</p>
          </div>
          {upcomingTransitions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No transitions planned in the next 30 days.</p>
          ) : (
            <div className="space-y-2">
              {upcomingTransitions.map(t => {
                const res = getResident(t.resident_id);
                const home = getHome(t.home_id);
                const days = daysUntil(t.planned_date);
                const isOverdue = days !== null && days <= 0;
                const isUrgent = days !== null && days <= 7 && days > 0;

                return (
                  <div key={t.id} className={`flex items-center justify-between p-3 rounded-xl border ${isOverdue ? "border-red-300 bg-red-500/5" : isUrgent ? "border-amber-300 bg-amber-500/5" : "border-border bg-muted/20"}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {res?.initials || "?"}
                      </div>
                      <div>
                        <p className="text-xs font-medium">{TRANSITION_TYPE_LABELS[t.transition_type] || t.transition_type || "Transition"}</p>
                        <p className="text-xs text-muted-foreground">{home?.name || "—"} · {formatDateUK(t.planned_date)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      {isOverdue ? (
                        <span className="text-xs text-red-600 font-bold">Overdue</span>
                      ) : days !== null ? (
                        <span className={`text-xs font-medium ${isUrgent ? "text-amber-600" : "text-muted-foreground"}`}>
                          {days}d
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}