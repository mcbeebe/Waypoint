# Waypoint — Project Context for Claude Code

## What Is Waypoint?

Waypoint is a navigation platform for parents of children with disabilities in California. It helps families understand their rights, navigate complex systems (Regional Centers, school districts, insurance), and take concrete next steps. Think of it as a "GPS for the disability services journey."

**Target users:** Parents of children with autism, Down syndrome, cerebral palsy, and other developmental disabilities — primarily in California, with plans to expand.

**Core value prop:** AI-powered guidance that knows California disability law (Lanterman Act, IDEA, Medi-Cal, SSI) and gives personalized, empathetic, actionable advice.

## Repository Structure

This is a **monorepo** containing all Waypoint code and business documents.

**Keep this section true:** any PR that adds, moves, or archives a top-level
directory or a plan-of-record document updates this map in the same PR. It had
drifted five months out of date before 2026-08-29 — naming two directories
that no longer existed, and twice telling sessions to delete a nested `.git`
that was removed in March.

```
WayPoint/
├── waypoint-app/               # ← THE ACTIVE CODEBASE (Expo / React Native)
│   ├── App.tsx                 # Entry point (Expo + React Navigation)
│   ├── src/
│   │   ├── screens/            # auth · onboarding · main · staff · legal
│   │   ├── lib/                # supabase client, ai.ts, planGenerator, theme tokens
│   │   ├── hooks/              # useAuth.ts (Supabase session management)
│   │   └── types/              # database.ts (schema types), navigation.ts
│   ├── supabase/
│   │   ├── migrations/         # 59 sequential SQL files — APPLIED BY HAND
│   │   └── functions/          # 8 Edge Functions: ai-proxy, gmail, google-auth,
│   │                           #   delete-account, stripe-webhook, push-send,
│   │                           #   poll-replies, family-invite (Deno) + _shared/
│   ├── qa/                     # promptRegression.golden.json — 78-case golden set
│   └── scripts/                # prompt-regression.mjs, build-pending-migrations.mjs
│
├── waypoint-site/              # Marketing/content site (Astro, Vercel) — waypointchild.com
│   ├── src/                    # content collections (D2 schema), components, routes
│   ├── content-ops/            # keyword map + validator, pipeline SOP, style guide
│   └── docs/                   # analytics taxonomy (D3), redirect map, launch checklist
│
├── docs/                       # ⚠️ NOT documentation — this is the deployed
│                               #   web MVP published to GitHub Pages (pages.yml)
├── Roadmap/                    # Plans, analyses, and design-canvas mockups
├── Operations/                 # Vendorization packet, DDS letters, business docs
├── Archive/                    # Superseded material, in typed buckets
│   └── Retired-Surfaces/       # gas-mvp/ lives here since 2026-09-07 — the
│                               #   Google Apps Script MVP, archived by owner
│                               #   decision. See gas-mvp.SUPERSEDED.md. Do not
│                               #   fix, update, or port anything in it, and do
│                               #   NOT treat its data as corroboration: its ZIP
│                               #   router misroutes San Diego, Long Beach and
│                               #   the whole north coast.
├── Financial Models/  ·  IEP INTAKE/  ·  Apple App Store Readiness/  ·  WayPoint 2.0/
│
├── ROADMAP.md                  # ← THE PLAN OF RECORD (v2.0, supersedes v1.1 §3–8)
├── *.jsx / *.js                # Standalone prototypes — design exploration, not deployed
└── *.docx / *.xlsx             # Business documents (see the markdown-first rule below)
```

There is **no nested `.git`** inside the archived gas-mvp — it was removed in
March 2026. There is
no `Undivided Customer Journey/` or `WayPoint-Enterprise-Planning/` directory;
that material is under `Archive/`.

## Tech Stack

### gas-mvp (ARCHIVED 2026-09-07 — `Archive/Retired-Surfaces/gas-mvp/`)

The owner retired and archived this surface: it no longer serves users and needs no
maintenance or updates. **Do not spend work here** — no bug fixes, no
dependency bumps, no porting. It is also not a source of truth: a
2026-09-07 audit found its ZIP router sent the city of San Diego to Inland
Regional Center and Long Beach to San Gabriel/Pomona, so treat any data it
carries as suspect rather than as corroboration for the same value
elsewhere. The description below is historical.
- **Runtime:** Google Apps Script (V8 engine, server-side JavaScript)
- **Frontend:** Single HTML file with inline CSS/JS (served via `HtmlService`)
- **Backend data:** Google Sheets (tabs: Users, ActionLog, Sessions, KnowledgeBase, Prompts, InteractionLog, DraftLog, ChatSessions)
- **AI:** Anthropic Claude API (claude-opus-4-6) called server-side via `UrlFetchApp`
- **Key features built (12 sprints):**
  - AI Navigator chat engine with tone calibration (collaborative → assertive → adversarial)
  - Entity Navigation Matrix — 49 deep-dive KB articles
  - Onboarding flow, user profiles, multi-child support
  - Action plan with save-from-chat, follow-ups, progress tracking
  - Spanish + Vietnamese i18n
  - Email drafts, document generation
  - QA Testing Lab with stress tests
  - Accessibility features
  - Chat history and session management

### waypoint-app (Active — the flagship app)
- **Framework:** Expo 55 / React Native 0.76
- **Language:** TypeScript (strict mode)
- **Auth:** Supabase Auth (Apple Sign-In ready, session persistence via AsyncStorage)
- **Database:** Supabase Postgres with:
  - 10 core tables: families, children, diagnoses, providers, services, documents, expenses, appointments, deadlines, chat_sessions/chat_messages
  - pgvector extension for RAG embeddings (knowledge_embeddings table)
  - Row-level security (planned)
  - Auto-updating `updated_at` triggers
- **Navigation:** React Navigation (native-stack)
- **Design system:** Custom tokens in `src/lib/theme.ts` (colors: navy, teal, coral, sage; spacing scale; radii)
- **Current state (2026-09-03):** the flagship product. 59 migrations, eight
  Edge Functions in production, 44 screens under `main/` plus auth /
  onboarding / staff / legal, and a 108-file / 1297-test vitest suite across
  four projects. (This line previously read "Auth scaffolding… no screens
  beyond onboarding exist yet.")

### Commands (from `waypoint-app/`)

```bash
npx tsc --noEmit    # typecheck — CI gate
npm run lint        # eslint — CI gate (0 errors, ~50 warnings today)
npm test            # vitest, FOUR projects, 108 files (111 runs) / 1297 — CI gate
npm run build:web   # expo export + postbuild — NOT run in CI
```

### Things that will bite you

- **Migrations are applied BY HAND** in the Supabase SQL editor, in order.
  `scripts/build-pending-migrations.mjs` bundles a range into one transaction.
  Code that assumes an unapplied migration ships a silently broken feature —
  this has already happened once (`e0bdcdd`, "Fix empty calendar when
  migration 029 hasn't been applied").
- **The eight Edge Functions are excluded from `tsconfig.json`** and have no
  tests, yet `deploy-edge-functions.yml` ships them to the production project
  on merge to `main`. Treat every change there as unverified by CI.
- **`npm test` runs FOUR projects, and the count of files is not the count of
  runs** — the three `.tz.test.ts` files execute twice, once per timezone.
  - `logic` (`*.test.ts`, node) — the pure modules.
  - `ui` (`*.test.tsx`, jsdom + react-native-web) renders components. It exists
    because three adversarial reviews in a row found defects the logic suite
    structurally could not see: a button wired to a screen that does not exist,
    a control a screen reader cannot reach, a headline rendered as a 10px
    badge. Native edges are stubbed in `vitest.setup.ui.tsx`; everything
    asserted on is the real component. Pinned to `TZ=America/Los_Angeles` —
    where the families are — so a date rendered off the UTC clock fails in
    CI, not only on a west-coast laptop.
  - `tz` (`*.tz.test.ts`, TZ=Asia/Ho_Chi_Minh) and `tz-west` (the SAME files,
    TZ=America/Los_Angeles). One timezone is not a timezone suite: east catches
    a deadline computed a day EARLY, west a day LATE. Running only east let
    `actionSort` bucket `created_at` on its UTC day for a full PR — invisible
    at UTC+7, an off-by-one every evening in California, which is where
    Waypoint's families are. A `.tz.test.ts` must pass in BOTH, so its
    assertions cannot assume a sign.
- **The navigator is built from `src/navigation/routeGraph.ts`.** A `navigate`
  resolves to PARENTS, never to a sibling stack, so a target is reachable only
  if the caller's own stack registers it or the call names the tab. Declare
  screens in the graph — `MainTabs.tsx` maps over it and the types make drift a
  compile error. A hand-copied mirror of this was tried first and immediately
  certified nine dead taps.
- **The classifier prompt is duplicated** in `src/lib/ai.ts` (`classifyIntent`)
  and `scripts/prompt-regression.mjs`, held together only by a "must mirror"
  comment. Change one, change the other, or the regression suite silently
  tests a stale prompt.
- **`stripe-webhook` is `verify_jwt = false` on purpose** (`supabase/config.toml`
  documents why). Do not "fix" it.

## Code Style & Conventions

- **TypeScript:** Strict mode enabled. Prefer functional components with hooks. Include error handling in all async functions.
- **Naming:** PascalCase for components/types, camelCase for functions/variables, snake_case for database columns.
- **Exports:** Default exports for screen components, named exports for utilities and hooks.
- **JSDoc:** Add to all exported functions. Keep inline comments minimal and purposeful.
- **Testing:** Include unit tests alongside new features (testing framework TBD for waypoint-app).

## Key Domain Knowledge

Waypoint operates in the **California disability services ecosystem**:
- **Regional Centers:** 21 state-funded centers that provide services under the Lanterman Act
- **IEP (Individualized Education Program):** School-based plans under IDEA
- **IPP (Individual Program Plan):** Regional Center service plans
- **Medi-Cal / CCS:** California Medicaid and California Children's Services
- **SSI:** Supplemental Security Income for disabled individuals
- **Key laws:** Lanterman Developmental Disabilities Act, IDEA, ADA, Section 504

The AI engine must be empathetic, actionable, and legally accurate. It should feel like talking to "a friend who happens to be a disability rights attorney."

**Escalation tone rule (owner preference, Aug 2026):** anywhere the app helps a family raise a problem with an agency, the first step is always friendly and collaborative — "ask" or "request," never "demand." Tone firms up only step by step as asks go unanswered (collaborative → assertive → adversarial). This applies to letter templates, CTAs, stage copy, and AI drafts alike.

The rule also governs how the app **describes an agency to the parent**, not
only how it addresses the agency (owner decision, Aug 29 2026). Home states the
status of the answer — "An answer on X is past due" — never an actor who failed
("They missed the deadline", "They owe you an answer"). The framing a family
reads first is the one they carry into the phone call, so it starts neutral and
firms up on the escalation ladder. Pinned by tests in `homeTriage.test.ts`.

## Environment Variables

### gas-mvp (retired)
- `ANTHROPIC_API_KEY` — was stored in Script Properties (PropertiesService).
  The surface is retired; if that key is still live, it is worth revoking.

### waypoint-app
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- See `.env.example` for setup instructions

## Git Workflow

- **Branch:** `main` (default)
- **Commit style:** Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)
- **Commit after:** Each working increment
- **Ship automatically (owner preference, Aug 2026):** when a work increment is complete and ALL gates pass (`npx tsc --noEmit`, `npx vitest run`, `npx eslint . --ext .ts,.tsx --quiet` from `waypoint-app/`), open a PR to `main` and merge it without waiting for a further ask. Use a merge commit (preserve history). Don't merge with failing or unrun gates.
- **Plan & mock up first (owner preference, Aug 2026):** for NEW user-facing features or flows, deliver a short plan plus design-canvas mockups (Roadmap/mockups/, app design tokens) and wait for the owner's go before building. Bug fixes, copy tweaks, and small refinements to already-shipped surfaces proceed straight to code under the auto-ship rule.

### Where auto-ship stops

The auto-ship rule means the session that wrote a change also merges it — the
producer approving its own work. That is a deliberate velocity trade for
mechanical changes, and it stays. But it does **not** extend to:

- anything a family sees or that changes advice, tone, or legal framing;
- anything touching money (`stripe-webhook`, entitlements);
- schema changes and migrations;
- the eight Edge Functions (no CI covers them);
- anything leaving the desk — the DDS/vendorization packet, payer-facing
  letters, App Store submission.

For those: run **`/adversary`** first, put its memo in the PR, and wait for
the owner. Approval is a person's, and is not delegable to an agent — nor to
CI the same session wrote.

**Scoped auto-merge grant (owner decision — a decision record, Aug 30 2026).**
The owner has explicitly delegated ONE lane back to the producing session: the
**draft-flow initiative** (Home triage → the question sheet → the letter draft
→ send; `Roadmap/Draft-Flow-Plan.md`). For draft-flow PRs the session runs the
gates, runs `/adversary`, posts the memo in the PR, and then **merges its own
PR** without waiting — the owner's standing approval for that lane. This is the
owner exercising the person's-approval requirement in advance for a bounded
initiative, not the agent self-approving.

Read it honestly for what it is: a **deliberate loosening of the first and
strongest stop** — "anything a family sees or that changes advice, tone, or
legal framing" — for this one lane, since the whole draft flow is family-facing,
tone-bearing, legal-framing copy. The trade is velocity on a well-mocked,
heavily-reviewed initiative; the `/adversary` pass stays mandatory precisely
because the human gate is now standing rather than per-PR.

It does **not** widen any other line: money (`stripe-webhook`, entitlements),
schema changes and migrations, the eight Edge Functions (so a draft-flow PR that
also touches `functions/gmail` still waits — the narrower stop wins), and
anything leaving the desk still stop here and wait for the owner, even inside
the draft flow. The grant is draft-flow-scoped; any other family-facing work
reverts to the wait rule. The owner can widen (to all app code, or everything)
or revoke it at any time. This paragraph is the decision record for the grant.

### Initiatives

Work spanning **≥3 PRs or ≥2 sessions, touching a deploy surface, or changing
a locked decision** gets a folder under `Roadmap/initiatives/` and a row in its
registry, with intent written *before* analysis. Below that bar the PR
description is the record. See `Roadmap/initiatives/README.md`.

(They live under `Roadmap/`, not `docs/` — `docs/` in this repo is the
deployed Pages site.)

### Documents of record

- **Markdown first.** PRDs, plans, analyses, checklists and decision records
  are authored as `.md` under `Roadmap/` or `Operations/`. Word, Excel and
  PowerPoint files are *export deliverables*, generated on demand — they are
  opaque blobs in git, with no diff and no reviewable history.
- **Supersession is two steps, in the same commit that ships the successor:**
  move the old document to the matching `Archive/<bucket>/`, and — for a
  binary that cannot carry a banner — leave a sibling
  `<name>.SUPERSEDED.md` naming what replaced it. Archiving has happened
  exactly once in this repo's history (commit `51b5e57`, March 2026); the
  convention it established lived only in that commit message until now.
- **Decision-record header** on `Roadmap/*.md`: `Date` / `Status:
  draft|adopted|superseded` / `Supersedes` / `Superseded-by`. Then "what is
  the current plan?" is a grep, not archaeology.

## Development Notes

- `Archive/Retired-Surfaces/gas-mvp/` is archived and unmaintained (see above) — it should not need editing at all. If a task genuinely requires it, note that `Code.gs` and `Index.html` are ~3200 and ~4800 lines, so show only changed sections with 3 lines of context.
- Standalone `.jsx` and `.js` files in the root are **prototypes** — they were used for design exploration and may be referenced but aren't deployed.
- Business documents (`.docx`, `.xlsx`, `.pptx`) are tracked in git for version control. They contain product strategy, financials, and project plans.
- The Entity Navigation Matrix (`Archive/Retired-Surfaces/gas-mvp/Waypoint-Entity-Navigation-Matrix-v9_4.xlsx`, documented in `WayPoint-Dev-Session-EntityKB-v9.4.txt`) is the knowledge base the retired MVP's AI engine ran on. It survives its host as a content SOURCE — the marketing site's Regional Center pages were seeded from it — but the file lives inside a retired directory, so treat it as reference material to be verified, never as verified data. Its one Regional Center row is why the 21 RC county lists had to be authored rather than converted.

## waypoint-site (marketing site — waypointchild.com)

- **Lives in `waypoint-site/`** (Astro, static output, hosted on Vercel — same account as the app; deploys via Vercel git integration, per D14). The design source of truth for its templates is `Waypoint-Marketing-Site-Prototype.html` at repo root — port, don't redesign. Brand tokens mirror `waypoint-app/src/lib/theme.ts` (`brand`/`brandType`, initiative 006).
- **Site gates** (run from `waypoint-site/`): `npm run gates` — `astro check` + `vitest run` + a drafts build (`WAYPOINT_SHOW_DRAFTS=1`, with Pagefind postbuild) + internal-link check + an axe-core accessibility scan (fails on serious/critical, 15 template pages, Playwright chromium) + a plain production build (Zod frontmatter failures fail the build by design) + link check again + `node scripts/validate-keyword-map.mjs`. Same auto-PR-and-merge-on-green convention as waypoint-app. **Exception:** content PRs labeled `content-review` wait for the credentialed reviewer's sign-off — never auto-merged.
- **The publish gate:** collection content renders only at `status: published` unless the build sets `WAYPOINT_SHOW_DRAFTS=1` (dev + Vercel Preview env); drafts render with a red banner + noindex, and hub/nav links gate on what exists in the build. See `waypoint-site/README.md`.
- **Frozen contracts:** the content schema is `waypoint-site/src/content.config.ts` (documented in `content-ops/SCHEMA.md`); events + deep-link params are `waypoint-site/docs/analytics-taxonomy.md`. Change those docs first, in their own PR, before changing any consumer.
- **Content rules:** nothing YMYL publishes without a completed `review` block (schema-enforced); benefit figures come only from `src/data/benefit-constants.json`; zero email gates; no HIPAA claims; statutes cited to primary sources.
