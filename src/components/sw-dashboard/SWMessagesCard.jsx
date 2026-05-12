import { MessageSquare, Users, UserCircle, ShieldAlert, ChevronRight } from "lucide-react";

const TYPE_CONFIG = {
  team: { icon: Users, label: "Team Messages", color: "text-blue-500 bg-blue-50" },
  manager: { icon: UserCircle, label: "Manager Update", color: "text-green-600 bg-green-50" },
  safeguarding: { icon: ShieldAlert, label: "Safeguarding Alert", color: "text-red-500 bg-red-50" },
  default: { icon: MessageSquare, label: "Message", color: "text-slate-500 bg-slate-100" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SWMessagesCard({ notifications, onViewAll, onViewMessage }) {
  const unread = notifications.filter(n => !n.read && !n.read_at && !n.is_read).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-slate-800 text-sm">Messages / Alerts</h3>
          {unread > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread}</span>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No unread messages.</p>
      ) : (
        <div className="space-y-2">
          {notifications.slice(0, 4).map((n, i) => {
            const module = (n.related_module || "").toLowerCase();
            const type = module.includes("safeguard") ? "safeguarding" : module.includes("team") ? "team" : module.includes("manager") ? "manager" : n.type === "alert" ? "safeguarding" : "default";
            const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.default;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id || i}
                className="flex items-start gap-3 cursor-pointer hover:bg-slate-50 rounded-lg p-1.5"
                onClick={() => onViewMessage(n)}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.color.split(" ")[1]} `}>
                  <Icon className={`w-4 h-4 ${cfg.color.split(" ")[0]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700">{n.related_module || cfg.label}</p>
                  <p className="text-xs text-slate-400 truncate">{n.message || n.title || "New message"}</p>
                </div>
                <span className="text-[10px] text-slate-300 shrink-0">{timeAgo(n.created_date)}</span>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onViewAll} className="flex items-center gap-1 text-xs text-blue-500 font-semibold hover:underline mt-4">
        View all messages <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}