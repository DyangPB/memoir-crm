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

**Reminder**:
A dated, one-off prompt to re-engage with a contact ("call Bob by October 20"). Hangs off a Contact. A reminder is pending until ticked off, then becomes done (or overdue past its date).
_Avoid_: Task, follow-up (use Reminder)

**Important Date**:
A date that recurs yearly for a contact — birthday, anniversary. Drives the recurring reminders feed. A contact's birthday is one of these.
_Avoid_: Recurring event, anniversary (use Important Date for the general concept)

**Label**:
A user-defined tag applied to Contacts for organization ("college friends", "work"). Flat: a Contact has many Labels, one level deep, no hierarchy.
_Avoid_: Tag, group, category (use Label)

**Field Definition**:
A user's declaration of a Custom Field: its name, its type (text, number, date, single-select, multi-select, long text, boolean, URL), and for selects, its options. Stored per user; values live on each Contact.
_Avoid_: Field schema, custom column, property definition