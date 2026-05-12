import { useState, useEffect, useRef, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import AppSidebar from "./AppSidebar";
import TopBar from "./TopBar";
import MobileBottomNav from "./MobileBottomNav";
import { cn } from "@/lib/utils";
import { Loader2, RefreshCw } from "lucide-react";
import { primeSecureGateway } from "@/lib/secureGateway";

const PULL_THRESHOLD = 80; // px

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();
  const mainRef = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (mainRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (touchStartY.current === null) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullDistance(Math.min(delta, PULL_THRESHOLD * 1.5));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      await queryClient.invalidateQueries();
      setTimeout(() => setRefreshing(false), 600);
    }
    setPullDistance(0);
    touchStartY.current = null;
  }, [pullDistance, queryClient]);

  useEffect(() => {
    base44.auth.me().then(async u => {
      setUser(u);
      if (u?.email) {
        base44.entities.StaffProfile.filter({ email: u.email }, '-created_date', 1)
          .then(profiles => {
            if (profiles?.[0]) {
              setStaffProfile(profiles[0]);
              primeSecureGateway(profiles[0]);
            }
          })
          .catch(() => {});
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar user={user} staffProfile={staffProfile} collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={cn("flex flex-col min-h-screen transition-all duration-300", "md:ml-64", collapsed ? "md:ml-[72px]" : "")}>
        <div style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <TopBar user={user} staffProfile={staffProfile} />
        </div>
        <main
          ref={mainRef}
          className="flex-1 overflow-auto px-3 py-4 md:px-6 md:py-6 pb-20 md:pb-6 relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull-to-refresh indicator — mobile only */}
          {(pullDistance > 0 || refreshing) && (
            <div
              className="md:hidden flex items-center justify-center absolute top-0 left-0 right-0 z-10 pointer-events-none transition-all"
              style={{ height: refreshing ? 48 : pullDistance * 0.6 }}
            >
              <RefreshCw className={cn("w-5 h-5 text-primary", refreshing && "animate-spin")} style={{ opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }} />
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="h-full"
            >
              <Outlet context={{ user, staffProfile }} />
            </motion.div>
          </AnimatePresence>
        </main>
        <footer className="px-4 py-2 border-t border-border text-center hidden md:block">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} CareCore AI &mdash; Created &amp; Conceptualised by <span className="font-medium">Morsalin Ahmed Chowdhury</span>. All rights reserved. Unauthorised copying or reproduction is strictly prohibited.
          </p>
        </footer>
      </div>
      <MobileBottomNav />
    </div>
  );
}