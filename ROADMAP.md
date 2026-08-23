# Waypoint Implementation Roadmap

**Version 2.0 · August 23, 2026 — supersedes v1.1's Phases 3–8**

> **⚠ Strategy change (Aug 2026):** the consumer-subscription sequencing below is superseded by the payer-funded plan in [`Roadmap/PRD-SDP-and-Premium-v1.md`](Roadmap/PRD-SDP-and-Premium-v1.md) (context: [`Roadmap/Payer-Funded-Pivot-Review-Aug2026.md`](Roadmap/Payer-Funded-Pivot-Review-Aug2026.md), [`Roadmap/Assumptions-Audit-Aug2026.md`](Roadmap/Assumptions-Audit-Aug2026.md), [`Roadmap/Options-Stack-Rank-Aug2026.md`](Roadmap/Options-Stack-Rank-Aug2026.md)).
> **Still in force from v1.1:** Phases 0, 0.5, 1 and 2 (wiring, UX kit, CA navigation core, Documents/IEP) — they serve both strategies. **Superseded:** Phases 3–8 as sequenced below (individual workstreams survive where the PRD pulls them in).
>
> **The development plan of record:**
>
> | Phase | Weeks | Ships | Gate |
> |---|---|---|---|
> | **W0 · Rebase & foundations** | 1–2 | Remaining audit P0s · migrations 035–036 (organizations, profiles/roles, staff, family assignments + consent, staff access log, `accessible_family_ids()` RLS helper) · role-forked routing (staff shell) · funnel event taxonomy · 099 vendorization packet started | RLS verification clean; staff login lands on a caseload shell, never onboarding; packet drafted |
> | **W1a · Funnel + Process Navigator** | 3–6 | Eligibility-first onboarding, funded offer, booking (EN+ES) · content provenance · planGenerator rules-table refactor · you-are-here process map, path decision aid, lever letters (G1–G3) | 3-min onboarding→result; funnel events flowing; IPP-meeting letter generated in-app |
> | **W1b · Facilitation workspace** | 5–10 | Caseload, case detail, PCP builder, 099 cap tracker, spending plan (COI block), time capture, baselines · RC + FMS invoicing · request/authorization tracker (G4) | One family orientation→approved plan in-app; **one PAID invoice**; hours-per-family measured |
> | **W2 · Premium** | 11–14 | Pricing page + web checkout · sponsor-aware entitlements · gates on existing features · AI cost caps · prompt-regression CI | First 10 subscribers; conversion instrumented; cost/user visible |
> | **W3 · Evidence & decision** | 15–18 | 10-family price/caseload readout · outcome baselines · funnel verdict · G3 gate pre-read with DDS answers | Go/no-go memo on scaling facilitation and opening the next channel |
>
> Non-engineering in parallel: DDS service-code question #0 in writing (week 1) · ten SDP-family price interviews · SELPA pilot conversation (October window) · grant applications.

**Version 1.1 · Locked August 16, 2026** *(superseded as described above; retained for reference)*

One consolidated plan covering every gap identified in the codebase audit plus all of PRD v2.0 (F1–F15). Eight phases ordered by leverage: **unlock what's already built, then port the proven GAS features, then build what's never existed.** Each phase ends at a shippable state with an explicit review gate.

Companion documents (styled versions with full audit evidence): [`Roadmap/Waypoint-Gap-Report.html`](Roadmap/Waypoint-Gap-Report.html) · [`Roadmap/Waypoint-Implementation-Plan.html`](Roadmap/Waypoint-Implementation-Plan.html)

**Work type legend:** `WIRE` = register/connect existing code · `PORT` = translate from GAS MVP or prototypes · `NEW` = build from scratch (PRD)

---

## Context: why the plan looks like this

The August 2026 audit found that most "missing" features in `waypoint-app` are **already built but unreachable**: the app ships a flat five-tab bar with no stack navigator, so 18 of 23 screens, 3 of 5 AI edge-function actions, and 20 of 32 database tables have no path a user can follow to them (~6,500 lines of finished code with no entry point). Roughly 60% of this plan is wiring and porting; only 40% is net-new build.

### Already shipped (not on the roadmap)

Auth (Apple/email), 6-step onboarding, seeded starter action plan (PR #10, including `children.rc_status`/`iep_status` via migration 012), Tracker list with status cycling, AI Navigator (streaming chat, tone bar, RAG over 226 KB articles, follow-up chips, save-as-action), Calendar CRUD, Home dashboard, basic Profile, PWA web build, `ai-proxy` edge function, 12 migrations.

---

## Locked decisions (August 16, 2026)

| # | Decision | Call |
|---|----------|------|
| 1 | Platform priority | **Web/PWA first.** OAuth uses the web client ID first; native configs land with the TestFlight build. Reminders ship in-app + email first, native push later. |
| 2 | Community timing | **Feature-flagged off.** Routes registered in Phase 0 but hidden until 6.1's moderation tooling is production-ready. |
| 3 | Insurance tracker scope | **Slim v1.** Card details + expiration reminders + appeal handoff. Units-used tracking deferred. |
| 4 | FHIR timing | **Register early.** Epic developer application filed during Phase 1; build work stays in 6.3. |
| 5 | Languages | **English + Spanish.** Full es coverage in 7.1; vi kept in repo but unlisted; tl/zh deferred. |
| 6 | GAS MVP sunset | **Retires at parity.** No interim GAS fixes; the deployment sunsets once the app clears Gate 4. |

---

## Phase 0 — Unblock & Unbreak `(S · days)`

**Goal:** every finished screen reachable, every silent bug fixed, every config wall removed. Highest leverage in the plan.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 0.1 | Stack navigation | WIRE | Wrap each tab in a stack navigator. Register: ActionDetail (Tracker cards open it — makes the starter plan's scripts/steps/documents visible), Documents, DocumentAnalysis, Resources, Blog, Expenses, TaxReport, Insights, Forum/Thread, Messages, Providers, Services, FamilySharing, HealthRecords, ProviderPortal, Terms/Privacy (tappable from Welcome — App Store requirement). Unlocks ~6,500 lines. |
| 0.2 | Profile save fixes | WIRE | Load + persist child name, RC status, IEP status (migration-012 columns); regenerate starter plan on change, mirroring GAS behavior. Add add-child flow (`useFamily.addChild` exists, zero callers). |
| 0.3 | Google OAuth setup | WIRE | Create OAuth client IDs, add env vars + google-signin config plugin. One task unblocks Gmail send and Calendar sync, both already coded. (F5 · F8) |
| 0.4 | Config hygiene | WIRE | Move Sentry to dependencies; remove dead `expo-router`; fill EAS placeholders; delete duplicate `ALL_REMAINING_MIGRATIONS.sql`; align version strings; add missing expo plugin entries (notifications, document picker). |

**Gate 0:** Every screen reachable on web + dev build · profile edits persist · Google account connects · starter-plan detail visible in Tracker.

---

## Phase 0.5 — UX Foundation `(S · days)` *(added Aug 16 — pulled forward from the UX plan)*

**Goal:** the design foundation every later screen composes from, built before Phase 1 adds five new screens. Sweep-style UX work (i18n, audits, consent screens, persona validation) stays in its original phases.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 0.5a | Component kit + tokens + icons | NEW | `src/components/ui/` (Card, SectionTitle, Chip, Skeleton), semantic state colors in `theme.ts`, Ionicons replacing emoji in the tab bar and Home tiles (UX 1). |
| 0.5b | Web URLs per screen | NEW | React Navigation linking config — browser back/forward and shareable/bookmarkable URLs on the PWA; `waypoint://` deep links on native (UX 2). |
| 0.5c | Four-states + text scale | WIRE | Shared `EmptyState`/`LoadingScreen` deduped (local copies removed), skeleton loading on Tracker, empty states get next-step CTAs; `TextScaleProvider` (Aa control, 100–150%, persisted) adopted on reading-heavy screens (UX 3/UX 5). |

**Gate 0.5:** New screens can be built entirely from kit components · every screen has a URL · Tracker shows skeletons/empty-CTA/error states · text size persists across sessions.

---

## Phase 1 — California Navigation Core `(M · ~1–2 wks)`

**Goal:** the product's moat — the California-specific knowledge layer no competitor has. Mostly data transcription from GAS.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 1.1 | RC data layer | PORT | 21-Regional-Center database, ZIP-prefix lookup + boundary overrides + county fallback picker. Fixes `regional_center: null` at onboarding; personalizes Home and agency content. (F4) |
| 1.2 | Agency Directory | PORT | 8 agencies with phone, services, statutory rights, watch-outs; RC entries personalized from 1.1. (F4) |
| 1.3 | RC Reimbursables guide | PORT | 11 fundable categories with POS codes, cost ranges, insider notes (+ 2 extra categories from the richer prototype data). |
| 1.4 | Journey Map | PORT | 9 diagnosis journeys as a phased timeline with "You are here," milestones, alerts; shown at onboarding completion + linked from Home. Use the finer 5–6-phase data from `Waypoint-Journey-Maps.jsx`. (F2) |
| 1.5 | Learn More & eligibility explainers | PORT | 15 explainer modals (SSI, IHSS, Lanterman, SB 946…) + 3 "Do I qualify?" checkers, linked from ActionDetail and agency pages. (F3) |

**Also during Phase 1:** file the Epic FHIR developer application (see [Epic registration steps](#epic-fhir-registration-steps)) so the external lead time runs in parallel with Phases 1–5.

**Gate 1:** New user onboards → sees their journey map → lands on a dashboard naming their actual Regional Center, with a browsable CA knowledge layer.

---

## Phase 2 — Documents & IEP Intelligence `(L · ~2–3 wks)`

**Goal:** the file keeper and the IEP Clarity reader, end to end — PRD F6 + F7 complete.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 2.1 | Document upload & library | WIRE | Configure document picker + camera scan; connect DocumentsScreen to the real `pickAndUploadDocument`; Supabase Storage bucket + folder structure (child → category → date); auto-categorization suggestions. (F6) |
| 2.2 | IEP Clarity reader | WIRE | Route uploads into the existing OCR → `analyze-iep` pipeline; render flags, citations, and suggestions in DocumentAnalysisScreen; add the required legal disclaimer. (F7) |
| 2.3 | IEP goal tracker | NEW | Goals table (AI-extracted from 2.2 or manual), baselines/targets, parent progress logs, trajectory chart, PDF progress report for meetings. (F7) |
| 2.4 | IEP timeline reminders | NEW | Annual review, triennial, 15-day assessment-plan and 60-day completion clocks computed from IEP dates, feeding the deadlines system. (F7 · F9) |
| 2.5 | Sharing & versions | NEW | Secure share links (expiry, optional password), access logging (the `document_access_logs` table already exists), version history per document. Annotation deferred to Phase 7 as a stretch. (F6) |

**Gate 2:** Upload an IEP from phone → AI review with flags & citations → goals tracked → share link sent to an advocate.

---

## Phase 3 — Communication Suite `(M · ~2 wks)`

**Goal:** PRD F8 complete — Waypoint writes the hard letters and keeps the paper trail.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 3.1 | Letter & template generator | PORT | 12 legally-grounded templates × 3 tones as a new `ai-proxy` action; template library screen; editable draft view with placeholder highlighting; profile-aware pre-fill. (F8) |
| 3.2 | Gmail depth | WIRE | Send with document attachments; save-to-Gmail-drafts (client functions already exist); compose from templates or free-form. (F8) |
| 3.3 | Communication log | NEW | Auto-log sent emails; manual entries for calls/meetings; filter by contact/date/category; export PDF/CSV. (F8) |
| 3.4 | Email analyzer | PORT | Paste an agency thread → promises, timeline violations, red flags, applicable law, drafted response. Port the AI version (`analyzeEmailAI`), which was never wired even in GAS. |

**Gate 3:** Pick "IEE request" → strong tone → edit → send via Gmail with the assessment attached → it appears in the communication log.

---

## Phase 4 — Adaptive Advocacy Layer `(M · ~2 wks)`

**Goal:** what made the MVP feel like an advocate, not a tracker — the app reacts to what happens.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 4.1 | Follow-up prompts | PORT | Completing key actions asks "How did it go?" and injects the right next action (voicemail → call again tomorrow; refused → appeal/complaint with draft). |
| 4.2 | Check-ins & frustration flows | PORT | Home/Tracker check-ins branch into decision trees (RC slow → what → how long) that detect Lanterman timeline violations and inject statute-citing escalation actions (4731, CDE, IMR) with drafts. Consolidate GAS's two duplicate implementations into one. |
| 4.3 | Chat completeness | WIRE + PORT | Session history list (`loadSession` exists, uncalled); 👍/👎/⚠️ feedback writing to an interactions log; graceful AI-failure fallback showing top pending actions + RC phone number. |
| 4.4 | Notifications & reminders | WIRE | **Web-first:** in-app reminder surfaces + email reminders ship first; native push (expo-notifications config, `useNotifications` scheduler, 30/14/7/1-day) activates when the TestFlight build lands. Notification preferences in Settings; "Text myself" `sms:` links from each action's `follow_up_note` work on web today. (F9) |

**Gate 4:** Mark "Call RC" complete → "left a voicemail" → tomorrow-morning action appears with a reminder scheduled. **GAS MVP sunsets after this gate.**

---

## Phase 5 — Calendar, Money & Insurance `(L · ~2–3 wks)`

**Goal:** PRD F5 depth + F12, the one major feature with no code anywhere.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 5.1 | Calendar depth | NEW | Recurring appointments; true two-way Google sync (fix the one-shot pull so Google-side edits propagate; use the existing update/delete client functions); overlap warnings. (F5) |
| 5.2 | Expenses & tax | WIRE | Polish the newly-wired Expenses entry + TaxReport; receipt photo attach (reuses Phase 2 upload); mileage; category totals feeding Home. |
| 5.3 | Insurance & authorization tracker — slim v1 | NEW | **Decided: slim scope.** Plan/card details (photo capture reuses 2.1), authorization records with expiration countdowns + renewal reminders through F9, denial → appeal handoff into the Phase 3 letter generator. Units-used-vs-approved tracking deferred. (F12) |
| 5.4 | Family sharing | WIRE | Finish invitations/permissions (tables + screen exist); co-parent sees shared calendar, actions, and documents per permission level. (F5) |

**Gate 5:** An ABA authorization shows its expiration 21 days out, with a renewal reminder set and an appeal letter one tap away.

---

## Phase 6 — Community & Ecosystem `(L · ~3 wks)`

**Goal:** PRD Phase-3/4 surface area — people and providers around the family.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 6.1 | Community hardening | WIRE | **Feature-flagged off until this completes.** Moderation UI (`useModeration` has zero callers), reporting flow, anonymous posting, blocking, community guidelines — then the flag opens. (F10) |
| 6.2 | Care team & provider portal | WIRE | Providers/Services registries polished; provider-side registration, document-share inbox, and messaging on the existing 4-table schema. (F15) |
| 6.3 | Health records (FHIR) | WIRE | The Epic/MyChart OAuth + FHIR R4 client is fully written. Registration filed in Phase 1; wire HealthRecordsScreen here. (F11) |
| 6.4 | Legal support resources | NEW | Legal guide library (seed from the 50 Entity-Matrix rights articles already in the KB) + attorney/advocate directory with CA legal-aid orgs. (F13) |

**Gate 6:** A parent asks the forum about their RC, shares an IEP with their advocate through the portal, and pulls visit notes from MyChart.

---

## Phase 7 — Quality, Language & Scale `(M · ongoing, threads through 5–6)`

**Goal:** the debt that decides real-world reliability. Claims ~20% of each week rather than waiting until the end.

| # | Workstream | Type | Detail |
|---|-----------|------|--------|
| 7.1 | i18n sweep | WIRE | **English + Spanish.** Move all screens onto the translation system; complete and review the Spanish string set; translate seeded starter-plan content. Vietnamese stays in repo but unlisted. |
| 7.2 | Offline & sync | WIRE | Consolidate the two ad-hoc queues onto `offlineSync.ts`; replay on reconnect; conflict policy. |
| 7.3 | Analytics & insights | WIRE | Call `trackEvent` from key flows so `analytics_events` actually populates; Insights screen becomes real; enhanced Home widgets. (F14) |
| 7.4 | AI quality harness | PORT | Port the QA Lab's 39 regression tests as an automated prompt-eval suite against `ai-proxy` (CI job, not a user-facing screen). |
| 7.5 | Accessibility & account | WIRE + NEW | Wire the unused a11y helpers (announcements, labels, touch targets, reduced motion); account deletion + data export (App Store requirement); document annotation stretch goal from F6. |

**Gate 7:** A Spanish-speaking parent uses the full app offline, and their data survives; deleting the account removes everything.

---

## PRD v2.0 coverage matrix

| PRD | Feature area | State today | Completed by |
|-----|-------------|-------------|--------------|
| F1 | Onboarding & Family Profile | Mostly done; profile bugs | 0.2 |
| F2 | Personalized Action Plans / Journey Maps | Starter plan shipped; no journey view | 1.4 · 4.1–4.2 |
| F3 | Resource Discovery & Library | Built, unreachable | 0.1 · 1.5 · 6.4 |
| F4 | Regional Center Integration | Absent (null at onboarding) | 1.1–1.3 |
| F5 | Appointments & Calendar | CRUD works; sync blocked, shallow | 0.3 · 5.1 · 5.4 |
| F6 | Document Management | Stub screen, unreachable | 2.1 · 2.5 (annotation 7.5) |
| F7 | IEP Review & Support | AI pipeline built, zero callers | 2.2–2.4 |
| F8 | Email Integration & Templates | Send wired but OAuth-blocked | 0.3 · 3.1–3.4 |
| F9 | Notifications & Reminders | Hook orphaned, no config | 0.4 · 2.4 · 4.4 |
| F10 | Peer Community | Built, unreachable, unmoderated | 0.1 · 6.1 |
| F11 | Healthcare Integration (FHIR) | Client built, unreachable | 6.3 |
| F12 | Insurance & Authorization Tracking | **No code anywhere** | 5.3 (slim v1) |
| F13 | Legal Support Resources | KB articles only | 6.4 |
| F14 | Analytics & Family Dashboard | Write side dead | 7.3 |
| F15 | Provider / Advocate Portal | Built, unreachable | 0.1 · 6.2 |

**Sequencing logic:** Phases 0–1 are strictly first — 0 multiplies the value of everything after it, and 1 is the differentiator users feel immediately. 2→3→4 build on each other (documents feed letters; letters feed follow-ups) but 3 and 4 can start while 2's tail finishes. 5 and 6 are independent and can swap based on traction. 7 threads through everything.

---

## UX plan — standards & practices

Applied to every workstream and reviewed at every gate. Grounded in WCAG 2.2 AA, Nielsen's heuristics, Apple HIG / Material patterns, and trauma-informed plain-language standards.

1. **Design system before screens.** `theme.ts` tokens (navy/teal/coral/sage, spacing, radii) are the single source of truth, extended with semantic roles (success/warning/danger/info), a fixed type scale, and an 8-pt grid. A documented component kit — buttons, cards, chips, list rows, sheets, form fields, banners — is built once in Phase 0–1; every later screen composes from it. The 16 WayPoint 2.0 HTML mockups (`01_Onboarding` … `16_ProviderPortal`) are the reference designs.
2. **Navigation & information architecture.** Standard tab + stack: five tabs, detail screens push with titled headers and back affordance, modals only for interruptions. On web, React Navigation's linking config gives every screen a real URL — browser back/forward works and screens are shareable. Max three taps from Home to any core task. One primary action per screen.
3. **Accessibility — WCAG 2.2 AA.** 4.5:1 text contrast in both themes, 44-pt touch targets, visible focus states, screen-reader labels and announcements (wire the existing `lib/accessibility.ts` helpers), reduced motion respected, 200% text scaling without breakage. Audited per-gate with axe/Lighthouse — 7.5 certifies, but every phase complies.
4. **Content design for stressed parents.** The GAS voice — "a friend who happens to be a disability rights attorney" — becomes a written style guide: 6th–8th-grade reading level, empathy before instruction, jargon always paired with tap-to-explain, progress celebrated, deadlines framed as support ("You have until March 12 — plenty of time"). Errors say what happened and what to do next; nothing dead-ends. Spanish is human-reviewed, not machine passthrough.
5. **The four-states rule.** No screen ships without all four states designed: loading (skeletons for lists), empty (shared `EmptyState` with a next-step CTA), error (retry + explanation), offline (cached data visible, queued actions show "will sync"). Optimistic updates with undo where the pattern exists.
6. **Forms, trust & PWA mechanics.** Single-column forms, inline validation on blur, input never lost (draft autosave), correct keyboards and autofill. Explicit consent screens before Google or Epic connections stating exactly what's read and why; privacy, export, and delete-account visible in Settings. Installable PWA: correct manifest, offline shell, <100 ms tap feedback, safe-area insets, honest cache-busting service worker.
7. **Validation loop.** Each gate includes persona walkthroughs (the PRD's four personas: first-diagnosis Maria, veteran Sarah, transition David, multi-system Priya) against the gate scenario, plus 3–5 real parent sessions when available. Analytics funnels (7.3) instrument the same scenarios post-launch. Findings feed the next phase's backlog.

---

## Epic FHIR registration steps

File during Phase 1 (external lead time runs in parallel; build work is 6.3). `lib/fhir.ts` is a patient-facing SMART on FHIR public client, so Epic's self-service track applies — no partnership or fees.

1. Go to **fhir.epic.com** → "Build Apps" → create a free Epic on FHIR developer account (business email; verify).
2. "+ Create App" → name **Waypoint** → Application Audience: **Patients** (the MyChart-login track the code implements).
3. Select FHIR **R4** APIs matching the scopes in `fhir.ts:28–38`: Patient.Read, Condition.Search, MedicationRequest.Search, Immunization.Search, AllergyIntolerance.Search, Observation.Search (Labs), DocumentReference.Search.
4. Register as a **public client with PKCE** (not confidential — it's a PWA with no server-held secret).
5. Redirect URIs: production web callback (e.g. `https://<pages-domain>/epic-callback`) + localhost for dev. Must exactly match what the app sends (`fhir.ts:41–43`, env `EXPO_PUBLIC_FHIR_CLIENT_ID` + redirect).
6. Save → an immediate **non-production client ID**. Set it in `.env`, test against Epic's sandbox (`fhir.epic.com/interconnect-fhir-oauth`, already the default in `fhir.ts:24`) with Epic's published test patients.
7. When sandbox works: mark the app ready for production, accept the API Subscription/Terms → **production client ID** issued. Patient-facing IDs then sync to Epic customer organizations — expect days to a few weeks of propagation; some health systems additionally gate which apps their MyChart patients can connect.
8. Keep sandbox and production client IDs as separate env vars per environment.

---

*Sources: full wiring audit of `waypoint-app/` (App.tsx, MainTabs, 23 screens, 23 hooks, 16 libs, 12 migrations, ai-proxy edge function), feature inventory of `gas-mvp/Code.gs` + `Index.html`, root prototypes, and `WayPoint 2.0/Waypoint_PRD_v2.0.md` (F1–F15). KB content (226 Entity Navigation Matrix articles) is already seeded in Supabase and is not a gap.*
