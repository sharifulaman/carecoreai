import { useState, useEffect, useRef } from "react";
import { Bell, Sun, Moon, Menu, X, Shield, GraduationCap, Flag, Calendar, FileText, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, getNavItemsForRole, ORG_ID } from "@/lib/roleConfig";
import { base44 } from "@/api/base44Client";
import { secureGateway } from "@/lib/secureGateway";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import MobileNav from "./MobileNav";
import ClockInButton from "@/components/staff/ClockInButton";
import ComplianceModal from "@/components/compliance/ComplianceModal";

const ROOT_ROUTES = ["/dashboard", "/tl-dashboard", "/sw-dashboard", "/residents", "/staff", "/finance", "/homes", "/24hours", "/settings", "/messages", "/analytics"];

const TYPE_ICON = {
  certification: Shield,
  dbs_expiry: Shield,
  training_expiry: GraduationCap,
  alert: Flag,
  flagged_log: Flag,
  holiday: Calendar,
  leave_request: Calendar,
  leave_response: Calendar,
  general: FileText,
  visit_report: FileText,
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "";
  }
}

export default function TopBar({ user, staffProfile, title }) {
  const location = useLocation();
  const [time, setTime] = useState(new Date());
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("carecore-theme");
    if (stored) return stored;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isRootRoute = ROOT_ROUTES.some(r => location.pathname === r) || location.pathname === "/";
  const [bellOpen, setBellOpen] = useState(false);
  const [complianceOpen, setComplianceOpen] = useState(false);
  const bellRef = useRef(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const role = staffProfile?.role || (user?.role === "user" ? "support_worker" : (user?.role || "support_worker"));
  const navItems = getNavItemsForRole(role);

  // Query unread notifications for current user by user_id
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications-bell", user?.id],
    queryFn: () => user?.id
      ? secureGateway.filter("Notification", { user_id: user.id, read: false }, "-created_date", 10)
      : [],
    enabled: !!user?.id,
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => secureGateway.update("Notification", id, { read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications-bell", user?.id] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(notifications.map(n => secureGateway.update("Notification", n.id, { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-bell", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["notifications-messages", user?.id] });
    },
  });

  const unreadCount = notifications.length;

  // Close bell dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Apply theme on init and changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("carecore-theme", theme);
  }, [theme]);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  const handleNotifClick = (n) => {
    markReadMutation.mutate(n.id);
    setBellOpen(false);
    if (n.link_url) navigate(n.link_url);
  };

  return (
    <>
      <header className="h-14 md:h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          {/* Mobile: show Back button on non-root routes, hamburger on root routes */}
          {!isRootRoute ? (
            <button onClick={() => navigate(-1)} className="md:hidden flex items-center gap-1 text-primary hover:opacity-70 transition-opacity">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Back</span>
            </button>
          ) : (
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden hover:opacity-70 transition-opacity">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
          <h1 className="text-base md:text-lg font-semibold text-foreground">{title || "Dashboard"}</h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <ClockInButton user={user} />
          <span className="text-sm text-muted-foreground hidden md:block">
            {time.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {" · "}
            {time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </Button>

          {/* Compliance modal trigger */}
          {complianceOpen && <ComplianceModal onClose={() => setComplianceOpen(false)} />}
          <Button variant="ghost" size="icon" onClick={() => setComplianceOpen(true)} className="h-9 w-9" title="Regulatory compliance">
            <Shield className="w-4 h-4 text-muted-foreground" />
          </Button>

          {/* Bell dropdown */}
          <div className="relative" ref={bellRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => setBellOpen(v => !v)}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>

            {bellOpen && (
              <div className="absolute right-0 top-11 z-50 w-72 sm:w-80 bg-card border border-border rounded-xl shadow-xl overflow-hidden" style={{maxWidth: 'calc(100vw - 16px)'}}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllReadMutation.mutate()}
                      className="text-xs text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div
                  className="max-h-96 overflow-y-auto"
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    if (el.scrollHeight - el.scrollTop - el.clientHeight < 20) {
                      queryClient.invalidateQueries({ queryKey: ["notifications-bell", user?.id] });
                    }
                  }}
                >
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">No new notifications</div>
                  ) : (
                    notifications.slice(0, 10).map(n => {
                      const Icon = TYPE_ICON[n.type] || FileText;
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className="w-full text-left px-4 py-3 hover:bg-muted/50 border-b border-border/50 last:border-0 border-l-2 border-l-primary bg-primary/5 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Icon className="w-3.5 h-3.5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold leading-snug truncate">{n.related_module || "Notification"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_date)}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="px-4 py-2 border-t border-border">
                  <button
                    onClick={() => { setBellOpen(false); navigate("/messages"); }}
                    className="text-xs text-primary hover:underline w-full text-center"
                  >
                    View all notifications →
                  </button>
                </div>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-accent transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                  {(user?.full_name || "U").charAt(0)}
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">{user?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{ROLE_LABELS[role]}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent rounded" onClick={() => navigate("/settings")}>Settings</button>
              <button className="w-full text-left px-2 py-1.5 text-sm text-red-500 hover:bg-accent rounded" onClick={() => base44.auth.logout("/")}>Log Out</button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <MobileNav navItems={navItems} isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}