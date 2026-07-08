import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AccidentsTab from "@/components/homes/tabs/AccidentsTab";

// Mock API client
const { filterMock, createMock, updateMock } = vi.hoisted(() => ({
  filterMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      AccidentReport: {
        filter: filterMock,
        create: createMock,
        update: updateMock,
      },
    },
  },
}));

// Mock toast
const { toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

// Mock role config
vi.mock("@/lib/roleConfig", () => ({
  ORG_ID: "default_org",
}));

// Mock permissions
vi.mock("@/lib/PermissionContext", () => ({
  useModuleActions: vi.fn(() => ({ canAdd: true, canEdit: true })),
}));

// Mock workflow trigger hook
vi.mock("@/hooks/useWorkflowTrigger", () => ({
  useWorkflowTrigger: vi.fn(() => ({
    triggerWorkflow: vi.fn(),
  })),
}));

// Mock notification creation
vi.mock("@/lib/createNotification", () => ({
  createNotification: vi.fn(),
}));

const residents = [
  {
    id: "resident-1",
    display_name: "Alex Taylor",
    home_id: "home-1",
  },
];
const homeName = "test home name";
const homeID = "home-1";
const user = { email: "admin@example.com", role: "admin", full_name: "Admin User" };
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

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AccidentsTab
        homeId={homeID}
        homeName={homeName}
        user={user}
        residents={residents}
        staff={staff}
      />
    </QueryClientProvider>
  );
}



async function typeInto(labelText, value, user) {
  const input = getFieldContainer(labelText).querySelector("input, textarea");
  await user.clear(input);
  await user.type(input, value);
}

function getFieldContainer(labelMatcher) {
  // Try to find label first, then fallback to p tag
  let element;
  let elements;
  try {
    elements = screen.getAllByText(labelMatcher, { selector: "label" });
    element = elements[0];
  } catch {
    elements = screen.getAllByText(labelMatcher, { selector: "p" });
    element = elements[0];
  }
  return element.closest("div");
}
function getFieldH3(labelMatcher){
  const element = screen.getByText(labelMatcher,{selector:"h3"});
  return element.closest("div");
}

// Updated helper for selecting from Radix select with better error handling
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

  const option = await screen.findByRole("option", { name: optionText })
    .catch(() => screen.findByText(optionText));
  
  await userEventInstance.click(option);
}


async function fillDateRange(labelMatcher, startDate, endDate, userEventInstance) {
  const container = getFieldContainer(labelMatcher);
  if (!container) {
    throw new Error(`Container not found for: ${labelMatcher}`);
  }
  const inputs = container.querySelectorAll("input[type='date']");
  if (inputs.length < 2) {
    throw new Error(`Expected 2 date inputs, found ${inputs.length}`);
  }
  
  // First input is start date
  const startInput = inputs[0];
  await userEventInstance.clear(startInput);
  await userEventInstance.type(startInput, startDate);
  
  // Second input is end date
  const endInput = inputs[1];
  await userEventInstance.clear(endInput);
  await userEventInstance.type(endInput, endDate);
}

// Helper to fill just the start date (for backward compatibility)
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

async function selectOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  const select = container.querySelector("select");
  await user.selectOptions(select, optionText);
}

beforeAll(() => {
  // Polyfills for testing environment
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

describe("AccidentsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    filterMock.mockResolvedValue([]);
    createMock.mockResolvedValue({ id: "acc-1" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Go to step 2 only if required fields are filled", async () => {
    const user = userEvent.setup();
    renderTab();

    // Open the form modal
    await user.click(screen.getByRole("button", { name: /Add Accident\/Illness/i }));

    // Verify we are on step 1 (Basic Information)
    expect(screen.getByText("Basic Info")).toBeInTheDocument();

    // Try to proceed without filling required fields
    const saveButtons = screen.getAllByRole("button", { name: /Save & Continue/i });
    await user.click(saveButtons[0]);

    // Expect error toast and stay on step 1
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith(
        "Please fill in all required fields before continuing"
      );
    });
    // Step 1 should still be active
    expect(screen.getByText("Basic Info")).toBeInTheDocument();

    // Now fill required fields: type, title, start_date
    // Select type "Accident" - using the p tag label
    await selectRadixOption(/Accident\/Illness Type/i, "Accident", user);

    // Fill title
    const titleInput = screen.getByPlaceholderText("Enter Title");
    await user.type(titleInput, "Test Accident");

    await fillDateRange(/Start & End Time/i, "2026-07-01", "2026-09-01", user);

    // Now click Save & Continue again
    const saveButtonsAgain = screen.getAllByRole("button", { name: /Save & Continue/i });
    await user.click(saveButtonsAgain[0]);

    // Expect to move to step 2
    await waitFor( () => {
      // expect(screen.getByText("People Involved")).toBeInTheDocument();
      expect( getFieldH3(/People Involved/i)).toBeInTheDocument();
    });

    // How to move to step 3
    // Fill staff involved
    await selectRadixOption(/Staff Involved/i, "Alex Manager", user);
    // Fill young person
   await selectRadixOption(/Young Person/i, "Alex Taylor", user);

    
    // Click save and continue again
    await user.click(saveButtonsAgain[0]);
    // Move to step 3
    await waitFor(() => {
      expect(getFieldH3(/Accident Details/i)).toBeInTheDocument();
    })

    // Moving from Step 3 to 4
    await typeInto(/Location/i, "Test location", user);
    await typeInto(/Description/i, "Test description...", user)
    // Click save and continue again for the third time
    await user.click(saveButtonsAgain[0]);
    // Move to step 4
    await waitFor(() => {
      expect(getFieldH3(/Signoffs & Alerts/i)).toBeInTheDocument();
    })

    // Finally submit the button
    await user.click(screen.getByRole("button", {name: /Submit Report/i}));
    
    const payload = createMock.mock.calls[0][0];  
    expect(payload).toMatchObject({
      title:"Test Accident",
      // start_date:"2026-07-01",
      date:"2026-07-01",
      // end_date:"2026-09-01",
      staff_involved:"Alex Manager",
      // yp_involved:"Alex Taylor",
      resident_name:"Alex Taylor",
      location:"Test location",
      description:"Test description..."
    })
    // expect(toastSuccessMock).toHaveBeenCalledWith("Submitted for approval");
    expect(createMock).toHaveBeenCalledTimes(1);
    // Ensure only one error toast was shown
    expect(toastErrorMock).toHaveBeenCalledTimes(1);
    // expect(toastErrorMock).not.toHaveBeenCalled();
  });
});