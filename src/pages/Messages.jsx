import { useState, useEffect } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { secureGateway } from "@/lib/secureGateway";
import { Button } from "@/components/ui/button";
import { Shield, GraduationCap, Flag, Calendar, FileText, Bell, CheckCheck, ExternalLink } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { seedNotificationsIfNeeded } from "@/lib/seedNotifications";

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "certification", label: "DBS Alerts" },
  { key: "training", label: "Training Alerts" },
  { key: "alert", label: "Flagged Logs" },
  { key: "holiday", label: "Leave" },
  { key: "general", label: "Visit Reports" },
];

const TYPE_ICON = {
  certification: Shield,
  alert: Flag,
  holiday: Calendar,
  general: FileText,
  rota: Bell,
  handover: FileText,
};

function NotificationCard({ n, onMarkRead, onNavigate }) {
  const Icon = TYPE_ICON[n.type] || Bell;
  const isUnread = !n.read;

  const fmtDate = (d) => {
    try { return format(new Date(d), "dd MMM yyyy 'at' HH:mm"); } catch { return d || ""; }
  };

  return (
    <div className={`rounded-xl border p-4 flex gap-4 transition-all ${
      isUnread
        ? "bg-white border-l-4 border-l-primary border-border shadow-sm"
        : "bg-muted/30 border-border"
    }`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
        isUnread ? "bg-primary/10" : "bg-muted"
      }`}>
        <Icon className={`w-5 h-5 ${isUnread ? "text-primary" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
          <p className={`text-sm leading-snug ${isUnread ? "font-semibold" : "font-medium text-muted-foreground"}`}>
            {n.related_module || "Notification"}
          </p>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{n.message}</p>
        <p className="text-xs text-muted-foreground mt-2">{fmtDate(n.created_date)}</p>
      </div>
      <div className="flex flex-col gap-2 shrink-0">
        {isUnread && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onMarkRead(n.id)}>
            <CheckCheck className="w-3 h-3" /> Read
          </Button>
        )}
        {n.link_url && (
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-primary" onClick={() => onNavigate(n)}>
            View <ExternalLink className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

const PAGE_SIZE = 20;

export default function Messages() {
  const { user, staffProfile } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isSW = staffProfile?.role === "support_worker";
  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  // Seed test data on first load
  useEffect(() => {
    if (user?.id) {
      seedNotificationsIfNeeded({
        userId: user.id,
        staffId: staffProfile?.id,
        orgId: staffProfile?.org_id || "default_org",
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications-messages", user?.id] });
        queryClient.invalidateQueries({ queryKey: ["notifications-bell", user?.id] });
      }).catch(() => {});
    }
  }, [user?.id]); // eslint-disable-line

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications-messages", user?.id],
    queryFn: () => user?.id
      ? secureGateway.filter("Notification", { user_id: user.id }, "-created_date", 100)
      : [],
    enabled: !!user?.id,
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => secureGateway.update("Notification", id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-messages", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications-bell", user?.id] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => secureGateway.update("Notification", n.id, { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-messages", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications-bell", user?.id] });
    },
  });

  const handleNavigate = (n) => {
    if (!n.read) markReadMutation.mutate(n.id);
    if (n.link_url) navigate(n.link_url);
  };

  // Apply tab filter
  const filtered = notifications.filter(n => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !n.read;
    if (activeTab === "training") return n.type === "certification" && n.related_module?.toLowerCase().includes("training");
    if (activeTab === "certification") return n.type === "certification" && !n.related_module?.toLowerCase().includes("training");
    if (activeTab === "alert") return n.type === "alert";
    if (activeTab === "holiday") return n.type === "holiday";
    if (activeTab === "general") return n.type === "general";
    return n.type === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset to page 1 when tab changes
  useEffect(() => { setPage(1); }, [activeTab]);

  if (isSW) {
    // Support workers only see their leave responses
    const swNotifs = notifications.filter(n => n.type === "holiday");
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Messages & Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">You will be notified here when your leave requests are approved or rejected.</p>
        </div>
        {swNotifs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {swNotifs.map(n => (
              <NotificationCard key={n.id} n={n} onMarkRead={id => markReadMutation.mutate(id)} onNavigate={handleNavigate} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Messages & Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up — no unread notifications"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            variant="outline"
            className="gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </Button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-44 shrink-0">
          <nav className="space-y-1">
            {TABS.map(tab => {
              const count = tab.key === "unread"
                ? notifications.filter(n => !n.read).length
                : tab.key === "all"
                ? notifications.length
                : notifications.filter(n => {
                    if (tab.key === "training") return n.type === "certification" && n.related_module?.toLowerCase().includes("training");
                    if (tab.key === "certification") return n.type === "certification" && !n.related_module?.toLowerCase().includes("training");
                    if (tab.key === "alert") return n.type === "alert";
                    if (tab.key === "holiday") return n.type === "holiday";
                    if (tab.key === "general") return n.type === "general";
                    return n.type === tab.key;
                  }).length;

              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${
                    activeTab === tab.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center ${
                      activeTab === tab.key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                    }`}>{count}</span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No notifications in this category.</p>
            </div>
          ) : (
            paginated.map(n => (
              <NotificationCard
                key={n.id}
                n={n}
                onMarkRead={id => markReadMutation.mutate(id)}
                onNavigate={handleNavigate}
              />
            ))
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}