# Memoir — Stitch Brief

Everything needed to redesign Memoir in [Google Stitch](https://stitch.withgoogle.com).

**How to use this file**

1. Set Stitch to **Web** (desktop) mode.
2. Paste **Part 1 (App context)** and **Part 2 (Design system)** as your first prompt. Every later prompt builds on it.
3. Paste **one screen prompt from Part 3 at a time** and generate that screen.
4. Use **Part 4 (Components)**, **Part 5 (States and copy)**, and **Part 6 (Hard rules)** whenever a generation drifts off-spec.
5. Attach the real screenshots (paths in the Appendix) as image references when Stitch asks for them.

> What you are producing: a redesign of the existing product, not a new product. Keep the vocabulary, structure, and copy exact. Change the visual execution.

---

# Part 1 — App context (paste first)

**Memoir** is a personal CRM for the people who matter: a private address book where you track the people you know, remember the details of each friendship, and get reminded to reach out. It is deliberately not a sales tool. No pipeline, no deals, no sharing, no teams.

Each person using Memoir keeps their own private set of contacts. Nothing is shared between people.

**Brand line:** "A memoir of everyone you know."
**Subline:** "A personal CRM for the people who matter."
**Onboarding line:** "Your people, all in one place."

## Vocabulary (use these words exactly, in UI and labels)

| Term | Meaning |
|---|---|
| **Contact** | A person you know. Everything hangs off a Contact. Never "person", "profile", or "record". |
| **Interaction** | A dated, typed entry in a contact's log: call, meeting, message, or other. |
| **Timeline** | The chronological list of a contact's Interactions. |
| **Note** | Freeform captured information about a contact. |
| **Reminder** | A dated, one-off prompt to reach out ("call Bob by October 20"). Becomes done when ticked off, overdue past its date. |
| **Important Date** | A date that recurs yearly for a contact (birthday, anniversary). A contact's birthday is one of these automatically. |
| **Label** | A flat, user-defined tag on contacts ("college friends", "work"). No hierarchy. |
| **Custom Field** | A user-defined field on contacts. Types: text, number, date, single-select, multi-select, long text, true/false, link. A contact carries a value per field. |
| **Dashboard** | The app's landing surface: everything that needs you now. |

## Functional system (what the app does)

- **Timeline**: every contact has a chronological thread of Interactions. The header shows a "days since you talked" count; contacts you have not talked to in over 30 days count as slipping.
- **Reminders**: one-off with a due date. States: pending, due today, overdue, done. The Dashboard and the "What's waiting" page surface them.
- **Important Dates**: recur every year, forever. Birthdays feed them automatically, so a birthday is entered once.
- **Labels**: a contact can carry many; the contact list can be filtered by one label at a time via chips.
- **Custom Fields**: users define their own fields in Settings; every contact then carries those fields.
- **Search**: one search box over contact names, notes, and interactions.
- **Privacy**: every surface is per-user private. There is a one-click demo account, filled with a fictional address book, for visitors.
- **Auth**: email + password, plus "Continue with Google".

## Screen map

| # | Screen | Route |
|---|---|---|
| 1 | Landing | `/` |
| 2 | Sign in | `/login` |
| 3 | Create account | `/signup` |
| 4 | Dashboard | `/app` |
| 5 | Contact list | `/app/contacts` |
| 6 | Contact detail | `/app/contacts/:id` |
| 7 | Add / edit contact | `/app/contacts/new` · `/app/contacts/:id/edit` |
| 8 | What's waiting (reminders) | `/app/reminders` |
| 9 | Settings | `/app/settings` |

All app screens (4–9) share one header: the "Memoir" wordmark on the left; on the right, the user's email, quiet text links "Contacts", "Reminders", "Settings", and a ghost "Sign out" button.

---

# Part 2 — Design system (paste with every prompt)

## Concept

The design language is built on one image: **a letter worth keeping**. Warm paper surfaces, ink-dark text, and a single deep ocean blue — the color of letters carried across water. **Fraunces** (a literary serif) carries the brand voice; **Inter** carries the working UI. Warmth is structural, not decorative.

## Colors

**Ocean — the single accent. CTAs, links, focus rings, timeline dots. One filled ocean pill per band.**
- Ocean `#0E5F82` · Pressed `#0A4A66` · Deep water (dark surfaces) `#0C3A54` · Soft `#05B2DC` (fills and dots only, never text) · Subdued fill `#D9EAF2`

**Amber — reserved for one meaning only: Reminders and Important Dates. It never decorates anything else.**
- Amber (text on chips) `#8A5C00` · Amber fill (dots and markers) `#FBAF00` · Amber chip background `#F5E6C8`

**Paper — surfaces. Pure white is banned.**
- Canvas (default page) `#FBF7EF` · Canvas soft (alternating bands) `#F4EDDE` · Vellum (warm interlude band) `#F1E6CF` · Hairline (1px borders) `#E6DCC5` · Input border `#CFC3A4`

**Ink — text. A warm near-black, never navy.**
- Ink `#2B2418` · Secondary `#4D4432` · Mute `#7C7158` · On dark `#FEFEFA`

**Semantic (product UI only)**
- Success `#38701A` on `#DDEDDC` · Warning `#A46A1A` on `#F5E6C8` · Danger `#B3402E` on `#F6DCD5`

## Typography

- **Fraunces** (display, weights 400–600): headlines, section openers, contact names, and the two signature numerals. Never body copy.
- **Inter** (400/500/600): all product UI — forms, tables, chips, body text.

| Style | Font / size | Weight | Use |
|---|---|---|---|
| Display XXL | Fraunces 56 / 1.05 / -0.8px | 500 | Landing hero |
| Display XL | Fraunces 44 | 500 | Section opener |
| Display LG | Fraunces 32 | 500 | Feature band title |
| Display MD | Fraunces 26 | 500 | App page title |
| Contact name | Fraunces 20 | 500 | Contact rows, detail header |
| Numeral | Fraunces 40 | 500 | "Days since" count and age numerals |
| Heading LG / MD / SM | Inter 20 / 17 / 15 | 600 | Product section headings |
| Body LG / MD | Inter 17 / 15 / 1.5 | 400 | Marketing lead / default product body |
| Body tabular | Inter 14, tabular figures | 400 | Every date, day-count, and number |
| Button | Inter 15 | 500 | Pill labels |
| Caption | Inter 13 | 400 | Helper text, row captions |
| Micro-cap | Inter 11 uppercase, 0.08em tracking | 500 | Eyebrows and chips |

Every date, day-count, and numeric value uses tabular figures (`tnum`). This is the product's quiet signal: it runs on time.

## Shape, depth, spacing

- Base spacing unit 8px (2/4/8/12/16/24/32/64). Brand sections pad 64–96px; app surfaces 24–32px. Cards pad 32px (feature) or 16–24px (app) internally — content never touches a card border.
- Radius: 4px hairline tags · 6px inputs · 8px chips · 12px cards and panels · 9999px all buttons, pills, and chips.
- Elevation: Level 1 `0 1px 3px rgba(44,36,24,0.06)` on paper cards; Level 2 `0 8px 24px rgba(44,36,24,0.08), 0 2px 6px rgba(44,36,24,0.05)` on floating panels and product mockups. Nothing heavier.
- **Paper stack**: the brand's depth medium for hero cards — two hairline-bordered sheets, barely rotated (≈0.8° and −0.5°), offset beneath the top card, like letters on a desk.

## Signature elements

1. **Airmail edge** — a 6px tall diagonal-stripe band across the very top of the landing page: ocean stripes with one amber stripe, like the edge of an airmail envelope. Non-negotiable on the landing hero.
2. **Timeline thread** — a 2px vertical hairline line down the contact detail page; each Interaction is marked by a circular dot carrying a small glyph (phone, coffee cup, message bubble, plain circle), birthdays and Important Dates by an amber dot.
3. **Days-since numeral** — a large Fraunces number paired with the caption "days since you talked", in every contact row and on the contact detail header. Ink-colored; amber only when that contact has an overdue Reminder.
4. **Letter avatar** — contacts are shown as circular avatars with the first letter of the name in Fraunces, on a soft paper fill with a hairline border. No photographic avatars in the UI.
5. **Product sheets** — brand pages prove the product with framed screenshots of the real UI (list + timeline) inside a 12px-radius, hairline-bordered, Level 2 shadow frame. Never decorative photography, never gradient art.

## Voice

Plains-spoken, warm, second person, like a thoughtful friend writing a letter. No marketing adjectives. Errors are recovery paths, not blame. Buttons are one verb, sentence case. No exclamation points, no em dashes.

---

# Part 3 — Screen prompts (copy one at a time)

## 1 · Landing page `/`

```text
Design the landing page for "Memoir", a personal CRM for the people who matter. Warm paper
surfaces (#FBF7EF), ink text (#2B2418), a single ocean blue accent (#0E5F82), Fraunces serif
headlines, Inter UI text. Desktop web, ~1200px container.

Top: a 6px diagonal-stripe "airmail edge" band across the whole page width (ocean stripes with
one amber stripe).
Header, sticky, paper background, hairline bottom border: "Memoir" in Fraunces left; center nav
links "The thread", "The details", "The reminders"; right, "Sign in" text link and one filled
ocean pill "Try the demo".

Hero, two columns: left, headline "A memoir of everyone you know." in Fraunces 56px, subline
"A personal CRM for the people who matter." in muted ink, then a filled pill "Try the demo" and
an outline pill "Create your account". Right: a framed product screenshot of the app's contact
list sitting on a "paper stack" (two hairline-bordered sheets slightly rotated and offset beneath
it), with a second smaller framed screenshot of a timeline thread below it, offset right.

Then three feature bands, alternating paper (#FBF7EF) and canvas-soft (#F4EDDE) backgrounds,
each a two-column row: text one side, framed product screenshot the other, alternating sides.
- "The thread" — "Log a call, a coffee, a message. Every contact keeps a timeline, so you can see
  how a friendship is going and what you said last."
- "The details" — "Birthdays, the names of their kids, the book they lent you. Notes, labels, and
  custom fields keep the details that make a friendship work."
- "The reminders" — "Reminders for the reach-outs you owe, and important dates that come back
  every year. Memoir tells you who to write to this week."
Feature titles are Fraunces 32px; body is Inter 17px muted.

Then a full-width vellum band (#F1E6CF): "Your memoir, nobody else's." with "Nothing is shared,
and nobody else can see your people. The demo opens a real memoir, already filled in, and it is
yours to click around."

Footer on paper: "Memoir" wordmark, subline "A personal CRM for the people who matter.", two link
columns headed "The product" (The thread, The details, The reminders) and "Your memoir" (Sign in,
Create your account), and a hairline-separated bottom line: "Private by default. No sharing, no
teams, no pipeline."

No pure white anywhere. No gradients. No navy.
```

## 2 · Sign in `/login`

```text
Design a sign-in screen for "Memoir", a personal CRM. Full-page deep-water background (#0C3A54).
A single narrow column, max ~380px, centered vertically and horizontally.

Top of the column: "MEMOIR" in small uppercase wide-tracked Inter (70% opacity), then "Welcome
back." in Fraunces 32px on-cream (#FEFEFA), then "Sign in to your memoir." in Inter 15px at 70%
opacity.

Form: label "Email" over an input; label "Password" over an input. Inputs on paper (#FBF7EF) with
6px radius and a soft border. Then a full-width cream pill button "Sign in" with deep-water text.
Below it, a full-width outline button "Continue with Google" (outline on dark).

Bottom line in small muted text: "New here? Create your account" with the link underlined.

Labels are small and quiet, one verb per button, no exclamation points.
```

## 3 · Create account `/signup`

```text
Design the account-creation screen for "Memoir", a personal CRM. Same deep-water (#0C3A54)
full-page treatment as the sign-in screen: one centered column max ~380px.

"MEMOIR" small uppercase eyebrow, then "Start your memoir." in Fraunces 32px cream, then the
subline "A personal CRM for the people who matter."

Form: Name, Email, Password fields (labels above, paper inputs, 6px radius), helper text "At least
8 characters." under the password. Full-width cream pill "Create account". Below, an outline
button "Continue with Google".

Bottom line: "Already keep a memoir? Sign in" with the link underlined.
```

## 4 · Dashboard `/app`

```text
Design the app dashboard for "Memoir", a personal CRM. Paper background (#FBF7EF). Top app header:
"Memoir" wordmark in Fraunces left; right, the user's email in small muted text, text links
"Contacts", "Reminders", "Settings", and a ghost "Sign out" button. Content is a centered column
max ~768px with generous padding.

Stack of three cards, each a paper card with a hairline border (#E6DCC5), 12px radius, 24px
internal padding, a Fraunces-free Inter 20px semibold heading, and a quiet text link at the top
right that leads to the surface owning the full list:

1. "Waiting on you" / link "See everything" — a tabular count line like "2 due · 1 overdue · 11 of
   14 contacts up to date" in small muted figures, then a wrapping row of pill chips, each chip
   naming one reminder: due chips are amber text (#8A5C00) on amber background (#F5E6C8); overdue
   chips are danger text (#B3402E) on #F6DCD5. Each chip shows the reminder text plus a smaller
   second line "Contact name · 14 days overdue". Empty state: "Nothing is waiting."

2. "Coming up" / link "All contacts" — a tabular count line "6 birthdays and dates in the next 30
   days · next: in 6 days", then rows divided by hairlines. Each row: a small amber fill dot
   (#FBAF00), the date's name, the contact name in small muted text, and right-aligned "turning
   34" (small muted) plus timing "in 6 days" in tabular figures. Empty state: "Nothing in the next
   30 days."

3. "People to catch up with" — rows of contacts quiet for over 30 days, each row: letter avatar,
   contact name in Fraunces 20px, and right-aligned a large Fraunces days-since numeral with the
   caption "days since you talked" beneath it. Most quiet first. Empty state: "You are up to date
   with everyone."

If the user has no contacts at all, the whole dashboard is replaced by: "Your people, all in one
place." in Fraunces 26px, the line "Add your first contact, and Memoir will help you stay in
touch.", and one filled ocean pill "Add contact".

Amber appears only for reminders and important dates. Exactly one filled ocean element per band.
```

## 5 · Contact list `/app/contacts`

```text
Design the contact list screen for "Memoir", a personal CRM. Paper background (#FBF7EF), same app
header as the dashboard. Content: one centered column max ~576px.

Header row: "Your people" in Fraunces 26px left, a filled ocean pill "Add contact" right.
Below: a search input, placeholder "Search your people".
Below: a wrapping row of label filter chips — "All" plus each user label. Active chip is a filled
ocean pill with cream text; inactive chips are ocean-blue text on pale ocean (#D9EAF2), all
uppercase micro-cap pills.

Then the list: rows divided by hairlines, each row with a circular letter avatar (first letter in
Fraunces on a paper-soft circle), the contact's name in Fraunces 20px with a small muted caption
underneath (their email, or how you met), and right-aligned the days-since numeral in Fraunces
26px with the caption "days since you talked" underneath. Rows hover to a pale ocean wash and have
a 44px+ touch height.

States to draw: filtered-no-results ("Nothing matched "something". Try a name, a place, or
something you talked about." with a ghost "Clear search"), label-with-nobody ("No one carries this
label yet." with a ghost "Show everyone"), and the first-run empty state ("Your people, all in one
place." in Fraunces, the line "Add your first contact, and Memoir will help you stay in touch.",
and a filled ocean pill "Add your first contact").
```

## 6 · Contact detail `/app/contacts/:id`

```text
Design the contact detail screen for "Memoir", a personal CRM. Paper background (#FBF7EF), same
app header. This is the product's calmest, most literary surface. The page chrome stays pinned and
the two panes below scroll independently.

Identity block under the header: a back control at the left (a small left arrow plus the visible
label "Back to Contacts", quiet ink, not a pill), then a large circular letter avatar, an uppercase
micro-cap eyebrow "CONTACT", the contact's name in Fraunces 32px, and at the right the signature
days-since numeral: a Fraunces 40px number with the caption "days since you talked", next to an
outline pill "Edit".

Below: two columns — a wide main column and a 260px reference sidebar.

Main column, in order:
1. A compact form to log an Interaction on a soft paper panel: a type select (Call, Meeting,
   Message, Other), a date field, an optional note, and an ocean pill "Log interaction".
2. "Timeline" in Inter 20px semibold, then the signature timeline thread: a 2px vertical hairline
   line down the left, with each Interaction as a circular dot on the line carrying a small glyph
   (phone for call, cup for meeting, message bubble for message, plain circle for other) in ocean
   blue on a pale ocean circle. Each entry: type name in Inter 15px semibold with the date in
   muted tabular figures beside it, the note below in body text, and two quiet ghost actions
   "Edit" and "Delete" (inline confirmation swaps in: "Delete this interaction?" with "Delete
   interaction" in danger and "Keep it" ghost — never a modal). Empty state: "Nothing logged yet.
   Add a call, a coffee, a message: anything that keeps the thread alive."
3. "Notes" in Inter 20px semibold: each note as body text with Edit/Delete ghost actions and the
   same inline delete confirmation. Adding a note is a compact add-affordance, not a permanently
   open form.

Reference sidebar (scrolls on its own), each block headed in Inter 20px semibold:
- "Details": uppercase micro-cap labels for Emails, Phones, Links, Birthday, How we met, then any
  custom fields, values in muted ink.
- "Labels": applied labels as pale ocean pills, then a small checklist of all labels with
  checkboxes, then a one-line input + "Add" button to create one.
- "Reminders": compact add form; each reminder as text with a due/overdue chip and quiet "Mark
  done" / "Delete" actions.
- "Important dates": each as an amber fill dot with an amber timing chip ("in 6 days"), the age
  ("turning 34"), and a quiet Delete. Birthday-sourced dates are marked "Comes from this contact's
  birthday." and cannot be deleted.

Delete confirmations are always inline, never modal, and always restate the action with a
danger-colored verb and a "Keep it" escape.
```

## 7 · Add / edit contact

```text
Design the "Add a contact" screen for "Memoir", a personal CRM. Paper background, same app
header. Content: one centered column max ~576px.

Above the form: the back control (left arrow + "Back to Contacts") and a title block — uppercase
micro-cap eyebrow "NEW CONTACT" over "Add a contact" in Fraunces 26px.

The form, as quiet sections with comfortable padding:
- Built-in fields: Name, Emails, Phones, Links, Birthday (uses a date field with a calendar glyph),
  and "How we met" as a text area.
- A "Custom fields" section rendering the user's own field definitions — text, number, date,
  single-select, multi-select, long text, true/false, and link inputs, each with the field's name
  as its label.
- Footer actions: a filled ocean pill "Add contact" and a ghost "Cancel".

Inputs: paper background, 6px radius, 1px soft border; focus swaps the border to ocean blue with a
2px ocean focus ring. Every date control looks like a text input with a calendar glyph, and opens
a paper panel with month and year dropdowns, weekday labels in uppercase micro-caps, today ringed
in ocean, and the selected day filled ocean. No native browser date pickers, no amber in these
panels.

The edit screen is the same layout, titled "Edit contact", submitting "Save changes".
```

## 8 · What's waiting `/app/reminders`

```text
Design the reminders screen for "Memoir", a personal CRM. Paper background, same app header.
Content: one centered column max ~768px.

Title row: the back control (left arrow + "Back to Dashboard") then "What's waiting" in Fraunces
26px.

Then up to four sections, each an Inter 20px semibold heading over a bordered list card (hairline
border, 12px radius, rows divided by hairlines):
- "Overdue" — reminder rows: the reminder text, an overdue chip (danger text #B3402E on #F6DCD5)
  reading "14 days overdue", the contact name in small muted text, and a ghost "Tick off" action
  on the right.
- "Due" — the same rows with an amber due chip "due today".
- "Upcoming" — a merged, date-sorted list of pending reminders and Important Dates: Important
  Date rows show an amber fill dot with an amber timing chip and, at the right, the age as a
  large Fraunces numeral with "turning" or "years".
- "Birthdays this week" — Important Date rows for birthdays within the next week.

Whole-list empty state: "Nothing is waiting. Add a reminder or an important date to a contact, and
it will show up here."
```

## 9 · Settings `/app/settings`

```text
Design the settings screen for "Memoir", a personal CRM. Paper background, same app header.
Content: one centered column max ~576px.

Title block: uppercase micro-cap eyebrow "SETTINGS" over "Your account" in Fraunces 26px.

Then stacked sections, each a paper card with a hairline border, 12px radius, and 24px internal
padding:
1. "Profile" — the user's name and email in one quiet line.
2. "Custom fields" — explanatory caption "Track the details that matter to you. Every contact can
   carry a value for each field."; a small add-form (Name input, Type select, and an Options input
   that appears only for select types, with the helper "Separate options with commas."); then a
   hairline-divided list of existing fields, each showing the field name, a muted "8 contacts"
   count, and a summary line like "Single-select · Home, Work, College", with quiet "Rename" and
   "Delete" actions. Inline rename swaps in an input with Save and Cancel; inline delete shows a
   precise sentence — Delete the field "Gift ideas"? Its values come off 8 contacts. This can't be
   undone. — with a danger "Delete field" and a ghost "Keep it".
3. "Labels" — caption "Group your contacts and filter the contact list by them."; input + "Add
   label"; hairline-divided rows of label name plus contact count with Rename and Delete.
4. A danger-zone card with a soft danger border: "Delete your account" in danger color, the line
   "Deleting your account removes everything: contacts, timeline, notes, reminders. This can't be
   undone.", an outline "Delete my account" button that reveals a password field with the helper
   "Enter your password to confirm.", a danger submit "Delete my account" and a ghost "Keep my
   account".

Quiet confirmation language everywhere: no dialogs, no red banners until something is actually
wrong.
```

## 10 · Component sheet (optional extra prompt)

```text
Design a component sheet for "Memoir", a warm paper-and-ink personal CRM. Show these components
side by side on a paper canvas (#FBF7EF), each labeled with its name:
- Pill buttons: primary (ocean fill, cream text), secondary (outline ocean), ghost (transparent,
  ink text), danger (deep red fill), on-dark (cream fill, deep-water text) — all fully rounded.
- Chips: soft label tag (ocean text on pale ocean), due reminder chip (amber on #F5E6C8), overdue
  reminder chip (danger on #F6DCD5), all uppercase micro-caps.
- Inputs: text input, text area, date field with calendar glyph, select with chevron — paper fill,
  6px radius, soft border, ocean focus ring.
- A date-picker panel and a select panel: paper surfaces, 12px radius, Level 2 shadow.
- Cards: feature card (paper, hairline, 32px padding), vellum card (#F1E6CF), deep-water card
  (#0C3A54), contact row (avatar, Fraunces name, days-since numeral).
- The signature elements: the 6px airmail stripe band; the timeline thread with glyph dots and an
  amber birthday dot; the Fraunces days-since numeral with its caption; the circular letter
  avatar; a framed product sheet; a paper stack of offset sheets.
No pure white. No gradients. No extra hues. Amber only on reminder and date elements.
```

---

# Part 4 — Components (consistency reference)

| Component | Spec |
|---|---|
| **Primary pill** | Ocean `#0E5F82` fill, cream `#FEFEFA` text, 8×16px padding, fully rounded. One per band. Pressed: `#0A4A66`. |
| **Secondary pill** | Paper fill, ocean text, 1px ocean border, same geometry. |
| **Ghost button** | Transparent, ink-secondary text, paper-soft hover, same geometry. |
| **On-dark button** | Cream fill, deep-water `#0C3A54` text. |
| **Soft tag** | Pale ocean `#D9EAF2` fill, ocean text, uppercase micro-cap. |
| **Due chip** | `#F5E6C8` fill, amber `#8A5C00` text, uppercase micro-cap, fully rounded. |
| **Overdue chip** | `#F6DCD5` fill, danger `#B3402E` text, same shape. |
| **Text input** | Paper fill, 6px radius, 1px `#CFC3A4` border; focus: ocean border + 2px ocean ring. |
| **Date field** | Looks like a text input with a 16px calendar glyph in muted ink at the right. Panel: paper, 12px radius, Level 2 shadow, month/year dropdowns in the caption, weekday labels in micro-caps, today ringed ocean, selected day filled ocean. |
| **Select field** | Same trigger as the date field with a chevron; same panel; highlighted option is pale ocean on ink; selected option carries an ocean check. |
| **App header** | Paper, hairline bottom border: wordmark left; email + Contacts / Reminders / Settings links + ghost Sign out right. |
| **Back control** | Left arrow (16px, muted) + a visible destination label ("Back to Contacts"), quiet ink, 44px hit area, never a pill, never on a top-level screen. |
| **Letter avatar** | 40px circle, paper-soft fill, hairline border, first letter in Fraunces 17px ink. |
| **Timeline thread** | 2px hairline vertical line; per Interaction a 28px circular pale-ocean dot with an ocean glyph; amber fill dot for birthdays and Important Dates. |
| **Days-since numeral** | Fraunces 40px number + caption "days since you talked"; ink normally, amber only when that contact has an overdue Reminder. |
| **Error note** | Small note: danger text on `#F6DCD5`, 8px radius, never a full-page red state. |
| **Inline confirmation** | In place of a modal: one plain sentence restating what will be removed, a danger-colored button naming the object ("Delete note", "Remove Bob"), and a ghost escape ("Keep it"). |

---

# Part 5 — States and copy

**Loading** (a quiet centered caption on paper, never a spinner alone):
- "Fetching your memoir" · "Fetching your people" · "Fetching your dashboard" · "Fetching what's waiting" · "Fetching this contact" · "Fetching your fields" · "Fetching your labels"

**Empty states** (each teaches the space):
- Contact list, first run: "Your people, all in one place. Add your first contact, and Memoir will help you stay in touch."
- Timeline: "Nothing logged yet. Add a call, a coffee, a message: anything that keeps the thread alive."
- No notes: "No notes yet." · No labels: "No labels yet." · No custom fields: "No custom fields yet. Add one above, and it appears on every contact."
- Search miss: "Nothing matched "…". Try a name, a place, or something you talked about." → ghost "Clear search"
- Label filter miss: "No one carries this label yet." → ghost "Show everyone"
- Dashboard: "Nothing is waiting." · "Nothing in the next 30 days." · "You are up to date with everyone."
- Reminders page: "Nothing is waiting. Add a reminder or an important date to a contact, and it will show up here."

**Success / progress**: "Saved." · "Interaction logged." · "Logging the coffee" · "Saving changes" · "Setting up the demo" · "Signing you in" · "Creating your account" · "Ticking off"

**Errors** (recovery paths, no blame, no "we"): "That didn't save. Your note is still here, try again." · "That email and password don't match an account. Try again." · "That email already has a memoir. Sign in instead." · "That password doesn't match. Nothing was deleted." · "Use at least 8 characters for your password."

**Destructive copy**: "Remove Bob from Memoir? You'll lose their timeline and notes. This can't be undone." Buttons: "Remove Bob" / "Keep Bob". · Delete the field "Gift ideas"? Its values come off 8 contacts. This can't be undone. · "Key revoked. Existing sessions stop working immediately."

---

# Part 6 — Hard rules

**Always**
- Paper `#FBF7EF` is the default surface. Warmth is the brand; keep the airmail edge on the landing hero.
- Fraunces for display tiers, contact names, and numerals only; Inter for everything else.
- Tabular figures on every date, day-count, and number.
- One filled ocean pill per band; everything else outline, ghost, or text.
- Cards get comfortable internal padding (16–24px app, 32px brand); content never touches the border.
- Confirmations restate the action in the buttons themselves ("Delete note" / "Keep it") and stay inline.

**Never**
- Pure white surfaces; navy; gradient meshes, blobs, or unearned blur.
- New hues outside ocean, amber, ink, paper, and the semantic trio.
- Amber as decoration, or for anything other than reminders and Important Dates.
- Body copy in a serif; the days-since numeral in a sans.
- Modals for confirmations; "OK", "Submit", or yes/no dialogs; exclamation points; em dashes.
- The banned words: manage, leverage, seamless, intuitive, powerful, streamline, empower, utilize.
- Synonyms for the vocabulary: no "person", "profile", "record", "tag", "task", "activity", "account" (as a person), "feed", "home".

**Responsive**: design desktop first (content columns 576–1200px). Tablet: the contact detail sidebar stacks below the main column, and the back control moves to its own row above the title. Mobile: display sizes drop 56 → 32px, the contact list fills the screen and detail replaces it, hairline dividers get a little more air, and every tap target stays at least 44px.

---

# Appendix — Reference screenshots to attach

Real screenshots of today's UI live in `apps/web/src/assets/` and can be attached to a Stitch prompt as visual reference:

| File | Shows |
|---|---|
| `contacts-list.png` | The contact list with days-since numerals |
| `contact-thread.png` · `contact-thread-mobile.png` | The timeline thread |
| `contact-details.png` | A contact's details and custom fields |
| `contact-labels.png` | Labels applied to a contact |
| `reminders-due.png` · `reminders-due-mobile.png` | Due and overdue reminder chips |

The full design authority is `design.md` in the repo root; this brief is a condensed, Stitch-ready copy of it plus the shipped screen inventory.
