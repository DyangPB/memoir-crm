# Memoir Design Language

## Overview

Memoir's design language is built on one image: **a letter worth keeping**. Warm paper surfaces, ink-dark text, and a single deep ocean blue — the color of letters carried across water. The brand motif is the **airmail edge**: the thin diagonal stripe band of an airmail envelope, rendered in ocean blue and amber, used as the hero's top border and as a card-top accent. It replaces the gradient-mesh hero with a motif that belongs to the product's story: keeping in touch across time and distance.

The color system has two primary roles. **Ocean** (`{colors.primary}` — `#0e5f82`) is the signature CTA color, used sparingly: one filled pill per band, plus focus rings and inline links. **Amber** (`{colors.amber}`) is reserved for one meaning only: reminders and Important Dates — due chips, overdue chips, birthday markers. It never decorates. **Ink** (`{colors.ink}` — `#2b2418`) is the universal text color, a warm near-black that reads as ink on paper. Dark surfaces are filled with deep water (`{colors.ocean-deep}` — `#0c3a54`), never navy.

Typography pairs a literary serif with a working sans. **Fraunces** (display, weights 400–600) carries the brand voice on heroes, section openers, contact names, and the signature "days since" numeral. **Inter** (400/500/600) does the product UI work: tables, forms, chips, and body text at 13–17px where a serif would lose legibility. Serif is earned by role, not applied by habit: display moments only, never body copy.

**Key Characteristics:**
- Paper-first surfaces: `{colors.canvas}` (`#fbf7ef`) is the default background everywhere. Pure white never appears.
- Airmail edge on every brand hero: a 6px diagonal stripe band in ocean/amber across the top edge, implemented as a repeating SVG.
- Single-ocean CTA hierarchy: one filled `{colors.primary}` pill per band; everything else is outline, ghost, or text.
- Fraunces serif for display tiers and the product's two signature numerals: the "days since last interaction" count and Important Date years.
- Amber means reminders, and nothing else.
- Contact-sheet composites instead of decorative photography: brand pages prove the product by showing the actual timeline UI.
- Tabular figures (`tnum`) on every date, day-count, and numeric cell — the quiet signal that this app runs on time.

## Colors

> **Source surfaces:** landing (`/`), app dashboard, contact list, contact detail.

### Brand & Accent
- **Ocean** (`{colors.primary}` — `#0e5f82`): The brand's signature CTA color. Filled-pill button, link emphasis, focus rings, timeline dots.
- **Ocean Press** (`{colors.primary-press}` — `#0a4a66`): Pressed-state lift of the primary.
- **Ocean Deep** (`{colors.ocean-deep}` — `#0c3a54`): Deep water. Fill of dark surfaces, the featured pricing tier, and the auth page background.
- **Ocean Soft** (`{colors.primary-soft}` — `#1a8cba`): Lighter ocean used in product-UI accents and chart highlights.
- **Ocean Subdued** (`{colors.primary-bg-subdued}` — `#d9eaf2`): Pale ocean fill for soft tags and selected rows.
- **Amber** (`{colors.amber}` — `#b07018`): The reminder color. Due chips, Important Date markers, timeline birthday dots. Never a button, never decoration.
- **Amber Soft** (`{colors.amber-bg}` — `#f5e6c8`): Reminder chip background.

### Surface
- **Canvas** (`{colors.canvas}` — `#fbf7ef`): Default page background. Warm paper; never pure white.
- **Canvas Soft** (`{colors.canvas-soft}` — `#f4edde`): Warm-tinted section background for alternating bands.
- **Vellum** (`{colors.vellum}` — `#f1e6cf`): Deeper warm band for feature interludes and the demo banner.
- **Hairline** (`{colors.hairline}` — `#e6dcc5`): 1px borders on cards, tables, and dividers.
- **Hairline Input** (`{colors.hairline-input}` — `#cfc3a4`): Form input borders.

### Text
- **Ink** (`{colors.ink}` — `#2b2418`): Default body text. Warm near-black, never pure black, never navy.
- **Ink Secondary** (`{colors.ink-secondary}` — `#4d4432`): Secondary text on paper.
- **Ink Mute** (`{colors.ink-mute}` — `#7c7158`): Helper text, captions, table labels.
- **On Primary** (`{colors.on-primary}` — `#fdfbf6`): Text on ocean and deep-water surfaces.

### Semantic (product UI only)
- **Success** (`{colors.success}` — `#2e7d4f`), bg `#ddeddc` — saved, done states.
- **Warning** (`{colors.warning}` — `#a46a1a`), bg `#f5e6c8` — approaching-due reminders.
- **Danger** (`{colors.danger}` — `#b3402e`), bg `#f6dcd5` — overdue reminders, destructive actions.

## Typography

### Font Family

**Display: Fraunces** (variable, optical sizes enabled) at weights 400–600. A warm literary serif with soft terminals — the letter-writing voice. Used for display tiers, contact names, and signature numerals.

**UI: Inter** at weights 400/500/600. A neutral working sans for product surfaces: forms, tables, chips, body copy at 13–17px. Inter is chosen deliberately for small-size legibility on data-dense surfaces; the serif carries brand, the sans carries work.

### Hierarchy

| Token | Font/Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xxl}` | Fraunces 56px | 500 | 1.05 | -0.8px | Landing hero headline |
| `{typography.display-xl}` | Fraunces 44px | 500 | 1.08 | -0.6px | Section opener |
| `{typography.display-lg}` | Fraunces 32px | 500 | 1.1 | -0.4px | Card title, feature band |
| `{typography.display-md}` | Fraunces 26px | 500 | 1.15 | -0.2px | App page title |
| `{typography.contact-name}` | Fraunces 20px | 500 | 1.25 | 0 | Contact name in list rows and detail header |
| `{typography.numeral}` | Fraunces 40px | 500 | 1.0 | -0.4px | "Days since" count and date numerals |
| `{typography.heading-lg}` | Inter 20px | 600 | 1.3 | 0 | Product section heading |
| `{typography.heading-md}` | Inter 17px | 600 | 1.35 | 0 | Sub-section heading |
| `{typography.heading-sm}` | Inter 15px | 600 | 1.4 | 0 | Mini-section label |
| `{typography.body-lg}` | Inter 17px | 400 | 1.55 | 0 | Marketing body lead |
| `{typography.body-md}` | Inter 15px | 400 | 1.5 | 0 | Default product body |
| `{typography.body-tabular}` | Inter 14px | 400 | 1.5 | -0.2px | Dates, day-counts, numeric cells (`tnum`) |
| `{typography.button-md}` | Inter 15px | 500 | 1.0 | 0 | Pill button label |
| `{typography.caption}` | Inter 13px | 400 | 1.4 | 0 | Helper text, table labels |
| `{typography.micro-cap}` | Inter 11px | 500 | 1.15 | 0.08em | All-caps eyebrow |

### Principles
- **Serif is earned.** Fraunces appears only in display roles: headlines, contact names, and numerals. Body copy is always Inter.
- **Modest negative tracking.** Serifs need less compression than geometric sans. -0.8px at 56px, scaling to 0 at 20px.
- **Tabular figures for time.** Any cell rendering a date, a day-count, or a numeric value uses `tnum`. Time is the product's quiet data signal.
- **Weight 500 is the serif voice.** Fraunces at 500 reads warm and confident; 600 for emphasis, never below 400.

### Note on Font Substitutes
Fraunces and Inter are both open-source (Google Fonts). If Fraunces is unavailable, fall back to **Source Serif 4** at 500, then Georgia. If Inter is unavailable, fall back to system-ui sans. Do not substitute a geometric sans (Poppins, Montserrat) for Inter — too round; do not substitute a Didone serif (Playfair) for Fraunces — too cold.

## Layout

### Spacing System
- **Base unit**: 8px (with 2 / 4 / 12 sub-tokens for fine work).
- **Tokens**: `{spacing.xxs}` 2px · `{spacing.xs}` 4px · `{spacing.sm}` 8px · `{spacing.md}` 12px · `{spacing.lg}` 16px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.huge}` 64px.
- **Section padding**: 64–96px on brand surfaces; 24–32px on app surfaces.
- **Card internal padding**: 32px on feature cards; 16–24px on app cards.

### Grid & Container
- Brand pages center in a ~1200px container; the airmail edge extends edge-to-edge above.
- The app uses a master-detail shell: a 360px contact list rail left, detail pane right (80ch max for prose fields).
- Contact detail lays out as a two-column grid: timeline thread (dominant, left) + sidebar (contact facts, custom fields, labels, reminders).

### Whitespace Philosophy
Paper needs room to breathe. Brand sections keep 96px gaps; the app tightens to 16–24px between related controls. The contact detail page is the product's calmest surface: one thread, one sidebar, generous vertical rhythm on the timeline.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| 0 | Flat | Default surface |
| 1 | `box-shadow: rgba(44,36,24,0.06) 0 1px 3px` | Card lift on paper |
| 2 | `box-shadow: rgba(44,36,24,0.08) 0 8px 24px, rgba(44,36,24,0.05) 0 2px 6px` | Floating panels, dialogs, product mockup chrome |
| 3 | Paper stack | Decorative depth: two offset sheets (hairline borders, 1px rotation) under a hero card, like letters stacked on a desk |

### Decorative Depth
The **paper stack** is the brand's depth medium — layered sheets, not gradient meshes and not heavy shadows. Literal shadows stay subtle (Levels 1–2); the stack is reserved for hero cards and the featured pricing tier.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Hairline tags, table chrome |
| `{rounded.sm}` | 6px | Form inputs |
| `{rounded.md}` | 8px | Compact cards, alerts, chips |
| `{rounded.lg}` | 12px | Feature cards, detail panels |
| `{rounded.pill}` | 9999px | All buttons, tag pills, reminder chips |

### Imagery Geometry
The brand uses **contact-sheet composites** — real screenshots of the app's timeline and list UI — more than photography. Composites render inside `{rounded.lg}` containers with a 1px `{colors.hairline}` border and Level 2 shadow. Any photography (demo account avatars, seed-contact portraits) is treated as circular avatars at 40px in-app, 80px on brand surfaces; never rectangular, never full-bleed.

## Components

### Buttons

**`button-primary-pill`** — the dominant CTA system-wide.
- Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.button-md}`, padding `{spacing.sm} {spacing.lg}` (8px 16px), rounded `{rounded.pill}`.
- Pressed state `button-primary-pill-pressed` shifts background to `{colors.primary-press}`.

**`button-secondary`** — outline-style alternative.
- Background `{colors.canvas}`, text `{colors.primary}`, 1px solid `{colors.primary}` border, same pill geometry.

**`button-ghost`** — quiet action.
- Transparent background, text `{colors.ink-secondary}`, hover background `{colors.canvas-soft}`, same pill geometry.

**`button-on-dark`** — used on deep-water surfaces.
- Background `{colors.canvas}`, text `{colors.ocean-deep}`, same pill geometry.

### Cards & Containers

**`card-feature-light`** — feature explanation card on paper.
- Background `{colors.canvas}`, padding `{spacing.xxl}`, rounded `{rounded.lg}`, 1px `{colors.hairline}` border.

**`card-vellum`** — warm interlude card.
- Background `{colors.vellum}`, text `{colors.ink}`, padding `{spacing.xxl}`, rounded `{rounded.lg}`. Used to break the paper rhythm with deeper warmth (demo banner, pricing).

**`card-dark-water`** — the inverted featured tier.
- Background `{colors.ocean-deep}`, text `{colors.on-primary}`, otherwise identical structure to `card-feature-light`.

**`card-contact-row`** — one contact in the app list rail.
- Flat paper row, bottom `{colors.hairline}` divider, contact avatar left, `{typography.contact-name}` + `{typography.caption}` stack, "days since" numeral right. Hover: `{colors.primary-bg-subdued}` background, 6px radius, no elevation.

### Inputs & Forms

**`text-input`** — standard form field.
- Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, padding `{spacing.sm} {spacing.md}`, rounded `{rounded.sm}`, 1px `{colors.hairline-input}` border.
- Focus state `text-input-focused`: border swaps to `{colors.primary}`, plus a 2px offset focus ring in `{colors.primary}` at 3:1 contrast.

### Navigation

**`nav-bar-on-paper`** — top nav floating over the airmail hero.
- Background `{colors.canvas}`, text `{colors.ink}`, padding `{spacing.lg} {spacing.xl}`. Serif wordmark left, primary nav center, sign-in + one filled `button-primary-pill` right.

### Pills, Tags, and Chips

**`pill-tag-soft`** — subdued label.
- Background `{colors.primary-bg-subdued}`, text `{colors.primary}`, type `{typography.micro-cap}`, padding 4px 8px, rounded `{rounded.pill}`.

**`chip-reminder-due`** — due reminder.
- Background `{colors.amber-bg}`, text `{colors.amber}`, same geometry as `pill-tag-soft`.

**`chip-reminder-overdue`** — overdue reminder.
- Background `{colors.danger}` bg `#f6dcd5`, text `{colors.danger}`, same geometry.

### Signature Components

**Airmail Edge** — a 6px tall repeating diagonal-stripe band (ocean `{colors.primary}` on canvas, with one amber stripe every 5th) across the top edge of brand heroes, implemented as an inline SVG pattern. The brand's replacement for the gradient mesh. Never wider than 6px, never below the hero.

**Timeline Thread** — the product's signature element: a 2px `{colors.hairline}` vertical line running down the contact detail page, with ocean dots marking each Interaction, an amber dot for birthdays and Important Dates, and a small glyph per interaction type (call, coffee, message, other). The thread is the "you've been in touch" proof, visible in every product screenshot.

**Days-Since Numeral** — the app's quiet data signal: a `{typography.numeral}` Fraunces count ("14") paired with a `{typography.caption}` label ("days since you talked") in every contact row and on the detail header. Uses `tnum`. Amber when the contact is overdue.

**Contact Sheet Composite** — brand-page product proof: real app screenshots (list rail + timeline thread) composited inside `{rounded.lg}` with hairline border and Level 2 shadow. The brand's argument is "look at the actual product," so every feature band pairs with one.

**`link-on-light`** — inline links on paper.
- Text `{colors.primary}`, type `{typography.body-md}`, no underline by default, underline on hover.

**`footer-on-paper`** — site-wide footer.
- Background `{colors.canvas}`, text `{colors.ink-mute}`, type `{typography.caption}`, padding `{spacing.huge} {spacing.xl}`. Serif wordmark, 3–4 link columns, small legal row.

## Do's and Don'ts

### Do
- Reserve `{colors.primary}` for filled CTAs, focus rings, and inline links — one filled button per band.
- Apply the airmail edge to every brand hero; bare-canvas heroes feel off-brand.
- Render display tiers, contact names, and numerals in Fraunces at 500 weight.
- Use `tnum` on every date, day-count, and numeric cell.
- Keep the canvas at `#fbf7ef`; the paper tone is the brand.
- Pair every feature explanation with a contact-sheet composite.
- Give amber exactly one meaning: reminders and Important Dates.

### Don't
- Don't use pure white anywhere; paper replaces white.
- Don't add new hues outside the documented palette (ocean, amber, ink, paper, semantic).
- Don't set body copy in Fraunces — serif below 20px is for names and numerals only.
- Don't use ocean as a body-text color — it is a CTA, link, and focus color.
- Don't use amber for decoration or non-reminder accents.
- Don't introduce gradient meshes, unearned blur, or navy — those belong to other brands.
- Don't render a "days since" numeral in sans.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Wide | ≥ 1440px | Full airmail edge; contact detail shows timeline + sidebar at full width |
| Desktop | 1024–1440px | Default content max-width; master-detail shell with 360px rail |
| Tablet | 768–1023px | Rail collapses to 280px; detail sidebar stacks below the thread |
| Mobile | < 768px | List-first: contact list fills the screen, detail replaces it (push navigation); display drops 56 → 32px; airmail edge re-tiles |

### Touch Targets
- Pill buttons and chips hit ≥ 44×44px on mobile via padding scaling.
- Form fields stay at 40px minimum height; font-size never below 16px on touch viewports (no iOS zoom triggers).

### Collapsing Strategy
- Display tiers stair-step 56 → 44 → 32 → 26px through the breakpoints.
- The timeline thread condenses spacing on mobile but never loses its dots — the proof element survives at every size.
- Contact detail moves from two-column to single-column; the sidebar stacks below the thread.

### Image Behavior
Contact-sheet composites use `srcset` with art-direction crops: mobile crops focus on the timeline thread alone; desktop crops show the full list rail + thread composition.

## Writing

### Voice

Memoir speaks like a thoughtful friend writing a letter: plain-spoken, second person, no marketing adjectives. Voice stays constant; tone bends to the moment. Errors are sober and practical. Success is warm and short. Destructive moments are plain and precise. Product copy is direct; brand copy may be warmer, but never louder.

### Principles

- Address the reader as "you". Never "the user".
- One noun per concept, everywhere: Contact, Interaction, Note, Reminder, Important Date, Label — the glossary is the vocabulary. A Contact is never a "person", "profile", or "record" in UI copy.
- Errors are recovery paths: what happened, what to do next, never blame, never "we" ("That didn't save. Your note is still here, try again.").
- Empty states teach the space: what belongs here, why it matters, and what fills it.
- Loading copy names the work: "Fetching your people", "Logging the coffee", "Saving changes".
- One verb per button, sentence case, no exclamation points, no em dashes. Commas and shorter sentences instead.
- Destructive moments restate the action in the buttons themselves.

### Surface Copy

| Surface | Copy |
|---|---|
| Hero CTA / secondary | "Try the demo" / "Create your account" |
| Empty contact list | "Your people, all in one place. Add your first contact, and Memoir will help you stay in touch." |
| Empty timeline | "Nothing logged yet. Add a call, a coffee, a message: anything that keeps the thread alive." |
| Reminders strip | "2 reminders this week" · "1 birthday" · chip: "Call Bob" / "14 days overdue" |
| Days-since numeral label | "days since you talked" |
| Loading | "Fetching your people", "Saving changes", "Logging the coffee" |
| Success | "Saved." / "Interaction logged." |
| Delete contact | "Remove Bob from Memoir? You'll lose their timeline and notes. This can't be undone." Buttons: "Remove Bob" / "Keep Bob" |
| MCP key revoked | "Key revoked. Existing sessions stop working immediately." |

### Hero Headline

**"A memoir of everyone you know."** — the name becomes the product; set in `{typography.display-xxl}` Fraunces. Subline, `{typography.body-lg}` `{colors.ink-mute}`: "A personal CRM for the people who matter."

### Banned

- Exclamation points as energy; em dashes
- "Manage", "leverage", "seamless", "intuitive", "powerful", "streamline", "empower", "utilize"
- "Submit", "OK", "Yes/No" dialogs, vague "Learn more"
- "We" in errors; humor in errors; "Something went wrong" with no next move
- Synonyms for glossary terms

## Iteration Guide

1. Focus on ONE component at a time.
2. Reference component names and tokens directly (`{colors.primary}`, `{chip-reminder-overdue}`, `{rounded.pill}`).
3. Run `npx @google/design.md lint DESIGN.md` after edits.
4. Add new variants as separate entries.
5. Default body to `{typography.body-md}` (15px); use `{typography.body-tabular}` for any date or numeric cell.
6. Serif = display roles only (Fraunces 500): headlines, contact names, numerals.
7. Amber = reminders only. Ocean = CTA, focus, links only.
8. The airmail edge is non-negotiable on brand heroes — bare-paper heroes break the brand.
