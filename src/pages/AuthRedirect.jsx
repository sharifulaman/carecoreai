import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/roleConfig";
import { Loader2 } from "lucide-react";

export default function AuthRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    async function redirect() {
      try {
        const user = await base44.auth.me();
        if (!user) { navigate("/", { replace: true }); return; }

        // Look up StaffProfile.role — the authoritative role for this app
        let staffRole = null;
        try {
          const profiles = await base44.entities.StaffProfile.filter({ email: user.email }, '-created_date', 1);
          if (profiles?.[0]?.role) staffRole = profiles[0].role;
        } catch (_) {}

        // Fallback: map base44 platform role if no StaffProfile found
        const mappedRole = staffRole || (user.role === "user" ? "support_worker" : user.role) || "support_worker";
        const route = ROLE_DASHBOARD_ROUTES[mappedRole] || "/dashboard";
        navigate(route, { replace: true });
      } catch {
        navigate("/", { replace: true });
      }
    }
    redirect();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}