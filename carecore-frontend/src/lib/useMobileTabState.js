import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const TAB_ROUTES = {
  "/dashboard": "dashboard",
  "/residents": "residents",
  "/house": "tasks",
};

/**
 * Preserve scroll position and sub-route for each main tab.
 * Usage: Call at the start of MobileBottomNav or App layout to track state.
 */
export function useMobileTabState() {
  const location = useLocation();
  const scrollPositionsRef = useRef({});

  // Save scroll position when navigating away from a tab
  useEffect(() => {
    const mainTab = Object.entries(TAB_ROUTES).find(
      ([route]) =>
        location.pathname === route || location.pathname.startsWith(route + "/")
    )?.[1];

    if (mainTab) {
      // Save current scroll position
      const mainElement = document.querySelector("main");
      if (mainElement) {
        scrollPositionsRef.current[mainTab] = mainElement.scrollTop;
      }
    }
  }, [location.pathname]);

  // Restore scroll position when switching to a tab
  useEffect(() => {
    const mainTab = Object.entries(TAB_ROUTES).find(
      ([route]) =>
        location.pathname === route || location.pathname.startsWith(route + "/")
    )?.[1];

    if (mainTab) {
      // Restore scroll position on next frame
      requestAnimationFrame(() => {
        const mainElement = document.querySelector("main");
        if (mainElement && scrollPositionsRef.current[mainTab] !== undefined) {
          mainElement.scrollTop = scrollPositionsRef.current[mainTab];
        }
      });
    }
  }, [location.pathname]);

  return scrollPositionsRef.current;
}