import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import WorkflowList from "./WorkflowList";

export default function RSMView({ workflows, events, homes, myStaffProfile, handlers, ofstedNotifications }) {
  const pending = workflows.filter(w => w.status === "pending_rsm");
  const reg27Pending = ofstedNotifications?.filter(n => n.status === "pending") || [];
  const [timers, setTimers] = useState({});

  // Update countdown timers every minute
  useEffect(() => {
    const updateTimers = () => {
      const newTimers = {};
      reg27Pending.forEach(notification => {
        const deadline = new Date(notification.deadline_datetime);
        const now = new Date();
        const hoursRemaining = Math.max(0, Math.floor((deadline - now) / (1000 * 60 * 60)));
        newTimers[notification.id] = hoursRemaining;
      });
      setTimers(newTimers);
    };
    updateTimers();
    const interval = setInterval(updateTimers, 60000);
    return () => clearInterval(interval);
  }, [reg27Pending]);

  return (
    <div className="space-y-6">
      {/* Reg 27 Pending Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          Reg 27 Notifications Pending
        </h2>
        {reg27Pending.length === 0 ? (
          <Card className="p-6 rounded-xl text-center text-muted-foreground text-sm">
            No pending Reg 27 notifications.
          </Card>
        ) : (
          <div className="space-y-3">
            {reg27Pending.map(notification => {
              const hours = timers[notification.id] ?? 0;
              const isUrgent = hours < 4;
              return (
                <Card
                  key={notification.id}
                  className={`p-4 rounded-xl border-l-4 ${
                    isUrgent ? "bg-red-50 border-red-500" : "bg-amber-50 border-amber-500"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{notification.home_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.event_summary}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className={`w-4 h-4 ${isUrgent ? "text-red-600" : "text-amber-600"}`} />
                        <Badge className={isUrgent ? "bg-red-500/10 text-red-700" : "bg-amber-500/10 text-amber-700"}>
                          {hours} hours remaining
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="rounded-lg"
                      variant={isUrgent ? "destructive" : "outline"}
                      onClick={() => window.location.href = "/compliance-hub"}
                    >
                      Draft & Send
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Final Approvals Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Final Approvals Pending</h2>
        {pending.length === 0 ? (
          <Card className="p-6 rounded-xl text-center text-muted-foreground text-sm">
            No workflows awaiting final RSM approval.
          </Card>
        ) : (
          <WorkflowList workflows={pending} events={events} homes={homes} handlers={handlers} />
        )}
      </div>
    </div>
  );
}