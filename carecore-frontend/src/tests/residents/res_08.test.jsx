import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DailyLogModal from "@/components/daily-logs/DailyLogModal";

const { createMock, updateMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  createMock: vi.fn(),
  updateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("@/api/base44Client", () => ({
  base44: {
    entities: {
      DailyLog: {
        create: createMock,
        update: updateMock,
      },
    },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

const resident = {
  id: "resident-1",
  display_name: "Alex Taylor",
  home_id: "home-1",
};

const staffProfile = {
  id: "staff-1",
  full_name: "Admin User",
  role: "admin",
};

function field(labelText) {
  return screen.getByText(labelText).parentElement;
}

async function typeInto(labelText, value, user) {
  const input = field(labelText).querySelector("input, textarea");
  await user.clear(input);
  await user.type(input, value);
}

async function selectOption(labelText, optionText, user) {
  const select = field(labelText).querySelector("select");
  await user.selectOptions(select, optionText);
}

describe("DailyLogModal - Save Entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMock.mockResolvedValue({ id: "daily-1" });
    updateMock.mockResolvedValue({ id: "daily-1" });
  });

  it("shows validation errors and does not create when required fields are missing", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <DailyLogModal
        resident={resident}
        staffProfile={staffProfile}
        onSaved={onSaved}
        onClose={onClose}
      />
    );

    await user.click(screen.getByRole("button", { name: /Save Entry/i }));

    expect(createMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith("Please fix the errors before saving.");
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("creates DailyLog and calls onSaved when Save Entry is clicked with valid data", async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(
      <DailyLogModal
        resident={resident}
        staffProfile={staffProfile}
        onSaved={onSaved}
        onClose={onClose}
      />
    );

    await typeInto("Title *", "Morning wellbeing check", user);
    await typeInto("Summary *", "Resident engaged well and attended breakfast.", user);
    await selectOption("Mood *", "Calm", user);
    await selectOption("Risk Level *", "Low", user);
    await selectOption("Visibility *", "Home Staff", user);

    await user.click(screen.getByRole("button", { name: /Save Entry/i }));

    await waitFor(() => {
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    const payload = createMock.mock.calls[0][0];

    expect(payload).toMatchObject({
      resident_id: "resident-1",
      resident_name: "Alex Taylor",
      home_id: "home-1",
      worker_id: "staff-1",
      worker_name: "Admin User",
      title: "Morning wellbeing check",
      summary: "Resident engaged well and attended breakfast.",
      mood: "Calm",
      risk_level: "Low",
      visibility: "Home Staff",
      log_type: "General Note",
    });

    expect(toastSuccessMock).toHaveBeenCalledWith("Entry Successful — Log entry saved.");
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });
});