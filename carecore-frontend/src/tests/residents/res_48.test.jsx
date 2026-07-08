import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NEETRecordTab from "../../components/residents/neet/NEETRecordTab";

const {
  secureGatewayFilterMock,
  secureGatewayCreateMock,
  secureGatewayUpdateMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  secureGatewayFilterMock: vi.fn(),
  secureGatewayCreateMock: vi.fn(),
  secureGatewayUpdateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/secureGateway", () => ({
  secureGateway: {
    filter: secureGatewayFilterMock,
    create: secureGatewayCreateMock,
    update: secureGatewayUpdateMock,
  },
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

function getFieldContainer(labelMatcher) {
  const labels = screen.getAllByText(labelMatcher, { selector: "label" });
  const label = labels[0]; // Takes the first match (Review Date with asterisk)
  return label.closest("div");
}

async function typeInto(labelMatcher, value, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input, textarea");
  await user.clear(input);
  await user.type(input, value);
}

async function selectRadixOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  const trigger = within(container).queryByRole("combobox") || within(container).queryByRole("button");
  await user.click(trigger);

  const option = await screen.findByRole("option", { name: optionText }).catch(() => null);
  if (!option) throw new Error(`Option not found: ${optionText}`);
  await user.click(option);
}

async function selectDate(labelMatcher, dateValue, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input[type='date']");
  await user.clear(input);
  await user.type(input, dateValue);
}
async function selectOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  const select = container.querySelector("select");
  await user.selectOptions(select, optionText);
}

async function selectNativeOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  const select = container.querySelector("select");
  await user.selectOptions(select, optionText);
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  

  return { render: render(
    <QueryClientProvider client={queryClient}>
     <NEETRecordTab
        residents={residents}
        homes={homes}
        staff={staff}
        isAdminOrTL={true}
     />
    </QueryClientProvider>
  ) };
}

beforeAll(() => {
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
});

describe("Add new NEET record", () => {
     beforeEach(() => {
        vi.clearAllMocks();
        secureGatewayFilterMock.mockImplementation(async (entity) => {
          switch (entity) {
            case "Records":
              return [];
            case "Resident":
              return residents;
            case "Home":
              return homes;
            case "StaffProfile":
              return staff;
            default:
              return [];
          }
        });
        secureGatewayCreateMock.mockResolvedValue({ id: "pp-1" });
        secureGatewayUpdateMock.mockResolvedValue({ id: "pp-1" });
      });
       afterEach(() => {
        vi.clearAllMocks();
  });
  it("Shows validation error when required fields are missing", async() => {
    const user = userEvent.setup({pointerEventsCheck: 0});
    renderTab();
    // open modal
    await user.click(await screen.findByRole("button", {name: /Add Record/i}))
    await screen.findByRole("heading", {name: /Add NEET Record/i})
    // await user.click(within(modalRoot).getByRole("button", { name: /^Save$/i }));
    await user.click(screen.getByRole("button", { name: /^Save$/i }));

      await waitFor(() => {
        expect(toastErrorMock).toHaveBeenCalled();
          const firstErrorMessage = toastErrorMock.mock.calls[0]?.[0] || "";
      expect(firstErrorMessage).toMatch(/required/i);

      expect(secureGatewayCreateMock).not.toHaveBeenCalled();
      expect(toastSuccessMock).not.toHaveBeenCalled();
      });
  }, 60000)
 it("Form submits after filling required fields", async () => {
  const user = userEvent.setup();
  renderTab();

  // Open modal
  await user.click(await screen.findByRole("button", { name: /Add Record/i }));
  await screen.findByRole("heading", { name: /Add NEET Record/i });

  // Fill fields
  await selectDate(/Date NEET Started/i, "2026-06-30", user);
  await typeInto(/Reason Currently NEET/i, "Job search, health, transport", user);
  await typeInto(/Action Plan/i, "Details steps to address NEET status", user);
  // Use native select helper – pick the staff member that actually exists in the mock
  await selectNativeOption(/Responsible Staff/i, "Admin User", user);
  await selectDate(/Review Date/i, "2026-06-30", user);
  

  await user.click(screen.getByRole("button", { name: /Save/i }));

  await waitFor(() => {
    expect(secureGatewayCreateMock).toHaveBeenCalledTimes(1);
    const payload = secureGatewayCreateMock.mock.calls[0][1];
    expect(payload).toMatchObject({
      date_neet_started: "2026-06-30",
      reason_currently_neet: "Job search, health, transport",
      action_plan: "Details steps to address NEET status",
      responsible_staff_id: "staff-1",  // matches the mock
      review_date: "2026-06-30",
    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Record created");
  
  });
});
})
