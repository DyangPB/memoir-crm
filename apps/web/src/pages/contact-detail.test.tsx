import type { Contact, ImportantDate, Note, Reminder } from "@memoir/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../lib/api";
import { ContactDetailPane } from "./contact-detail";
import { ContactsPage } from "./contacts";

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { email: "me@example.com" } },
      isPending: false,
    }),
    signOut: vi.fn(),
  },
}));

vi.mock("../lib/api", () => {
  const ok = <T,>(value: T) => vi.fn(async () => ({ ok: true as const, value }));

  return {
    listContacts: ok([]),
    listLabels: ok([]),
    getCadence: ok({ health: null }),
    getContact: ok(null),
    listInteractions: ok([]),
    listNotes: ok([]),
    listContactReminders: ok([]),
    listContactImportantDates: ok([]),
    listFieldDefinitions: ok([]),
    createNote: vi.fn(),
    createReminder: vi.fn(),
    photoUrl: (contactId: string) => `/api/contacts/${contactId}/photo`,
    attachmentUrl: (contactId: string, interactionId: string, attachmentId: string) =>
      `/api/contacts/${contactId}/interactions/${interactionId}/attachments/${attachmentId}`,
  };
});

const ADA: Contact = {
  id: "c1",
  name: "Ada Lovelace",
  emails: ["ada@example.com"],
  phones: [],
  socialLinks: [],
  birthday: null,
  howWeMet: "At a salon",
  location: null,
  roleCompany: null,
  timezone: null,
  photoVersion: null,
  cadenceDays: null,
  cadenceTracked: true,
  customFields: {},
  labels: [{ id: "l1", name: "Family" }],
  lastInteractionAt: null,
  effectiveCadenceDays: 30,
  createdAt: "2026-01-01T00:00:00.000Z",
};

const NOTE: Note = {
  id: "n1",
  contactId: "c1",
  body: "Loves analytical engines",
  createdAt: "2026-01-02T00:00:00.000Z",
};

const REMINDER: Reminder = {
  id: "r1",
  contactId: "c1",
  body: "Send her the paper",
  dueOn: "2099-01-01",
  status: "pending",
  createdAt: "2026-01-02T00:00:00.000Z",
};

const IMPORTANT_DATE: ImportantDate = {
  id: "d1",
  contactId: "c1",
  name: "Anniversary",
  fallsOn: "2000-06-01",
  source: "manual",
  createdAt: "2026-01-02T00:00:00.000Z",
};

const NOTE_PLACEHOLDER = "What should you remember?";
const REMINDER_PLACEHOLDER = "Call Bob";

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={["/app/contacts/c1"]}>
      <Routes>
        <Route element={<ContactsPage />} path="/app/contacts">
          <Route element={<ContactDetailPane />} path=":id" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(api.createNote).mockReset();
  vi.mocked(api.createReminder).mockReset();
  vi.mocked(api.listContacts).mockResolvedValue({ ok: true, value: [ADA] });
  vi.mocked(api.getContact).mockResolvedValue({ ok: true, value: ADA });
  vi.mocked(api.listLabels).mockResolvedValue({
    ok: true,
    value: [{ id: "l1", name: "Family", contactCount: 1 }],
  });
  vi.mocked(api.listNotes).mockResolvedValue({ ok: true, value: [NOTE] });
  vi.mocked(api.listContactReminders).mockResolvedValue({
    ok: true,
    value: [REMINDER],
  });
  vi.mocked(api.listContactImportantDates).mockResolvedValue({
    ok: true,
    value: [IMPORTANT_DATE],
  });
});

describe("Contact detail panes", () => {
  it("keeps only reference information in the sidebar", async () => {
    renderDetail();

    await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" });

    const sidebar = screen.getByRole("complementary", { name: "Reference" });
    const headings = within(sidebar)
      .getAllByRole("heading")
      .map((heading) => heading.textContent);

    expect(headings).toEqual(["Details", "Labels", "Important dates"]);
  });

  it("keeps the Note form closed until asked for, then closes it after saving", async () => {
    const user = userEvent.setup();

    vi.mocked(api.createNote).mockResolvedValue({
      ok: true,
      value: { ...NOTE, id: "n2", body: "Prefers tea" },
    });

    renderDetail();

    await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" });

    expect(screen.queryByPlaceholderText(NOTE_PLACEHOLDER)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Add note" }));
    await user.type(screen.getByPlaceholderText(NOTE_PLACEHOLDER), "Prefers tea");
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(api.createNote).toHaveBeenCalledWith("c1", { body: "Prefers tea" });
    await waitFor(() => expect(screen.queryByPlaceholderText(NOTE_PLACEHOLDER)).toBeNull());
    expect(screen.getByRole("button", { name: "Add note" })).toBeTruthy();
  });

  it("closes the Note form again on Cancel without saving", async () => {
    const user = userEvent.setup();

    renderDetail();

    await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" });
    await user.click(screen.getByRole("button", { name: "Add note" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByPlaceholderText(NOTE_PLACEHOLDER)).toBeNull();
    expect(api.createNote).not.toHaveBeenCalled();
  });

  it("keeps the Reminder form closed until asked for, then closes it after saving", async () => {
    const user = userEvent.setup();

    vi.mocked(api.createReminder).mockResolvedValue({
      ok: true,
      value: { ...REMINDER, id: "r2", body: "Call Ada" },
    });

    renderDetail();

    await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" });

    expect(screen.queryByPlaceholderText(REMINDER_PLACEHOLDER)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Add reminder" }));
    await user.type(screen.getByPlaceholderText(REMINDER_PLACEHOLDER), "Call Ada");
    await user.click(screen.getByRole("button", { name: "Add reminder" }));

    expect(api.createReminder).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ body: "Call Ada" }),
    );
    await waitFor(() => expect(screen.queryByPlaceholderText(REMINDER_PLACEHOLDER)).toBeNull());
    expect(screen.getByRole("button", { name: "Add reminder" })).toBeTruthy();
  });

  it("moves focus into the Note form and the Reminder form when they open", async () => {
    const user = userEvent.setup();

    renderDetail();

    await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" });

    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(document.activeElement).toBe(screen.getByPlaceholderText(NOTE_PLACEHOLDER));

    await user.click(screen.getByRole("button", { name: "Add reminder" }));
    expect(document.activeElement).toBe(screen.getByPlaceholderText(REMINDER_PLACEHOLDER));
  });
});
