import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export default function MobileNav({ navItems, isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path) => {
    if (path) {
      navigate(path);
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={onClose}
        />
      )}
      {/* Drawer */}
      <nav className={cn(
        "md:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-sidebar flex flex-col transition-transform duration-300 shadow-2xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-3">
            <img src="https://media.base44.com/images/public/69e8b95bf83622ae112de61e/e6f91219b_ChatGPTImageApr30202612_31_15PM.png" alt="CareCore AI" className="w-8 h-8 rounded-lg object-contain bg-white" />
            <span className="text-sidebar-foreground font-semibold text-base">CareCore AI</span>
          </div>
          <button onClick={onClose} className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1.5 rounded-lg hover:bg-sidebar-accent">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav items */}
        <div className="flex-1 overflow-y-auto py-3 px-2">
          <div className="space-y-1">
            {navItems.map((item) => {
              if (item.isGroup && item.children) {
                return (
                  <div key={item.key} className="space-y-1">
                    <p className="text-xs font-semibold text-sidebar-foreground/50 px-3 py-2 uppercase tracking-wide">
                      {item.label}
                    </p>
                    {item.children.map((child) => {
                      const Icon = child.icon;
                      const isActive = location.pathname === child.path;
                      if (!Icon) return null;
                      return (
                        <button
                          key={child.path}
                          onClick={() => handleNavClick(child.path)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                            isActive
                              ? "bg-sidebar-primary text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                          )}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{child.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              }

              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              if (!Icon) return null;

              return (
                <div key={item.key}>
                  {item.section && (
                    <p className="text-xs font-semibold text-sidebar-foreground/50 px-3 py-2 mt-2 uppercase tracking-wide">{item.section}</p>
                  )}
                  <button
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}