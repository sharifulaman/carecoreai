import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// REAL API client – no mock
import { base44 } from "@/api/base44Client";
import { getToken } from "@/tests/getToken";
import {getResident} from "@/tests/getResident";
import ExploitationRiskForm from "@/components/residents/risk/ExploitationRiskForm.jsx"

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
let resident;
const staffProfile = { id: "1fcfbbfc-842e-443e-953c-9ba7010c0933", full_name: "Admin User", role: "admin", org_id: "default_org" };

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

async function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const onClose = vi.fn();
  const onSave = vi.fn();
  const residents = await getResident();
//   resident = residents[3];
resident = residents.find(r => r.display_name === "Zacky vengence")
//   console.log("Resident: ", resident);

  return { 
    render: render(
      <QueryClientProvider client={queryClient}>
      
      <ExploitationRiskForm
        resident={resident}
        existing={false}
        staffProfile={staffProfile}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        readOnly={false}
      
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

describe("Testing exploitation risk form", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => {
        vi.clearAllMocks();
    })

    it("Saves the form successfully from he UI", async() => {
        const user = userEvent.setup({pointerEventsCheck:0});
        await renderTab();
       await screen.findByText(new RegExp(`Exploitation Risk — ${resident.display_name}`, "i"));        
        // Fill in the required fields
        await typeInto(/CSE NOTES/i, "Describe concerns, notes or indicators", user);
        const saveButton = screen.getByRole("button", {name: /Save assessment/i});
        expect(saveButton).toBeInTheDocument();
        await user.click(saveButton);
        await waitFor(() => {
            expect(toastSuccessMock).toHaveBeenCalledWith("Exploitation risk assessment saved");
        })
    })
})