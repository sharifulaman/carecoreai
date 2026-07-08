import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BenefitsInputTab from "@/components/eighteen-plus/BenefitsTab/BenefitsInputTab.jsx";

// Custom functions
import { getResident } from "@/tests/getResident";
import { getToken } from "@/tests/getToken";
import { base44 } from "@/api/base44Client";

const email = import.meta.env.VITE_EMAIL;
const password = import.meta.env.VITE_PASSWORD;
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

// function field(labelText) {
//   return screen.getByText(labelText).parentElement;
// }
function field(labelText) {
  // getAllByText returns an array of all matching elements
  const elements = screen.getAllByText(labelText);
  
  if (elements.length === 0) {
    throw new Error(`Unable to find an element with the text: ${labelText}`);
  }

  // Return the parent of the very first match
  return elements[0].parentElement;
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
    <BenefitsInputTab
        residents={residents}
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

describe("Add Benefit button check", () => {
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

  it("Click the button from the UI and check the correct form header", async () => {
    const user = userEvent.setup();
    await renderTab();

    const addButton = await screen.findByRole("button", {
        name:/Add Benefit/i
    });
    await user.click(addButton);
    // Checking the form header
    const header = await screen.findByText(/Add Benefit for/i);
    expect(header).toBeInTheDocument();
  })
  it("Test without submitting the required fields", async()=> {
     const user = userEvent.setup();
    await renderTab();

    const addButton = await screen.findByRole("button", {
        name:/Add Benefit/i
    });
    await user.click(addButton);
    // Submit button
    const submitButton = await screen.findByRole("button", {
        name:/Add Benefit/i
    })
    await user.click(submitButton);
    const errorMessage = await screen.findByText(/Validation Error/i);
    expect(errorMessage).toBeInTheDocument();
  })
 it("Submit the form after filling up all the required fields", async () => {
  const user = userEvent.setup();
  await renderTab();

  // 1. Safety Check: Verify that your mocked residents array actually has data
  // If this throws, your `getResident()` helper utility is returning empty data.
  expect(residents && residents.length).toBeGreaterThan(0);
  expect(residents[0].id).toBeTruthy(); 

  const addButton = await screen.findByRole("button", {
    name: /Add Benefit/i,
  });
  await user.click(addButton);

  // 2. Explicitly change the resident option using the top selector
  // This updates 'selectedResidentId' from "" to a valid UUID string
  const residentSelector = screen.getAllByRole("combobox")[0]; // or target by its layout context
  const firstResidentName = residents[0].display_name || residents[0].initials;
  await user.selectOptions(residentSelector, firstResidentName);

  // 3. Fill out the specific option fields within the nested benefit form container
  // Note: Your dropdown options use snake_case keys as values!
  // "universal_credit" corresponds to the UI string "Universal Credit"
  await selectOption(/Benefit Type/i, "universal_credit", user);
  await selectOption(/Status/i, "active", user);
  await selectDate(/Start Date/i, "2026-07-08", user);

  // 4. Submit form execution
  const submitButton = await screen.findByRole("button", {
    name: /Add Benefit/i,
  });
  await user.click(submitButton);

  
});
})