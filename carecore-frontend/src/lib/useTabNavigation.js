import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const TAB_ROUTES = {
  "/dashboard": "dashboard",
  "/residents": "residents",
  "/house": "tasks",
  "/messages": "alerts",
};

const DEFAULT_SUB_ROUTES = {
  dashboard: "/dashboard",
  residents: "/residents",
  tasks: "/house",
  alerts: "/messages",
};

export function useTabNavigation(currentPath) {
  const navigate = useNavigate();

  // Get the main tab from current path
  const getMainTab = useCallback((path) => {
    for (const [route, tab] of Object.entries(TAB_ROUTES)) {
      if (path === route || path.startsWith(route + "/")) {
        return tab;
      }
    }
    return null;
  }, []);

  // Save current path when it changes
  useEffect(() => {
    const mainTab = getMainTab(currentPath);
    if (mainTab) {
      sessionStorage.setItem(`tab-last-route-${mainTab}`, currentPath);
    }
  }, [currentPath, getMainTab]);

  // Navigate to a tab, restoring last visited sub-route if it exists
  const navigateToTab = useCallback((mainTabRoute) => {
    const mainTab = getMainTab(mainTabRoute);
    if (!mainTab) {
      navigate(mainTabRoute);
      return;
    }

    const lastRoute = sessionStorage.getItem(`tab-last-route-${mainTab}`);
    const targetRoute = lastRoute || DEFAULT_SUB_ROUTES[mainTab];
    navigate(targetRoute);
  }, [navigate, getMainTab]);

  return navigateToTab;
}