import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FamilyContactForm from "@/components/residents/family/FamilyContactForm.jsx";
import {getHome, getHomeWithName} from "@/tests/getHome";
// REAL API client – no mock
import { base44 } from "@/api/base44Client";
import { getToken } from "@/tests/getToken";
import {getResident} from "@/tests/getResident";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
let resident;
let residents;

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
const staffProfile = { id: "staff-1", full_name: "Admin User", role: "admin", org_id: "default_org" };
const appUser = { id: "user-1", role: "admin", email: "admin@example.com" };

async function typeInto(labelMatcher, value, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input, textarea");
  if (!input) {
    // Try finding by label directly
    const label = screen.getByText(labelMatcher, { selector: "label" });
    const parentDiv = label.closest("div");
    const foundInput = parentDiv?.querySelector("input, textarea");
    if (foundInput) {
      await user.clear(foundInput);
      await user.type(foundInput, value);
      return;
    }
    throw new Error(`Could not find input for: ${labelMatcher}`);
  }
  await user.clear(input);
  await user.type(input, value);
}

function getFieldContainer(labelMatcher) {
  try {
    const label = screen.getByText(labelMatcher, { selector: "label" });
    return label.closest("div");
  } catch {
    // Try finding any element containing the text
    const element = screen.getByText(labelMatcher);
    return element.closest("div");
  }
}

async function selectRadixOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  const trigger = within(container).queryByRole("combobox") || within(container).queryByRole("button");
  if (!trigger) {
    // Try finding by text
    const elements = screen.getAllByText(labelMatcher);
    for (const el of elements) {
      const parent = el.closest("div");
      const foundTrigger = parent?.querySelector("[role='combobox'], [role='button']");
      if (foundTrigger) {
        await user.click(foundTrigger);
        break;
      }
    }
  } else {
    await user.click(trigger);
  }

  const option = await screen.findByRole("option", { name: optionText }).catch(() => null);
  if (!option) {
    // Try finding by text
    const optionElement = screen.getByText(optionText);
    await user.click(optionElement);
    return;
  }
  await user.click(option);
}

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
    const timeFormatted = timeValue.length === 5 ? timeValue : `${timeValue}:00`;
    const fullValue = `${dateValue}T${timeFormatted}`;
    fireEvent.change(datetimeLocalInput, { target: { value: fullValue } });
    return;
  }

  // 3. Try finding by label
  const label = screen.getByText(labelMatcher, { selector: "label" });
  const parentDiv = label.closest("div");
  const input = parentDiv?.querySelector("input");
  if (input) {
    const timeFormatted = timeValue.length === 5 ? timeValue : `${timeValue}:00`;
    const fullValue = `${dateValue}T${timeFormatted}`;
    fireEvent.change(input, { target: { value: fullValue } });
    return;
  }

  throw new Error(`Could not find date, time, or datetime-local input for: ${labelMatcher}`);
}

async function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  const onSave = vi.fn();
  residents = await getResident();
  resident = residents[0];
  resident = residents.find((r) => r.display_name === "Synyster Gates");
  console.log("Resident: ", resident)
  return { 
    render: render(
      <QueryClientProvider client={queryClient}>
        <FamilyContactForm 
	resident={resident}
 	residents={residents}
 	staff={staffProfile} user={appUser}
 	onClose={() => vi.fn()}
	onSave={() => vi.fn()}
/>
      </QueryClientProvider>
    ), 
    onSave,
    onClose 
  };
}

beforeAll(async () => {
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
  // Set the real authentication token before any API calls
  const token = await getToken({ email, password });
  base44.setToken(token);
});

describe("Log a family contact", () => {
     beforeEach(() => {
    vi.clearAllMocks();
  });
   afterEach(() => {
    vi.clearAllMocks();
  });
  it("Validates required fields before allowing on the next step", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderTab();
    await screen.findByRole("heading", { name: /Log Family Contact/i });
    
    // Step 1: Try to click the "next" button without filling required fields
    let nextButton = screen.getByRole("button", { name: /^Next$/i });
    await user.click(nextButton);
    
    // Should show validation errors for required fields
    await waitFor(() => {
        const errorMessages = screen.queryAllByText(/Required/i);
        expect(errorMessages.length).toBeGreaterThan(0);
    });
    
    // Step 1: Fill in the required fields
    await selectRadixOption(/Young Person/i, resident.display_name, user);
    await selectDateAndTime(/Contact Date & Time /i, "2026-07-04", "17:30", user);
    await typeInto(/Contact Person Name/i, "Jane Smith", user);
    
    // Get fresh reference to next button and click to go to Step 2
    nextButton = screen.getByRole("button", { name: /^Next$/i });
    await user.click(nextButton);
    
    // Verify we're on Step 2
    await screen.findByText(/Contact Method/i);
    
    // // Fill in Step 2 required fields
    // await selectRadixOption(/Relationship/i, "Mother", user);
    
    // // Get fresh reference and click to go to Step 3
    nextButton = screen.getByRole("button", { name: /^Next$/i });
    await user.click(nextButton);
    
    // // Verify we're on Step 3 - NOW the checkbox should be visible
    const supervisedCheckbox = await screen.findByText(/Was this contact supervised?/i);
    expect(supervisedCheckbox).toBeInTheDocument();
    // Go to step 4
    nextButton = screen.getByRole("button", {name: /^Next$/i});
    await user.click(nextButton);
    // In step 4, some certain texts should be visible
    await screen.findByText(/Mood Before Contact/i);
    await screen.findByText(/Mood After Contact/i);

    // Move to step 5
    nextButton = screen.getByRole("button", {name: /^Next$/i});
    await user.click(nextButton);
    // In step 5, some texts should be visible
    await screen.findByText(/Any concerns arising from this contact?/i);
    // Finally submit the button
    const submitButton = screen.getByRole("button", {name: /Log Contact/i});
    expect(submitButton).toBeInTheDocument();
    await user.click(submitButton);
    await waitFor(() => {
        expect(toastSuccessMock).toHaveBeenCalledWith("Contact logged successfully");
    })
    
});
})