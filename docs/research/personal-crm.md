# Personal CRM — Primary-Source Research

> **Purpose:** reference material for deciding what to build in a solo personal-CRM portfolio project, and what to study first.
>
> **Method:** every claim below was verified against primary sources only — official documentation sites, official product sites, GitHub READMEs, and raw source files fetched on 2026-10-07. No Medium posts, listicles, or secondary write-ups. Star counts come from the GitHub REST API at fetch time and drift over time; links are provided so numbers can be re-checked.

---

## 1. Overview — what a personal CRM is

The term is defined most explicitly by Monica's own documentation:

> "A CRM is a Customer Relationship Management software. It is used in the sales world to keep track of who you've spoken to, who's ready to buy your stuff and follow up during the entire customer lifecycle. A CRM however, is not suited for documenting your contacts or your life, although the intention is similar. **A personal CRM is a set of tools that let you mimic this behaviour and document your personal contacts, but not in a business context.**" — [Monica docs, "Welcome to Monica"](https://docs.monicahq.com/)

Monica's README calls the category a **PRM (Personal Relationship Management)** system: "Imagine a CRM — a commonly used tool by sales teams in the corporate world — for your friends and family" ([Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).

Commercial personal-CRM products position against sales CRMs the same way:

- Dex: "**Personal CRM for your relationships**… Built for people, not sales pipeline. Dealing with heavy, complicated systems like Salesforce is overkill for keeping in touch." ([getdex.com](https://getdex.com/))
- Clay (rebranded "Mesh"): "Every relationship… Automatically organized, intelligently searchable, always up to date. For you and your team." ([clay.earth](https://clay.earth/), which now redirects to [me.sh](https://me.sh/))

Monica's README also explicitly documents what the category is *not*: "Monica is not a social network… it's for your eyes only," "does not have built-in AI with integrations like ChatGPT," and "It will only send you emails for the things you asked to be reminded of" ([Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)). That stance is a real positioning choice — several competitors (Dex, Folk, Twenty) go the opposite way and lean into AI.

**Consensus feature core** across all sources examined: contacts (rich contact sheets), an activity log/timeline, reminders, notes, tags/groups, and import/export. Sections 2 and 3 give the evidence per product.

---

## 2. Feature landscape (what real ones implement, with evidence)

### 2.1 Contacts as the core object

- Monica: "**A contact is the core data of Monica**… Monica lets you document everything about this contact, including their social graph: children, family, and so on" ([Monica docs, "Meet Monica"](https://docs.monicahq.com/getting-started/readme-1)). The [`Contact.php` model](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php) exposes relations to notes, reminders, important dates, tasks, calls, goals, pets, files, groups, labels, contact-to-contact relationships, life events, timeline events, mood tracking, addresses, quick facts, loans, posts, and a company.
- Twenty: standard objects include **People** and **Companies**; "Everything in Twenty is built around objects and fields — the building blocks of your data model" ([Twenty docs, Data Model](https://docs.twenty.com/getting-started/core-concepts/data-model)).
- Dex documents the exact personal-CRM contact fields people want: "How you met, Education history, Work, Important dates, Family, Gift ideas, Event history" ([getdex.com](https://getdex.com/)).
- EspoCRM defines its Contact entity purely in metadata: `personName`, `salutationName`, phones, email, address, plus `links` to accounts, opportunities, meetings, calls, tasks, emails ([Contact.json entityDefs](https://raw.githubusercontent.com/espocrm/espocrm/master/application/Espo/Modules/Crm/Resources/metadata/entityDefs/Contact.json)).

### 2.2 Timeline / activity log

- Monica has dedicated `ContactFeedItem` and `TimelineEvent` models ([models directory](https://github.com/monicahq/monica/tree/main/app/Models)).
- EspoCRM ships a "**Stream** — a live feed with all record changes and team communication" ([espocrm.com/features](https://www.espocrm.com/features/)).
- Twenty has a dedicated `timeline` server module ([modules listing](https://github.com/twentyhq/twenty/tree/main/packages/twenty-server/src/modules)).
- Folk's contact page shows an "Interactions" panel (calls, emails, "5 messages", "Contact imported") with notes and tasks next to it ([folk.app](https://www.folk.app/)).

### 2.3 Reminders & important dates

- Monica: `ContactReminder` + `ContactImportantDate` models ([models](https://github.com/monicahq/monica/tree/main/app/Models)); README lists "Reminders" and "Automatic reminders for birthdays" ([Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- Dex: "The reminders are gentle but effective," plus "handy reminders and groups functionality" in user quotes ([getdex.com](https://getdex.com/)).
- Clay/Mesh: "Set reminders for the moments that count. Get intelligent prompts when it's time to reconnect" with a feed filterable by Birthdays, Events, News, Social changes, Posts, Reconnect, Reminders ([clay.earth](https://clay.earth/)).

### 2.4 Tags / groups / labels

- Monica has `Label` and `Group`/`GroupType`/`GroupTypeRole` models ([models](https://github.com/monicahq/monica/tree/main/app/Models)); the README lists "Labels to organize contacts" ([Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- Dex advertises "groups functionality" ([getdex.com](https://getdex.com/)).
- EspoCRM has `TargetList` (marketing lists) as a link on Contact ([Contact.json](https://raw.githubusercontent.com/espocrm/espocrm/master/application/Espo/Modules/Crm/Resources/metadata/entityDefs/Contact.json)).
- Notably, Twenty's standard objects have **no tags** — organization is done via views/filters instead ([Twenty Data Model](https://docs.twenty.com/getting-started/core-concepts/data-model)). This is a real design fork in the space.

### 2.5 Notes

- Monica `Note` model ([models](https://github.com/monicahq/monica/tree/main/app/Models)); README: "Ability to add notes to a contact" ([Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- Twenty `note` server module ([modules](https://github.com/twentyhq/twenty/tree/main/packages/twenty-server/src/modules)).
- Folk: notes plus an AI-generated "Relation summary" per contact ([folk.app](https://www.folk.app/)).

### 2.6 Import / export / sync

- Monica's `Contact` extends `VCardResource`, requires `monicahq/laravel-sabre` (a CardDAV/WebDAV server), and has an `AddressBookSubscription` model — i.e., contacts sync with standard CardDAV address books ([Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php), [composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json), [models](https://github.com/monicahq/monica/tree/main/app/Models)).
- EspoCRM has dedicated [Import](https://www.espocrm.com/features/data-import/) ("migrate data from external sources") and [Export](https://www.espocrm.com/features/data-export/) ("Extract CRM data to CSV or Excel file") features ([features page](https://www.espocrm.com/features/)).
- Dex: "Export or delete your data at any time" ([getdex.com](https://getdex.com/)).

### 2.7 Search

- Monica uses Laravel Scout with Meilisearch/Typesense drivers ([composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)); the Contact model is `Searchable` with a `SearchUsingFullText` index over names ([Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php)).
- Clay: "intelligently searchable" ([clay.earth](https://clay.earth/)).
- Twenty keeps a `searchVector` column on workspace entities ([workspace-member.workspace-entity.ts](https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-server/src/modules/workspace-member/standard-objects/workspace-member.workspace-entity.ts)).

### 2.8 Authentication

- Monica (from dependencies): Laravel Fortify + Jetstream + Sanctum (session/API auth), WebAuthn passkeys (`asbiin/laravel-webauthn`), and OAuth via Laravel Socialite with Google, GitHub, LinkedIn, Microsoft Azure, Facebook providers ([composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)).
- Twenty documents OAuth among its platform capabilities: "REST and GraphQL APIs, webhooks, and OAuth" ([Twenty Developers intro](https://docs.twenty.com/developers/introduction)).

### 2.9 Custom fields / extensible data model

- Monica v5: `Module`, `ModuleRow`, `ModuleRowField` models implement user-defined contact field types; README: "Management of contact field types" ([models](https://github.com/monicahq/monica/tree/main/app/Models), [Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- Twenty: custom objects/fields "get the same first-class treatment as built-in ones — including API endpoints, views, permissions, and workflow triggers" ([Twenty Data Model](https://docs.twenty.com/getting-started/core-concepts/data-model)).
- EspoCRM: metadata JSON (`entityDefs`, `layouts`, `clientDefs`, …) merged recursively from a `custom/` directory, with a JSON Schema published for IDE autocompletion ([EspoCRM metadata docs](https://docs.espocrm.com/development/metadata/)).

### 2.10 Integrations & AI

- Clay/Mesh: Facebook, LinkedIn, Instagram, Notion, WhatsApp, X integrations; "Contact details stay current. Job changes surface automatically" ([clay.earth](https://clay.earth/)).
- Dex: LinkedIn sync with title-change alerts, browser extension (Facebook, Instagram, X, Gmail), and an **MCP server** so Claude/ChatGPT/Gemini can read your contacts ([getdex.com](https://getdex.com/)).
- Folk: 30+ integrations, MCP, AI assistants, enrichment ([folk.app](https://www.folk.app/)).
- Twenty: calendar/email sync, messaging, AI agents; "The open alternative to Salesforce, designed for AI" ([Twenty README](https://raw.githubusercontent.com/twentyhq/twenty/main/README.md), [docs index](https://docs.twenty.com/llms.txt)).
- Monica: deliberately no AI, per its README ([Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).

---

## 3. Similar projects

### 3.1 Monica — `monicahq/monica` ⭐ 25,446 · 2,617 forks

- **Repo:** https://github.com/monicahq/monica · **Docs:** https://docs.monicahq.com/ · **Site:** https://monicahq.com
- **What it is:** the reference open-source **personal relationship manager**, since 2017, self-hostable via Docker ([Monica docs](https://docs.monicahq.com/), [README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- **Stats/activity:** 25,446 stars, 2,617 forks, PHP, **AGPL-3.0**, last push 2026-09-24 — active ([GitHub API](https://api.github.com/repos/monicahq/monica)). Note: `main` is the v5 beta (codenamed "Chandler"); `4.x` is the stable branch ([README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- **Feature set:** contacts, relationships between contacts, reminders (incl. automatic birthdays), notes, activities, tasks, addresses/contact methods, **user-definable contact field types**, pets, a journal/diary, mood tracking, documents/photos, custom genders, favorites, multiple vaults & users, labels, multiple currencies, 27 languages ([README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- **Stack:** PHP 8.3 + Laravel 12, Inertia.js, Jetstream/Fortify/Sanctum, Laravel Scout + Meilisearch/Typesense, Sabre (CardDAV), Socialite OAuth, WebAuthn, PHPUnit/Paratest + Larastan + PHPStan ([composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)).
- **Architecture:** account → **vaults** (private, encrypted-ish isolation units) → **contacts** ([Monica docs](https://docs.monicahq.com/getting-started/readme-1)). Contact-centric: one `Contact` model with ~25 relation types; soft deletes, UUIDs, full-text search indexing ([Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php)).
- **Copy:** the contact-centric domain model and its "everything hangs off Contact" simplicity; the vault concept for data isolation; reminders + important-dates design; CardDAV/vCard import-export; clear product principles ("It should do one thing (documenting your life) extremely well, and nothing more" — [README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- **Avoid:** the PHP/Laravel monolith if your portfolio targets TypeScript roles; the ongoing v4→v5 rewrite churn (README warns the default branch is beta); multi-user account/vault complexity is more than a solo portfolio needs.

### 3.2 Twenty — `twentyhq/twenty` ⭐ 58,012 · 9,463 forks

- **Repo:** https://github.com/twentyhq/twenty · **Docs:** https://docs.twenty.com/ · **Site:** https://twenty.com
- **What it is:** "**The open alternative to Salesforce, designed for AI**" — a business CRM platform with cloud and self-host (Docker Compose) options ([README](https://raw.githubusercontent.com/twentyhq/twenty/main/README.md)).
- **Stats/activity:** 58,012 stars, 9,463 forks, TypeScript, last push 2026-10-07 — very active ([GitHub API](https://api.github.com/repos/twentyhq/twenty)). License: mostly AGPL-3.0 with a "Twenty Application Exception", MIT for SDKs/UI library/apps, commercial license for `@license Enterprise` files ([LICENSE](https://raw.githubusercontent.com/twentyhq/twenty/main/LICENSE)).
- **Feature set:** objects (People, Companies, Opportunities, Tasks, Notes) + **custom objects**, views, workflows, AI agents, dashboards, calendar & email sync ([docs index](https://docs.twenty.com/llms.txt), [Data Model](https://docs.twenty.com/getting-started/core-concepts/data-model)).
- **Stack:** TypeScript monorepo (Nx); server: NestJS + BullMQ + PostgreSQL + Redis; frontend: React + Jotai + Linaria + Lingui; REST + GraphQL APIs, webhooks, OAuth ([README](https://raw.githubusercontent.com/twentyhq/twenty/main/README.md), [Developers intro](https://docs.twenty.com/developers/introduction)).
- **Architecture:** modular domain packages (`person`, `company`, `task`, `note`, `timeline`, `workflow`, `calendar`, `messaging`, `dashboard`, `workspace-member`, … — [modules](https://github.com/twentyhq/twenty/tree/main/packages/twenty-server/src/modules)); every entity extends `BaseWorkspaceEntity` so all data is workspace-scoped ([workspace-member.workspace-entity.ts](https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-server/src/modules/workspace-member/standard-objects/workspace-member.workspace-entity.ts)); field types include composite Address/FullName and special Relation/File/JSON/Actor, with automatic system fields `id`, `createdAt`, `updatedAt`, `createdBy`, `position` ([Data Model](https://docs.twenty.com/getting-started/core-concepts/data-model)).
- **Copy:** the metadata-driven "objects and fields" mental model; the module-per-domain directory convention; the extension model where a whole app is defined as code (`defineObject(...)`, CLI publish — [README](https://raw.githubusercontent.com/twentyhq/twenty/main/README.md)); excellent docs structure ([llms.txt](https://docs.twenty.com/llms.txt)).
- **Avoid:** the sheer scale (a 58k-star monorepo with agents, message sync, multi-workspace tenancy) — it's a company CRM with AI-first direction, not a solo-target scope.

### 3.3 EspoCRM — `espocrm/espocrm` ⭐ 3,443 · 988 forks

- **Repo:** https://github.com/espocrm/espocrm · **Docs:** https://docs.espocrm.com/ · **Site:** https://www.espocrm.com
- **What it is:** an open-source **CRM platform** ("more than a CRM – it's a platform for building custom business applications") since 2014 ([README](https://raw.githubusercontent.com/espocrm/espocrm/master/README.md)).
- **Stats/activity:** 3,443 stars, 988 forks, PHP, **AGPL-3.0**, last push 2026-10-06 — active ([GitHub API](https://api.github.com/repos/espocrm/espocrm)).
- **Feature set:** leads, opportunities, accounts, contacts, calendar, email sync/sending/templates/mass email, activity stream, cases, portal, knowledge base, documents, web-to-lead, campaigns, workflows, BPM, import, export to CSV/Excel, roles/teams ([features page](https://www.espocrm.com/features/)).
- **Stack:** PHP 8.3–8.5, MySQL/MariaDB/PostgreSQL; "frontend designed as a single-page application and a REST API backend written in PHP"; SOLID backend with DI, static typing ([README](https://raw.githubusercontent.com/espocrm/espocrm/master/README.md)).
- **Architecture (the interesting part):** **metadata-driven everything**. Entities, fields, layouts, ACLs, views are JSON files merged recursively; customization happens by dropping JSON into `custom/`; a published JSON Schema gives IDE autocompletion ([metadata docs](https://docs.espocrm.com/development/metadata/)). The Contact entity shows the pattern concretely — fields, `links` (relations), `collection.textFilterFields`, and DB `indexes` all in one JSON file ([Contact.json](https://raw.githubusercontent.com/espocrm/espocrm/master/application/Espo/Modules/Crm/Resources/metadata/entityDefs/Contact.json)).
- **Copy:** the entityDefs-in-metadata approach (one file per entity declaring fields/relations/indexes/filters is a superb, achievable pattern for a solo backend); clean REST API; the quality of its developer docs.
- **Avoid:** the business-sales scope; the bespoke frontend framework (nested views, custom DI) that only EspoCRM uses.

### 3.4 Clay (rebranded "Mesh") — closed-source commercial

- **Site:** https://clay.earth/ (redirects to https://me.sh/)
- **What it is:** the best-known venture-backed **personal CRM startup**, now rebranded Mesh: "Mesh brings together everyone you've ever met. Automatically organized, intelligently searchable, always up to date. For you and your team" ([me.sh via clay.earth](https://clay.earth/)).
- **Features:** a home feed of birthdays/events/news/social changes with "reconnect" prompts, reminders, automatic enrichment from Facebook/LinkedIn/Instagram/Notion/WhatsApp/X, team sharing ("who knows whom"), an AI assistant (Nexus), apps on macOS/Windows/Web/Android/iOS; claims "186,821,792 relationships managed" ([clay.earth](https://clay.earth/)).
- **Why it matters as a reference:** it defines the commercial bar for personal-CRM UX (feed-first, automatic, multi-platform). No source to read, but its landing page is a free feature/positioning checklist.

### 3.5 Dex — closed-source commercial

- **Site:** https://getdex.com/
- **What it is:** "One place for your relationships — impress with thoughtfulness"; 30,000+ users ([getdex.com](https://getdex.com/)).
- **Features:** LinkedIn sync (automatic title-change alerts), the contact-detail field checklist quoted in §2.1, reminders, groups, browser extension, mobile app, privacy/export controls, and an **MCP server** so AI assistants can act on your relationship data ([getdex.com](https://getdex.com/)).
- **Why it matters:** the closest commercial match to the portfolio scope — single-user, lightweight, detail-oriented. Its feature list is effectively a validated MVP checklist, and the MCP angle is a cheap-to-implement differentiator for a portfolio project.

### 3.6 Folk — closed-source commercial (pivoted to team sales CRM)

- **Site:** https://www.folk.app/
- **What it is:** originally a lightweight team/personal CRM, now repositioned as "The AI CRM for your entire sales motion" ([folk.app](https://www.folk.app/)).
- **Features:** pipelines, multi-channel messages/sequences, tasks, dashboards, AI assistants, enrichment, Chrome extension, 30+ integrations, API + MCP ([folk.app](https://www.folk.app/)).
- **Why it matters:** (a) its per-contact page (Interactions + Notes + Tasks + relation summary) is a clean UX pattern worth copying; (b) the pivot is evidence that pure personal CRM is a hard standalone business — a portfolio project should not try to out-folk Folk, it should pick a sharp niche.

### 3.7 Notion template approach

- **Source:** Notion's official template marketplace: the **CRM category** has 2,091 templates and there is a dedicated **"Personal CRM" category with 250 templates** ([notion.com/templates/category/crm](https://www.notion.com/templates/category/crm)).
- **What it is:** CRM built from Notion databases — a People database related to Meetings/Notes databases, with views, filters, properties ([Notion templates](https://www.notion.com/templates/category/crm)). Notion's own FAQ describes the model: "Notion templates create databases you can relate, filter, and visualize (board, timeline, calendar)" ([same page](https://www.notion.com/templates/category/crm)).
- **Copy:** the *data-model shape* — related People ↔ Interactions ↔ Notes tables — is the fastest way to prototype your schema before building it for real.
- **Avoid:** treating a template as the end product. A template has no reminder engine, no import/export, no offline, no API, no auth — exactly the things a portfolio project should demonstrate (see §4).

### 3.8 Other notable open-source personal CRMs (smaller, modern, solo-scale)

From GitHub's own `topic:personal-crm` search (86 repos total — a strong signal the space is underserved; the big CRMs don't even use the tag) ([search API](https://api.github.com/search/repositories?q=topic:personal-crm&sort=stars&order=desc&per_page=15)):

- **pingcrm** (`sneg55/pingcrm`, ⭐125, AGPL-3.0): "Personal Networking CRM — AI-powered, open-source, self-hostable. Syncs Gmail, Telegram, Twitter/X, and LinkedIn. Detects life events, drafts follow-ups, scores relationships" — FastAPI + Next.js ([repo](https://github.com/sneg55/pingcrm)).
- **tilly** (`carlassmann/tilly`, ⭐65, MIT): "A relationship journal. An **offline capable PWA**… has an AI agent" — TypeScript, Astro + React + Jazz (local-first CRDT framework) ([repo](https://github.com/carlassmann/tilly)). The best small reference for the local-first/offline angle.

---

## 4. Portfolio implications — what makes a solo CRM impressive but achievable

### 4.1 Scope advice, grounded in the evidence

1. **Single-user first.** Dex proves the whole category works for one user with no org chart ([getdex.com](https://getdex.com/)); Monica's vaults/multi-user machinery is the part a solo project should skip ([Monica docs](https://docs.monicahq.com/getting-started/readme-1)). Twenty's workspace/multi-tenant layer is explicitly company-scale ([workspace-member entity](https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-server/src/modules/workspace-member/standard-objects/workspace-member.workspace-entity.ts)).
2. **Contact-centric, timeline, reminders.** That triad appears in every serious product: Monica ([Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php), [README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)), Twenty ([modules](https://github.com/twentyhq/twenty/tree/main/packages/twenty-server/src/modules)), EspoCRM ([features](https://www.espocrm.com/features/)), Dex/Clay ([getdex.com](https://getdex.com/), [clay.earth](https://clay.earth/)). It is also exactly one person's buildable scope.
3. **A sharp differentiator beats breadth.** The evidence shows distinct niches: local-first/offline (tilly — [repo](https://github.com/carlassmann/tilly)), AI-agent/MCP integration (Dex — [getdex.com](https://getdex.com/); Folk — [folk.app](https://www.folk.app/)), privacy/no-AI (Monica — [README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)), or social-graph tracking (Monica's contact-to-contact relationships — [Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php)).

### 4.2 Features that demonstrate engineering depth (each with a source to study)

| Depth area | Evidence / pattern to study |
|---|---|
| **Data modeling** | Monica's ~25 relation types hanging off Contact ([Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php)); Twenty's objects/fields/relations with system fields ([Data Model](https://docs.twenty.com/getting-started/core-concepts/data-model)); EspoCRM's single-file entityDefs incl. indexes and text-filter fields ([Contact.json](https://raw.githubusercontent.com/espocrm/espocrm/master/application/Espo/Modules/Crm/Resources/metadata/entityDefs/Contact.json)) |
| **Full-text search** | Monica: Scout + Meilisearch/Typesense, `SearchUsingFullText` attribute ([composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json), [Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php)) |
| **Import/export** | Monica: vCard + CardDAV via Sabre ([Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php), [composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)); EspoCRM CSV/Excel import-export as first-class features ([features](https://www.espocrm.com/features/)) |
| **Auth** | Monica: Fortify/Jetstream/Sanctum + WebAuthn passkeys + OAuth providers ([composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)); Twenty: OAuth platform API ([Developers intro](https://docs.twenty.com/developers/introduction)) |
| **Integrations** | Dex LinkedIn/title-change sync ([getdex.com](https://getdex.com/)); Clay multi-network sync ([clay.earth](https://clay.earth/)); Twenty calendar/email sync modules ([modules](https://github.com/twentyhq/twenty/tree/main/packages/twenty-server/src/modules)) |
| **Offline / local-first** | tilly's offline PWA on Jazz CRDTs ([repo](https://github.com/carlassmann/tilly)) |
| **AI integration** | Dex MCP server ([getdex.com](https://getdex.com/)); Folk MCP ([folk.app](https://www.folk.app/)); pingcrm AI follow-ups ([repo](https://github.com/sneg55/pingcrm)) |
| **Testing & quality** | Monica dev dependencies: PHPUnit/Paratest, Larastan, PHPStan; Sonar coverage badge in README ([composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json), [README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)) |

### 4.3 What to deliberately *not* build

- Sales pipelines, forecasting, email marketing, invoicing (Twenty/EspoCRM business-CRM features — [Twenty README](https://raw.githubusercontent.com/twentyhq/twenty/main/README.md), [EspoCRM features](https://www.espocrm.com/features/)).
- Multi-tenant workspaces, team permissions, BPM engines ([Twenty workspace-member](https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-server/src/modules/workspace-member/standard-objects/workspace-member.workspace-entity.ts), [EspoCRM features](https://www.espocrm.com/features/)).
- AI unless it's the differentiator you're selling — Monica's explicit no-AI stance is a legitimate position ([Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).

---

## 5. Recommended references — ranked study order

1. **Monica** — https://github.com/monicahq/monica (+ https://docs.monicahq.com/). *Why first:* it is the canonical personal CRM; read the README feature list, then `app/Models/Contact.php` — the entire category's data model in one file.
2. **Twenty** — https://github.com/twentyhq/twenty (+ https://docs.twenty.com/getting-started/core-concepts/data-model). *Why second:* the best modern architecture reference (objects/fields metadata, module-per-domain layout, workspace scoping) in the stack most portfolio projects use (TypeScript/NestJS/React/PostgreSQL).
3. **EspoCRM** — https://github.com/espocrm/espocrm (+ https://docs.espocrm.com/development/metadata/). *Why third:* the cleanest "define your schema as declarative metadata" pattern, with exceptional docs — read the metadata page and the Contact entityDefs JSON.
4. **Dex** (https://getdex.com/) — validated personal-CRM feature checklist and UX; note the MCP/AI-assistant angle.
5. **Clay/Mesh** (https://clay.earth/) — commercial bar for feed/reminders/integrations and product positioning.
6. **Notion Personal CRM templates** (https://www.notion.com/templates/category/crm) — fastest way to sketch the schema (People ↔ Interactions ↔ Notes) before building.
7. **tilly** (https://github.com/carlassmann/tilly) and **pingcrm** (https://github.com/sneg55/pingcrm) — modern, solo-scale implementations for local-first and AI-powered variants.

---

## 6. Suggested MVP scope (derived from the evidence above)

**Core (phase 1 — the Monica/Dex/EspoCRM consensus):**
- Contacts with rich detail fields (Dex's checklist: how you met, work/education, important dates, family, gift ideas — [getdex.com](https://getdex.com/)) + contact-to-contact relationships ([Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php)).
- Activity timeline per contact ([TimelineEvent model](https://github.com/monicahq/monica/tree/main/app/Models), [Twenty timeline module](https://github.com/twentyhq/twenty/tree/main/packages/twenty-server/src/modules), [EspoCRM Stream](https://www.espocrm.com/features/activity-stream/)).
- Reminders + important dates incl. recurring birthdays ([Monica README](https://raw.githubusercontent.com/monicahq/monica/main/README.md)).
- Notes, labels/groups ([Monica models](https://github.com/monicahq/monica/tree/main/app/Models), [getdex.com](https://getdex.com/)).
- Full-text search (Meilisearch or Postgres FTS — Monica pattern: [composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)).
- vCard/CSV import & export ([Contact.php](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php), [EspoCRM export](https://www.espocrm.com/features/data-export/)).
- Auth (email + passkeys; OAuth optional — Monica pattern: [composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)).
- REST API + automated tests + CI (Monica dev stack: [composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)).

**Phase 2 — pick ONE differentiator:**
- *Integration/AI:* one OAuth sync (e.g. LinkedIn-style, per Dex) or an MCP server ([getdex.com](https://getdex.com/), [folk.app](https://www.folk.app/)).
- *Local-first:* offline PWA (tilly pattern — [repo](https://github.com/carlassmann/tilly)).
- *Data-model depth:* declarative entity metadata like EspoCRM entityDefs ([Contact.json](https://raw.githubusercontent.com/espocrm/espocrm/master/application/Espo/Modules/Crm/Resources/metadata/entityDefs/Contact.json)) or custom objects à la Twenty ([Data Model](https://docs.twenty.com/getting-started/core-concepts/data-model)).

**Explicitly out of scope (evidence):** sales pipelines, multi-tenant workspaces, email campaigns, BPM — see §4.3.

---

## Sources

1. [Monica — GitHub repo](https://github.com/monicahq/monica)
2. [Monica README (main branch)](https://raw.githubusercontent.com/monicahq/monica/main/README.md)
3. [Monica docs — Welcome](https://docs.monicahq.com/)
4. [Monica docs — Meet Monica (concepts)](https://docs.monicahq.com/getting-started/readme-1)
5. [Monica docs — Vaults](https://docs.monicahq.com/vaults/introduction)
6. [Monica docs — Journals](https://docs.monicahq.com/vaults/journals)
7. [Monica — Contact.php model](https://raw.githubusercontent.com/monicahq/monica/main/app/Models/Contact.php)
8. [Monica — models directory](https://github.com/monicahq/monica/tree/main/app/Models)
9. [Monica — composer.json](https://raw.githubusercontent.com/monicahq/monica/main/composer.json)
10. [Monica — GitHub API repo data](https://api.github.com/repos/monicahq/monica)
11. [Twenty — GitHub repo](https://github.com/twentyhq/twenty)
12. [Twenty README](https://raw.githubusercontent.com/twentyhq/twenty/main/README.md)
13. [Twenty docs — home](https://docs.twenty.com/)
14. [Twenty docs — Data Model](https://docs.twenty.com/getting-started/core-concepts/data-model)
15. [Twenty docs — Developers intro](https://docs.twenty.com/developers/introduction)
16. [Twenty docs — index (llms.txt)](https://docs.twenty.com/llms.txt)
17. [Twenty — server modules directory](https://github.com/twentyhq/twenty/tree/main/packages/twenty-server/src/modules)
18. [Twenty — workspace-member entity source](https://raw.githubusercontent.com/twentyhq/twenty/main/packages/twenty-server/src/modules/workspace-member/standard-objects/workspace-member.workspace-entity.ts)
19. [Twenty — LICENSE (AGPL + Application Exception + commercial terms)](https://raw.githubusercontent.com/twentyhq/twenty/main/LICENSE)
20. [Twenty — GitHub API repo data](https://api.github.com/repos/twentyhq/twenty)
21. [EspoCRM — GitHub repo](https://github.com/espocrm/espocrm)
22. [EspoCRM README](https://raw.githubusercontent.com/espocrm/espocrm/master/README.md)
23. [EspoCRM docs — home](https://docs.espocrm.com/)
24. [EspoCRM docs — Metadata (development)](https://docs.espocrm.com/development/metadata/)
25. [EspoCRM — Contact.json entityDefs](https://raw.githubusercontent.com/espocrm/espocrm/master/application/Espo/Modules/Crm/Resources/metadata/entityDefs/Contact.json)
26. [EspoCRM — features overview](https://www.espocrm.com/features/)
27. [EspoCRM — GitHub API repo data](https://api.github.com/repos/espocrm/espocrm)
28. [Clay / Mesh — official site](https://clay.earth/)
29. [Dex — official site](https://getdex.com/)
30. [Folk — official site](https://www.folk.app/)
31. [Notion — CRM template category (incl. Personal CRM)](https://www.notion.com/templates/category/crm)
32. [GitHub search API — topic:personal-crm](https://api.github.com/search/repositories?q=topic:personal-crm&sort=stars&order=desc&per_page=15)
33. [pingcrm — GitHub repo](https://github.com/sneg55/pingcrm)
34. [tilly — GitHub repo](https://github.com/carlassmann/tilly)
