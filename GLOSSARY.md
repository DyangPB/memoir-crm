# Personal CRM

A web app for documenting personal contacts and relationships, outside any business/sales context. Each user keeps a private address book of the people they know, with an activity timeline, reminders, and notes.

## Language

**Personal CRM**:
Tools that mimic CRM behavior for personal contacts rather than customers — "a CRM for your friends and family," not a sales pipeline.
_Avoid_: CRM (unqualified), PRM, relationship manager

**User**:
A person with an account in the app. Every user's data is private to them and invisible to all other users; there is no data sharing between users.
_Avoid_: Account, member, customer

**Contact**:
The core entity: a person the user knows and wants to keep track of. Everything (timeline, notes, reminders) hangs off a Contact.
_Avoid_: Person (use Contact for the entity), lead, profile

**Custom Field**:
A user-defined field on a Contact, in addition to the built-in fields (name, email, birthday, …). The user decides the field's name and type.
_Avoid_: Custom attribute, extension, property

**Interaction**:
A dated, typed entry in the log of exchanges with a contact (call, meeting, message, other). Answers "when did we last talk?"
_Avoid_: Activity, touchpoint, event (use Interaction for log entries)

**Note**:
Freeform captured information about a contact. Answers "what should I remember about them?"
_Avoid_: Memo, comment (use Note)

**Timeline**:
The chronological list of a contact's Interactions, shown on the contact's page.
_Avoid_: Feed, activity log (use Timeline)

**Dashboard**:
The app's landing surface. What needs you now: Reminders due and overdue, Important Dates coming up, and Contacts you have not talked to in a while.
_Avoid_: Home, feed, overview (use Dashboard)

**Reminder**:
A dated, one-off prompt to re-engage with a contact ("call Bob by October 20"). Hangs off a Contact. A reminder is pending until ticked off, then becomes done (or overdue past its date).
_Avoid_: Task, follow-up (use Reminder)

**Important Date**:
A date that recurs yearly for a contact — birthday, anniversary. Drives the recurring reminders feed. A contact's birthday is one of these.
_Avoid_: Recurring event, anniversary (use Important Date for the general concept)

**Cadence**:
How often the user intends to be in touch with a Contact, expressed as a target interval ("every 30 days"). A global default applies unless the Contact overrides it or opts out; a Contact past their Cadence is due for outreach. A Contact with no Interactions yet has no "days since", so it is not measured against its Cadence.
_Avoid_: Frequency, rhythm, schedule

**Cadence Health**:
The share of cadence-tracked Contacts currently within their target interval, shown as a percentage ("84% in touch"). Contacts that opted out, or have no Interactions yet, are left out.
_Avoid_: Score, rating

**Label**:
A user-defined tag applied to Contacts for organization ("college friends", "work"). Flat: a Contact has many Labels, one level deep, no hierarchy.
_Avoid_: Tag, group, category (use Label)

**Field Definition**:
A user's declaration of a Custom Field: its name, its type (text, number, date, single-select, multi-select, long text, boolean, URL), and for selects, its options. Stored per user; values live on each Contact.
_Avoid_: Field schema, custom column, property definition

**Photo**:
The picture of a Contact, uploaded by the user and shown in place of their letter avatar. At most one per Contact; replacing it removes the old one. Contacts without one keep the letter avatar.
_Avoid_: Avatar image, profile picture, headshot (use Photo; "letter avatar" is the fallback)

**Attachment**:
A file added to an Interaction: images show inline in the Timeline, anything else is a download. Belongs to one Interaction and goes with it when the Interaction or its Contact is deleted.
_Avoid_: Upload, document, media (use Attachment for the file, Photo for a Contact's picture)

**API Key**:
A secret a User generates in Settings so an AI assistant can use their Memoir over MCP. Shown once when created, stored only as a hash, and revoked at any time; revoking stops it working immediately. It reaches the assistant tools only, never the web app's own API.
_Avoid_: Token, password, MCP key (use API Key)

**Memoir calendar**:
The secondary Google calendar named "Memoir" that Memoir creates in a connected Google account. Every dated Reminder and Important Date is mirrored there, in both directions, so they show on the user's phone. A birthday goes one way only (Memoir's version wins), and a done Reminder has no event. Disconnecting stops the syncing and leaves the calendar in Google.
_Avoid_: Sync calendar, Memoir feed

**Google layer**:
Events from the Google calendars the user chose to show on the Calendar, read-only beside Memoir's own items. Never includes the Memoir calendar itself.
_Avoid_: Imported calendar, external events
