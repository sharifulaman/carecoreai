import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { getNavItemsForRole } from "@/lib/roleConfig";
import { LogOut, ChevronLeft, ChevronRight, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function AppSidebar({ user, staffProfile, collapsed, onToggle }) {
  const location = useLocation();
  // Use StaffProfile.role if available (authoritative), fallback to mapped user.role
  const role = staffProfile?.role || (user?.role === "user" ? "support_worker" : (user?.role || "support_worker"));
  const navItems = getNavItemsForRole(role);

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
                        const isActive = location.pathname === child.path || 
                          (child.path === '/homes-hub' && location.pathname.startsWith('/homes/'));
                        const Icon = child.icon;

                        const linkContent = (
                          <Link
                            to={child.path}
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
                (item.path === '/24hours' && location.pathname.startsWith('/24hours'));
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