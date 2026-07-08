import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import StaffForm from "@/components/staff/StaffForm";


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

const homes = [{ id: "home-1", name: "Hope House", address: "1 Care Street", status: "active" }];
const teamLeaders = [{ id: "tl-1", full_name: "Taylor Lead", home_ids: ["home-1"] }];

function getFieldContainer(labelMatcher) {
  const label = screen.getByText(labelMatcher, { selector: "label" });
  return label.closest("div");
}

async function typeInto(labelMatcher, value, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input, textarea");
  await user.clear(input);
  await user.type(input, value);
}

async function selectOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  // Target the Radix trigger button explicitly
  const trigger = container.querySelector("button[data-state], [role='combobox']");
  if (!trigger) throw new Error(`Could not find select trigger for ${labelMatcher}`);
  
  await user.click(trigger);

  // Radix UI Select components render items inside a separate portal at the body level
  const option = await screen.findByRole("option", { name: optionText });
  await user.click(option);
}



async function selectDate(labelMatcher, dateValue, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input[type='date']");
  if (!input) throw new Error(`Could not find date input for ${labelMatcher}`);
  
  // Directly fire the change event to reliably update HTML5 date pickers in JSDOM
  fireEvent.change(input, { target: { value: dateValue } });
}

function renderTab(onSubmitMock) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <StaffForm
        homes={homes}
        teamLeaders={teamLeaders}
        onSubmit={onSubmitMock}
        onClose={vi.fn()}
        saving={false}
      />
    </QueryClientProvider>
  );
}

beforeAll(() => {
  // Suppress specific Radix UI act warnings caused by microtask/macrotask layout shifts
  const originalError = console.error;
  console.error = (...args) => {
    if (/Warning: An update to.*inside a test was not wrapped in act/.test(args[0])) {
      return;
    }
    originalError.call(console, ...args);
  };

  // Keep your existing mocks below:
  if (typeof window !== "undefined" && window.Element && !window.Element.prototype.scrollIntoView) {
    window.Element.prototype.scrollIntoView = vi.fn();
  }
  if (typeof window !== "undefined" && window.Element && !window.Element.prototype.hasPointerCapture) {
    window.Element.prototype.hasPointerCapture = () => false;
    window.Element.prototype.setPointerCapture = () => {};
    window.Element.prototype.releasePointerCapture = () => {};
  }
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false, media: "", onchange: null,
      addListener: () => {}, removeListener: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
});
describe("Create new staff (StaffForm unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Shows validation error when required fields are missing", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onSubmitMock = vi.fn();
    renderTab(onSubmitMock);

    await screen.findByRole("heading", { name: /Add Staff Member/i });
    await user.click(screen.getByRole("button", { name: /Add Staff Member/i }));

    expect(onSubmitMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Please fix the errors before saving");
  });

  it("Creates new staff when required fields are filled", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onSubmitMock = vi.fn();
    renderTab(onSubmitMock);

    await screen.findByRole("heading", { name: /Add Staff Member/i });

    await typeInto(/Full Name/i, "John Doe", user);
    await typeInto(/^Email/i, "john@sl.com", user);
    await selectOption(/^\s*Role\s*\*?\s*$/i, "Super Admin", user);
    await typeInto(/^\s*Phone\s*\*?\s*$/i, "07700900000", user);
    await selectOption(/^\s*Employment Type\s*\*?\s*$/i, "Bank", user);
    await selectDate(/^\s*Start Date\s*\*?\s*$/i, "2026-06-20", user);

    await user.click(screen.getByRole("button", { name: /Add Staff Member/i }));

    await waitFor(() => expect(onSubmitMock).toHaveBeenCalledTimes(1));

    const payload = onSubmitMock.mock.calls[0][0];
    expect(payload).toMatchObject({
      full_name: "John Doe",
      email: "john@sl.com",
      phone: "07700900000",
      employment_type: "bank",
    });

    expect(toastErrorMock).not.toHaveBeenCalled();
  },60000);
});