import type { Contact } from "@memoir/core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../lib/api";
import { ContactDetailPane } from "./contact-detail";
import { ContactsPage } from "./contacts";

vi.mock("../lib/auth-client", () => ({
  authClient: {
    useSession: () => ({ data: { user: { email: "me@example.com" } }, isPending: false }),
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
    photoUrl: (contactId: string) => `/api/contacts/${contactId}/photo`,
    attachmentUrl: (contactId: string, interactionId: string, attachmentId: string) =>
      `/api/contacts/${contactId}/interactions/${interactionId}/attachments/${attachmentId}`,
  };
});

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

const ADA = contact("c1", "Ada Lovelace");
const GRACE = contact("c2", "Grace Hopper");

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ContactsPage />} path="/app/contacts">
          <Route element={<ContactDetailPane />} path=":id" />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(api.listContacts).mockResolvedValue({ ok: true, value: [ADA, GRACE] });
  vi.mocked(api.getContact).mockImplementation(async (id) => ({
    ok: true,
    value: id === ADA.id ? ADA : GRACE,
  }));
});

describe("Contacts split pane", () => {
  it("shows a Contact's detail beside the list when a row is selected", async () => {
    const user = userEvent.setup();

    renderAt("/app/contacts");

    await user.click(await screen.findByRole("link", { name: /Ada Lovelace/ }));

    expect(await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Grace Hopper/ })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ada Lovelace/ }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("opens the split view with that Contact selected from a deep link", async () => {
    renderAt("/app/contacts/c2");

    expect(await screen.findByRole("heading", { level: 1, name: "Grace Hopper" })).toBeTruthy();
    expect(api.getContact).toHaveBeenCalledWith("c2");
    expect((await screen.findByRole("link", { name: /Grace Hopper/ })).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: /Ada Lovelace/ })).toBeTruthy();
  });

  it("filters the list by what's typed into search", async () => {
    const user = userEvent.setup();

    renderAt("/app/contacts");

    await user.type(await screen.findByLabelText("Search your people"), "birdwatching");

    await waitFor(() =>
      expect(api.listContacts).toHaveBeenLastCalledWith({ q: "birdwatching", label: undefined }),
    );
  });

  it("filters the list by Label chip", async () => {
    const user = userEvent.setup();

    vi.mocked(api.listLabels).mockResolvedValue({
      ok: true,
      value: [{ id: "l1", name: "Family", contactCount: 1 }],
    });

    renderAt("/app/contacts");

    await user.click(await screen.findByRole("button", { name: "Family" }));

    await waitFor(() =>
      expect(api.listContacts).toHaveBeenLastCalledWith({ q: "", label: "l1" }),
    );
  });

  it("goes back from a Contact to the list, keeping the filter that was on", async () => {
    const user = userEvent.setup();

    renderAt("/app/contacts/c1?label=l1");

    await screen.findByRole("heading", { level: 1, name: "Ada Lovelace" });

    const back = screen.getByRole("link", { name: /Back to Contacts/ });

    expect(back.getAttribute("href")).toBe("/app/contacts?label=l1");

    await user.click(back);

    expect(screen.queryByRole("heading", { level: 1, name: "Ada Lovelace" })).toBeNull();
    expect(await screen.findByText(/Pick someone from the list/)).toBeTruthy();
  });

  it("keeps a way back to the list while a Contact is still loading", async () => {
    vi.mocked(api.getContact).mockReturnValue(new Promise(() => {}));

    renderAt("/app/contacts/c1");

    expect((await screen.findByRole("link", { name: /Back to Contacts/ })).getAttribute("href")).toBe(
      "/app/contacts",
    );
  });
});
