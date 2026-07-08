import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, Outlet } from "react-router-dom";
import Settings from "@/pages/Settings.jsx";
import userEvent from "@testing-library/user-event";
import {getUserRole} from "@/tests/getRole";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
let userRole;

const testUser = {
  id: "user-1",
  role: "admin"
};

const testStaffProfile = {
  id: "staff-1",
  role: "admin",
  full_name: "Admin User"
};

// Wrapper that provides outlet context
function SettingsWithContext({ user = testUser, staffProfile = testStaffProfile }) {
  return (
    <MemoryRouter initialEntries={['/settings']}>
      <Routes>
        <Route element={<Outlet context={{ user, staffProfile }} />}>
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

function renderTab(user = testUser, staffProfile = testStaffProfile) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SettingsWithContext user={user} staffProfile={staffProfile} />
    </QueryClientProvider>
  );
}


describe("Admin & Org tabs", () => {
  it("should show 'User Management' for admin users", async () => {
    userRole = await getUserRole({email, password});
    renderTab(testUser, { ...testStaffProfile, role: userRole });
    
    // Wait for the Users tab to appear
    const usersTab = await screen.findByRole("tab", { name: /Users/i });
    expect(usersTab).toBeInTheDocument();
    
    // Click it to show the content
    await userEvent.click(usersTab);
    
    // Check that "User Management" heading appears
    const heading = await screen.findByRole("heading", { name: /User Management/i });
    expect(heading.textContent).toBe("User Management");
  });

  it("should NOT show 'User Management' for non-admin users", async () => {
    
    const nonAdminUser = { ...testUser, role: "support_worker" };
    const nonAdminProfile = { ...testStaffProfile, role: "support_worker" };
    
    renderTab(nonAdminUser, nonAdminProfile);
    
    // Wait for component to load
    await screen.findByRole("heading", { name: /Settings/i });
    
    // Users tab should NOT exist
    const usersTab = screen.queryByRole("tab", { name: /Users/i });
    expect(usersTab).not.toBeInTheDocument();
    
    // "User Management" heading should NOT exist
    const heading = screen.queryByRole("heading", { name: /User Management/i });
    expect(heading).not.toBeInTheDocument();
  });
});