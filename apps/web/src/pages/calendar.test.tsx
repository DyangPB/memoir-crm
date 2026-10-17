import type { CalendarItem, Contact, GoogleStatus } from "@memoir/core";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../lib/api";
import { CalendarPage } from "./calendar";

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: { email: "me@example.com" } }, isPending: false }),
    signOut: vi.fn(),
  },
}));

vi.mock("../lib/api", () => ({
  listCalendar: vi.fn(),
  listContacts: vi.fn(),
  createReminder: vi.fn(),
  getGoogleStatus: vi.fn(),
  syncGoogleNow: vi.fn(),
}));

function contact(id: string, name: string): Contact {
  return {
    id,
    name,
    emails: [],
    phones: [],
    socialLinks: [],
    birthday: null,
    howWeMet: null,
    location: null,
    roleCompany: null,
    timezone: null,
    photoVersion: null,
    cadenceDays: null,
    cadenceTracked: true,
    customFields: {},
    labels: [],
    lastInteractionAt: null,
    effectiveCadenceDays: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const ITEMS: CalendarItem[] = [
  {
    kind: "reminder",
    id: "r1",
    title: "Call Bob",
    date: "2026-10-20",
    contactId: "bob",
    contactName: "Bob Nguyen",
    done: false,
  },
  {
    kind: "important-date",
    id: "d1",
    label: "Birthday",
    date: "2026-10-20",
    contactId: "ada",
    contactName: "Ada Lovelace",
    yearsOld: 34,
  },
  {
    kind: "reminder",
    id: "r2",
    title: "Send a card",
    date: "2026-10-22",
    contactId: "ada",
    contactName: "Ada Lovelace",
    done: false,
  },
];

const NOT_CONNECTED: GoogleStatus = {
  configured: true,
  linked: false,
  connected: false,
  calendars: [],
  lastSyncedAt: null,
  lastError: null,
};

function renderCalendar(search = "?date=2026-10-20") {
  return render(
    <MemoryRouter initialEntries={[`/app/calendar${search}`]}>
      <Routes>
        <Route element={<CalendarPage />} path="/app/calendar" />
      </Routes>
    </MemoryRouter>,
  );
}

function cell(label: string) {
  return screen.getByRole("gridcell", { name: label });
}

/** Month view lists the selected day twice, in its cell and in the day panel. */
async function loaded() {
  const twentieth = await screen.findByRole("gridcell", { name: "Tuesday 20 October 2026" });

  await within(twentieth).findByText("Call Bob");
}

beforeEach(() => {
  vi.mocked(api.listCalendar).mockReset().mockResolvedValue({ ok: true, value: ITEMS });
  vi.mocked(api.listContacts)
    .mockReset()
    .mockResolvedValue({ ok: true, value: [contact("bob", "Bob Nguyen"), contact("ada", "Ada Lovelace")] });
  vi.mocked(api.createReminder).mockReset();
  vi.mocked(api.getGoogleStatus).mockReset().mockResolvedValue({ ok: true, value: NOT_CONNECTED });
  vi.mocked(api.syncGoogleNow).mockReset();
});

describe("Calendar month view", () => {
  it("asks for exactly the days the grid shows", async () => {
    renderCalendar();

    await loaded();

    expect(api.listCalendar).toHaveBeenCalledWith("2026-09-27", "2026-10-31");
  });

  it("puts each item on its own day", async () => {
    renderCalendar();

    await loaded();

    const twentieth = within(cell("Tuesday 20 October 2026"));
    expect(twentieth.getByText("Call Bob")).toBeTruthy();
    expect(twentieth.getByText("Birthday")).toBeTruthy();
    expect(twentieth.queryByText("Send a card")).toBeNull();
    expect(within(cell("Thursday 22 October 2026")).getByText("Send a card")).toBeTruthy();
  });

  it("lists the selected day's items in the day panel", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();
    await user.click(within(cell("Thursday 22 October 2026")).getByRole("button", { name: "Thursday 22 October 2026" }));

    const panel = within(screen.getByRole("complementary", { name: "Selected day" }));

    expect(panel.getByRole("heading", { name: "Thursday 22 October 2026" })).toBeTruthy();
    expect(panel.getByText("Send a card")).toBeTruthy();
    expect(panel.queryByText("Call Bob")).toBeNull();
  });
});

describe("Calendar layers", () => {
  it("hides and shows Reminders with their toggle", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();

    await user.click(screen.getByRole("checkbox", { name: "Reminders" }));

    expect(screen.queryAllByText("Call Bob")).toHaveLength(0);
    expect(screen.queryAllByText("Send a card")).toHaveLength(0);
    expect(screen.getAllByText("Birthday").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("checkbox", { name: "Reminders" }));

    expect(screen.getAllByText("Call Bob").length).toBeGreaterThan(0);
  });

  it("hides and shows Important Dates with their toggle", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();

    await user.click(screen.getByRole("checkbox", { name: "Important Dates" }));

    expect(screen.queryAllByText("Birthday")).toHaveLength(0);
    expect(screen.getAllByText("Call Bob").length).toBeGreaterThan(0);
  });
});

describe("Calendar views", () => {
  it("marks the current view and keeps the selected day when the view changes", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();

    expect(screen.getByRole("button", { name: "Month" }).getAttribute("aria-pressed")).toBe("true");

    await user.click(
      within(cell("Thursday 22 October 2026")).getByRole("button", { name: "Thursday 22 October 2026" }),
    );
    await user.click(screen.getByRole("button", { name: "Day" }));

    expect(screen.getByRole("button", { name: "Day" }).getAttribute("aria-pressed")).toBe("true");
    expect(await screen.findByText("Send a card")).toBeTruthy();
    expect(screen.queryByText("Call Bob")).toBeNull();
  });

  it.each(["Week", "Day", "Agenda"])("shows the same feed in %s", async (view) => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();
    await user.click(screen.getByRole("button", { name: view }));

    expect(await screen.findByText("Call Bob")).toBeTruthy();
    expect(screen.getByText("Birthday")).toBeTruthy();
  });

  it("asks for the range each view needs", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();

    await user.click(screen.getByRole("button", { name: "Week" }));
    await waitFor(() => expect(api.listCalendar).toHaveBeenLastCalledWith("2026-10-18", "2026-10-24"));

    await user.click(screen.getByRole("button", { name: "Day" }));
    await waitFor(() => expect(api.listCalendar).toHaveBeenLastCalledWith("2026-10-20", "2026-10-20"));

    await user.click(screen.getByRole("button", { name: "Agenda" }));
    await waitFor(() => expect(api.listCalendar).toHaveBeenLastCalledWith("2026-10-20", "2026-11-18"));
  });

  it("steps to the next month", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(api.listCalendar).toHaveBeenLastCalledWith("2026-11-01", "2026-12-05"));
    expect(screen.getByRole("heading", { name: "November 2026" })).toBeTruthy();
  });
});

describe("Add reminder from the Calendar", () => {
  it("creates a Reminder dated the selected day", async () => {
    const user = userEvent.setup();

    vi.mocked(api.createReminder).mockResolvedValue({
      ok: true,
      value: {
        id: "r3",
        contactId: "bob",
        body: "Bring the book",
        dueOn: "2026-10-22",
        status: "pending",
        createdAt: "2026-10-01T00:00:00.000Z",
      },
    });

    renderCalendar();
    await loaded();
    await user.click(within(cell("Thursday 22 October 2026")).getByRole("button", { name: "Thursday 22 October 2026" }));
    await user.click(screen.getByRole("button", { name: "Add reminder" }));

    expect((screen.getByLabelText("Date") as HTMLInputElement).value).toBe("2026-10-22");

    await user.type(screen.getByLabelText("Reminder"), "Bring the book");
    await user.selectOptions(screen.getByLabelText("Contact"), "Bob Nguyen");
    await user.click(screen.getByRole("button", { name: "Save reminder" }));

    expect(api.createReminder).toHaveBeenCalledExactlyOnceWith("bob", {
      body: "Bring the book",
      dueOn: "2026-10-22",
    });
    await waitFor(() => expect(api.listCalendar).toHaveBeenCalledTimes(2));
  });

  it("asks who the Reminder is for", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Add reminder" }));
    await user.type(screen.getByLabelText("Reminder"), "Call someone");
    await user.click(screen.getByRole("button", { name: "Save reminder" }));

    expect(api.createReminder).not.toHaveBeenCalled();
    expect(screen.getByText("Choose who this reminder is for.")).toBeTruthy();
  });

  it("shows the error when the Reminder can't be saved", async () => {
    const user = userEvent.setup();

    vi.mocked(api.createReminder).mockResolvedValue({
      ok: false,
      status: 400,
      message: "Write the reminder first.",
    });

    renderCalendar();
    await loaded();
    await user.click(screen.getByRole("button", { name: "Add reminder" }));
    await user.selectOptions(screen.getByLabelText("Contact"), "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: "Save reminder" }));

    expect(await screen.findByText("Write the reminder first.")).toBeTruthy();
  });
});

describe("Calendar item details", () => {
  function chip(day: string, name: string) {
    return within(cell(day)).getByRole("button", { name });
  }

  it("shows what a Reminder is about while the pointer rests on it", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();

    expect(screen.queryByRole("tooltip")).toBeNull();

    await user.hover(chip("Tuesday 20 October 2026", "Call Bob"));

    const tip = within(screen.getByRole("tooltip"));

    expect(tip.getByText("Call Bob")).toBeTruthy();
    expect(tip.getByText("Reminder")).toBeTruthy();
    expect(tip.getByText("For Bob Nguyen")).toBeTruthy();
    expect(tip.getByText("Tuesday 20 October 2026")).toBeTruthy();

    await user.unhover(chip("Tuesday 20 October 2026", "Call Bob"));

    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("shows the same details to someone using the keyboard, and Escape closes them", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();

    act(() => chip("Thursday 22 October 2026", "Send a card").focus());

    expect(within(screen.getByRole("tooltip")).getByText("For Ada Lovelace")).toBeTruthy();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("says how long an Important Date has been marked, and whose it is", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();
    await user.hover(chip("Tuesday 20 October 2026", "Birthday"));

    const tip = within(screen.getByRole("tooltip"));

    expect(tip.getByText("Important Date")).toBeTruthy();
    expect(tip.getByText("Ada Lovelace")).toBeTruthy();
    expect(tip.getByText("Marks 34 years")).toBeTruthy();
  });

  it("says when a Reminder is done, and gives a Google event its times", async () => {
    const user = userEvent.setup();

    vi.mocked(api.listCalendar).mockResolvedValue({
      ok: true,
      value: [
        {
          kind: "reminder",
          id: "r9",
          title: "Return the book",
          date: "2026-10-20",
          contactId: "bob",
          contactName: "Bob Nguyen",
          done: true,
        },
        {
          kind: "google",
          id: "g1",
          title: "Dinner",
          date: "2026-10-20",
          start: "2026-10-20T19:30:00+01:00",
          end: "2026-10-20T21:00:00+01:00",
          calendarId: "primary",
          meetUrl: null,
        },
      ],
    });

    renderCalendar();
    await loaded2();
    await user.hover(chip("Tuesday 20 October 2026", "Return the book"));

    expect(within(screen.getByRole("tooltip")).getByText("Done")).toBeTruthy();

    await user.hover(chip("Tuesday 20 October 2026", "Dinner"));

    const tip = within(screen.getByRole("tooltip"));

    expect(tip.getByText("Google Calendar")).toBeTruthy();
    expect(tip.getByText("19:30 to 21:00")).toBeTruthy();
  });

  it("selects the day when a chip is clicked", async () => {
    const user = userEvent.setup();

    renderCalendar();
    await loaded();
    await user.click(chip("Thursday 22 October 2026", "Send a card"));

    const panel = within(screen.getByRole("complementary", { name: "Selected day" }));

    expect(panel.getByRole("heading", { name: "Thursday 22 October 2026" })).toBeTruthy();
  });
});

/** Waits for the grid without assuming which items the test fed it. */
async function loaded2() {
  await screen.findByRole("gridcell", { name: "Tuesday 20 October 2026" });
  await waitFor(() =>
    expect(
      within(cell("Tuesday 20 October 2026")).queryAllByRole("button").length,
    ).toBeGreaterThan(1),
  );
}
