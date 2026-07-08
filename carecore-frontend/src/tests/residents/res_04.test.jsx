import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router } from "react-router-dom";
import Residents from "../../pages/Residents";
import { getToken } from "@/tests/getToken";
import { base44 } from "@/api/base44Client";


const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

// Mock useOutletContext to provide user and staffProfile
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useOutletContext: () => ({
      user: {
        id: "user-1",
        email: "admin@test.com",
        role: "admin",
      },
      staffProfile: {
        id: "staff-1",
        full_name: "Admin User",
        role: "admin",
        org_id: "default_org",
      },
    }),
  };
});

vi.mock("../../lib/MobileContext", () => ({
  useMobile: () => ({
    isMobile: false,
  }),
}));

// Mock sonner toast
const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

beforeAll(async () => {
  // Polyfills for browser APIs
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
  const token = await getToken({ email, password });
  base44.setToken(token);
});

function renderResidentsWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <Router>
        <Residents />
      </Router>
    </QueryClientProvider>
  );
}

describe("Residents tabs - Find residents by service type", () => {
  it("shows residents for All Residents tab", async () => {
    renderResidentsWithProviders();

    // Wait for page to load
    await waitFor(() => {
      expect(screen.getByText(/All Residents/i)).toBeInTheDocument();
    });

    const allTab = await screen.findByRole("button", { name: /all residents/i });
    await userEvent.click(allTab);

    await waitFor(() => {
      expect(
        screen.getByText(/Showing \d+ of \d+ All Residents residents/i)
      ).toBeInTheDocument();
    });
  });

  // it("shows residents for Outreach tab", async () => {
  //   renderResidentsWithProviders();

  //   await waitFor(() => {
  //     expect(screen.getByText(/Outreach/i)).toBeInTheDocument();
  //   });

  //   const outreachTab = await screen.findByRole("button", {
  //     name: /outreach/i,
  //   });
  //   await userEvent.click(outreachTab);

  //   await waitFor(() => {
  //     expect(
  //       screen.getByText(/Showing \d+ of \d+ Outreach residents/i)
  //     ).toBeInTheDocument();
  //   });
  // });

  // it("shows residents for 18+ Accommodation tab", async () => {
  //   renderResidentsWithProviders();

  //   await waitFor(() => {
  //     expect(screen.getByText(/18\+ Accommodation/i)).toBeInTheDocument();
  //   });

  //   const eighteenPlusTab = await screen.findByRole("button", {
  //     name: /18\+ accommodation/i,
  //   });
  //   await userEvent.click(eighteenPlusTab);

  //   await waitFor(() => {
  //     expect(
  //       screen.getByText(/Showing \d+ of \d+ 18\+ Accommodation residents/i)
  //     ).toBeInTheDocument();
  //   });
  // });

  // it("shows residents for 24 Hours Housing tab", async () => {
  //   renderResidentsWithProviders();

  //   await waitFor(() => {
  //     expect(screen.getByText(/24 Hours Housing/i)).toBeInTheDocument();
  //   });

  //   const twentyFourTab = await screen.findByRole("button", {
  //     name: /24 hours housing/i,
  //   });
  //   await userEvent.click(twentyFourTab);

  //   await waitFor(() => {
  //     expect(
  //       screen.getByText(/Showing \d+ of \d+ 24 Hours Housing residents/i)
  //     ).toBeInTheDocument();
  //   });
  // });

  // it("cycles through all service tabs and verifies counts update", async () => {
  //   renderResidentsWithProviders();

  //   // Verify All Residents tab
  //   await waitFor(() => {
  //     expect(
  //       screen.getByText(/Showing \d+ of \d+ All Residents residents/i)
  //     ).toBeInTheDocument();
  //   });

  //   // Click Outreach tab
  //   const outreachTab = await screen.findByRole("button", {
  //     name: /outreach/i,
  //   });
  //   await userEvent.click(outreachTab);

  //   await waitFor(() => {
  //     expect(
  //       screen.getByText(/Showing \d+ of \d+ Outreach residents/i)
  //     ).toBeInTheDocument();
  //   });

  //   // Click 18+ Accommodation tab
  //   const eighteenPlusTab = await screen.findByRole("button", {
  //     name: /18\+ accommodation/i,
  //   });
  //   await userEvent.click(eighteenPlusTab);

  //   await waitFor(() => {
  //     expect(
  //       screen.getByText(/Showing \d+ of \d+ 18\+ Accommodation residents/i)
  //     ).toBeInTheDocument();
  //   });

  //   // Click 24 Hours Housing tab
  //   const twentyFourTab = await screen.findByRole("button", {
  //     name: /24 hours housing/i,
  //   });
  //   await userEvent.click(twentyFourTab);

  //   await waitFor(() => {
  //     expect(
  //       screen.getByText(/Showing \d+ of \d+ 24 Hours Housing residents/i)
  //     ).toBeInTheDocument();
  //   });
  // });
});