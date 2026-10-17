import type { Contact } from "@memoir/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReminderQuickAdd } from "./reminder-quick-add";

// 2026-10-17 is a Saturday.
const TODAY = "2026-10-17";

function contact(id: string, name: string): Contact {
  return {
    id,
    name,
    emails: [],
    phones: [],
    socialLinks: [],
    birthday: null,
    howWeMet: null,
    cadenceDays: null,
    cadenceTracked: true,
    customFields: {},
    labels: [],
    lastInteractionAt: null,
    effectiveCadenceDays: 30,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

const CONTACTS = [contact("bob", "Bob Nguyen"), contact("ada", "Ada Lovelace")];

function setup() {
  const onAdd = vi.fn(async () => null);

  render(<ReminderQuickAdd contacts={CONTACTS} onAdd={onAdd} today={TODAY} />);

  return { onAdd, user: userEvent.setup() };
}

describe("ReminderQuickAdd", () => {
  it("adds a reminder from a title, a contact, and a date in plain words", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Reminder"), "Call Bob");
    await user.selectOptions(screen.getByLabelText("Contact"), "Bob Nguyen");
    await user.type(screen.getByLabelText("When"), "in 3 days");
    await user.click(screen.getByRole("button", { name: "Add reminder" }));

    expect(onAdd).toHaveBeenCalledExactlyOnceWith("bob", { body: "Call Bob", dueOn: "2026-10-20" });
  });

  it("shows the day it understood before the reminder is added", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText("When"), "next friday");

    expect(screen.getByText("Scheduled 23 Oct 2026")).toBeTruthy();
  });

  it("asks for a date from the picker when it can't read the words", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Reminder"), "Call Bob");
    await user.selectOptions(screen.getByLabelText("Contact"), "Bob Nguyen");
    await user.type(screen.getByLabelText("When"), "soonish");
    await user.click(screen.getByRole("button", { name: "Add reminder" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText("I couldn't read that date. Pick one instead.")).toBeTruthy();

    await user.type(screen.getByLabelText("Pick a date"), "2026-11-02");
    await user.click(screen.getByRole("button", { name: "Add reminder" }));

    expect(onAdd).toHaveBeenCalledExactlyOnceWith("bob", { body: "Call Bob", dueOn: "2026-11-02" });
  });

  it("clears the form once the reminder is saved", async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText("Reminder"), "Call Bob");
    await user.selectOptions(screen.getByLabelText("Contact"), "Bob Nguyen");
    await user.type(screen.getByLabelText("When"), "tomorrow");
    await user.click(screen.getByRole("button", { name: "Add reminder" }));

    expect((screen.getByLabelText("Reminder") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("When") as HTMLInputElement).value).toBe("");
  });

  it("keeps what was typed and shows the error when saving fails", async () => {
    const onAdd = vi.fn(async () => "That contact isn't here.");
    const user = userEvent.setup();

    render(<ReminderQuickAdd contacts={CONTACTS} onAdd={onAdd} today={TODAY} />);

    await user.type(screen.getByLabelText("Reminder"), "Call Bob");
    await user.selectOptions(screen.getByLabelText("Contact"), "Bob Nguyen");
    await user.type(screen.getByLabelText("When"), "tomorrow");
    await user.click(screen.getByRole("button", { name: "Add reminder" }));

    expect(screen.getByText("That contact isn't here.")).toBeTruthy();
    expect((screen.getByLabelText("Reminder") as HTMLInputElement).value).toBe("Call Bob");
  });

  it("asks for a contact before adding", async () => {
    const { onAdd, user } = setup();

    await user.type(screen.getByLabelText("Reminder"), "Call someone");
    await user.type(screen.getByLabelText("When"), "tomorrow");
    await user.click(screen.getByRole("button", { name: "Add reminder" }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText("Choose who this reminder is for.")).toBeTruthy();
  });
});
