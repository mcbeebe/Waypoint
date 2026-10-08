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

| # | attune.coach | Waypoint version | Source screen |
|---|---|---|---|
| 1 | Hero: "Training that actually adapts to you." + sign-up + interactive card, tabs "Same morning, four different athletes" | Hero: "The next step for your child, before you have to ask." + Start free + phone card with tabs **"Same Monday, four different families"** (just diagnosed · IEP years · benefits · turning 18), each showing its Home heads-up | Home triage |
| 2 | "How a morning works" — 4 numbered steps | **"How a week works"**: tell us what happened → Waypoint finds the next step → send the friendly ask → Waypoint watches the clock | — |
| 3 | Dark band "Whatever you're training for" — 4 path cards + week-by-week chart with "Today" | Dark band **"Wherever you are"** — 4 path cards + the journey-by-age strip (0–3, 3–5, 5–13, 14–22) with "You are here" | Journey |
| 4 | "A coach in your pocket" — scripted chat, Approve / Keep my plan | **"A navigator in your pocket"** — scripted (not live) chat, 3 sample questions; answer cards Your right / Good to know / Watch out; buttons Save as step / Draft the request; after 3 tries it ends in "Start free" | Navigator |
| 5 | "Make it yours" — coach name + 17 personalities | **"Your tone, your call"** — Collaborative → Assertive → Advocacy; always starts collaborative (CLAUDE.md tone rule); live letter preview changes with the tone | Letters & Drafts |
| 6 | — | **Free IEP goal check** inline + the IEP analysis screen as the upgrade | IEP Review |
| 7 | — | **"Waypoint speaks first"** — Day 0 / 12 / 16 timeline, status-first wording | Home triage |
| 8 | "Works with the gear you already wear" — Garmin, Strava, Apple Health | **"Works with what you already use"** — Gmail (replies come back in), your mail app, phone notifications, upload a PDF or photo. Verified in app code; no calendar export, so none claimed | — |
| 9 | Dark "Try it before you're in" — 3 calculators | Dark **"Try it free"** — IEP goal check, SSI calculator, RC finder, template letters | — |
| 10 | Founder quote + FAQ side by side | Mike's quote + **FAQ** (Is this legal advice? What does it cost? What happens to my data? Is it only for California? Spanish? Who's behind it?) | — |
| 11 | Dark final band "Start training that adapts to you." | Dark final band: "Turn 'What do I do?' into 'Here's what to do next.'" + Start free | — |

Already built on a branch (PR 2 draft): sections 1 (without persona tabs),
6, 7, 9 and 11, plus the tabbed feature showcase. The build replaces the
tabs with sections 3–5 and 8 above.

## Rest of the site

| Page | Today | Plan |
|---|---|---|
| IEP goal check `/tools/iep-goal-check/` | — | Built (PR 1), independently reviewed: 14 golden goals rate strong, false positives fixed, copy says "not spotted, check the goal" |
| Free tools hub `/tools/` | No page; nav "Free Tools" opens the SSI calculator | New hub (Attune's "Try it before you're in" as a page); nav points here |
| SSI calculator, RC finder | Working | Same result → "next step" block as the goal check |
| The App `/product/` | Text-only feature grid | Full tour, feature by feature beside its screen: Navigator, letters, Home, plan, IEP review, Resource Stack, Self-Determination path, document vault; keep "Why not just read the guides?" |
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
| 2 | Homepage, Attune-mapped sections 1–11 + guard tests | 1, decisions 4–5 |
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
