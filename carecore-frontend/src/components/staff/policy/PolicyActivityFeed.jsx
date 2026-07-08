import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ORG_ID } from "@/lib/roleConfig";
import { format } from "date-fns";
import { Upload, UserPlus, Eye, CheckCircle2, Bell, Archive, FileText } from "lucide-react";

const EVENT_CONFIG = {
  "Policy Uploaded": { icon: Upload, color: "bg-blue-100 text-blue-600" },
  "Policy Version Uploaded": { icon: Upload, color: "bg-blue-100 text-blue-600" },
  "Policy Assigned": { icon: UserPlus, color: "bg-teal-100 text-teal-600" },
  "Policy Viewed": { icon: Eye, color: "bg-purple-100 text-purple-600" },
  "Policy Acknowledged": { icon: CheckCircle2, color: "bg-green-100 text-green-600" },
  "Reminder Sent": { icon: Bell, color: "bg-amber-100 text-amber-600" },
  "Policy Archived": { icon: Archive, color: "bg-red-100 text-red-600" },
};

export default function PolicyActivityFeed({ refreshKey }) {
  const { data: events = [] } = useQuery({
    queryKey: ["hr-policy-activity", refreshKey],
    queryFn: () => base44.entities.HRPolicyActivityEvent.filter({ org_id: ORG_ID }, "-event_date", 20),
    staleTime: 30000,
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Recent Activity</h3>
        <button className="text-xs text-teal-600 font-semibold hover:underline">View all →</button>
      </div>
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {events.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-8">No activity yet</p>
        ) : events.map(event => {
          const cfg = EVENT_CONFIG[event.event_type] || { icon: FileText, color: "bg-slate-100 text-slate-600" };
          const Icon = cfg.icon;
          return (
            <div key={event.id} className="flex gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 leading-tight">{event.event_title}</p>
                {event.performed_by_name && <p className="text-[10px] text-slate-400">by {event.performed_by_name}</p>}
                {event.policy_title && <p className="text-[10px] text-teal-600 font-medium truncate">{event.policy_title}</p>}
                <p className="text-[10px] text-slate-300 mt-0.5">{event.event_date ? format(new Date(event.event_date), "dd MMM, HH:mm") : "—"}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}