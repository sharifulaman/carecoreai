import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CouncilTaxExemptionTab from "@/components/residents/finance/CouncilTaxExemptionTab.jsx";

// Custom functions
import { base44 } from "@/api/base44Client";
import { getResident } from "@/tests/getResident";
import { getToken } from "@/tests/getToken";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;

const staffProfile = {
  id: "staff-1",
  full_name: "Admin User",
  role: "admin",
  org_id: "default_org"
};

const appUser = {
  id: "user-1",
  role: "admin",
  email: "admin@example.com",
};

const homes = [
  {
    id: "home-1",
    name: "Hope House",
    address: "1 Care Street",
    status: "active",
  },
];

let residents;

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

function field(labelText) {
  return screen.getByText(labelText).parentElement;
}

async function selectOption(labelText, optionText, user) {
  const select = field(labelText).querySelector("select");
  await user.selectOptions(select, optionText);
}
async function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  residents = await getResident();

  return render(
    <QueryClientProvider client={queryClient}>
      <CouncilTaxExemptionTab
        residents={residents}
        homes={homes}
        staff={staffProfile}
        user={appUser}
        isAdminOrTL={true}
      />
    </QueryClientProvider>
  );
}

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

  const token = await getToken({
    email: email,
    password: password,
  });
  base44.setToken(token);
});

describe("Council Tax Exemption test cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.sessionStorage = {
      _data: {},
      getItem(key) { return this._data[key] || null; },
      setItem(key, value) { this._data[key] = value; },
      removeItem(key) { delete this._data[key]; },
      clear() { this._data = {}; },
    };
  });

  it("Check if the form opens after clicking the Add Exemption button", async () => {
    const user = userEvent.setup();
    await renderTab();

    // First, find and click the "Add Exemption" button to show the form
    const addButton = await screen.findByText(/Add Exemption/i);
    await user.click(addButton);

    // Now the header should appear
    const header = await screen.findByText(/New Council Tax Exemption/i);
    expect(header).toBeInTheDocument();
  });


  it("Shows the form with header and other certain texts when Add Exemption is clicked", async () => {
    const user = userEvent.setup();
    await renderTab();

    // Click Add Exemption
    const addButton = await screen.findByText(/Add Exemption/i);
    await user.click(addButton);

    // Check if the form appears with the header
    const header = await screen.findByText(/New Council Tax Exemption/i);
    expect(header).toBeInTheDocument();

    // Check if form fields appear
    const exemptionTypeLabel = screen.getByText(/Exemption Type \*/i);
    expect(exemptionTypeLabel).toBeInTheDocument();

    const startDateLabel = screen.getByText(/Start Date \*/i);
    expect(startDateLabel).toBeInTheDocument();

    const endDateLabel = screen.getByText(/End Date \*/i);
    expect(endDateLabel).toBeInTheDocument();

    const councilNameLabel = screen.getByText(/Council Name \*/i);
    expect(councilNameLabel).toBeInTheDocument();

    // Check if Create button appears
    const createButton = screen.getByRole('button', { name: /Create Exemption/i });
    expect(createButton).toBeInTheDocument();

    // Check if Cancel button appears
    const cancelButton = screen.getByRole('button', { name: /Cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  it("Validate required fields when submitting empty form", async () => {
    const user = userEvent.setup();
    await renderTab();

    // Click Add Exemption to show the form
    const addButton = await screen.findByText(/Add Exemption/i);
    await user.click(addButton);

    // Try to submit without filling required fields
    const createButton = await screen.findByRole('button', { name: /Create Exemption/i });
    await user.click(createButton);

    // Should show validation errors
    await waitFor(() => {
      const errorMessages = screen.getAllByText(/is required/i);
      expect(errorMessages.length).toBeGreaterThan(0);
    });
  });

  it("Submit the form after fullfilling all required fields", async () => {
    const user = userEvent.setup();
    await renderTab();

    // Click Add Exemption to show the form
    const addButton = await screen.findByText(/Add Exemption/i);
    await user.click(addButton);

    // Fill up the required fields
    await selectOption(/Exemption Type/i, "Care Leaver", user);
    await selectDate(/Start Date/i, "2026-07-07", user);
    await selectDate(/End Date/i, "2026-07-31", user);
    await selectDate(/Renewal Date/i, "2026-08-12", user);
    await typeInto(/Council Name/i, "Test Council", user);

    // Submit the form
    const createButton = await screen.findByText(/Create Exemption/i);
    await user.click(createButton);
    // Check if the form is submitted
    // await waitFor(() => {

    // })
  })
});