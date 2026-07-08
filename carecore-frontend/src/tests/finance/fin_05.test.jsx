import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import PlacementsTab from "@/components/finance/tabs/PlacementsTab";

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

const user = {
  id: "user-1",
  role: "admin",
  email: "admin@example.com",
};
const isAdmin = true;
const isTeamLeader = true;
const isSW = false;
const isFinanceLine = true;
const isFinanceManager = true;
const isFinanceOfficer = true;
const homes = [
  {
    id: "home-1",
    name: "Hope House",
    address: "1 Care Street",
    status: "active",
  },
];
const residents = [
  {
    id: "resident-1",
    display_name: "Alex Taylor",
    home_id: "home-1",
    status: "active",
  },
];
const placements = [
  {
    id: "1",
    resident_id: "resident-1",
    name: "placement 1",
  },
];
const invoices = [
  {
    id: "1",
    name: "Invoice 1",
  },
];
const bills = [
  {
    id: "1",
    name: "bill 1",
  },
];
const expenses = [
  {
    id: "1",
    name: "expense 1",
  },
];

const visibleHomes = [
  {
    id: "home-1",
    name: "Hope House",
  },
];

const visibleHomeIds = new Set(visibleHomes.map(h => h.id));

const visiblePlacements = [
  {
    id: "1",
    name: "test",
  },
];
const visibleInvoices = [
  {
    id: "1",
    name: "test",
  },
];
const staffProfile = {
  id: "staff-1",
  full_name: "Admin User",
  role: "admin",
  org_id: "default_org",
};
const thisMonth = true;
const sharedData = {
  user,
  isAdmin,
  isTeamLeader,
  isSW,
  isFinanceLine,
  isFinanceManager,
  isFinanceOfficer,
  homes,
  residents,
  placements,
  invoices,
  bills,
  expenses,
  visibleHomes,
  visibleHomeIds,
  visiblePlacements,
  visibleInvoices,
  staffProfile,
  thisMonth,
};

function getFieldContainer(labelMatcher) {
  let element;
  let elements;
  try {
    elements = screen.getAllByText(labelMatcher, { selector: "label" });
    element = elements[0];
  } catch {
    try {
      elements = screen.getAllByText(labelMatcher, { selector: "p" });
      element = elements[0];
    } catch {
      // Fallback: find any element containing the text
      elements = screen.getAllByText(labelMatcher);
      element = elements[0];
    }
  }
  if (!element) {
    throw new Error(`Could not find element with text: ${labelMatcher}`);
  }
  return element.closest("div");
}

async function selectRadixOption(labelMatcher, optionText, userEventInstance) {
  const container = getFieldContainer(labelMatcher);
  const trigger =
    within(container).queryByRole("combobox") ||
    within(container).queryByRole("button") ||
    container.querySelector('[role="combobox"]');
  
  if (!trigger) {
    throw new Error(`Could not find trigger for ${labelMatcher}`);
  }
  
  await userEventInstance.click(trigger);

  // Wait for options to appear
  let option;
  try {
    option = await screen.findByRole("option", { name: optionText });
  } catch {
    // Fallback: find by text content
    const allOptions = await screen.findAllByRole("option");
    option = allOptions.find(el => el.textContent?.trim() === optionText);
    if (!option) {
      throw new Error(`Could not find option with text: ${optionText}`);
    }
  }
  
  await userEventInstance.click(option);
}

async function fillDateInput(labelMatcher, dateValue, userEventInstance) {
  const container = getFieldContainer(labelMatcher);
  if (!container) {
    throw new Error(`Container not found for: ${labelMatcher}`);
  }
  const inputs = container.querySelectorAll("input[type='date']");
  if (inputs.length === 0) {
    throw new Error(`No date inputs found for ${labelMatcher}`);
  }
  const input = inputs[0];
  await userEventInstance.clear(input);
  await userEventInstance.type(input, dateValue);
}

async function typeNumber(labelMatcher, numberValue, userEventInstance) {
  const container = getFieldContainer(labelMatcher);
  if (!container) {
    throw new Error(`Container not found for: ${labelMatcher}`);
  }
  const inputs = container.querySelectorAll("input[type='number']");
  if (inputs.length === 0) {
    throw new Error(`No number inputs found for ${labelMatcher}`);
  }
  const input = inputs[0];
  await userEventInstance.clear(input);
  await userEventInstance.type(input, numberValue);
}

async function selectLocalAuthority(laName, userEventInstance) {
  const container = getFieldContainer(/Local Authority/i);
  const input = container.querySelector('input');
  
  if (!input) {
    throw new Error('Local Authority input not found');
  }
  
  await userEventInstance.click(input);
  await userEventInstance.clear(input);
  await userEventInstance.type(input, laName);
  
  // Wait for dropdown and click the option
  await waitFor(async () => {
    const option = await screen.findByText(laName, { selector: 'button' });
    await userEventInstance.click(option);
  });
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PlacementsTab {...sharedData} />
      </MemoryRouter>
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

describe("Add new placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    secureGatewayFilterMock.mockImplementation(async (entity) => {
      switch (entity) {
        case "PlacementFee":
          return [];
        case "Resident":
          return residents;
        case "Home":
          return homes;
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

  it("Opens the form after clicking", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(await screen.findByRole("button", { name: /Add Placement Fee/i }));
    await screen.findByRole("heading", { name: /Add Placement Fee/i });

    await user.click(screen.getByRole("button", { name: /Save Placement Fee/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Please fill in all required fields");
    });

    expect(secureGatewayCreateMock).not.toHaveBeenCalled();
    expect(toastSuccessMock).not.toHaveBeenCalled();
  }, 60000);

  it("The form should be submitted after filling up all required fields", async () => {
    const user = userEvent.setup();
    renderTab();

    // Open form
    await user.click(await screen.findByRole("button", { name: /Add Placement Fee/i }));
    await screen.findByRole("heading", { name: /Add Placement Fee/i });
    
    // Fill up all required fields
    // 1. Home (required)
    await selectRadixOption(/Home/i, "Hope House", user);
    
    // 2. Resident (required) - UNCOMMENTED THIS
    await selectRadixOption(/Resident/i, "Alex Taylor", user);
    
    // 3. Local Authority (required)
    await selectLocalAuthority("Croydon", user);
    
    // 4. Placement Start Date (not strictly required but good to fill)
    await fillDateInput(/Placement Start Date/i, "2026-07-04", user);
    
    // 5. Weekly Rate (required)
    await typeNumber("Weekly Rate (£) *", "500", user);
    
    // Submit the form
    await user.click(screen.getByRole("button", { name: /Save Placement Fee/i }));
    
    // Wait for the create to be called
    await waitFor(() => {
      expect(secureGatewayCreateMock).toHaveBeenCalledTimes(1);
    }, { timeout: 5000 });
    
    // Verify the payload
    const payload = secureGatewayCreateMock.mock.calls[0][1];
    expect(payload).toMatchObject({
      home_id: "home-1",
      resident_id: "resident-1",
      local_authority: "Croydon",
      placement_start_date: "2026-07-04",
      weekly_rate: 500,
    });
    
    expect(toastSuccessMock).toHaveBeenCalledWith("Placement fee saved");
    expect(toastErrorMock).not.toHaveBeenCalled();
  }, 60000);
});