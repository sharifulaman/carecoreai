import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppointmentsTab from "@/components/residents/appointments/AppointmentsTab";

const {
  secureGatewayFilterMock,
  secureGatewayCreateMock,
  secureGatewayUpdateMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  secureGatewayFilterMock: vi.fn(),
  secureGatewayCreateMock: vi.fn(),
  secureGatewayUpdateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/secureGateway", () => ({
  secureGateway: {
    filter: secureGatewayFilterMock,
    create: secureGatewayCreateMock,
    update: secureGatewayUpdateMock,
  },
}));

vi.mock("@/hooks/useWorkflowTrigger", () => ({
  useWorkflowTrigger: () => ({
    triggerWorkflow: vi.fn(),
  }),
}));

vi.mock("@/lib/PermissionContext", () => ({
  useModuleActions: () => ({
    canEdit: true,
    canAdd: true,
    canApprove: true,
    canDelete: true,
    isReadOnly: false,
    level: "edit",
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      VisitorLog: { filter: vi.fn().mockResolvedValue([]) },
      Shift: { filter: vi.fn().mockResolvedValue([]) },
    },
  },
}));

const residents = [
  {
    id: "resident-1",
    display_name: "Alex Taylor",
    home_id: "home-1",
  },
];

const homes = [
  {
    id: "home-1",
    name: "Hope House",
    address: "1 Care Street",
    status: "active",
  },
];

const staffProfile = {
  id: "staff-1",
  full_name: "Admin User",
  role: "admin",
  org_id: "default_org",
};

const appUser = {
  id: "user-1",
  role: "admin",
  email: "admin@example.com",
};

const staff = [
  {
    id: "staff-1",
    full_name: "Admin User",
    role: "admin",
    status: "active",
    home_ids: ["home-1"],
  },
];

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AppointmentsTab
        residents={residents}
        homes={homes}
        user={appUser}
        staff={staff}
        staffProfile={staffProfile}
        isAdmin={true}
        isAdminOrTL={true}
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

describe("RES-16 - Add new appointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // AppointmentsTab data load
    secureGatewayFilterMock.mockImplementation(async (entity) => {
      switch (entity) {
        case "Appointment":
          return [];
        case "Resident":
          return residents;
        case "Home":
          return homes;
        case "StaffProfile":
          return staff;
        default:
          return [];
      }
    });

    secureGatewayCreateMock.mockResolvedValue({ id: "apt-1" });
    secureGatewayUpdateMock.mockResolvedValue({ id: "apt-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it(
    "shows validation errors and does not create when required fields are missing",
    async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      renderTab();

      // Wait for loading to end
      await waitFor(() => {
        expect(screen.queryByText(/Loading appointments.../i)).not.toBeInTheDocument();
      });

      // Open appointment form
      await user.click(await screen.findByRole("button", { name: /New Appointment/i }));
      await screen.findByRole("heading", { name: /New Appointment/i });

      // Save without filling required fields
      await user.click(screen.getByRole("button", { name: /Save Appointment/i }));

      // Should show validation toast and not create
      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalledWith("Please fill in all required fields");
      });

      expect(secureGatewayCreateMock).not.toHaveBeenCalled();
      expect(toastSuccessMock).not.toHaveBeenCalled();
    },
    60000
  );
});