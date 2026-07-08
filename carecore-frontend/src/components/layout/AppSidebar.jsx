import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getNavItemsForRoleAndPermissions } from "@/lib/roleConfig";
import { usePermission } from "@/lib/PermissionContext";
import { LogOut, ChevronLeft, ChevronRight, Bell, MapPin, ShieldOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function AppSidebar({ user, staffProfile, collapsed, onToggle }) {
  const location = useLocation();
  // Use StaffProfile.role if available (authoritative), fallback to mapped user.role
  const role = staffProfile?.role || (user?.role === "user" ? "support_worker" : (user?.role || "support_worker"));

  // Permission data comes from PermissionContext (provided by AppLayout).
  // enabledModuleKeys is a string[] of enabled module keys, or null when unconfigured.
  const { enabledModuleKeys, isLoaded } = usePermission();
  const navItems = getNavItemsForRoleAndPermissions(role, user?.email, enabledModuleKeys);
  // True when permissions have loaded and every module is blocked (all-None config).
  const hasNoAccess = isLoaded && Array.isArray(enabledModuleKeys) && enabledModuleKeys.length === 0;

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
        "md:flex hidden",
        collapsed ? "w-[72px]" : "w-64"
      )}>
        {/* Logo area */}
        <div className="border-b border-sidebar-border shrink-0 h-16 overflow-hidden">
          {collapsed ? (
            <div className="flex items-center justify-center h-full">
              <img
                src="https://media.base44.com/images/public/69e8b95bf83622ae112de61e/364cbaab0_ChatGPTImageMay8202612_06_51PM.png"
                alt="CareCore AI"
                className="w-10 h-10 object-contain"
              />
            </div>
          ) : (
            <img
              src="https://media.base44.com/images/public/69e8b95bf83622ae112de61e/364cbaab0_ChatGPTImageMay8202612_06_51PM.png"
              alt="CareCore AI"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {hasNoAccess && !collapsed && (
            <div className="mx-1 mb-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-3 py-3 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                <ShieldOff className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] font-semibold">No Module Access</span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-500 leading-snug">
                Your role has no modules configured. Contact your system administrator.
              </p>
            </div>
          )}
          <div className="space-y-1">
            {navItems.map((item) => {
              if (item.isGroup && item.children) {
                return (
                  <div key={item.key}>
                    {!collapsed && (
                      <div className="px-3 py-2 mt-2">
                        <p className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wide">{item.label}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      {item.children.filter(child => child.roles.includes(role)).map((child) => {
                        const childPathBase = child.path?.split("?")[0];
                        const isActive = location.pathname === childPathBase ||
                (child.path === '/homes-hub' && location.pathname.startsWith('/homes/')) ||
                (childPathBase === '/residents' && location.pathname === '/residents' && !child.path.includes("?") && !location.search) ||
                (childPathBase === '/residents' && location.pathname.startsWith('/residents/') && !child.path.includes("?")) ||
                (childPathBase === '/residents' && location.pathname.startsWith('/young-people/') && !child.path.includes("?")) ||
                (child.path?.includes("?") && location.pathname === '/residents' && location.search === `?service=${child.path.split("?service=")[1]}`);
                        const Icon = child.icon;

                        const linkContent = (
                          <Link
                            to={child.path || "/"}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                              collapsed && "justify-center px-2"
                            )}
                          >
                            <span className="relative shrink-0">
                              <Icon className="w-5 h-5" />
                            </span>
                            {!collapsed && <span className="flex-1">{child.label}</span>}
                          </Link>
                        );

                        if (collapsed) {
                          return (
                            <Tooltip key={child.key}>
                              <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                              <TooltipContent side="right" className="font-medium">{child.label}</TooltipContent>
                            </Tooltip>
                          );
                        }

                        return <div key={child.key}>{linkContent}</div>;
                      })}
                    </div>
                  </div>
                );
              }

              const isActive = location.pathname === item.path || 
                (item.path === '/24hours' && location.pathname.startsWith('/24hours')) ||
                (item.path === '/homes-hub' && location.pathname.startsWith('/homes/')) ||
                (item.path === '/residents' && location.pathname.startsWith('/residents/')) ||
                (item.path === '/residents' && location.pathname.startsWith('/young-people/'));
              const Icon = item.icon;

              const sectionLabel = item.section;
              const linkContent = (
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    collapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );

              if (collapsed) {
                return (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <div key={item.key}>
                  {sectionLabel && !collapsed && (
                    <div className="px-3 py-2 mt-2">
                      <p className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wide">{sectionLabel}</p>
                    </div>
                  )}
                  {linkContent}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Bottom section */}
        <div className="border-t border-sidebar-border p-3 space-y-2 shrink-0">
          {!collapsed && (
            <div className="px-3 py-2">
              <p className="text-sidebar-foreground text-sm font-medium truncate">{user?.full_name || "User"}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate capitalize">{role.replace(/_/g, " ")}</p>
            </div>
          )}

          <div className={cn("flex gap-1", collapsed ? "flex-col items-center" : "")}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent h-9 w-9"
                >
                  {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{collapsed ? "Expand" : "Collapse"}</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 h-9 w-9"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Log Out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}