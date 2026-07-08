import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import YPVoiceFormModal from "@/components/compliance-quality/yp-voice/YPVoiceFormModal";
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

// FIXED: Templates with all required fields
const templates = [
    {
        id: "template-1",
        name: "Voice Feedback",           // Required for display
        category: "voice_feedback",       // Required for mapping
        status: "active",                 // Required to show in list
        description: "Collect feedback from young people",
        frequency: "Monthly",
        active_version_number: "1.0"
    }
];
const homes = [
    {
        id: "home-1",
        name: "Hope House"
    }
];
const staff = {
    id: "staff-1",
    first_name: "John"
};
const staffProfile = {
    id: "staff-p-1",
    full_name: "John Doe"
};
const editRecord = false;
const residents = [
  {
    id: "resident-1",
    display_name: "Alex Taylor",
    home_id: "home-1",
    status: "active",
  },
];

// Helper functions
function getFieldContainer(labelMatcher) {
  let element;
  let elements;
  try {
    elements = screen.getAllByText(labelMatcher, { selector: "label" });
    element = elements[0];
  } catch {
    try {
      elements = screen.getAllByText(labelMatcher, { selector: "p" });
      element = elements[0];
    } catch {
      // Fallback: find any element containing the text
      elements = screen.getAllByText(labelMatcher);
      element = elements[0];
    }
  }
  if (!element) {
    throw new Error(`Could not find element with text: ${labelMatcher}`);
  }
  return element.closest("div");
}

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

  // Wait for options to appear
  let option;
  try {
    option = await screen.findByRole("option", { name: optionText });
  } catch {
    // Fallback: find by text content
    const allOptions = await screen.findAllByRole("option");
    option = allOptions.find(el => el.textContent?.trim() === optionText);
    if (!option) {
      throw new Error(`Could not find option with text: ${optionText}`);
    }
  }
  
  await userEventInstance.click(option);
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <YPVoiceFormModal
            templates={templates}
            defaultCategory={"template_manager"}
            residents={residents}
            homes={homes}
            staff={staff}
            staffProfile={staffProfile}
            editRecord={false}
            onClose={() => {}}
            onSaved={() => {}}
        />
      </MemoryRouter>
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
  // Set the real authentication token before any API calls
  const token = await getToken({ email, password });
  base44.setToken(token);
});

describe("YPVoiceModal", () => {
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

  it("Matches the header and tests submission without filling required fields", async() => {
    const user = userEvent.setup();
    renderTab();
    
    // Match the header
    await screen.findByRole("heading", {name: /New Submission/i});
    
    // Step 1: Select a template - click on the template card
    // Find the template by its name (which is now "Voice Feedback")
    const templateCard = screen.getByText(/Voice Feedback/i).closest('button');
    await user.click(templateCard);
    
    // Now we're in Step 2, the Submit button should be visible
    // Click the Submit button without filling any required fields
    await user.click(screen.getByRole("button", {name: /Submit/i}));
    
    // Should show validation errors
    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith("Please select a young person");
    });
  }, 60000);
  it("Submitting the button after filling up required fields", async() => {
    const user = userEvent.setup();
    renderTab();
    
    // Match the header
    await screen.findByRole("heading", {name: /New Submission/i});
    
    // Step 1: Select a template - click on the template card
    // Find the template by its name (which is now "Voice Feedback")
    const templateCard = screen.getByText(/Voice Feedback/i).closest('button');
    await user.click(templateCard);
    
    // Now we're in Step 2, the Submit button should be visible
    // Fill up the required field
    await selectRadixOption(/Young Person/i, "Alex Taylor", user);
    // Click the Submit button without filling any required fields
    await user.click(screen.getByRole("button", {name: /Submit/i}));
// payload
// Get home ID and name
const homeID = await getHome();
const homeName = await getHomeWithName();
// Get resident
const residents = await getResident();
const resident = residents[0];

const payload = {
    org_id:"org-1",
    template_id:"template-11111",
    template_name:templates[0].name,
    template_category:templates[0].category,
    template_version:templates[0].active_version_number,
    resident_id:resident.id,
    resident_name:resident.display_name,
    home_id:homeID,
    home_name:homeName,
    submitted_by_id:staffProfile.id,
    submitted_by_name:staffProfile.full_name,
    submitted_at: new Date().toISOString(),
    last_updated_by_id:staffProfile.id,
    last_updated_by_name:staffProfile.full_name,
};

    const response = await base44.entities.YPFeedbackSubmission.create(payload);
    expect(toastSuccessMock).toHaveBeenCalledWith("Submitted successfully");
    expect(toastErrorMock).not.toHaveBeenCalled();
    
    
  }, 60000);
});