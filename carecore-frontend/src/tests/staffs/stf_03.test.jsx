import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StaffProfileModal from "@/components/staff/tabs/StaffProfileModal";
import {getUser} from "@/tests/getUser";


const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

const homes = [{ id: "home-1", name: "Hope House", address: "1 Care Street", status: "active" }];
const staff = [
  {
    id: "staff-admin-1",
    full_name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    user_id: "user-admin-1",
  },
  {
    id: "staff-2",
    full_name: "Alex Manager",
    email: "alex@example.com",
    role: "admin_officer",
    user_id: "user-admin-2",
  },
];

async function renderTab(onSubmitMock) {
   const queryClient = new QueryClient({
     defaultOptions: { queries: { retry: false } },
   });
   const user = await getUser({
    email:email,
    password:password
   });
 
   return render(
     <QueryClientProvider client={queryClient}>
     <StaffProfileModal
          member={"personal"}
          user={user}
          homes={homes}
          allStaff={staff}
          defaultTab={"personal"}
          onClose={() => vi.fn()}
        />
     </QueryClientProvider>
   );
 }

 beforeAll(() => {
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  if (!global.ResizeObserver) {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }

  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = () => false;
  }

  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = () => {};
  }

  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = () => {};
  }
});

describe("StaffProfileModal", () => {
    it("Checking our desired form", async() => {
        const user = userEvent.setup({pointerEventsCheck: 0});
        await renderTab();
        // First verify we're on the modal by checking for the Edit button
        const editButton = await screen.findByRole("button", { name: /Edit/i });
        expect(editButton).toBeInTheDocument();
        // Click Edit to enter edit mode
        await user.click(editButton);
        // Now the Save button should appear
        const saveButton = await screen.findByRole("button", { name: /Cancel/i });
        expect(saveButton).toBeInTheDocument();

        // Test tab navigation
        // const personalTab = await screen.findByRole("tab", {
        //     name:/Personal/i
        // });
        const personalTab = await screen.getByText(/Personal/i);
        await user.click(personalTab);
        const expectedText = await screen.findByText(/Date of Birth/i);
        expect(expectedText).toBeInTheDocument();
    })
})