import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AchievementForm from "@/components/residents/achievements/AchievementForm";

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

const residents = [
  {
    id: "resident-1",
    display_name: "Alex Taylor",
    home_id: "home-1",
  },
];
const staffProfile = {
  id: "staff-1",
  full_name: "Admin User",
  role: "admin",
  org_id: "default_org",
};
const staff = [
  {
    id: "staff-1",
    full_name: "Admin User",
    role: "admin",
    status: "active",
    home_ids: ["home-1"],
  },
];
const appUser = {
  id: "user-1",
  role: "admin",
  email: "admin@example.com",
};

const categories = [
    "Achievement",
    "Awards"
];

async function selectRadixOption(labelMatcher, optionText, user) {
  const container = getFieldContainer(labelMatcher);
  const trigger = within(container).queryByRole("combobox") || within(container).queryByRole("button");
  await user.click(trigger);

  const option = await screen.findByRole("option", { name: optionText }).catch(() => null);
  if (!option) throw new Error(`Option not found: ${optionText}`);
  await user.click(option);
}

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
  const select = container.querySelector("select");
  await user.selectOptions(select, optionText);
}

async function selectDate(labelMatcher, dateValue, user) {
  const container = getFieldContainer(labelMatcher);
  const input = container.querySelector("input[type='date']");
  await user.clear(input);
  await user.type(input, dateValue);
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const onClose = vi.fn();
  const onSave = vi.fn();
  return render(
    <QueryClientProvider client={queryClient}>
      <AchievementForm
        resident={residents[0]}
        residents={residents}
        staff={staff}
        user={appUser}
        onClose={onClose}
        onSave={onSave}
      />
    </QueryClientProvider>
  );
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
});

describe("AchievementForm", () => {
     beforeEach(() => {
        vi.clearAllMocks();
    
        // AppointmentsTab data load
        secureGatewayFilterMock.mockImplementation(async (entity) => {
          switch (entity) {
            case "Achievement":
              return [];
            case "Resident":
              return residents;
           
            case "StaffProfile":
              return staff;
            case "Category":
                return categories;
            default:
              return [];
          }
        });
    
        secureGatewayCreateMock.mockResolvedValue({ id: "apt-1" });
        secureGatewayUpdateMock.mockResolvedValue({ id: "apt-1" });
      });
      afterEach(() => {
    vi.clearAllMocks();
  });
  it("Achievement should return error if any of the required fields are empty", async () => {
    const user = userEvent.setup({poinerEventsCheck: 0});
    renderTab();
    // Check the header name
    await screen.findByRole("heading", {name: /✨ Record Achievement/i});
    // Save without required fields
    await user.click(screen.getByRole("button",{name: /Record Achievement/i})
)
// Should show error on toast
await waitFor(() => {
    expect(toastErrorMock).toHaveBeenCalledWith("Please fill in all required fields")
});
// expect(secureGatewayCreateMock).not.toHaveBeenCalled();
// expect()

  })
  it("Checking data posting when all of the required fields are filled", async() => {
    const user = userEvent.setup();
    renderTab();
    // Select a young person
    // await selectOption(/Young Person/i, "Alex Taylor", user);
    await selectRadixOption(/Young Person/i, "Alex Taylor", user);
    await selectDate(/Achievement Date/i, "2026-07-01", user);
    // await selectOption(/Category/i, "Achievement", user);
    await selectRadixOption(/Category/i, "personal growth", user);
    await typeInto("Title (one line) *", "Test title", user);
    await typeInto(/Description/i, "Test description", user);
    await typeInto(/How was this celebrated?/i, "Write any text here", user);
    await user.click(screen.getByRole("button",{name: /Record Achievement/i}));
    await waitFor(() => {
        expect(secureGatewayCreateMock).toHaveBeenCalledTimes(1);
    })
    const payload = secureGatewayCreateMock.mock.calls[0][1];
    expect(payload).toMatchObject({
        org_id:"default_org",
        resident_id:"resident-1",
        achievement_date: "2026-07-01",
        category:"personal_growth",
        title:"Test title",
        description:"Test description",
        celebrated_how:"Write any text here",

    });
    expect(toastSuccessMock).toHaveBeenCalledWith("Achievement recorded")
  })
})