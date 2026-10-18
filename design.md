# Memoir Design Language

## Overview

Memoir's design language is built on one image: **a letter worth keeping**. Warm paper surfaces, ink-dark text, and a single deep ocean blue, the color of letters carried across water. The brand motif is the **airmail edge**: the thin diagonal stripe band of an airmail envelope, in ocean blue and amber, running across the top of every page and along the top of the cards that matter most. It belongs to the product's story: keeping in touch across time and distance.

The color system has two working colors. **Ocean** (`{colors.primary}`, `#0e5f82`) is the signature action color, used sparingly: one filled pill per band, plus focus rings, selected states, and inline links. **Amber** (`{colors.amber}`) has one meaning, **something is owed to someone**: a due Reminder, an Important Date coming up, a Contact you have gone quiet on past your own Cadence. It never decorates. **Ink** (`{colors.ink}`, `#2b2418`) is the universal text color, a warm near-black that reads as ink on paper. Dark surfaces are deep water (`{colors.ocean-deep}`, `#0c3a54`), never navy.

Typography pairs a literary serif with a working sans. **Newsreader** (display, weights 400 to 700) carries the brand voice on heroes, page titles, contact names, and the signature "days since" numeral. **Inter** (400/500/600) does the product UI work: forms, chips, tables, and body text at 12 to 16px where a serif would lose legibility. Serif is earned by role, not applied by habit.

Icons are **Material Symbols Outlined**, drawn from one font, always decorative: the label carries the meaning, the glyph only helps the eye find it.

**Key Characteristics:**
- Paper-first surfaces: `{colors.canvas}` (`#fbf7ef`) is the page background everywhere. Pure white never appears.
- Airmail edge across the header of every page and the top of the cards that start something (a quick-add card, the Waiting on you card), and on the auth pages.
- Single-ocean action hierarchy: one filled `{colors.primary}` pill per band; everything else is outline, ghost, or text.
- Newsreader for display tiers and the product's two signature numerals: the "days since you talked" count and Important Date years.
- Amber means attention is owed, and nothing else.
- Photos are circles, and a Contact without one gets their letter, so the list reads the same either way.
- Tabular figures (`tnum`) on every date, day-count, and numeric cell: the quiet signal that this app runs on time.

## Colors

> **Source surfaces:** landing (`/`), auth, Dashboard, Contacts, Reminders, Calendar, Settings.

> **Accent palette.** The accent and semantic accents come from the project's coolors set: ocean-deep `#0c3a54`, ocean-soft `#05b2dc`, amber-fill `#fbaf00`, success-fill `#63c132`, on-primary `#fefefa`. Where a color has to carry text, the token is derived from its seed so it clears 4.5:1 against its background: amber `#8a5c00` on `{colors.amber-bg}`, success `#38701a` on `#ddeddc`. Bright seeds are for fills, dots, and markers, never for text.

### Brand & Accent
- **Ocean** (`{colors.primary}`, `#0e5f82`): The brand's action color. Filled-pill button, link emphasis, focus rings, the selected day on the Calendar, timeline dots.
- **Ocean Press** (`{colors.primary-press}`, `#0a4a66`): Pressed-state lift of the primary.
- **Ocean Deep** (`{colors.ocean-deep}`, `#0c3a54`): Deep water. Dark surfaces and the auth page background.
- **Ocean Soft** (`{colors.primary-soft}`, `#05b2dc`): Lighter ocean for fills, dots, and chart marks only, never text.
- **Ocean Subdued** (`{colors.primary-bg-subdued}`, `#d9eaf2`): Pale ocean fill for open Reminder chips, selected rows, hover rows, and the Cadence Health pill.
- **Amber** (`{colors.amber}`, `#8a5c00`): Attention as text. Due chips, Important Date labels, a days-since numeral past its Cadence. 4.7:1 on `{colors.amber-bg}`. Never a button, never decoration.
- **Amber Fill** (`{colors.amber-fill}`, `#fbaf00`): Attention as a mark. Important Date dots, the amber stripe in the airmail edge, the "items need action" dot. Never carries text.
- **Amber Soft** (`{colors.amber-bg}`, `#f5e6c8`): Due chip and Important Date chip background.

- **Aliases the components use:** `{colors.primary-container}` is the same ocean as `{colors.primary}` (`#0e5f82`), used by the Stitch-derived components for the current tab and the selected day. `{colors.ocean-subdued}` is `{colors.primary-bg-subdued}` (`#d9eaf2`). `{colors.danger-bg}` is the danger background (`#f6dcd5`), defined under Semantic below. When a component names an alias, it means the token it points at.

### Surface
- **Canvas** (`{colors.canvas}`, `#fbf7ef`): Default page background. Warm paper; never pure white.
- **Canvas Soft** (`{colors.canvas-soft}`, `#f4edde`): Warm-tinted band for secondary surfaces: the tab strip, week and leading-day cells, done chips.
- **Vellum** (`{colors.vellum}`, `#f1e6cf`): Deeper warm band for interludes: the On this day strip and the landing page's interlude band.
- **Hairline** (`{colors.hairline}`, `#e6dcc5`): 1px borders on cards, grids, and dividers.
- **Hairline Input** (`{colors.hairline-input}`, `#cfc3a4`): Form input borders.

### Text
- **Ink** (`{colors.ink}`, `#2b2418`): Default body text. Warm near-black, never pure black, never navy.
- **Ink Secondary** (`{colors.ink-secondary}`, `#4d4432`): Secondary text on paper.
- **Ink Mute** (`{colors.ink-mute}`, `#7c7158`): Helper text, captions, labels, and anything finished (a done Reminder).
- **On Primary** (`{colors.on-primary}`, `#fefefa`): Text on ocean and deep-water surfaces.

### Semantic (product UI only)
- **Success** (`{colors.success}`, `#38701a`), fill `{colors.success-fill}` (`#63c132`), bg `#ddeddc`: saved states and the "synced" dot. The fill takes the green mark; the text token stays dark enough to read.
- **Warning** (`{colors.warning}`, `#a46a1a`), bg `#f5e6c8`: approaching-due states.
- **Danger** (`{colors.danger}`, `#b3402e`), bg `#f6dcd5`: overdue Reminders, a failed sync, destructive actions.

## Typography

### Font Family

**Display: Newsreader** (variable, optical sizes 6 to 72) at weights 400 to 700, with Source Serif 4 then Georgia behind it. A warm literary serif with an editorial voice: the letter-writing voice. Used for display tiers, page titles, contact names, and signature numerals.

**UI: Inter** at weights 400/500/600. A neutral working sans for forms, chips, tables, and body copy. Chosen deliberately for small-size legibility; the serif carries brand, the sans carries work.

### Hierarchy

| Token | Font/Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xxl}` | Newsreader 56px | 500 | 1.05 | -0.8px | Landing hero headline |
| `{typography.display-xl}` | Newsreader 48px | 600 | 56px | -0.02em | Section opener |
| `{typography.display-lg}` | Newsreader 32px | 500 | 40px | -0.01em | Dashboard greeting, contact name in the detail header |
| `{typography.display-md}` | Newsreader 24px | 500 | 32px | 0 | Page title, month title, Important Date years |
| `{typography.headline-sm}` | Newsreader 20px | 500 | 28px | 0 | Card and settings section titles, the On this day line |
| `{typography.contact-name}` | Newsreader 20px | 500 | 28px | 0 | Contact name in list rows |
| `{typography.numeral}` | Newsreader 40px | 500 | 1.0 | -0.4px | "Days since" count |
| `{typography.heading-lg}` | Inter 20px | 600 | 1.3 | 0 | Product section heading |
| `{typography.heading-md}` | Inter 17px | 600 | 1.35 | 0 | Sub-section heading |
| `{typography.heading-sm}` | Inter 15px | 600 | 1.4 | 0 | Timeline entry title |
| `{typography.body-lg}` | Inter 16px | 400 | 26px | 0 | Marketing body lead |
| `{typography.body-md}` | Inter 14px | 400 | 22px | 0 | Default product body |
| `{typography.body-tabular}` | Inter 14px | 400 | 1.5 | -0.2px | Dates, day-counts, numeric cells (`tnum`) |
| `{typography.button-md}` | Inter 14px | 600 | 1.0 | 0 | Pill button label, tab label |
| `{typography.label-lg}` | Inter 14px | 600 | 20px | 0 | Nav items, pills |
| `{typography.caption}` | Inter 13px | 400 | 1.4 | 0 | Helper text, chip detail, labels |
| `{typography.micro-cap}` | Inter 11px | 500 | 1.15 | 0.08em | All-caps eyebrow, status chips, weekday headings |

### Principles
- **Serif is earned.** Newsreader appears only in display roles: headlines, titles, contact names, and numerals. Body copy is always Inter.
- **Modest negative tracking.** Serifs need less compression than geometric sans: -0.8px at 56px, scaling to 0 at 24px and below.
- **Tabular figures for time.** Any cell rendering a date, a day-count, or a numeric value uses `tnum`. Time is the product's quiet data signal.
- **Weight 500 is the serif voice.** Newsreader at 500 reads warm and confident; 600 for emphasis, never below 400.

### Note on Font Substitutes
Newsreader and Inter are open-source (Google Fonts). If Newsreader is unavailable, fall back to **Source Serif 4** at 500, then Georgia. If Inter is unavailable, fall back to system-ui sans. Do not substitute a geometric sans (Poppins, Montserrat) for Inter, which is too round; do not substitute a Didone serif (Playfair) for Newsreader, which is too cold.

### Icons
Material Symbols Outlined, loaded as a font and set in text-size classes (`text-base` to `text-2xl`). Glyphs are looked up by ligature name (`schedule`, `cake`, `event`, `attach_file`) through one `Icon` component, are `aria-hidden`, and take the color of the text beside them. Filled variants are for a selected or confirmed state only. An icon never stands alone: it sits beside a label, or its button carries an `aria-label`.

## Layout

### Spacing System
- **Scale**: Tailwind's 4px steps (8px is the usual unit, with 2, 4, and 12px for fine work). A few layouts use named tokens: `space-xs` 6px, `space-sm` 8px, `space-md` 16px, `space-lg` 24px, `space-xl` 40px, with a 32px page margin and a 24px gutter.
- **Section padding**: 64 to 96px on brand surfaces; 24 to 48px on app surfaces.
- **Card internal padding**: 32px on feature cards; 16 to 24px on app cards.

### Grid & Container
- Brand pages center in a 72rem (1152px) container, Tailwind's `max-w-6xl`; the airmail edge extends edge-to-edge above.
- The app is five surfaces under one shared header: **Dashboard**, **Contacts**, **Reminders**, **Calendar**, **Settings**. The header carries the airmail edge, the wordmark, the five links (the current one in `{colors.primary-bg-subdued}`), and the sign-out control.
- **Contacts is a split pane.** A 22rem list rail (the "Your people" title with "Add contact", the Cadence Health pill, search, Label chips, then the rows) sits beside the selected Contact's detail. Below Tablet the list fills the screen and the detail replaces it (push navigation), with a back control.
- **Contact detail** is two panes under pinned chrome. From Tablet up the Contacts page fits the viewport and never scrolls as a whole: the app header and the identity block stay put. From Wide up the main column (the Timeline thread, then Reminders, then Notes, with prose capped at 80ch) and a 260px reference sidebar (Details with the custom fields, Labels, Important Dates only) each scroll on their own. Below Wide the sidebar stacks under the main column and the pane scrolls as one.
- **Dashboard** is a single centered column: a greeting with the "Log interaction" action, then the cards.
- **Reminders** is a centered column: header, tab strip, quick-add card, then the sections.
- **Calendar** is a wide page: toolbar, layer toggles, then the view. Month sits beside a 320px selected-day panel; Week, Day, and Agenda fill the width.

### Whitespace Philosophy
Paper needs room to breathe. Brand sections keep 96px gaps; the app tightens to 16 to 24px between related controls. The contact detail is the product's calmest surface: one thread, one reference sidebar, generous vertical rhythm on the timeline.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 | Flat | Default surface |
| 1 | `box-shadow: rgba(44,36,24,0.06) 0 1px 3px` | Card lift on paper |
| 2 | `box-shadow: rgba(44,36,24,0.08) 0 8px 24px, rgba(44,36,24,0.05) 0 2px 6px` | Floating panels, dialogs, product mockup chrome |
| 3 | Paper stack | Decorative depth: two offset sheets (hairline borders, 1px rotation) under a hero card, like letters stacked on a desk |

### Decorative Depth
The **paper stack** is the brand's depth medium: layered sheets, not gradient meshes and not heavy shadows. Literal shadows stay subtle (Levels 1 to 2); the stack is reserved for hero cards.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Hairline labels, table chrome, calendar chips |
| `{rounded.sm}` | 6px | Small controls (hover rows, the close control) |
| `{rounded.md}` | 8px | Form inputs, compact cards, alerts, header links |
| `{rounded.lg}` | 12px | Feature cards, detail panels, quick-add cards, the Calendar grid |
| `{rounded.pill}` | 9999px | All buttons, tag pills, status chips, avatars, attachment chips |

### Imagery Geometry
The brand uses **contact-sheet composites**, real screenshots of the app's timeline and list UI, more than photography. Composites render inside `{rounded.lg}` containers with a 1px `{colors.hairline}` border and Level 2 shadow. A Contact's **Photo** is always a circle: 40px in the list, 64px in the detail header, `object-cover`, 1px `{colors.hairline}` border. With no Photo, the **letter avatar** takes the same circle: the first letter in Newsreader on `{colors.canvas-soft}`. An image attached to an Interaction is the one rectangle: shown inline in the Timeline at most 12rem tall, `{rounded.md}`, 1px hairline border.

## Components

### Buttons

**`button-primary-pill`**: the dominant action system-wide.
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-md}`, height 40px, rounded `{rounded.pill}`.
- Pressed state shifts background to `{colors.primary-press}`.

**`button-secondary`**: outline-style alternative.
- Background `{colors.canvas}`, text `{colors.primary}`, 1px solid `{colors.primary}` border, same pill geometry.

**`button-ghost`**: quiet action ("Edit", "Mark done", "Attach file", "Cancel").
- Transparent background, text `{colors.ink-secondary}`, hover background `{colors.canvas-soft}`, same pill geometry.

**`button-danger`**: destructive confirmation only, after the action has been restated ("Delete interaction", "Disconnect").
- Background `{colors.danger}`, text `{colors.on-primary}`, same pill geometry.

**`button-on-dark`**: used on deep-water surfaces.
- Background `{colors.canvas}`, text `{colors.ocean-deep}`, same pill geometry.

### Cards & Containers

**`card-feature-light`**: a block on paper.
- Background `{colors.canvas}`, padding `32px`, rounded `{rounded.lg}`, 1px `{colors.hairline}` border.

**`card-airmail`**: a card that starts something, topped with the airmail edge.
- `card-feature-light` with a 6px airmail edge across its top. Used for the Waiting on you card, the Reminders quick-add card, and the Calendar's add-reminder card.

**`card-vellum`**: warm interlude card.
- Background `{colors.vellum}`, text `{colors.ink}`, padding `32px`, rounded `{rounded.lg}`. Used for the On this day strip and the landing page's interlude band.

**`card-dark-water`**: the inverted tier.
- Background `{colors.ocean-deep}`, text `{colors.on-primary}`, otherwise identical to `card-feature-light`.

**`card-contact-row`**: one Contact in the list rail.
- Flat paper row, bottom `{colors.hairline}` divider, avatar left, `{typography.contact-name}` over a `{typography.caption}` line, the days-since numeral right. Hover and the selected row: `{colors.primary-bg-subdued}` background, 6px radius, no elevation.

**`reminder-row`**: one Reminder on the Reminders page.
- A `{rounded.lg}` hairline card: a 20px check box at the left, the Reminder in `{typography.body-md}` over a status chip, its day, and the Contact; "Mark done" (ghost) and "Reschedule" (secondary) at the right. Reschedule swaps the buttons for a date field with "Save date" and "Cancel", so nothing opens a form. A done Reminder fades to 60%, struck through, and its chip turns `{colors.ink-mute}` on `{colors.canvas-soft}`.

**`log-interaction-dialog`**: record a moment from anywhere.
- A native dialog on a `{colors.canvas}` panel at `{rounded.lg}` with Level 2 shadow, opened by the Dashboard's "Log interaction" pill. A Contact select (placeholder "Choose a contact"), then the same Interaction form as the Timeline (type, date, note), with "Log interaction" as its one primary pill and a close control. It closes itself once the Interaction is logged.

**`attachment`**: a file on an Interaction.
- Images show inline (see Imagery Geometry). Every other file is a pill chip: `attach_file` glyph, the name truncated, the size in `{typography.caption}` `tnum`, 1px `{colors.hairline-input}` border; a small circular close control beside it removes the file.

### Inputs & Forms

**`text-input`**: standard form field.
- Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}`, 1px `{colors.hairline-input}` border, 40px tall.
- Focus state: border swaps to `{colors.primary}`, plus a 2px ring in `{colors.primary}` at 30% opacity.

**`date-field`**: every date (birthday, Interaction date, Reminder due date, Important Date, Calendar's add reminder).
- Today, the browser's own date control wearing the `text-input` look. A designed panel (month and year dropdowns, today ringed in `{colors.primary}`, the chosen day filled `{colors.primary}`, no amber) is planned and tracked as its own issue.

**`select-field`**: every select (Interaction type, single-select custom fields, the quick-add Contact).
- Trigger and focus identical to `text-input`, with the browser's chevron. A designed panel is planned alongside the date field.

**`quick-date`**: the Reminders quick-add "When" field.
- A `text-input` that reads plain words ("in 3 days", "next Friday", "Oct 28"). What it understood shows beneath as "Scheduled 23 Oct 2026" in `{typography.caption}` `{colors.ink-mute}`; if it can't read the words, a `date-field` appears under a short line of help instead of an error.

**`cadence-field`**: how often you mean to be in touch with a Contact.
- A `select-field` ("Use my default (every 30 days)", "Choose my own", or "Don't track") that reveals a days input only for "Choose my own".

### Navigation

**`app-header`**: the page header on every app surface.
- Background `{colors.canvas}` under a 6px airmail edge; Newsreader wordmark left, the five surface links in `{typography.label-lg}` at `{rounded.md}`, and the signed-in email (on wider screens) with a ghost "Sign out" right.

**`back-to-parent`**: the way back from a surface one level deep (new and edit Contact, Reminders, Calendar).
- An inline control at the left of the page title: a 16px `arrow_back` in `{colors.ink-mute}` plus a label in `{typography.body-md}` `{colors.ink-secondary}`, naming the destination ("Back to Contacts", "Back to Dashboard").
- Hover: label `{colors.ink}` on a `{colors.canvas-soft}` background at `{rounded.sm}`. Hit area at least 44px tall.
- Never a pill button, and never on a top-level surface.

**`tab-strip`**: filters over one list (Reminders: All, Due & Overdue, Upcoming, Completed).
- A `{colors.canvas-soft}` track at `{rounded.lg}` with a 1px hairline border; each tab is `{typography.button-md}`. The current tab sits on `{colors.canvas}` in `{colors.primary-container}` with Level 1 shadow; the others are `{colors.ink-mute}`. Counts follow the label in `tnum`.

**`view-switcher`**: the Calendar's Month, Week, Day, and Agenda.
- The same track and pill geometry as `tab-strip`, but it is a group of toggle buttons (`aria-pressed`), because choosing a view changes how one page is drawn rather than switching between panels.

### Pills, Tags, and Chips

**`pill-label-soft`**: subdued label.
- Background `{colors.primary-bg-subdued}`, text `{colors.primary}`, type `{typography.micro-cap}`, padding 4px 8px, rounded `{rounded.pill}`.

**`chip-reminder-due`**: due or upcoming Reminder, and any Important Date.
- Background `{colors.amber-bg}`, text `{colors.amber}`, same geometry as `pill-label-soft`.

**`chip-reminder-overdue`**: overdue Reminder.
- Background `{colors.danger-bg}`, text `{colors.danger}`, same geometry.

**`pill-cadence-health`**: how many of your cadence-tracked Contacts are within their target ("84% in touch").
- Background `{colors.ocean-subdued}`, text `{colors.primary-container}`, `{typography.label-lg}`, `tnum`, rounded `{rounded.pill}`. Its tooltip gives the counts. Hidden when no Contact is tracked.

**`pill-sync`**: Google Calendar's state on the Calendar page.
- A hairline `{colors.canvas-soft}` pill: a `{colors.success-fill}` dot (pulsing while syncing), the status in `{typography.caption}` ("Google Calendar synced · 4 min ago"), and a circular refresh control. A failed sync turns the pill `{colors.danger-bg}` with the reason in place of the time.

### Signature Components

**Airmail Edge**: a 6px diagonal-stripe band of ocean `{colors.primary}` and amber stripes divided by thin gaps of paper. It is drawn two ways: a CSS gradient utility (alternating ocean and amber) on the app header, the auth pages, and the Waiting on you card, and an inline SVG pattern (four ocean stripes to each amber one) on the landing hero and the two add-reminder cards. Never wider than 6px.

**Timeline Thread**: the product's signature element: a 2px `{colors.hairline}` vertical line down the Contact detail, a circular ocean-subdued marker for each Interaction holding a glyph for its type (`call`, `local_cafe`, `chat_bubble_outline`, `radio_button_unchecked`), the entry's day in `tnum`, its note, and any attachments beneath. The thread is the "you've been in touch" proof, visible in every product screenshot.

**Days-Since Numeral**: the app's quiet data signal: a `{typography.numeral}` Newsreader count ("14") paired with a `{typography.caption}` label ("days since you talked") in every Contact row and on the detail header. Uses `tnum`. It turns **amber** when the count passes that Contact's own Cadence target, with a screen-reader note ("Past your Cadence of 30 days"). A Contact who opted out of Cadence tracking never turns amber.

**Local Clock**: under a Contact's role and location, when they have a timezone: a `schedule` glyph, the time there in `{typography.body-tabular}` (24-hour, "13:05"), and the timezone name in `{colors.ink-mute}`. It updates while the page stays open.

**On This Day Strip**: a `card-vellum` on the Dashboard: an `auto_stories` glyph, "On this day · 3 years ago", the old Interaction's note in `{typography.headline-sm}`, and a link to that Contact. Shown only when there is a memory.

**Contact Sheet Composite**: brand-page product proof: real app screenshots (list rail + timeline thread) composited inside `{rounded.lg}` with hairline border and Level 2 shadow.

**`link-on-light`**: inline links on paper.
- Text `{colors.primary}`, type `{typography.body-md}`, no underline by default, underline on hover.

**`footer-on-paper`**: site-wide footer.
- Background `{colors.canvas}`, text `{colors.ink-mute}`, type `{typography.caption}`, padding `64px 24px`. Wordmark, 3 to 4 link columns, small legal row.

### Dashboard

The app's landing surface at `/app`: a greeting in `{typography.display-lg}` with one primary "Log interaction" pill (it opens a dialog, so a moment can be recorded without leaving), then `card-feature-light` blocks, each with a `{typography.headline-sm}` heading and a quiet text link to the surface that owns the full list:

1. **Waiting on you** (a `card-airmail`): Reminders due and overdue: a `{typography.body-tabular}` count line, then `chip-reminder-due` and `chip-reminder-overdue` chips, each naming the Contact. Links to Reminders.
2. **Coming up**: Important Dates in the next 30 days: amber markers only, timing in `{typography.body-tabular}` ("in 6 days"), ages as "turning 34" for birthdays.
3. **People to catch up with**: Contacts past their own Cadence: the `{typography.numeral}` days-since count, amber, with its "days since you talked" caption. Links to Contacts.

The **On this day strip** closes the page when there is a memory. Empty states teach the space instead of nagging.

### Reminders

A centered column. The header reads "Reminders & Important Dates" with a pill saying how many items need action. Beneath it, the `tab-strip`, then the `card-airmail` quick-add (Reminder, Contact, and `quick-date` fields in a row, with "Add reminder" at the right on Desktop and below on Mobile). Then the sections, each headed by a chip and a count: **Overdue** (danger), **Due today & this week** (amber), **Upcoming** (amber), **Completed** (muted: nothing is owed). Important Dates share the amber sections with Reminders, with their years as a `{typography.display-md}` numeral. Completed lists done Reminders only.

### Calendar

Month, Week, Day, and Agenda over Memoir's own data and, when connected, the Google calendars the user chose.
- **Header row**: the title and one line of help, with "Add reminder" (primary) at the right, beside the `pill-sync` once Google is connected.
- **Toolbar**: previous and next (secondary icon buttons), the range title in `{typography.display-md}`, "Today" (ghost), and the `view-switcher`.
- **Layer toggles**: a checkbox per source (Reminders, Important Dates, and, once connected, Google Calendar). A layer that is off disappears from every view. The Google layer is the user's chosen Google calendars, shown read-only, and never includes the Memoir calendar's own events, which already appear as Reminders and Important Dates.
- **Month**: a hairline `{rounded.lg}` grid of Sunday-to-Saturday weeks. Each cell is a labelled `gridcell` holding a day button (today ringed in `{colors.primary}`, the selected day filled `{colors.primary}`) and up to three chips, then "+N more". Days outside the month sit on `{colors.canvas-soft}`. Beside the grid, the selected day's panel lists everything on that day as rows.
- **Chips** carry a glyph and a title at `{rounded.xs}`: an open Reminder `{colors.primary-bg-subdued}` with `schedule`; an overdue one `{colors.danger-bg}`; a done one faded and struck through; an Important Date `{colors.amber-bg}` with `cake`; a Google event neutral `{colors.canvas-soft}` with a hairline border and `event`. Google events are read-only: no link into a Contact, and "Join meeting" when there is a video link.
- **Week** is seven day columns; **Day** is the selected day's rows; **Agenda** is the next 30 days, grouped under day headings, empty days skipped.
- The chosen day lives in the page URL, so switching views, the back button, and a shared link all keep it.

### Contact Detail

- **Header**: the 64px avatar, "Contact" in `{typography.micro-cap}`, the name in `{typography.display-lg}`, role and location in `{typography.body-md}`, the `Local Clock`, and "Add photo" or "Change photo" and "Remove photo" as ghost buttons. The days-since numeral and "Edit" sit at the right.
- **Timeline**: the form to log an Interaction, then the thread. Each entry offers "Attach file", "Edit", and "Delete" as ghost buttons; deleting asks first, in plain words.
- **Reminders and Notes**: each sits under the Timeline with an "Add reminder" or "Add note" secondary button beside its heading. The button opens the form in place and goes away while it is open; saving or "Cancel" closes it again. Note text and Interaction text are held to an 80ch measure (`max-w-[80ch]`).

### Settings

One `card-feature-light` per concern, each headed in `{typography.headline-sm}`: Profile, Cadence (the default every Contact follows), **Google Calendar**, Custom fields, Labels, **Assistant access**, and Delete your account (the danger-bordered card, last). The Google Calendar card walks through three states in place: *not set up* (a sentence saying whoever runs Memoir needs to add Google credentials), *not connected* (one primary "Connect Google Calendar"), and *connected* (when it last synced with "Sync now", a checkbox per Google calendar to show as the Google layer, and "Disconnect Google Calendar", which restates that the Memoir calendar stays in Google before it asks to be confirmed).

The **Assistant access** card names a new key, then shows its secret once in a `vellum` panel with "Copy" and "Done" and the line that this is the only time it is shown. Keys are listed with their prefix and creation day; "Revoke" asks first and says an assistant using the key stops working right away.

## Do's and Don'ts

### Do
- Reserve `{colors.primary}` for filled actions, focus rings, selected states, and inline links, with one filled button per band.
- Run the airmail edge across the app header and the top of cards that start something.
- Render display tiers, contact names, and numerals in Newsreader at 500 weight.
- Use `tnum` on every date, day-count, and numeric cell.
- Keep the canvas at `#fbf7ef`; the paper tone is the brand.
- Show a Contact's Photo as a circle, and fall back to their letter in the same circle.
- Give amber exactly one meaning: attention is owed (a Reminder, an Important Date, a Contact past their Cadence).
- Let one URL name the day the Calendar shows, so every view and link agrees.

### Don't
- Don't use pure white anywhere; paper replaces white.
- Don't add new hues outside the documented palette (ocean, amber, ink, paper, semantic).
- Don't set body copy in Newsreader: serif below 20px is for names and numerals only.
- Don't use ocean as a body-text color: it is an action, link, and focus color.
- Don't use amber for decoration or for anything that isn't owed attention.
- Don't introduce gradient meshes, unearned blur, or navy: those belong to other brands.
- Don't render a "days since" numeral in sans.
- Don't show an SVG as an attachment image: files that can carry script are downloads, never inline.
- Don't let an icon stand alone without a label or an `aria-label`.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Wide | ≥ 1280px | Contact detail shows the sidebar beside the main column, and the two scroll independently |
| Desktop | 1024–1279px | The Calendar's day panel sits beside the Month grid |
| Tablet | 768–1023px | Contacts is the split pane (22rem rail beside the detail); the Month grid and its day panel stack; the detail sidebar stacks under the thread |
| Mobile | < 768px | List-first: the Contact list fills the screen and the detail replaces it (push navigation); Week becomes one column of days below 640px; the quick-add button drops below its fields |

### Touch Targets
- Buttons and form fields are 40px tall; the back control hits 44px. The goal is 44px for every control on a touch screen; the calendar's day buttons (28px) and chips are the largest gap.
- Form text is 14px, which iOS zooms on focus. Raising it to 16px on touch viewports is not done yet.

### Collapsing Strategy
- The timeline thread condenses spacing on mobile but never loses its dots: the proof element survives at every size.
- Detail moves from two columns to one; the sidebar stacks below the main column and the pane scrolls as one. Below Tablet the page scrolls naturally.
- The Calendar's Month keeps its seven columns on every width; chips truncate rather than the grid collapsing.

### Image Behavior
Contact-sheet composites use `srcset` with art-direction crops: mobile crops focus on the timeline thread alone; desktop crops show the full list rail + thread composition. Photos and attached images load lazily and are served from the app's own origin, never from a public file URL.

## Writing

### Voice

Memoir speaks like a thoughtful friend writing a letter: plain-spoken, second person, no marketing adjectives. Voice stays constant; tone bends to the moment. Errors are sober and practical. Success is warm and short. Destructive moments are plain and precise. Product copy is direct; brand copy may be warmer, but never louder.

### Principles

- Address the reader as "you". Never "the user".
- One noun per concept, everywhere. The glossary is the vocabulary: Contact, Interaction, Note, Reminder, Important Date, Cadence, Cadence Health, Label, Photo, Attachment, Memoir calendar, Google layer. A Contact is never a "person", "profile", or "record" in UI copy, and a Reminder is never a "task" or "commitment". "People" is the one plural the product uses for Contacts as a group ("Your people"), and a Label is never a "tag".
- Errors are recovery paths: what happened, what to do next, never blame, never "we" ("That didn't save. Your note is still here, try again.").
- Empty states teach the space: what belongs here, why it matters, and what fills it.
- Loading copy names the work: "Fetching your people", "Fetching what's waiting", "Opening the calendar", "Logging the interaction".
- One verb per button, sentence case, no exclamation points, no em dashes. Commas and shorter sentences instead.
- Destructive moments restate the action in the buttons themselves.
- When a change in one place changes another, say so where it matters: Disconnect says the Memoir calendar stays in Google.

### Surface Copy

| Surface | Copy |
|---|---|
| Hero CTA / secondary | "Try the demo" / "Create your account" |
| Empty contact list | "Your people, all in one place. Add your first contact, and Memoir will help you stay in touch." |
| Empty timeline | "Nothing logged yet. Add a call, a coffee, a message: anything that keeps the thread alive." |
| Dashboard, no contacts yet | Same copy as the empty contact list, plus one "Add contact" primary pill |
| Dashboard · Waiting on you | "2 due · 1 overdue · 8 of 10 contacts up to date" · chips: "Call Bob" / "14 days overdue" · empty: "Nothing is waiting." |
| Dashboard · Coming up | "6 birthdays and dates in the next 30 days" · rows: "turning 34", "in 6 days" · empty: "Nothing in the next 30 days." |
| Dashboard · People to catch up with | rows: the days-since numeral over "days since you talked" · empty: "You're in touch with everyone lately." |
| Dashboard · On this day | "On this day · 3 years ago" |
| Reminders · header | "Reminders & Important Dates" · pill: "3 items need action" |
| Reminders · quick-add | Fields "Reminder", "Contact", "When" · placeholder "Oct 28 or in 3 days" · unread date: "I couldn't read that date. Pick one instead." · no Contact: "Choose who this reminder is for." |
| Calendar · actions | "Add reminder" · "Today" · views "Month", "Week", "Day", "Agenda" · empty day: "Nothing on this day." |
| Calendar · sync | "Google Calendar synced · 4 min ago" · "Syncing with Google Calendar" |
| Cadence | "Use my default (every 30 days)" · "Don't track a Cadence" · "84% in touch" · "Past your Cadence of 30 days." |
| Photo and files | "Add photo" / "Change photo" / "Remove photo" · "Attach file" · too big: "That photo is too big. Keep it under 5 MB." |
| Back control | "Back to Contacts" on contact pages · "Back to Dashboard" on Reminders and Calendar |
| Days-since numeral label | "days since you talked" |
| Loading | "Fetching your people", "Fetching your dashboard", "Saving changes", "Logging the interaction" |
| Success | "Saved." |
| Delete contact | "Remove Bob from Memoir? You'll lose their timeline and notes. This can't be undone." Buttons: "Remove Bob" / "Keep Bob" |
| Disconnect Google | "Stop syncing? The Memoir calendar and its events stay in your Google account." Buttons: "Disconnect" / "Keep it" |

### Hero Headline

**"A memoir of everyone you know."** The name becomes the product; set in `{typography.display-xxl}` Newsreader. Subline, `{typography.body-lg}` `{colors.ink-mute}`: "A personal CRM for the people who matter."

### Banned

- Exclamation points as energy; em dashes
- "Manage", "leverage", "seamless", "intuitive", "powerful", "streamline", "empower", "utilize"
- "Submit", "OK", "Yes/No" dialogs, vague "Learn more"
- "We" in errors; humor in errors; "Something went wrong" with no next move
- Synonyms for glossary terms

## Iteration Guide

1. Focus on ONE component at a time.
2. Reference component names and tokens directly (`{colors.primary}`, `{chip-reminder-overdue}`, `{rounded.pill}`).
3. Run `npx @google/design.md lint design.md` after edits.
4. Add new variants as separate entries.
5. Default body to `{typography.body-md}` (14px); use `{typography.body-tabular}` for any date or numeric cell.
6. Serif = display roles only (Newsreader 500): headlines, titles, contact names, numerals.
7. Amber = attention owed. Ocean = actions, focus, selected states, links.
8. The airmail edge belongs on the app header and on cards that start something: don't scatter it elsewhere.
9. Name new things with the glossary first; add the term there before it appears in copy.
