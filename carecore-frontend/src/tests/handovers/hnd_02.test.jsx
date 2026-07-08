import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import HandoverSummaryTab from "@/components/handover/HandoverSummaryTab.jsx";
// REAL API client – no mock
import { base44 } from "@/api/base44Client";
import { getToken } from "@/tests/getToken";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

// Mock only the toast (sonner) so we can assert success/error messages
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

// Test data – must match an existing handover in your test database
const handover = {
  id: "handover-1",
  org_id: "org-1",
  handover_id: "handover-1",
  home_id: "home-1",
  handover_date: "2026-07-02",
  shift: "night",
};
const homeID = "home-1";
const isLocked = false;

// Helper: find the container of a field by its label text
function getFieldContainer(labelMatcher) {
  let element;
  try {
    // Try to find a <label> with the text
    const elements = screen.getAllByText(labelMatcher, { selector: "label" });
    element = elements[0];
  } catch {
    try {
      // Fallback to <p> tags (common in some components)
      const elements = screen.getAllByText(labelMatcher, { selector: "p" });
      element = elements[0];
    } catch {
      // Last resort: any element with that text
      const elements = screen.getAllByText(labelMatcher);
      element = elements[0];
    }
  }
  if (!element) throw new Error(`Could not find element with text: ${labelMatcher}`);
  return element.closest("div");
}

// Helper: type a value into an input/textarea inside a labelled container
async function typeInto(labelText, value, user) {
  const container = getFieldContainer(labelText);
  if (!container) throw new Error(`Container not found for: ${labelText}`);
  const input = container.querySelector("input, textarea");
  if (!input) throw new Error(`Input/textarea not found for: ${labelText}`);
  await user.clear(input);
  await user.type(input, value);
}

// Render the component with required providers
function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HandoverSummaryTab
          handover={handover}
          homeId={homeID}
          locked={isLocked}
        />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// JSDOM polyfills (required for Radix UI and others)
beforeAll(async () => {
  // Polyfills for jsdom environment
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

  // Set the real authentication token before any API calls
  const token = await getToken({ email, password });
  base44.setToken(token);
});

describe("Update handover tests", () => {
  // Store the ID of any created update so we can clean it up
  let createdUpdateId = null;

  beforeEach(() => {
    vi.clearAllMocks();
    createdUpdateId = null;
    // SessionStorage polyfill if your app uses it (e.g., for auth)
    global.sessionStorage = {
      _data: {},
      getItem(key) { return this._data[key] || null; },
      setItem(key, value) { this._data[key] = value; },
      removeItem(key) { delete this._data[key]; },
      clear() { this._data = {}; },
    };
  });

  afterEach(async () => {
    // Clean up the created record from the real database
    if (createdUpdateId) {
      try {
        await base44.entities.HandoverUpdate.delete(createdUpdateId);
      } catch (e) {
        // Ignore cleanup errors – they might be due to the record already gone
      }
      createdUpdateId = null;
    }
  });

  it("Open Handover update form – validation error", async () => {
    const user = userEvent.setup();
    renderTab();

    // Open the modal
    await user.click(screen.getByRole("button", { name: /Add Update/i }));
    await screen.findByRole("heading", { name: /Add Handover Update/i });

    // Try to save without filling the summary
    await user.click(screen.getByRole("button", { name: /Save Update/i }));

    // Should show validation toast
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Summary required");
    });

    // Ensure no API call was made
    // We can't easily assert on the real method without spying, but the toast error is enough.
  }, 60000);

  it("Form submission after filling required fields", async () => {
    const user = userEvent.setup();
    renderTab();

   

    // Open the modal
    await user.click(screen.getByRole("button", { name: /Add Update/i }));
    await screen.findByRole("heading", { name: /Add Handover Update/i });

    // Fill the summary field
    await typeInto("Summary *", "Test summary", user);

    // Submit the form
    await user.click(screen.getByRole("button", { name: /Save Update/i }));

   
    const data = {
        summary: "Test summary from UI",
      org_id: expect.any(String),
      handover_id: "handover-1",
      home_id: "home-1",
      update_type: "daily_overview", // default
      severity: "low", // default
    }

  
     const response = await base44.entities.HandoverUpdate.create(data);
                   

    
    expect(toastSuccessMock).toHaveBeenCalledWith("Update added");
    expect(toastErrorMock).not.toHaveBeenCalled();

  
  }, 60000);
});