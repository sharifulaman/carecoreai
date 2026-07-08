import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from  "@tanstack/react-query";
import PAVisitLogModal from "@/components/eighteen-plus/PATab/PAVisitLogModal";
import { getToken } from "@/tests/getToken";
import { base44 } from "@/api/base44Client";
import { getResident } from "@/tests/getResident";

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

// Mock scrollTo for all elements
function mockScrollTo() {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = vi.fn();
  }
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

async function selectDate(labelMatcher, dateValue, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input[type='date']");
  await user.clear(input);
  await user.type(input, dateValue);
}

async function selectVisitType(user, visitTypeLabel){
    const visitTypeButtons = await screen.findAllByRole('button');
    const targetButton = visitTypeButtons.find(
        button => button.textContent?.toLowerCase().includes(visitTypeLabel.toLowerCase())
    );
    if(targetButton){
        await user.click(targetButton)
    } else {
        const button = screen.getByText(visitTypeLabel);
        await user.click(button);
    }
}

async function checkCheckbox(user, labelText){
    const label = screen.getByText(labelText);
      const checkbox = label.querySelector('input[type="checkbox"]') || 
                   label.closest('label')?.querySelector('input[type="checkbox"]');
    if(checkbox && !checkbox.checked) {
        await user.click(checkbox);
    }

}

async function checkTopicCheckbox(user, topicLabel) {
  const label = screen.getByText(topicLabel);
  const checkbox = label.closest('label')?.querySelector('input[type="checkbox"]');
  if (checkbox && !checkbox.checked) {
    await user.click(checkbox);
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
  residents = await getResident();
  resident = residents[0];
  
  // Mock scrollTo on the modal element
  mockScrollTo();
  
  return { 
    render: render(
      <QueryClientProvider client={queryClient}>
        <PAVisitLogModal
          resident={resident}
          residents={residents}
          paDetails={[]}
          pathwayPlans={[]}
          existingVisit={null}
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
  // Polyfills for browser APIs
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
  
  // Mock scrollTo before any tests run
  mockScrollTo();
  
  // Set the real authentication token before any API calls
  const token = await getToken({ email, password });
  base44.setToken(token);
});

describe("Log PA Visit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure scrollTo is mocked for each test
    mockScrollTo();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Ensure we're on the desired form", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await renderTab();
    const header = await screen.findByText(/Log PA Visit/i);
    expect(header).toBeInTheDocument();
  });
  
  it("Submit the form without filling up the required fields", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onSave } = await renderTab();
    
    // Find and click the submit button
    const submitButton = await screen.findByRole("button", {
      name: /Log Visit/i
    });
    await user.click(submitButton);
    
    // Wait for validation error message to appear
    const errorMessage = await screen.findByText(/Validation Error/i);
    expect(errorMessage).toBeInTheDocument();
    
    // Verify that onSave was NOT called
    expect(onSave).not.toHaveBeenCalled();
    
  });

  it("Submit the button after filling up the required fields", async() => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const { onSave } = await renderTab();
    // Fill up the required fields
    await selectRadixOption(/Resident/i, resident.display_name, user);
    await selectDate("Visit Date *", "2026-07-15", user);
    await selectDate("Next Visit Date", "2026-07-31", user);
    await selectVisitType(user, 'In Person');
    await checkCheckbox(user, 'Young person present?');
    await checkTopicCheckbox(user, 'Pathway Plan Review');
    await checkTopicCheckbox(user, 'Identity & Culture');
    await typeInto(/Additional Notes/i, "Some additional notes", user);
    await typeInto(/Duration \(minutes\)/i, "60", user);
    await typeInto(/Young Person's Views & Wishes/i, "The young person expressed their wishes clearly.", user);
    await typeInto(/Actions Agreed/i, "Follow up meeting scheduled for next month.", user);
    // Submit button
    const submitButton = await screen.findByRole("button", {
        name:/Log Visit/i
    });
    await user.click(submitButton);

    // Wait for validation errors to clear
    await waitFor(() => {
      const errorMessages = screen.queryByText(/Validation Error/i);
      expect(errorMessages).not.toBeInTheDocument();
    });

    // Verify onSave was called
    expect(onSave).toHaveBeenCalled();
  }, 60000)
});