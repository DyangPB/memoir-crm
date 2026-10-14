import { isIsoDay, type SocialLink } from "./contact";
import type { CustomFieldValues, FieldType } from "./custom-field";
import type { ImportantDateSource } from "./important-date";
import type { InteractionType } from "./interaction";
import { reminderStatusAt, type ReminderStatus } from "./reminder";

const MS_PER_DAY = 86_400_000;

export type DemoFieldDefinition = {
  id: string;
  name: string;
  type: FieldType;
  options: string[];
};

export type DemoLabel = {
  id: string;
  name: string;
};

export type DemoInteraction = {
  id: string;
  type: InteractionType;
  occurredOn: string;
  note: string | null;
};

export type DemoNote = {
  id: string;
  body: string;
};

export type DemoReminder = {
  id: string;
  body: string;
  dueOn: string;
  status: ReminderStatus;
};

export type DemoImportantDate = {
  id: string;
  name: string;
  fallsOn: string;
  source: ImportantDateSource;
};

export type DemoContact = {
  id: string;
  name: string;
  emails: string[];
  phones: string[];
  socialLinks: SocialLink[];
  birthday: string | null;
  howWeMet: string | null;
  customFields: CustomFieldValues;
  labelIds: string[];
  interactions: DemoInteraction[];
  notes: DemoNote[];
  reminders: DemoReminder[];
  importantDates: DemoImportantDate[];
};

export type DemoSeed = {
  fieldDefinitions: DemoFieldDefinition[];
  labels: DemoLabel[];
  contacts: DemoContact[];
};

/** The day `days` away from `now`, in the ISO YYYY-MM-DD shape every dated column uses. */
function dayOffset(now: Date, days: number): string {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return new Date(today + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** A birthday landing on the same day of the year as `now + inDays`, `age` years back. */
function birthdayYearsBack(now: Date, inDays: number, age: number): string {
  const day = dayOffset(now, inDays);
  const onTheDay = `${Number(day.slice(0, 4)) - age}${day.slice(4)}`;

  // 29 February clamps to the 28th in a common year, the way its occurrences do.
  return isIsoDay(onTheDay) ? onTheDay : `${onTheDay.slice(0, 8)}28`;
}

function reminderStatus(dueOn: string, now: Date, ticked: boolean): ReminderStatus {
  return ticked ? "done" : reminderStatusAt({ status: "pending", dueOn }, now);
}

const fieldIds = {
  coffee: "demo-field-coffee",
  giftBudget: "demo-field-gift-budget",
  lastGift: "demo-field-last-gift",
  relationship: "demo-field-relationship",
  interests: "demo-field-interests",
  giftIdeas: "demo-field-gift-ideas",
  innerCircle: "demo-field-inner-circle",
  linkedin: "demo-field-linkedin",
} as const;

const labelIds = {
  collegeFriends: "demo-label-college-friends",
  work: "demo-label-work",
  family: "demo-label-family",
  bookClub: "demo-label-book-club",
} as const;

type RawInteraction = {
  type: InteractionType;
  daysAgo: number;
  note: string;
};

type RawReminder = {
  body: string;
  inDays: number;
  ticked?: boolean;
};

type RawImportantDate = {
  name: string;
  inDays: number;
};

type RawContact = {
  id: string;
  name: string;
  emails?: string[];
  phones?: string[];
  socialLinks?: SocialLink[];
  birthday?: {
    inDays: number;
    age: number;
  };
  howWeMet?: string;
  customFields?: CustomFieldValues;
  labelIds?: string[];
  interactions?: RawInteraction[];
  notes?: string[];
  reminders?: RawReminder[];
  importantDates?: RawImportantDate[];
};

function demoContacts(now: Date): RawContact[] {
  return [
    {
      id: "demo-contact-amara",
      name: "Amara Okonkwo",
      emails: ["amara.okonkwo@example.com"],
      phones: ["+44 7700 900112"],
      socialLinks: [{ label: "Instagram", url: "https://www.instagram.com/amara.okonkwo" }],
      birthday: { inDays: 6, age: 34 },
      howWeMet:
        "First day at university. We both skipped the orientation icebreakers and found the same quiet corner of the library.",
      customFields: {
        [fieldIds.relationship]: "Friend",
        [fieldIds.interests]: ["Books", "Travel"],
        [fieldIds.innerCircle]: true,
        [fieldIds.coffee]: "Oat latte",
        [fieldIds.giftIdeas]: "The ceramic mug she kept picking up in the museum shop.",
      },
      labelIds: [labelIds.collegeFriends, labelIds.bookClub],
      interactions: [
        { type: "meeting", daysAgo: 41, note: "Book club at hers. She lent me The Dispossessed." },
        { type: "message", daysAgo: 52, note: "Sent the photographs from the coast walk." },
      ],
      notes: ["Reading The Dispossessed because of her. Wants to see the Lisbon photographs."],
      reminders: [{ body: "Send Amara the reading list", inDays: 1 }],
    },
    {
      id: "demo-contact-ben",
      name: "Ben Aquino",
      emails: ["ben.aquino@example.com"],
      birthday: { inDays: 22, age: 41 },
      howWeMet: "Met at the Tuesday stand-up. He fixed the printer in my first week.",
      customFields: {
        [fieldIds.relationship]: "Colleague",
        [fieldIds.interests]: ["Film"],
        [fieldIds.coffee]: "Flat white",
        [fieldIds.linkedin]: "https://www.linkedin.com/in/ben-aquino",
      },
      labelIds: [labelIds.work],
      interactions: [
        {
          type: "call",
          daysAgo: 3,
          note: "Talked through the flat move. Two places in Leith are still in play.",
        },
        { type: "message", daysAgo: 26, note: "He sent the address for Saturday." },
      ],
      reminders: [{ body: "Call Ben about the flat", inDays: 0 }],
    },
    {
      id: "demo-contact-carmen",
      name: "Carmen Ruiz",
      emails: ["carmen.ruiz@example.com"],
      phones: ["+34 600 900 123"],
      howWeMet: "Cousins. We grew up two streets apart in Seville.",
      customFields: {
        [fieldIds.relationship]: "Family",
        [fieldIds.innerCircle]: true,
      },
      labelIds: [labelIds.family],
      interactions: [{ type: "message", daysAgo: 12, note: "Checked in about the move." }],
      notes: ["Allergic to shellfish. Sends a card for every birthday, no exceptions."],
      importantDates: [{ name: "Anniversary", inDays: 12 }],
    },
    {
      id: "demo-contact-devon",
      name: "Devon Clarke",
      emails: ["devon.clarke@example.com"],
      birthday: { inDays: 29, age: 29 },
      labelIds: [labelIds.work, labelIds.bookClub],
      reminders: [{ body: "Nudge Devon about the book club vote", inDays: -4 }],
    },
    {
      id: "demo-contact-elif",
      name: "Elif Demir",
      emails: ["elif.demir@example.com"],
      birthday: { inDays: -2, age: 37 },
      howWeMet:
        "Met on the ferry to the islands. We shared a table and talked about olives for two hours.",
      customFields: {
        [fieldIds.relationship]: "Friend",
        [fieldIds.interests]: ["Hiking", "Cooking"],
      },
      interactions: [
        { type: "message", daysAgo: 95, note: "She wrote from Ankara. The studio is going well." },
      ],
    },
    {
      id: "demo-contact-farida",
      name: "Farida Haddad",
      emails: ["farida.haddad@example.com"],
      phones: ["+44 7700 900318"],
      socialLinks: [{ label: "Website", url: "https://faridahaddad.example.com/notes" }],
      birthday: { inDays: 3, age: 45 },
      howWeMet: "Postgraduate seminar. She corrected my footnote and we have been friends since.",
      customFields: {
        [fieldIds.coffee]: "Turkish coffee, no sugar",
        [fieldIds.giftBudget]: 45,
        [fieldIds.lastGift]: dayOffset(now, -95),
        [fieldIds.relationship]: "Friend",
        [fieldIds.interests]: ["Books", "Cooking", "Travel"],
        [fieldIds.giftIdeas]:
          "A proper Turkish coffee pot, the illustrated cookbook she kept borrowing, and tickets to the film festival in March.",
        [fieldIds.innerCircle]: true,
        [fieldIds.linkedin]: "https://www.linkedin.com/in/farida-haddad",
      },
      labelIds: [labelIds.collegeFriends, labelIds.work, labelIds.bookClub],
      interactions: [
        { type: "message", daysAgo: 2, note: "Voice note about the wedding in Amman." },
        { type: "call", daysAgo: 5, note: "Caught up on her trip plans." },
        { type: "meeting", daysAgo: 40, note: "Coffee before her review." },
        { type: "other", daysAgo: 150, note: "Posted the photographs from the coast." },
      ],
      notes: [
        "Keen gardener. The balcony tomatoes finally came good this year.",
        "Allergic to lilies. Her sister is Yasmin, and the twins are Sami and Nour. She keeps borrowing the illustrated cookbook, so buy her a copy of her own.",
      ],
      reminders: [{ body: "Send Farida the coast photographs", inDays: -14, ticked: true }],
      importantDates: [{ name: "Moved to Glasgow", inDays: 40 }],
    },
    {
      id: "demo-contact-gus",
      name: "Gus Larsson",
      emails: ["gus.larsson@example.com"],
      phones: ["+46 70 123 45 67"],
      birthday: { inDays: 19, age: 58 },
      howWeMet: "Grew up next door. Still the person to call when something breaks.",
      customFields: {
        [fieldIds.relationship]: "Family",
        [fieldIds.innerCircle]: false,
        [fieldIds.coffee]: "Builder's tea",
      },
      labelIds: [labelIds.family],
      interactions: [{ type: "message", daysAgo: 8, note: "Waved off the cabin idea for now." }],
      reminders: [{ body: "Call Gus about the cabin weekend", inDays: 9 }],
    },
    {
      id: "demo-contact-hana",
      name: "Hana Sato",
      emails: ["hana.sato@example.com"],
      socialLinks: [{ label: "Threads", url: "https://www.threads.com/@hanasato" }],
      howWeMet: "Met in Kyoto, waiting out a typhoon in the same coffee shop.",
      customFields: {
        [fieldIds.relationship]: "Colleague",
        [fieldIds.interests]: ["Travel", "Music", "Hiking"],
        [fieldIds.linkedin]: "https://www.linkedin.com/in/hana-sato",
        [fieldIds.giftBudget]: 30,
      },
      labelIds: [labelIds.work],
      interactions: [
        { type: "meeting", daysAgo: 2, note: "Coffee on Leith Walk before her review." },
      ],
      notes: ["Prefers morning meetings. Runs the Wednesday running club."],
      reminders: [{ body: "Ask Hana about the Kyoto trip", inDays: 20 }],
    },
    {
      id: "demo-contact-ivan",
      name: "Ivan Petrov",
      emails: ["ivan.petrov@example.com"],
      birthday: { inDays: 44, age: 52 },
      howWeMet: "Worked together on the harbour project.",
      labelIds: [labelIds.work],
      interactions: [{ type: "call", daysAgo: 55, note: "Quick call about the invoice." }],
      reminders: [{ body: "Ask Ivan for the harbour invoice", inDays: -6 }],
    },
    {
      id: "demo-contact-juno",
      name: "Oleksandra Kovalenko-Bondar",
      emails: ["oleksandra.kovalenko@example.com"],
      phones: ["+380 44 123 4567"],
      birthday: { inDays: 13, age: 30 },
      howWeMet: "Talked through a whole book club evening, then stayed back to stack the chairs.",
      customFields: {
        [fieldIds.relationship]: "Friend",
        [fieldIds.interests]: ["Books", "Cooking", "Film"],
        [fieldIds.innerCircle]: true,
      },
      labelIds: [labelIds.bookClub],
      interactions: [
        { type: "message", daysAgo: 1, note: "She is hosting the next book club." },
        { type: "meeting", daysAgo: 21, note: "Book club at hers. We disagreed about the ending." },
      ],
      notes: ["Hosting the November book club. Bring the sourdough starter she asked for."],
    },
  ];
}

function buildContact(raw: RawContact, now: Date): DemoContact {
  const slug = raw.id.slice("demo-contact-".length);
  const interactions: DemoInteraction[] = (raw.interactions ?? []).map((entry, index) => ({
    id: `demo-interaction-${slug}-${index + 1}`,
    type: entry.type,
    occurredOn: dayOffset(now, -entry.daysAgo),
    note: entry.note,
  }));
  const notes: DemoNote[] = (raw.notes ?? []).map((body, index) => ({
    id: `demo-note-${slug}-${index + 1}`,
    body,
  }));
  const reminders: DemoReminder[] = (raw.reminders ?? []).map((entry, index) => {
    const dueOn = dayOffset(now, entry.inDays);

    return {
      id: `demo-reminder-${slug}-${index + 1}`,
      body: entry.body,
      dueOn,
      status: reminderStatus(dueOn, now, entry.ticked === true),
    };
  });
  const importantDates: DemoImportantDate[] = (raw.importantDates ?? []).map((entry, index) => ({
    id: `demo-date-${slug}-${index + 1}`,
    name: entry.name,
    fallsOn: dayOffset(now, entry.inDays),
    source: "manual",
  }));
  const birthday =
    raw.birthday === undefined
      ? null
      : birthdayYearsBack(now, raw.birthday.inDays, raw.birthday.age);

  if (birthday !== null) {
    importantDates.unshift({
      id: `demo-date-${slug}-birthday`,
      name: "Birthday",
      fallsOn: birthday,
      source: "birthday",
    });
  }

  return {
    id: raw.id,
    name: raw.name,
    emails: raw.emails ?? [],
    phones: raw.phones ?? [],
    socialLinks: raw.socialLinks ?? [],
    birthday,
    howWeMet: raw.howWeMet ?? null,
    customFields: raw.customFields ?? {},
    labelIds: raw.labelIds ?? [],
    interactions,
    notes,
    reminders,
    importantDates,
  };
}

/**
 * The demo account's address book: fictional people whose dates are relative to
 * `now`, so a fresh seed always lands the dashboard and reminders page in a
 * populated state. The same seed doubles as the test fixture set.
 */
export function buildDemoSeed(now: Date): DemoSeed {
  return {
    fieldDefinitions: [
      { id: fieldIds.coffee, name: "Coffee order", type: "text", options: [] },
      { id: fieldIds.giftBudget, name: "Gift budget", type: "number", options: [] },
      { id: fieldIds.lastGift, name: "Last gift", type: "date", options: [] },
      {
        id: fieldIds.relationship,
        name: "Relationship",
        type: "single-select",
        options: ["Friend", "Family", "Colleague", "Mentor"],
      },
      {
        id: fieldIds.interests,
        name: "Shared interests",
        type: "multi-select",
        options: ["Books", "Cooking", "Film", "Hiking", "Music", "Travel"],
      },
      { id: fieldIds.giftIdeas, name: "Gift ideas", type: "long-text", options: [] },
      { id: fieldIds.innerCircle, name: "Inner circle", type: "boolean", options: [] },
      { id: fieldIds.linkedin, name: "LinkedIn", type: "url", options: [] },
    ],
    labels: [
      { id: labelIds.collegeFriends, name: "college friends" },
      { id: labelIds.work, name: "work" },
      { id: labelIds.family, name: "family" },
      { id: labelIds.bookClub, name: "book club" },
    ],
    contacts: demoContacts(now).map((raw) => buildContact(raw, now)),
  };
}
