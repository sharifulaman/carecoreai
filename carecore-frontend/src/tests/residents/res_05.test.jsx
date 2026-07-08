import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PlacementPlanForm from "@/components/residents/care-planning/PlacementPlanForm.jsx";
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
const staff = [
  {
    id: "staff-1",
    full_name: "Admin User",
    role: "admin",
    status: "active",
    home_ids: ["home-1"],
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

const plan = {
    breakdown_risk_notes
: 
"asdf",
child_agrees
: 
true,
child_comments
: 
"asdf",
child_consulted
: 
true,
contingency_plan
: 
"asdf",
created_by
: 
"admin@test.com",
created_by_id
: 
"e0604656-1495-456e-89c0-d19518e58fa8",
created_by_name
: 
"admin",
created_date
: 
"2026-06-29T18:00:52.116238+06:00",
effective_date
: 
"2026-06-29",
emergency_placement
: 
true,
goals
: 
[],
home_id
: 
"95b0b9a1-3a6d-47a4-9d33-d86ec6ec8760",
home_name
: 
"Business Test Home",
id
: 
"b0a873d7-c904-4429-bbab-51cba813db38",
iro_contact
: 
"asdf",
iro_name
: 
"asdf",
la_agreed
: 
true,
la_area
: 
"asdf",
number_of_placements_12_months
: 
22,
org_id
: 
"default_org",
parent_comments
: 
"adsf",
parent_consulted
: 
true,
placement_type
: 
"Temporary residential",
planned_duration
: 
"2 years",
planned_end_date
: 
"",
reason_for_placement
: 
"Hemmeroid",
resident_id
: 
"9777a720-1be5-451f-a836-ca870f9b9d73",
resident_name
: 
"Conor Mcgregor",
review_date
: 
"2027-06-30",
risk_of_breakdown
: 
true,
social_worker_contact
: 
"sadf",
social_worker_name
: 
"asd",
status
: 
"active",
updated_at
: 
"2026-07-05T04:43:31.237Z",
updated_date
: 
"2026-07-05T10:43:31.239779+06:00",
version
: 
1,
};
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
async function selectDate(labelMatcher, dateValue, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input[type='date']");
  await user.clear(input);
  await user.type(input, dateValue);
}


async function renderTab({ plan = null } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  
  const onClose = vi.fn();
  const onSave = vi.fn();
  residents = await getResident();
  resident = residents.find((r) => r.display_name === "Synyster Gates")
  console.log("Resident: ", resident)
//   plan.resident_name = resident.display_name;
  plan={...plan, resident_name:resident.display_name, resident_id:resident.id}
  
  return { 
    render: render(
      <QueryClientProvider client={queryClient}>
         <PlacementPlanForm
          plan={plan}
          resident={resident}
          residents={residents}
          homes={homes}
          staff={staff}
          myStaffProfile={staffProfile}
          // 2. Pass your actual mock references so you can assert on them if needed
          onClose={onClose}
          onSave={onSave}
        />
      </QueryClientProvider>
    ), 
    onSave,
    onClose 
  };
}
const 

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

describe("Edit placement plan", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    it("Ensure we're on the desired form",async() => {
        const user = userEvent.setup({pointerEventsCheck: 0});
        renderTab({plan});
        await screen.findByRole("heading", {name: /Edit Placement Plan/i}); 
       
    })
    it("Submit the form without filling up the required fields", async() => {
        const user = userEvent.setup({pointerEventsCheck: 0});
        renderTab();
        await screen.findByRole("heading", {name: /Create Placement Plan/i}); 
        // await typeInto(/Reason for Placement/i, "Hemmeroid", user);
        const saveButton = screen.getByRole("button", {name:/Create Plan/i});
        await user.click(saveButton);
        await waitFor(() => {
            expect(toastErrorMock).toHaveBeenCalledWith("Young Person, reason for placement, effective date, and review date are required")
        })

    })
     it("Submit the form without filling up the required fields", async() => {
        const user = userEvent.setup({pointerEventsCheck: 0});
        renderTab();
        await screen.findByRole("heading", {name: /Create Placement Plan/i}); 
        // await typeInto(/Reason for Placement/i, "Hemmeroid", user);
        const saveButton = screen.getByRole("button", {name:/Create Plan/i});
        await user.click(saveButton);
        await waitFor(() => {
            expect(toastErrorMock).toHaveBeenCalledWith("Young Person, reason for placement, effective date, and review date are required")
        })

    })
    it("Edit the form", async() => {
         const user = userEvent.setup({pointerEventsCheck: 0});
        renderTab({plan});
        await screen.findByRole("heading", {name: /Edit Placement Plan/i}); 
        await typeInto(/Reason for Placement/i, "Free of piles", user);
        await selectDate(/Effective Date/i, "2026-07-05", user);
        await selectDate(/Review Date/i, "2026-07-10", user);
        await typeInto(/Placement Type/i, "Part time", user);
         const saveButton = screen.getByRole("button", {name:/Save Changes/i});
        await user.click(saveButton);
        await waitFor(() => {
            expect(toastSuccessMock).toHaveBeenCalledWith("Plan updated")
        })
    })
})