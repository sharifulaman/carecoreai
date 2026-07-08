// @ts-nocheck
import { createContext, useContext, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Numeric rank for each access level — higher = more permissive.
export const LEVEL_RANK = { None: 0, View: 1, Edit: 2, Approve: 3, Admin: 4 };

const PermissionContext = createContext(null);

/**
 * PermissionProvider fetches the RolePermission record for the logged-in user's
 * role once per session and exposes permission helpers to all children.
 *
 * Admin role bypasses all module checks. If no RolePermission record exists for
 * a role, all modules are accessible (backward-compatible default).
 *
 * Data formats supported in enabled_modules (JSONB):
 *   Legacy:  ["staff", "finance", ...]
 *   Current: [{key: "staff", level: "Edit"}, {key: "finance", level: "View"}, ...]
 */
export function PermissionProvider({ role, children }) {
  const isAdmin = role === "admin";

  const { data: permRecord = null, isLoading, refetch } = useQuery({
    queryKey: ["role-permissions-nav", role],
    // Use the dedicated /my-permissions endpoint instead of the entity proxy.
    // The entity proxy goes through RequireModuleAccess which blocks users whose
    // admin_mgmt module is None — causing a loop where permissions can never load.
    queryFn: () => base44.permissions.fetchMine(),
    enabled: Boolean(role) && !isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  // Parse enabled_modules into { moduleKey → level } map.
  // Returns null when no record exists (→ no restriction).
  const moduleMap = useMemo(() => {
    if (isAdmin) return null;
    if (!permRecord?.enabled_modules) return null;

    const mods = permRecord.enabled_modules;
    if (!Array.isArray(mods) || mods.length === 0) return null;

    const map = {};
    if (typeof mods[0] === "object" && mods[0] !== null) {
      // Current format: [{key, level}]
      mods.forEach(({ key, level }) => { if (key) map[key] = level || "View"; });
    } else {
      // Legacy format: ["staff", "finance"]
      mods.forEach(key => { if (key) map[key] = "View"; });
    }
    return Object.keys(map).length > 0 ? map : null;
  }, [permRecord, isAdmin]);

  // Plain string array of enabled keys — passed to getNavItemsForRoleAndPermissions.
  // Only includes modules with level >= View. Returns an empty array (not null) when a
  // record exists but all modules are "None", so the caller knows to hide everything.
  const enabledModuleKeys = useMemo(() => {
    if (isAdmin) return null;
    if (!moduleMap) return null;
    return Object.keys(moduleMap).filter(
      (key) => (LEVEL_RANK[moduleMap[key]] ?? 0) >= LEVEL_RANK.View
    );
  }, [isAdmin, moduleMap]);

  // True once the permission query has settled (or immediately for admin).
  const isLoaded = isAdmin || !isLoading;

  // hasModule — true when the module has at least View access (or no record exists).
  const hasModule = useCallback((key) => {
    if (isAdmin || moduleMap === null) return true;
    return (LEVEL_RANK[moduleMap[key]] ?? 0) >= LEVEL_RANK.View;
  }, [isAdmin, moduleMap]);

  // getLevel — returns the configured access level string, or null when unconfigured.
  const getLevel = useCallback((key) => {
    if (isAdmin) return "Admin";
    if (moduleMap === null) return null;
    return moduleMap[key] ?? "None";
  }, [isAdmin, moduleMap]);

  const canView = useCallback((key) => {
    const level = getLevel(key);
    return level === null ? true : LEVEL_RANK[level] >= LEVEL_RANK.View;
  }, [getLevel]);

  const canEdit = useCallback((key) => {
    const level = getLevel(key);
    return level === null ? true : LEVEL_RANK[level] >= LEVEL_RANK.Edit;
  }, [getLevel]);

  const canApprove = useCallback((key) => {
    const level = getLevel(key);
    return level === null ? true : LEVEL_RANK[level] >= LEVEL_RANK.Approve;
  }, [getLevel]);

  const value = {
    hasModule,
    getLevel,
    canView,
    canEdit,
    canApprove,
    enabledModuleKeys,
    isAdmin,
    isLoaded,
    invalidate: refetch,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// Safe fallback used when a component is rendered outside AppLayout (portals, etc.).
const OPEN_FALLBACK = {
  hasModule: () => true,
  getLevel: () => null,
  canView: () => true,
  canEdit: () => true,
  canApprove: () => true,
  enabledModuleKeys: null,
  isAdmin: false,
  isLoaded: true,
  invalidate: () => {},
};

export function usePermission() {
  return useContext(PermissionContext) ?? OPEN_FALLBACK;
}

/**
 * useModuleActions — resolves what a user can do inside a specific module.
 *
 * When a RolePermission record exists for the user's role, the configured level
 * is the source of truth (overrides role-based logic).  When no record exists,
 * the provided `roleFallbacks` are used so existing role-based behaviour is
 * preserved — permissions can only RESTRICT, never grant beyond what the role
 * already allows.
 *
 * Level → action mapping:
 *   None    → { canView: false, canAdd: false, canEdit: false, canApprove: false, canDelete: false }
 *   View    → { canView: true,  canAdd: false, canEdit: false, canApprove: false, canDelete: false }
 *   Edit    → { canView: true,  canAdd: true,  canEdit: true,  canApprove: false, canDelete: false }
 *   Approve → { canView: true,  canAdd: true,  canEdit: true,  canApprove: true,  canDelete: false }
 *   Admin   → { canView: true,  canAdd: true,  canEdit: true,  canApprove: true,  canDelete: true  }
 *
 * Usage:
 *   const { canEdit, canAdd, isReadOnly, level } = useModuleActions("residents", {
 *     canEdit: isAdminOrTL,   // existing role-based check — used only when unconfigured
 *     canAdd:  isAdminOrTL,
 *   });
 */
export function useModuleActions(moduleKey, roleFallbacks = {}) {
  const { getLevel, isAdmin } = usePermission();

  if (isAdmin) {
    return { level: "Admin", canView: true, canAdd: true, canEdit: true, canApprove: true, canDelete: true, isReadOnly: false, configured: true };
  }

  const level = getLevel(moduleKey);

  if (level === null) {
    // No RolePermission record — defer to role-based fallbacks.
    const edit = roleFallbacks.canEdit ?? true;
    const add  = roleFallbacks.canAdd  ?? edit;
    return {
      level: null,
      configured: false,
      canView:    roleFallbacks.canView    ?? true,
      canAdd:     add,
      canEdit:    edit,
      canApprove: roleFallbacks.canApprove ?? false,
      canDelete:  roleFallbacks.canDelete  ?? false,
      isReadOnly: !edit,
    };
  }

  const rank = LEVEL_RANK[level] ?? 0;
  return {
    level,
    configured: true,
    canView:    rank >= LEVEL_RANK.View,
    canAdd:     rank >= LEVEL_RANK.Edit,
    canEdit:    rank >= LEVEL_RANK.Edit,
    canApprove: rank >= LEVEL_RANK.Approve,
    canDelete:  rank >= LEVEL_RANK.Admin,
    isReadOnly: rank < LEVEL_RANK.Edit,
  };
}
