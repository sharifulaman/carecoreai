import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MissingReportForm from "@/components/residents/missing/MissingReportForm.jsx";
import {getHome, getHomeWithName} from "@/tests/getHome";
// REAL API client – no mock
import { base44 } from "@/api/base44Client";
import { getToken } from "@/tests/getToken";
import {getResident} from "@/tests/getResident";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

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

const residents = [{ id: "resident-1", display_name: "Alex Taylor", home_id: "home-1" }];
const homes = [{ id: "home-1", name: "Hope House", address: "1 Care Street", status: "active" }];
const staff = [{ id: "staff-1", full_name: "Admin User", role: "admin", status: "active", home_ids: ["home-1"] }];
const appUser = { id: "user-1", role: "admin", email: "admin@example.com" };
const staffProfile = { id: "staff-1", full_name: "Admin User", role: "admin", org_id: "default_org" };

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

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  const onSave = vi.fn();

  return { 
    render: render(
      <QueryClientProvider client={queryClient}>
        <MissingReportForm
          resident={residents[0]}
          residents={residents}
          homes={homes}
          staff={staff}
          user={appUser}
          staffProfile={staffProfile}
          onClose={onClose}
          onSave={onSave}
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

describe("Missing Report Testing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Validates required fields before allowing navigation to next step", async() => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderTab();

    await screen.findByRole("heading", { name: /Report Missing From Home/i });

    // Step 1: Try to click Next without filling required fields
    const nextButton = screen.getByRole("button", { name: /^Next$/i });
    await user.click(nextButton);

    // Should show validation errors for required fields
    await waitFor(() => {
      const errorMessages = screen.queryAllByText(/Required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });

//     // Fill up the required fields for step 1
    // await selectRadixOption(/Young Person/i, "Alex Taylor", user);
      const residentInput = screen.getByDisplayValue("Alex Taylor");
  expect(residentInput).toBeInTheDocument();
    await selectDateAndTime(/Last Seen Date & Time/i, "2026-07-04", "11:10", user);
    await selectRadixOption(/Risk Level at Time of Going Missing/i, "High", user);
    await typeInto(/Last Known Location/i, "Park", user);
    await typeInto(/Last Seen By/i, "John Cena", user);

//     // Clear any existing errors
//     const errorElements = screen.queryAllByText(/Required/i);
//     errorElements.forEach(el => {
//       if (el.closest('.text-red-500')) {
//         // Errors should disappear after filling fields
//       }
//     });

//     // Click Next - should navigate to step 2
    await user.click(nextButton);
    
//     // Verify we're on step 2
    await screen.findByText(/UK guidance requires police notification/i);
    const step2NextButton = screen.getByRole("button", { name: /^Next$/i });
    
//     // Step 2: Try to proceed without answering police notification
    await user.click(step2NextButton);
    
//     // Should show validation error for reported_to_police
    await waitFor(() => {
      const policeError = screen.getByText(/Required — please select Yes or No/i);
      expect(policeError).toBeInTheDocument();
    });

//     // Fill required fields for step 2
    const yesButton = screen.getByRole("button", { name: /^Yes$/i });
    await user.click(yesButton);

//     // Police report fields appear, fill them
    await selectDateAndTime(/Police Report Date & Time/i, "2026-07-04", "12:00", user);
    await typeInto(/Police Reference Number/i, "OP/2026/123456", user);

//     // Click Next - should navigate to step 3
    await user.click(step2NextButton);
    
//     // Verify we're on step 3
    await screen.findByText(/Is there a known CSE risk/i);
    const step3NextButton = screen.getByRole("button", { name: /^Next$/i });
    
//     // Step 3 has no required fields, so we can proceed
    await user.click(step3NextButton);
    
//     // Verify we're on step 4
    await screen.findByText(/Local Authority notified of missing episode/i);
    const step4NextButton = screen.getByRole("button", { name: /^Next$/i });
    
//     // Step 4: Try to proceed without filling required fields
//     await user.click(step4NextButton);
    
//     // Should show validation error for la_notified
//     await waitFor(() => {
//       const laError = screen.getByText(/Required — please select Yes or No/i);
//       expect(laError).toBeInTheDocument();
//     });

//     // Fill LA notified
    const laNoButton = screen.getByRole("button", { name: /^No$/i });
    await user.click(laNoButton);

//     // Select "No — returned" to show return fields
    const returnedNoButton = screen.getByRole("button", { name: /^No — still missing$/i });
    await user.click(returnedNoButton);

//     // Fill returned fields
    // await selectDateAndTime(/Date & Time Returned/i, "2026-07-04", "15:30", user);
    // await selectRadixOption(/Condition on Return/i, "Well", user);
    
//     // Fill RHI offered (required for returned)
//     const rhiYesButton = screen.getByRole("button", { name: /^Yes$/i });
//     await user.click(rhiYesButton);

//     // Now should be able to proceed
    await user.click(step4NextButton);
    
//     // Verify we're on step 5
    await screen.findByText(/Outcome \/ Learning/i);
    //     // Verify Submit button is visible
    const submitButton = screen.getByRole("button", { name: /Submit Report/i });
    expect(submitButton).toBeInTheDocument();

    // Time to post to database baybe!!!
    const homeID = await getHome();
const homeName = await getHomeWithName();
// Get resident
const residents = await getResident();
const resident = residents[0];

const payload ={
  org_id:"org-1",
  resident_id:resident.id,
  resident_name:resident.display_name,
  home_id:homeID,
  home_name:homeName,
  child_initials:"test",
  accommodation_category:"test",
  expected_location:"Park",
  reported_by_id:staffProfile.id,
  reported_by_name:staffProfile.full_name,

  missing_start_datetime:"2026-07-04T11:10:00.000Z",
  missing_end_datetime:"2026-07-04T11:10:00.000Z",
  returned_location:"Park",
  returned_datetime:"2026-07-05T15:30:00.000Z",
  condition_on_return:"Well",
  reported_missing_datetime: new Date().toISOString(),
  reported_to_police:true,
  police_report_datetime:"2026-07-04T12:00:00.000Z",
  police_reference_number:"OP/2026/123",
  police_station:"Dhaka",
  known_associates_checked:true,
  cse_risk_considered:true,
  areas_searched:["1","2"],
  risk_level_at_time:"high",
   last_seen_location:"Park",
   last_seen_datetime:"2026-07-04T11:10:00.000Z",
   last_seen_by:"John Doe",
   reported_to_police:true,
   la_notified:true,
   people_contacted:["1","2"],
   


};
//  const submitButton = screen.getByRole("button", { name: /Submit Report/i });
//   expect(submitButton).toBeInTheDocument();

  // NOW SUBMIT THE FORM THROUGH THE UI - NOT DIRECT API CALL
  await user.click(submitButton);

  // Wait for the submission to complete and check the toast
  await waitFor(() => {
    expect(toastSuccessMock).toHaveBeenCalledWith("Missing person report logged — pending manager review");
// const response = await base44.entities.MissingFromHome.create(payload);
// expect(toastSuccessMock).toHaveBeenCalledWith("Missing person report logged — pending manager review");
// // expect(toastErrorMock).not.toHaveBeenCalled();

  });
    

  })});
