import axiosInstance from "@/api/axiosInstance";
import { ROLE_DASHBOARD_ROUTES } from "@/lib/roleConfig";

export async function signIn({ email, password, checkUserAuth }) {
  try {
    const response = await axiosInstance.post("auth/login", { email, password });

    if (response.data.status === "success") {
      const { user_type, access_token } = response.data.data;

      if (user_type === "platform") {
        const admin = response.data.data.admin;

        sessionStorage.setItem("platform_access_token", access_token);
        sessionStorage.setItem("platform_admin", JSON.stringify(admin));

        // Platform owner has no tenant checkUserAuth to run — skip it.
        return { success: true, target: "/dashboard" };
      }

      // Tenant staff login — original behavior, unchanged.
      const user = response.data.data.user;

      sessionStorage.setItem("access_token", access_token);
      sessionStorage.setItem("token", access_token);
      sessionStorage.setItem("user", JSON.stringify(user));

      if (checkUserAuth) {
        await checkUserAuth();
      }

      const target = ROLE_DASHBOARD_ROUTES[user?.role] || "/dashboard";
      return { success: true, target };
    }

    return { success: false, error: "Login failed. Please check your credentials and try again." };
  } catch (error) {
  console.log('RAW ERROR:', error?.response?.status, error?.response?.data, error?.message);
  const msg =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    "Login failed. Please check your credentials and try again.";
  return { success: false, error: msg };
}
}