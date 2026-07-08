import { describe, it, expect, beforeEach,beforeAll, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Residents from "@/pages/Residents";

const {
  secureGatewayFilterMock,
  secureGatewayCreateMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  secureGatewayFilterMock: vi.fn(),
  secureGatewayCreateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/secureGateway", () => ({
  secureGateway: {
    filter: secureGatewayFilterMock,
    create: secureGatewayCreateMock,
  },
}));

vi.mock("@/lib/createNotification", () => ({
  createNotification: vi.fn().mockResolvedValue(undefined),
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

vi.mock("@/lib/MobileContext", () => ({
  useMobile: () => ({ isMobile: false }),
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

vi.mock("@/components/residents/yp/YPCardView", () => ({
  default: function MockYPCardView({ residents }) {
    return (
      <div data-testid="yp-card-view">
        {residents.map((resident) => (
          <div key={resident.id}>{resident.display_name}</div>
        ))}
      </div>
    );
  },
}));

let residentsStore = [];

const homes = [
  {
    id: "home-1",
    name: "Hope House",
    address: "1 Care Street",
    status: "active",
  },
];

const staff = [
  {
    id: "tl-1",
    full_name: "Taylor Lead",
    role: "team_leader",
    status: "active",
    user_id: "user-tl-1",
    home_ids: ["home-1"],
    primary_home_id: "home-1",
  },
  {
    id: "kw-1",
    full_name: "Kelly Worker",
    role: "support_worker",
    status: "active",
    user_id: "user-kw-1",
    home_ids: ["home-1"],
    primary_home_id: "home-1",
  },
];

function TestLayout() {
  return (
    <Outlet
      context={{
        user: { id: "user-1", role: "admin", email: "admin@example.com" },
        staffProfile: {
          id: "staff-1",
          org_id: "default_org",
          role: "admin",
          full_name: "Admin User",
        },
      }}
    />
  );
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  window.history.pushState({}, "", "/residents?tab=yp");

  render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<TestLayout />}>
            <Route path="/residents" element={<Residents />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function field(labelMatcher) {
  return screen.getByText(labelMatcher).parentElement;
}

async function typeInto(labelMatcher, value, user) {
  const input = field(labelMatcher).querySelector("input, textarea");
  await user.clear(input);
  await user.type(input, value);
}

async function selectOption(labelMatcher, optionText, user) {
  const trigger =
    within(field(labelMatcher)).queryByRole("combobox") ||
    within(field(labelMatcher)).queryByRole("button");

  await user.click(trigger);

  const option =
    (await screen.findByRole("option", { name: optionText }).catch(() => null)) ||
    (await screen.findByRole("button", { name: optionText }).catch(() => null));

  await user.click(option);
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
describe("RES-01 - Admit resident UI test", () => {
  beforeEach(() => {
    residentsStore = [];

    secureGatewayFilterMock.mockImplementation(async (entity) => {
      switch (entity) {
        case "Resident":
          return [...residentsStore];
        case "Home":
          return homes;
        case "StaffProfile":
          return staff;
        default:
          return [];
      }
    });

    secureGatewayCreateMock.mockImplementation(async (entity, payload) => {
      if (entity === "Resident") {
        const createdResident = {
          id: "resident-1",
          status: "active",
          ...payload,
        };
        residentsStore.push(createdResident);
        return createdResident;
      }

      if (entity === "AdmissionDischargeNotice") {
        return { id: "notice-1", ...payload };
      }

      return { id: "record-1", ...payload };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("creates a resident from the UI, shows success, and displays the resident in the correct service stream", async () => {
    const user = userEvent.setup();

    renderPage();

    // Step 1: open Add Resident form
    await user.click(await screen.findByRole("button", { name: /Add New Resident/i }));
    await screen.findByRole("heading", { name: /Add New Young Person/i });

    // Step 2: fill required fields
    await typeInto(/Display Name/, "Alex Taylor", user);
    await typeInto(/Initials/, "AT", user);
    await typeInto(/Date of Birth/, "2008-04-15", user);

    await selectOption(/Gender/, "Male", user);
    await selectOption(/Residence \/ Home/, "Hope House", user);
    await selectOption(/Team Leader/, "Taylor Lead", user);
    await selectOption(/Key Worker/, "Kelly Worker", user);
    await selectOption(/Service Type/, "18+ Accommodation", user);
    await selectOption(/Placement Type/, "Supported Accommodation", user);

    await typeInto(/Placement Start/, "2026-06-29", user);

    await selectOption(/Accommodation Category/, "Self-contained accommodation", user);
    await selectOption(/Looked-after child\?/, "Yes", user);
    await selectOption(/Care leaver\?/, "Yes", user);
    await typeInto(/Legal placement basis/, "Section 20", user);
    await typeInto(/Placing Local Authority/, "Birmingham City Council", user);
    await selectOption(/UASC\?/, "No", user);
    await selectOption(/English first language\?/, "Yes", user);
    await selectOption(/Interpreter required\?/, "No", user);
    await typeInto(/Nationality \/ Country of Origin/, "British", user);
    await typeInto(/Local Authority \(LA\)/, "Birmingham City Council", user);
    await typeInto(/Social Worker Name/, "Jordan Smith", user);

    // Step 3: save
    await user.click(screen.getByRole("button", { name: /Add Resident/i }));

    // Step 4: verify success toast
    await waitFor(() => {
      expect(toastSuccessMock).toHaveBeenCalledWith("Young person added successfully!");
    });

    // Step 5: verify resident creation payload
    const residentCreateCall = secureGatewayCreateMock.mock.calls.find(
      ([entity]) => entity === "Resident"
    );

    expect(residentCreateCall).toBeTruthy();
    expect(residentCreateCall[1]).toMatchObject({
      display_name: "Alex Taylor",
      dob: "2008-04-15",
      home_id: "home-1",
      service_type: "eighteen_plus",
      placement_type: "supported_accommodation",
      placement_start: "2026-06-29",
    });

    // Step 6: switch to correct service stream
    await user.click(screen.getByRole("button", { name: /18\+ Accommodation/i }));

    // Step 7: verify resident appears in correct stream
    await waitFor(() => {
      expect(screen.getByTestId("yp-card-view")).toHaveTextContent("Alex Taylor");
    });

    // expect(
    //   screen.getByText(/Showing\s+1\s+of\s+1\s+18\+\s+Accommodation residents/i)
    // ).toBeInTheDocument();

    expect(toastErrorMock).not.toHaveBeenCalled();
  },60000);
});