# Waypoint — Project Context for Claude Code

## What Is Waypoint?

Waypoint is a navigation platform for parents of children with disabilities in California. It helps families understand their rights, navigate complex systems (Regional Centers, school districts, insurance), and take concrete next steps. Think of it as a "GPS for the disability services journey."

**Target users:** Parents of children with autism, Down syndrome, cerebral palsy, and other developmental disabilities — primarily in California, with plans to expand.

**Core value prop:** AI-powered guidance that knows California disability law (Lanterman Act, IDEA, Medi-Cal, SSI) and gives personalized, empathetic, actionable advice.

## Repository Structure

This is a **monorepo** containing all Waypoint code and business documents.

```
WayPoint/
├── gas-mvp/                    # ← ACTIVE MVP (Google Apps Script)
│   ├── Code.gs                 # Backend: AI engine, user mgmt, sheet ops (~2900 lines)
│   ├── Index.html              # Frontend: full SPA with chat UI (~7000 lines)
│   ├── Waypoint MVP Data.xlsx  # Entity Navigation Matrix + KB data
│   ├── *.docx / *.xlsx         # MVP-specific planning docs
│   └── .git/                   # ⚠️ Legacy nested git — safe to delete (parent tracks all)
│
├── waypoint-app/               # ← FUTURE: React Native / Expo mobile app
│   ├── App.tsx                 # Entry point (Expo + React Navigation)
│   ├── package.json            # Expo 52, React Native 0.76, Supabase
│   ├── tsconfig.json           # TypeScript strict mode
│   ├── src/
│   │   ├── components/         # Shared UI components (Button.tsx)
│   │   ├── screens/            # Auth (WelcomeScreen), Main (HomeScreen), Onboarding
│   │   ├── hooks/              # useAuth.ts (Supabase session management)
│   │   ├── lib/                # supabase.ts client, theme.ts design tokens
│   │   └── types/              # database.ts (full schema types), navigation.ts
│   ├── supabase/
│   │   └── migrations/         # 001_schema_v1.sql (full Postgres schema)
│   ├── .env.example            # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
│   └── .gitignore
│
├── *.jsx                       # Standalone React prototypes (mockups, landing page, journey maps)
├── *.js                        # AI engine prototypes (action engine, agencies, plan generator)
├── *.docx                      # Business plans, GTM, competitor analysis, SWOT, memos
├── *.xlsx                      # Financial models, sprint plans, project trackers
├── *.pptx                      # Investor pitch decks
├── Apple App Store Readiness/  # App Store launch planning
├── Undivided Customer Journey/ # Customer journey research
├── WayPoint-Enterprise-Planning/ # Enterprise scale-up docs
└── WayPoint-Dev-Session-EntityKB-v9.4.txt  # Dev session log (Entity KB build)
```

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

### waypoint-app (Future — Early Stage)
- **Framework:** Expo 52 / React Native 0.76
- **Language:** TypeScript (strict mode)
- **Auth:** Supabase Auth (Apple Sign-In ready, session persistence via AsyncStorage)
- **Database:** Supabase Postgres with:
  - 10 core tables: families, children, diagnoses, providers, services, documents, expenses, appointments, deadlines, chat_sessions/chat_messages
  - pgvector extension for RAG embeddings (knowledge_embeddings table)
  - Row-level security (planned)
  - Auto-updating `updated_at` triggers
- **Navigation:** React Navigation (native-stack)
- **Design system:** Custom tokens in `src/lib/theme.ts` (colors: navy, teal, coral, sage; spacing scale; radii)
- **Current state:** Auth scaffolding + Welcome screen + Home placeholder. No screens beyond onboarding exist yet.

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
- **Note:** `gas-mvp/` has a legacy nested `.git/` directory that should be removed (all history is in the parent repo)

## Development Notes

- The `gas-mvp/Code.gs` and `Index.html` files are large (~2900 and ~7000 lines respectively). When editing, show only changed sections with 3 lines of context.
- Standalone `.jsx` and `.js` files in the root are **prototypes** — they were used for design exploration and may be referenced but aren't deployed.
- Business documents (`.docx`, `.xlsx`, `.pptx`) are tracked in git for version control. They contain product strategy, financials, and project plans.
- The Entity Navigation Matrix (in `gas-mvp/Waypoint-Entity-Navigation-Matrix-v9_4.xlsx` and documented in `WayPoint-Dev-Session-EntityKB-v9.4.txt`) is the core knowledge base powering the AI engine.
