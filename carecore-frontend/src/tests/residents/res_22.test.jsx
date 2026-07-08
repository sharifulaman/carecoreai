import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PlacementPlanTab from "@/components/residents/care-planning/PlacementPlanTab";

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

const residents = [{ id: "resident-1", display_name: "Alex Taylor", home_id: "home-1" }];
const homes = [{ id: "home-1", name: "Hope House", address: "1 Care Street", status: "active" }];
const staff = [{ id: "staff-1", full_name: "Admin User", role: "admin", status: "active", home_ids: ["home-1"] }];
const appUser = { id: "user-1", role: "admin", email: "admin@example.com" };
const staffProfile = { id: "staff-1", full_name: "Admin User", role: "admin", org_id: "default_org" };



function getFieldContainer(labelMatcher) {
  const label = screen.getByText(labelMatcher, { selector: "label" });
  return label.closest("div");
}

async function typeInto(labelMatcher, value, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input, textarea");
  await user.clear(input);
  await user.type(input, value);
}

async function selectOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  const select = container.querySelector("select");
  await user.selectOptions(select, optionText);
}

async function selectDate(labelMatcher, dateValue, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input[type='date']");
  await user.clear(input);
  await user.type(input, dateValue);
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <PlacementPlanTab
        residents={residents}
        homes={homes}
        user={appUser}
        staff={staff}
        myStaffProfile={staffProfile}
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
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
  if (!HTMLElement.prototype.hasPointerCapture) HTMLElement.prototype.hasPointerCapture = () => false;
  if (!HTMLElement.prototype.setPointerCapture) HTMLElement.prototype.setPointerCapture = () => {};
  if (!HTMLElement.prototype.releasePointerCapture) HTMLElement.prototype.releasePointerCapture = () => {};
});

describe("Create new placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    secureGatewayFilterMock.mockImplementation(async (entity) => {
      switch (entity) {
        case "PlacementPlan":
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

    secureGatewayCreateMock.mockResolvedValue({ id: "pp-1" });
    secureGatewayUpdateMock.mockResolvedValue({ id: "pp-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it(
    "shows validation errors and does not create when required fields are missing",
    async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });
      renderTab();

      // wait for tab loading
      await waitFor(() => {
        expect(screen.queryByText(/Loading\.\.\./i)).not.toBeInTheDocument();
      });

      // open modal
      await user.click(await screen.findByRole("button", { name: /Create Plan/i }));
      await screen.findByRole("heading", { name: /Create Placement Plan/i });

    const modalHeading = await screen.findByRole("heading", { name: /Create Placement Plan/i });
const modalRoot = modalHeading.closest(".bg-card"); // modal card container class in your DOM
await user.click(within(modalRoot).getByRole("button", { name: /^Create Plan$/i }));

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalled();
      });

      const firstErrorMessage = toastErrorMock.mock.calls[0]?.[0] || "";
      expect(firstErrorMessage).toMatch(/required/i);

      expect(secureGatewayCreateMock).not.toHaveBeenCalled();
      expect(toastSuccessMock).not.toHaveBeenCalled();
    },
    60000
  );
  it("Creates a placement when required fields are filled", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  renderTab();

  await waitFor(() => {
    expect(screen.queryByText(/Loading\.\.\./i)).not.toBeInTheDocument();
  });

  // Open modal first
  await user.click(await screen.findByRole("button", { name: /Create Plan/i }));
  await screen.findByRole("heading", { name: /Create Placement Plan/i });

  // Fill fields inside modal
  await selectOption(/Young Person/i, "Alex Taylor", user);
  await typeInto(/Reason for Placement/i, "test reason", user);
  await selectDate(/Effective Date/i, "2026-06-01", user);
  await selectDate(/Review Date/i, "2026-08-12", user);

  // Click modal Create Plan button (disambiguate)
  const modalHeading = screen.getByRole("heading", { name: /Create Placement Plan/i });
  const modalRoot = modalHeading.closest(".bg-card");
  await user.click(within(modalRoot).getByRole("button", { name: /^Create Plan$/i }));

  await waitFor(() => {
    expect(secureGatewayCreateMock).toHaveBeenCalledTimes(1);
  });

  // IMPORTANT: payload is second argument
  const payload = secureGatewayCreateMock.mock.calls[0][1];
  expect(payload).toMatchObject({
    resident_id: "resident-1",
    resident_name: "Alex Taylor",
    home_id: "home-1",
    home_name: "Hope House",
    reason_for_placement: "test reason",
    effective_date: "2026-06-01",
    review_date: "2026-08-12",
  });
});
});