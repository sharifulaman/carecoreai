import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ComplaintForm from "@/components/residents/complaints/ComplaintForm";

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

const residents = [{ id: "resident-1", display_name: "Alex Taylor", home_id: "home-1" }];
const homes = [{ id: "home-1", name: "Hope House", address: "1 Care Street", status: "active" }];
const staff = [{ id: "staff-1", full_name: "Admin User", role: "admin", status: "active", home_ids: ["home-1"] }];
const appUser = { id: "user-1", role: "admin", email: "admin@example.com" };

function getFieldContainer(labelMatcher) {
  // Pass an options object to search specifically for a <label> tag element
  const label = screen.getByText(labelMatcher, { selector: "label" });
  return label.closest("div");
}

async function typeInto(labelMatcher, value, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input, textarea");
  await user.clear(input);
  await user.type(input, value);
}

async function selectRadixOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  const trigger = within(container).queryByRole("combobox") || within(container).queryByRole("button");
  await user.click(trigger);

  const option = await screen.findByRole("option", { name: optionText }).catch(() => null);
  if (!option) throw new Error(`Option not found: ${optionText}`);
  await user.click(option);
}
async function selectFeedbackType(typeText, user) {
  // typeText = "Complaint" or "Compliment"
  const button = await screen.findByRole("button", { name: new RegExp(typeText, "i") });
  await user.click(button);
}
import { fireEvent } from "@testing-library/react";

async function selectDateAndTime(labelMatcher, dateValue, timeValue, user) {
  let container;
  try {
    container = getFieldContainer(labelMatcher);
  } catch {
    container = document.body;
  }

  // 1. Try native separate date/time inputs
  const dateInput = container.querySelector("input[type='date']");
  const timeInput = container.querySelector("input[type='time']");

  if (dateInput || timeInput) {
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: dateValue } });
    }
    if (timeInput) {
      fireEvent.change(timeInput, { target: { value: timeValue } });
    }
    return;
  }

  // 2. Try a single datetime-local input
  const datetimeLocalInput = container.querySelector("input[type='datetime-local']");
  if (datetimeLocalInput) {
    // Combine date and time, ensuring time has HH:MM format
    const timeFormatted = timeValue.length === 5 ? timeValue : `${timeValue}:00`; // safety
    const fullValue = `${dateValue}T${timeFormatted}`;
    fireEvent.change(datetimeLocalInput, { target: { value: fullValue } });
    return;
  }

  // 3. Otherwise throw with debug info
  screen.debug();
  throw new Error(`Could not find date, time, or datetime-local input for: ${labelMatcher}`);
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  const onSave = vi.fn();

  return { render: render(
    <QueryClientProvider client={queryClient}>
      <ComplaintForm
        residents={residents}
        homes={homes}
        staff={staff}
        user={appUser}
        onClose={onClose}
        onSave={onSave}
      />
    </QueryClientProvider>
  ), onSave };
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

describe("Add new complaint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    secureGatewayFilterMock.mockImplementation(async (entity) => {
      switch (entity) {
        case "Complaints":
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

 it("Enables Next button only after selecting a feedback type", async () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const { onSave } = renderTab();

  await screen.findByRole("heading", { name: /Young Person Complaint & Compliment Form/i });

  // Step 1: Verify Next button is DISABLED initially on Step 1
  const nextBtn = screen.getByRole("button", { name: /^Next$/i });
  expect(nextBtn).toBeDisabled();
  expect(secureGatewayCreateMock).not.toHaveBeenCalled();

  // Step 2: Choose "Complaint" to fulfill Step 1 requirements
  await selectFeedbackType("Complaint", user);

  // Step 3: Verify button is now ENABLED on Step 1
  await waitFor(() => expect(nextBtn).not.toBeDisabled());
  expect(secureGatewayCreateMock).not.toHaveBeenCalled();

  // --- PROGRESS TO THE NEXT STEP ---
 
  await user.click(nextBtn);

 
  await selectRadixOption(/^Young Person\s*\*?$/i, "Alex Taylor", user);
  await selectDateAndTime(/Date & Time Allegation Raised/i, "2026-08-01", "12:00", user);

  // Verify the Next button remains active or checks out on this step
  await waitFor(() => expect(nextBtn).not.toBeDisabled());
  expect(secureGatewayCreateMock).not.toHaveBeenCalled();
});
});