import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, Bell, ListChecks } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabNavigation } from "@/lib/useTabNavigation";
import { useMobileTabState } from "@/lib/useMobileTabState";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Residents", icon: Users, path: "/residents" },
  { label: "Tasks", icon: ListChecks, path: "/house" },
  { label: "Alerts", icon: Bell, path: "/messages" },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigateToTab = useTabNavigation(location.pathname);
  useMobileTabState(); // Track scroll position per tab

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card border-t border-border flex items-stretch"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ label, icon: Icon, path }) => {
        const active = location.pathname === path || location.pathname.startsWith(path + "/");
        return (
          <button
            key={path}
            onClick={() => navigateToTab(path)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors select-none",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("w-5 h-5", active && "text-primary")} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}