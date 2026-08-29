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
│   │   ├── migrations/         # 47 sequential SQL files — APPLIED BY HAND
│   │   └── functions/          # 5 Edge Functions: ai-proxy, gmail, google-auth,
│   │                           #   delete-account, stripe-webhook (Deno)
│   ├── qa/                     # promptRegression.golden.json — 78-case golden set
│   └── scripts/                # prompt-regression.mjs, build-pending-migrations.mjs
│
├── gas-mvp/                    # Google Apps Script MVP — still serving users
│   ├── Code.gs                 # Backend: AI engine, user mgmt, sheet ops (~3200 lines)
│   ├── Index.html              # Frontend: SPA with chat UI (~4800 lines)
│   └── .clasp.json             # Exists since Mar 2026 but is NOT used — deploys
│                               #   are still manual copy-paste. See the open
│                               #   question in docs/initiatives/README.md
│
├── docs/                       # ⚠️ NOT documentation — this is the deployed
│                               #   web MVP published to GitHub Pages (pages.yml)
├── Roadmap/                    # Plans, analyses, and design-canvas mockups
├── Operations/                 # Vendorization packet, DDS letters, business docs
├── Archive/                    # Superseded material, in typed buckets
├── Financial Models/  ·  IEP INTAKE/  ·  Apple App Store Readiness/  ·  WayPoint 2.0/
│
├── ROADMAP.md                  # ← THE PLAN OF RECORD (v2.0, supersedes v1.1 §3–8)
├── *.jsx / *.js                # Standalone prototypes — design exploration, not deployed
└── *.docx / *.xlsx             # Business documents (see the markdown-first rule below)
```

There is **no nested `gas-mvp/.git`** — it was removed in March 2026. There is
no `Undivided Customer Journey/` or `WayPoint-Enterprise-Planning/` directory;
that material is under `Archive/`.

## Tech Stack

### gas-mvp (Active — Production)
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
- **Current state (2026-08-29):** the flagship product. 47 migrations, five
  Edge Functions in production, screens across auth / onboarding / main /
  staff / legal, and a 44-file / 474-test vitest suite. (This line previously
  read "Auth scaffolding… no screens beyond onboarding exist yet.")

### Commands (from `waypoint-app/`)

```bash
npx tsc --noEmit    # typecheck — CI gate
npm run lint        # eslint — CI gate (0 errors, ~50 warnings today)
npm test            # vitest, 44 files / 474 tests — CI gate
npm run build:web   # expo export + postbuild — NOT run in CI
```

### Things that will bite you

- **Migrations are applied BY HAND** in the Supabase SQL editor, in order.
  `scripts/build-pending-migrations.mjs` bundles a range into one transaction.
  Code that assumes an unapplied migration ships a silently broken feature —
  this has already happened once (`e0bdcdd`, "Fix empty calendar when
  migration 029 hasn't been applied").
- **The five Edge Functions are excluded from `tsconfig.json`** and have no
  tests, yet `deploy-edge-functions.yml` ships them to the production project
  on merge to `main`. Treat every change there as unverified by CI.
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

## Environment Variables

### gas-mvp
- `ANTHROPIC_API_KEY` — stored in Script Properties (PropertiesService), never in code

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
- the five Edge Functions (no CI covers them);
- anything leaving the desk — the DDS/vendorization packet, payer-facing
  letters, App Store submission.

For those: run **`/adversary`** first, put its memo in the PR, and wait for
the owner. Approval is a person's, and is not delegable to an agent — nor to
CI the same session wrote.

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

- The `gas-mvp/Code.gs` and `Index.html` files are large (~3200 and ~4800 lines respectively). When editing, show only changed sections with 3 lines of context.
- Standalone `.jsx` and `.js` files in the root are **prototypes** — they were used for design exploration and may be referenced but aren't deployed.
- Business documents (`.docx`, `.xlsx`, `.pptx`) are tracked in git for version control. They contain product strategy, financials, and project plans.
- The Entity Navigation Matrix (in `gas-mvp/Waypoint-Entity-Navigation-Matrix-v9_4.xlsx` and documented in `WayPoint-Dev-Session-EntityKB-v9.4.txt`) is the core knowledge base powering the AI engine.
