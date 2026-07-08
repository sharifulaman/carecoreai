import { Loader2, ShieldOff } from "lucide-react";
import { usePermission } from "@/lib/PermissionContext";

/**
 * ModuleGate wraps a page/section and blocks rendering when the logged-in user's
 * role does not have access to the given module key.
 *
 * - While permissions are loading, renders a spinner (prevents false "Access Restricted" flash).
 * - Admin role bypasses all gates.
 * - If no RolePermission record is configured for the role, access is granted (backward-compat).
 *
 * Usage:
 *   <ModuleGate module="finance"><Finance /></ModuleGate>
 */
export default function ModuleGate({ module, children }) {
  const { hasModule, isLoaded, isAdmin } = usePermission();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isAdmin || hasModule(module)) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <ShieldOff className="w-10 h-10 text-muted-foreground/40" />
      <p className="text-base font-semibold text-muted-foreground">Access Restricted</p>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Your role does not have access to this module. Contact your system administrator to request access.
      </p>
    </div>
  );
}
