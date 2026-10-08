# waypointchild.com — full-site plan (initiative 013)

Date: 2026-10-08 · Status: draft (awaiting owner go) · Supersedes: — · Superseded-by: —

Builds on the approved homepage proposal (`PROPOSAL.md`: option A, new
headline, owner go 2026-10-08). Reference: the attune.coach landing page, as
captured in its own repo
(`mcbeebe/Broken-Arrow-Training` → `docs/initiatives/003-landing-page/screenshots/PR3-landing-1280.jpg`;
the live domain does not resolve from the build environment).

## Goals (every page serves one or both)

1. **Sign-up** — show the app doing the work, with one consistent ask: "Start free".
2. **Free help** — real help with no email: tools, guides, letters.

## Attune, section by section → Waypoint homepage

Owner direction (2026-10-08): keep the current site's Guides, Schools and
Regional Centers, the Tell → Plan → Act → Track loop, and the comparison
tables. They are placed below; nothing on the current site is removed (see
"Nothing removed").

| # | attune.coach | Waypoint version | Kept from today | Source screen |
|---|---|---|---|---|
| 1 | Hero + interactive card, "Same morning, four different athletes" | Hero: "The next step for your child, before you have to ask." + Start free + phone with tabs **"Same Monday, four different families"**; stats row underneath (23 agencies, 21 Regional Centers, 13 diagnoses) | Stats row | Home triage |
| 2 | "How a morning works" — 4 steps | **"One loop, every time something changes."** The Tell → Plan → Act → Track ring and its four cards, as one shared component | Loop (`/product/`) | — |
| 3 | Dark "Whatever you're training for" — 4 path cards + chart | Dark **"Wherever you are"** — the six pillar cards (Regional Centers, School & IEPs, Money & benefits, Insurance & therapies, First steps 0–5, Free tools) linking to the real Guides, Schools and Regional Centers hubs and the 21 Regional Center pages; then the journey-by-age strip with "You are here" | Pillar cards | Journey |
| 4 | "A coach in your pocket" — scripted chat | **"A navigator in your pocket"** — scripted chat (not live AI), 3 sample questions, ends at Start free | — | Navigator |
| 5 | "Make it yours" — personalities | **"Your tone, your call"** — Collaborative → Assertive → Advocacy; letter preview changes with the tone | — | Letters & Drafts |
| 6 | — | **"Why not just read the guides?"** — Without it / With Waypoint panels, then three guide-vs-app rows (full four on `/product/`) | Both comparisons | — |
| 7 | — | **Free IEP goal check** + IEP analysis screen as the upgrade | — | IEP Review |
| 8 | — | **"Waypoint speaks first"** — Day 0 / 12 / 16 timeline | — | Home triage |
| 9 | "Works with the gear you already wear" | **"Works with what you already use"** — Gmail, your mail app, phone notifications, PDF or photo upload (verified in app code; no calendar export claimed) | — | — |
| 10 | Dark "Try it before you're in" | Dark **"Try it free"** — IEP goal check, SSI calculator, RC finder, template letters | — | — |
| 11 | Founder quote + FAQ | Mike's quote + FAQ | Founder quote | — |
| 12 | Dark closing band | "Turn 'What do I do?' into 'Here's what to do next.'" + Start free | Closing line | — |

Mobile length: twelve sections is long on a phone. Sections 2, 5 and 9 are
compact by design; the build checks scroll depth at 390 px before review.

## Nothing removed

| Today | Where it goes |
|---|---|
| Menu: Start Here, The App, Guides, Free Tools, Schools, Regional Centers, Pricing, Search | Unchanged; "Free Tools" now opens the new hub |
| Guides hub, Schools (IEP) hub, Regional Centers hub + 21 RC pages, answers, letters | Unchanged content; linked from homepage section 3; CTA boxes gain a small screen |
| Homepage stats row | Under the hero ("2 languages" waits on decision 3) |
| Homepage pillar cards (incl. "Publishing soon" gating) | Homepage section 3 |
| Homepage "Without it / With Waypoint" and "Generic advice vs Waypoint" | Homepage section 6 |
| `/product/` "Why not just read the guides?" (4 rows) | Stays on `/product/`; 3 rows also on the homepage |
| `/product/` "Six things the app does that a page can't" | Stays; each feature gets its screen |
| `/product/` "One loop, every time something changes" | Stays; also homepage section 2 (one shared component) |
| Pricing "If money is tight" and "How we compare" table | Stay; numbers update after decisions 1–2 |
| About, Start here, legal, search, accessibility | Unchanged |

## Rest of the site

| Page | Today | Plan |
|---|---|---|
| IEP goal check `/tools/iep-goal-check/` | — | Built (PR 1), independently reviewed: 14 golden goals rate strong, false positives fixed, copy says "not spotted, check the goal" |
| Free tools hub `/tools/` | No page; nav "Free Tools" opens the SSI calculator | New hub (Attune's "Try it before you're in" as a page); nav points here |
| SSI calculator, RC finder | Working | Same result → "next step" block as the goal check |
| The App `/product/` | Text-only feature grid | Keeps every section (comparison, six features, loop); each feature now sits beside its screen, plus Resource Stack and the Self-Determination path |
| Pricing `/pricing/` | Plus $4.99 / Pro $9.99 | Match the app once decided; one "what's free" table |
| Guides, answers, letters, RC pages | Text CTA box | CTA box gains a small matching screen (letter page → drafted email). Component change only, no content edits |
| Header / footer | "Free Tools" → SSI calculator | "Free Tools" → `/tools/`; goal-check link once its review hold lifts |
| About, Start here, legal, search | — | No change |

## Shared building blocks

- `PhoneFrame` + mock-screen styles (built) on every page; fictional family
  "Maya"; screens are one labelled image to screen readers.
- `NavigatorDemo` (scripted chat, try-limit 3), `PersonaTabs` (hero),
  `ToolNextStep` (tool result → sign-up).
- Guard tests: mock screens contain no phone numbers, no emails except
  `*.example`, names only from an allowlist; banned claims ("best", "#1",
  user counts, unverified prices or integrations).

## Decisions needed

1. **Prices.** Site: Plus $4.99/mo, Pro $9.99/mo. App (`entitlements.ts`): one Premium tier, $99/yr or $14.99/mo. Which is real?
2. **What's free.** Site puts deadline alerts in Plus and letters in Pro; the app lists core letters and the request tracker as free.
3. **Spanish.** Home says "En español"; pricing says "English + Spanish, full parity"; the site has no Spanish pages. Reword to "The app speaks Spanish", or plan Spanish pages?
4. **Persona tabs.** Are these the right four families: just diagnosed (0–5), IEP years, benefits and money, turning 18?
5. **FAQ answers.** I draft from existing site copy (pricing, privacy, about); you approve the wording.
6. **Goal check indexing.** Lift its noindex and footer hold when PR 1 merges, or after a separate copy review?

## Build order

| # | PR | Depends on |
|---|---|---|
| 1 | IEP goal check (built, reviewed) | — |
| 2 | Homepage, sections 1–12 + guard tests; shared loop and comparison components | 1, decisions 4–5 |
| 3 | Free tools hub, nav, shared next-step block | 1 |
| 4 | `/product/` full tour | 2 |
| 5 | Pricing alignment | decisions 1–2 |
| 6 | Screens in content-page CTA boxes | 2 |
| 7 | Spanish wording or Spanish pages plan | decision 3 |

Every PR: `npm run gates` (types, tests, both builds, links, axe, keyboard
walk, citations, sitemap, keyword map), screenshots at 390 and 1280 px,
`/adversary` memo in the PR, then wait for the owner to merge
(family-facing, outside the draft-flow lane).

## Not in scope

No AI or network calls from the site; no app, entitlement, Edge Function or
analytics-taxonomy changes; no legal claims beyond the site's verified sources.
