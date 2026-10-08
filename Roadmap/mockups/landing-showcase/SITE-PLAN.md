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

## Owner decisions (2026-10-08)

1. **Prices: decided.** Plus $9.99/mo or $99/yr; Pro $14.99/mo or $139/yr
   (read as Plus/Pro respectively — confirm).
2. **What's free: decided** — the "Suggested" column below, as written (owner, 2026-10-08).
3. **Spanish: plan it.** A Spanish-pages plan is added (PR 7). Until those
   pages ship, the site says "The app speaks Spanish" instead of "En español".
4. **Hero families: approved** — just diagnosed (0–5), IEP years, benefits and
   money, turning 18.
5. **FAQ: approved** — drafted from existing pricing, privacy and about copy,
   owner approves wording in the PR.
6. **Goal check indexing: lift at PR merge** — noindex, sitemap filter and
   hidden footer link removed in PR 1 itself.

## Core features and tiers (decided: the Suggested column)

Today the app's paywall is **off** for everyone (`waypoint-app/src/lib/flags.ts`
`paywall: false`, and its server twin `PAYWALL_ENFORCED = false` in `ai-proxy`):
every family currently gets everything. The app's code also has ONE paid tier
("Premium"), not Plus and Pro. Two tiers at the decided prices means an app
change (entitlements, Stripe products, the webhook) — a money change that
sits outside this site initiative and waits for the owner under CLAUDE.md.

| Feature | What it does | App code (when the paywall turns on) | Site pricing today | Suggested |
|---|---|---|---|---|
| AI Navigator | Ask anything; answers cite the law | Free: 30 messages/mo. Premium: unlimited | Free: limited. Plus: unlimited. Pro: “priority AI” | Free 30/mo · Plus and Pro unlimited |
| Eligibility results | What your child may qualify for, with the rule behind each | Free | Free | Free |
| Journey and process maps | Ages and stages, how each system works | Free | Free (as guides) | Free |
| Resource Stack | Benefit layers in order, and your next one | Not gated | Not listed | Free |
| Self-Determination path | Step-by-step SDP enrollment with its clocks | Not gated | Not listed | Free |
| Action plan | One list across every system, next 3 steps first | Free (starter plan) | Not listed | Free |
| Request tracker and clocks | Each request starts its legal clock; Home shows what's due | Free | Plus: “deadline alerts” | Free to see clocks · Plus for push reminders |
| Reminders (push notifications) | Heads-up before a clock runs out, and when an answer is past due | Not gated | Plus | Plus |
| Letter drafts, core letters | Friendly drafted requests in your name, three tones | Free (core letters) | Pro: “appeal & letter generation” | Free |
| Letter sending history | A record of every letter sent and when | Premium | Pro | Plus |
| Gmail connection | Send from your Gmail; replies come back into Waypoint | Not gated | Not listed | Plus |
| Email analyzer | Paste an agency email; get what it means and what to do | Not gated (AI) | Not listed | Plus |
| IEP document analysis | Upload an IEP: goals rated, rewrites, compare, meeting prep, goal tracking | Premium | Plus: “IEP meeting prep” | Plus |
| IEP goal check (website) | One goal, five parts, in the browser | — | — (new) | Free, no account |
| Document vault | Store reports, notices, IEPs | Free to store | Plus | Free to store |
| Document sharing links and binder export | Share or export your records | Premium | Plus | Plus |
| Paper-trail export | Export the communication log | Premium | Not listed | Plus |
| Expense tracking and tax report | Track disability expenses; year-end report | Premium | Plus | Plus |
| Multi-child | More than one child on the account | Premium | Pro | Pro |
| Family sharing | Invite a co-parent or caregiver | Not gated | Not listed | Pro |
| Spanish | The app in Spanish | Free | Free | Free |
| “Priority AI” | Listed on the site's Pro plan | Does not exist in the app | Pro | Remove from site until built |

The site's pricing page will show exactly the column the owner approves; a
test fails if the page lists a feature the app does not have (the "priority
AI" row today).

## Build order

| # | PR | Depends on |
|---|---|---|
| 1 | IEP goal check (built, reviewed) | — |
| 2 | Homepage, sections 1–12 + guard tests; shared loop and comparison components | 1, decisions 4–5 |
| 3 | Free tools hub, nav, shared next-step block | 1 |
| 4 | `/product/` full tour | 2 |
| 5 | Pricing page: decided prices + approved feature table | decision 2 |
| 6 | Screens in content-page CTA boxes | 2 |
| 7 | Spanish pages plan (interim wording ships in PR 2) | — |

Every PR: `npm run gates` (types, tests, both builds, links, axe, keyboard
walk, citations, sitemap, keyword map), screenshots at 390 and 1280 px,
`/adversary` memo in the PR, then wait for the owner to merge
(family-facing, outside the draft-flow lane).

## Not in scope

No AI or network calls from the site; no app, entitlement, Edge Function or
analytics-taxonomy changes; no legal claims beyond the site's verified sources.
