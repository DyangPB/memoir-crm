import { describe, expect, it } from "vitest";

import { isIsoDay, parseContactInput } from "../src/contact";
import { fieldTypes, parseCustomFieldValues, parseFieldDefinitionInput } from "../src/custom-field";
import { daysSince } from "../src/days-since";
import { buildDemoSeed } from "../src/demo";
import {
  BIRTHDAY_WINDOW_DAYS,
  daysUntilOccurrence,
  occursWithinDays,
  parseImportantDateInput,
  UPCOMING_WINDOW_DAYS,
} from "../src/important-date";
import { interactionTypes, parseInteractionInput } from "../src/interaction";
import { parseLabelInput } from "../src/label";
import { parseNoteInput } from "../src/note";
import { validateAttachment, validatePhoto } from "../src/media";
import { parseReminderInput, reminderStatusAt } from "../src/reminder";

const NOW = new Date("2026-10-12T08:00:00.000Z");
const MS_PER_DAY = 86_400_000;

const seed = buildDemoSeed(NOW);

describe("demo seed validity", () => {
  it("is a usable payload for every field definition parser", () => {
    expect(seed.fieldDefinitions.length).toBeGreaterThan(0);

    for (const field of seed.fieldDefinitions) {
      expect(parseFieldDefinitionInput(field)).toEqual({
        ok: true,
        field: { name: field.name, type: field.type, options: field.options },
      });
    }
  });

  it("is a usable payload for every label parser", () => {
    expect(seed.labels.length).toBeGreaterThan(0);

    for (const label of seed.labels) {
      expect(parseLabelInput(label)).toEqual({ ok: true, name: label.name });
    }
  });

  it("normalizes to itself through the contact parser", () => {
    for (const contact of seed.contacts) {
      const parsed = parseContactInput(contact);

      expect(parsed).toEqual({
        ok: true,
        contact: {
          name: contact.name,
          emails: contact.emails,
          phones: contact.phones,
          socialLinks: contact.socialLinks,
          birthday: contact.birthday,
          howWeMet: contact.howWeMet,
          location: contact.location,
          roleCompany: contact.roleCompany,
          timezone: contact.timezone,
          cadenceDays: null,
          cadenceTracked: true,
        },
      });
    }
  });

  it("normalizes to itself through the custom field validator", () => {
    const definitions = seed.fieldDefinitions;
    const withValues = seed.contacts.filter(
      (contact) => Object.keys(contact.customFields).length > 0,
    );

    expect(withValues.length).toBeGreaterThan(0);

    for (const contact of withValues) {
      const parsed = parseCustomFieldValues(definitions, contact.customFields);

      expect(parsed).toEqual({ ok: true, values: contact.customFields });
    }
  });

  it("is a usable payload for every interaction, note, reminder and date parser", () => {
    for (const contact of seed.contacts) {
      for (const interaction of contact.interactions) {
        expect(parseInteractionInput(interaction)).toEqual({
          ok: true,
          interaction: {
            type: interaction.type,
            occurredOn: interaction.occurredOn,
            note: interaction.note,
          },
        });
        expect(isIsoDay(interaction.occurredOn)).toBe(true);
      }

      for (const note of contact.notes) {
        expect(parseNoteInput(note)).toEqual({ ok: true, note: { body: note.body } });
      }

      for (const reminder of contact.reminders) {
        expect(parseReminderInput(reminder)).toEqual({
          ok: true,
          reminder: { body: reminder.body, dueOn: reminder.dueOn },
        });
        expect(isIsoDay(reminder.dueOn)).toBe(true);
      }

      for (const importantDate of contact.importantDates) {
        expect(parseImportantDateInput(importantDate)).toEqual({
          ok: true,
          importantDate: { name: importantDate.name, fallsOn: importantDate.fallsOn },
        });
        expect(isIsoDay(importantDate.fallsOn)).toBe(true);
      }
    }
  });
});

describe("demo seed surface coverage", () => {
  it("carries enough people to fill the contact list", () => {
    expect(seed.contacts.length).toBeGreaterThanOrEqual(8);
    expect(new Set(seed.contacts.map((contact) => contact.id)).size).toBe(seed.contacts.length);
    expect(new Set(seed.contacts.map((contact) => contact.name)).size).toBe(seed.contacts.length);
  });

  it("defines a field of every type", () => {
    const types = seed.fieldDefinitions.map((field) => field.type);

    expect([...types].sort()).toEqual([...fieldTypes].sort());
  });

  it("gives every label at least two contacts, and leaves a contact unlabelled", () => {
    const labelIds = new Set(seed.labels.map((label) => label.id));

    for (const contact of seed.contacts) {
      for (const labelId of contact.labelIds) {
        expect(labelIds.has(labelId)).toBe(true);
      }
    }

    for (const label of seed.labels) {
      const applied = seed.contacts.filter((contact) => contact.labelIds.includes(label.id)).length;

      expect(applied).toBeGreaterThanOrEqual(2);
    }

    expect(seed.contacts.some((contact) => contact.labelIds.length === 0)).toBe(true);
    expect(seed.contacts.some((contact) => contact.labelIds.length >= 3)).toBe(true);
  });

  it("logs every interaction type across the cast", () => {
    const logged = new Set(
      seed.contacts.flatMap((contact) => contact.interactions.map((entry) => entry.type)),
    );

    expect([...logged].sort()).toEqual([...interactionTypes].sort());
  });

  it("has a contact with an empty timeline and one with an untouched record", () => {
    expect(seed.contacts.some((contact) => contact.interactions.length === 0)).toBe(true);
    expect(seed.contacts.some((contact) => Object.keys(contact.customFields).length === 0)).toBe(
      true,
    );
    expect(seed.contacts.some((contact) => contact.notes.length === 0)).toBe(true);
    expect(seed.contacts.some((contact) => contact.birthday === null)).toBe(true);
  });

  it("spans contacts talked to recently and contacts gone quiet", () => {
    const days = seed.contacts.map((contact) => {
      const latest = contact.interactions
        .map((interaction) => interaction.occurredOn)
        .sort()
        .at(-1);

      return latest === undefined ? null : daysSince(new Date(`${latest}T00:00:00.000Z`), NOW);
    });

    expect(days.some((value) => value !== null && value <= 7)).toBe(true);
    expect(days.some((value) => value !== null && value > 30)).toBe(true);
    expect(days).toContain(null);
  });

  it("puts birthdays and dates both inside and outside the upcoming window", () => {
    const dates = seed.contacts.flatMap((contact) => contact.importantDates);
    const birthdayDates = dates.filter((date) => date.source === "birthday");

    expect(dates.some((date) => occursWithinDays(date.fallsOn, NOW, UPCOMING_WINDOW_DAYS))).toBe(
      true,
    );
    expect(dates.some((date) => !occursWithinDays(date.fallsOn, NOW, UPCOMING_WINDOW_DAYS))).toBe(
      true,
    );
    expect(
      dates.some((date) => date.source === "manual" && occursWithinDays(date.fallsOn, NOW, 30)),
    ).toBe(true);
    expect(birthdayDates.length).toBeGreaterThanOrEqual(2);
    expect(
      birthdayDates.some((date) => occursWithinDays(date.fallsOn, NOW, BIRTHDAY_WINDOW_DAYS)),
    ).toBe(true);
    expect(birthdayDates.some((date) => daysUntilOccurrence(date.fallsOn, NOW) > 300)).toBe(true);
  });

  it("keeps every birthday in step with a birthday Important Date", () => {
    for (const contact of seed.contacts.filter((entry) => entry.birthday !== null)) {
      const birthdayDates = contact.importantDates.filter((date) => date.source === "birthday");

      expect(birthdayDates).toHaveLength(1);
      expect(birthdayDates[0]?.fallsOn).toBe(contact.birthday);
    }

    for (const contact of seed.contacts.filter((entry) => entry.birthday === null)) {
      expect(contact.importantDates.filter((date) => date.source === "birthday")).toHaveLength(0);
    }
  });

  it("fills every Reminder state the dashboard and reminders page can show", () => {
    const dueNow = seed.contacts
      .flatMap((contact) => contact.reminders)
      .map((reminder) => reminderStatusAt({ status: reminder.status, dueOn: reminder.dueOn }, NOW));

    expect(dueNow).toContain("due");
    expect(dueNow).toContain("overdue");
    expect(dueNow).toContain("pending");
    expect(dueNow).toContain("done");
  });

  it("marks a ticking-off as done rather than pending", () => {
    const done = seed.contacts
      .flatMap((contact) => contact.reminders)
      .filter((reminder) => reminder.status === "done");

    expect(done.length).toBeGreaterThan(0);

    for (const reminder of done) {
      expect(reminderStatusAt({ status: "pending", dueOn: reminder.dueOn }, NOW)).not.toBe("done");
    }
  });
});

describe("demo seed determinism", () => {
  it("builds the same seed for the same moment", () => {
    expect(buildDemoSeed(NOW)).toEqual(seed);
  });

  it("moves every dated row with the clock, keeping every person", () => {
    const laterNow = new Date(NOW.getTime() + 2 * MS_PER_DAY);
    const later = buildDemoSeed(laterNow);
    const dayGap = (before: string, after: string): number =>
      Math.round(
        (Date.parse(`${after}T00:00:00.000Z`) - Date.parse(`${before}T00:00:00.000Z`)) / MS_PER_DAY,
      );

    for (const [index, contact] of seed.contacts.entries()) {
      const shifted = later.contacts[index];

      expect(shifted?.name).toBe(contact.name);

      for (const [entryIndex, interaction] of contact.interactions.entries()) {
        const moved = shifted?.interactions[entryIndex]?.occurredOn;

        expect(moved !== undefined && dayGap(interaction.occurredOn, moved)).toBe(2);
      }

      for (const [entryIndex, reminder] of contact.reminders.entries()) {
        const moved = shifted?.reminders[entryIndex]?.dueOn;

        expect(moved !== undefined && dayGap(reminder.dueOn, moved)).toBe(2);
        expect(shifted?.reminders[entryIndex]?.body).toBe(reminder.body);
      }

      for (const [entryIndex, date] of contact.importantDates.entries()) {
        const moved = shifted?.importantDates[entryIndex]?.fallsOn ?? date.fallsOn;
        // A birthday keeps its month and day, which can step over 29 February.
        const expected = date.source === "birthday" ? [2, 3] : [2];

        expect(expected).toContain(dayGap(date.fallsOn, moved));
      }

      if (contact.birthday !== null && shifted?.birthday != null) {
        expect(daysUntilOccurrence(shifted.birthday, laterNow)).toBe(
          daysUntilOccurrence(contact.birthday, NOW),
        );
      }
    }
  });

  it("keeps ids stable across rebuilds so the demo resets in place", () => {
    const later = buildDemoSeed(new Date(NOW.getTime() + 41 * MS_PER_DAY));

    expect(later.contacts.map((contact) => contact.id)).toEqual(
      seed.contacts.map((contact) => contact.id),
    );
    expect(later.fieldDefinitions.map((field) => field.id)).toEqual(
      seed.fieldDefinitions.map((field) => field.id),
    );
    expect(later.labels.map((label) => label.id)).toEqual(seed.labels.map((label) => label.id));
  });
});

describe("demo seed profile and media coverage", () => {
  it("gives several contacts a location, role/company, and timezone", () => {
    expect(seed.contacts.filter((contact) => contact.location !== null).length).toBeGreaterThanOrEqual(5);
    expect(seed.contacts.filter((contact) => contact.roleCompany !== null).length).toBeGreaterThanOrEqual(4);
    expect(seed.contacts.filter((contact) => contact.timezone !== null).length).toBeGreaterThanOrEqual(5);
    expect(seed.contacts.some((contact) => contact.timezone === null)).toBe(true);
  });

  it("gives some contacts a photo and leaves others to the letter avatar", () => {
    const withPhoto = seed.contacts.filter((contact) => contact.photo !== null);

    expect(withPhoto.length).toBeGreaterThanOrEqual(3);
    expect(withPhoto.length).toBeLessThan(seed.contacts.length);

    for (const contact of withPhoto) {
      expect(
        validatePhoto({
          contentType: contact.photo?.contentType ?? "",
          size: contact.photo?.bytes.length ?? 0,
        }).ok,
      ).toBe(true);
    }
  });

  it("attaches both an inline image and a download-only file to some interactions", () => {
    const attachments = seed.contacts.flatMap((contact) =>
      contact.interactions.flatMap((interaction) => interaction.attachments),
    );

    expect(attachments.some((attachment) => attachment.contentType === "image/png")).toBe(true);
    expect(attachments.some((attachment) => attachment.contentType !== "image/png")).toBe(true);
    expect(new Set(attachments.map((attachment) => attachment.id)).size).toBe(attachments.length);

    for (const attachment of attachments) {
      expect(
        validateAttachment({
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          size: attachment.bytes.length,
        }),
      ).toEqual({
        ok: true,
        attachment: {
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          size: attachment.bytes.length,
        },
      });
    }
  });
});
