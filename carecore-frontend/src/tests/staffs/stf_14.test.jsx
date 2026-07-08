import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DisciplinaryTab from "@/components/staff/tabs/DisciplinaryTab";

const {
  secureGatewayFilterMock,
  secureGatewayCreateMock,
  secureGatewayUpdateMock,
  secureGatewayDeleteMock,
  createNotificationMock,
  logAuditMock,
  toastSuccessMock,
  toastErrorMock,
} = vi.hoisted(() => ({
  secureGatewayFilterMock: vi.fn(),
  secureGatewayCreateMock: vi.fn(),
  secureGatewayUpdateMock: vi.fn(),
  secureGatewayDeleteMock: vi.fn(),
  createNotificationMock: vi.fn(),
  logAuditMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/lib/secureGateway", () => ({
  secureGateway: {
    filter: secureGatewayFilterMock,
    create: secureGatewayCreateMock,
    update: secureGatewayUpdateMock,
    delete: secureGatewayDeleteMock,
  },
}));

vi.mock("@/lib/PermissionContext", () => ({
  useModuleActions: () => ({
    canView: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
  }),
}));

vi.mock("@/lib/createNotification", () => ({
  createNotification: createNotificationMock,
}));

vi.mock("@/lib/logAudit", () => ({
  logAudit: logAuditMock,
}));


vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));
 

const user = { email: "admin@example.com", role: "admin", full_name: "Admin User" };
const staff = [
  {
    id: "staff-admin-1",
    full_name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    user_id: "user-admin-1",
  },
  {
    id: "staff-2",
    full_name: "Alex Manager",
    email: "alex@example.com",
    role: "admin_officer",
    user_id: "user-admin-2",
  },
];

 function renderTab(onSubmitMock) {
   const queryClient = new QueryClient({
     defaultOptions: { queries: { retry: false } },
   });
 
   return render(
     <QueryClientProvider client={queryClient}>
     <DisciplinaryTab
        user={user}
        staff={staff}
     />
     </QueryClientProvider>
   );
 }

 function getFieldContainer(labelMatcher) {
  const label = screen.getByText(labelMatcher, { selector: "label" });
  return label.closest("div");
}

async function selectRadixOption(labelMatcher, optionText, userEventInstance) {
  const container = getFieldContainer(labelMatcher);
  const trigger =
    within(container).queryByRole("combobox") ||
    within(container).queryByRole("button");
  await userEventInstance.click(trigger);

  const option =
    (await screen.findByRole("option", { name: optionText }).catch(() => null)) ||
    (await screen.findByText(optionText).catch(() => null));

  await userEventInstance.click(option);
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

describe("DisciplinaryTab RecordForm", () => {
   beforeEach(() => {
    vi.clearAllMocks();

    secureGatewayFilterMock.mockImplementation(async (entity) => {
      if (entity === "DisciplinaryRecord") return [];
      return [];
    });
      secureGatewayCreateMock.mockResolvedValue({ id: "disc-1" });
    secureGatewayUpdateMock.mockResolvedValue({ id: "disc-1" });
    secureGatewayDeleteMock.mockResolvedValue({});
    createNotificationMock.mockResolvedValue({});
    logAuditMock.mockResolvedValue({});

});
    it("keeps save disabled until staff member is selected", async() => {
         const u = userEvent.setup({ pointerEventsCheck: 0 });
         renderTab();
         await u.click(await screen.findByRole("button", { name: /^Disciplinary$/i }));
         await screen.findByRole("heading", { name: /Log Disciplinary/i });
         const saveBtn = screen.getByRole("button", { name: /^Save$/i });
         expect(saveBtn).toBeDisabled();
         expect(secureGatewayCreateMock).not.toHaveBeenCalled();
    })

})