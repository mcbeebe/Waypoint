# Landing-page showcase + free IEP goal check — proposal

Date: 2026-10-08 · Status: draft (awaiting owner decisions) · Supersedes: — · Superseded-by: —

Mockup: [`Landing.html`](Landing.html) (interactive; fictional child "Maya").
Published view: see the Artifact link in the session.

## Goals

1. Convince families to sign up — show the app working: AI Navigator chat,
   email drafting, reminders / proactive nudges, IEP analysis, action plan.
2. Give a little free help on the page itself — with an IEP tool as the
   headline free tool.

## Reference findings

- **Broken Arrow Training repo = the Attune landing page.** Patterns borrowed:
  - Product UI rebuilt in code above the fold, not screenshots.
  - Free tools are pure-client (no fetch, no storage, no auth), enforced by a
    guard test, and reuse the app's own logic.
  - Every demo ends in the single CTA; the tool a visitor came from is
    carried into sign-up (`?from=tool-…`).
  - Approved copy lives in one file, with a test for banned claims.
- **attune.coach did not resolve** from this environment (DNS failure), so the
  live site was not reviewed. Need the correct URL to compare.

## Proposed homepage, top to bottom

| # | Section | Job |
|---|---|---|
| 1 | Hero + phone showing Home's proactive heads-up | Sign-up; shows "speaks first" above the fold |
| 2 | Free IEP goal check (inline) | Free help; leads to the full analysis in the app |
| 3 | "See it work" tabs: Navigator · Draft · IEP analysis · Plan · Benefits stack | Sign-up; each tab tagged Free or Premium |
| 4 | "Waypoint speaks first" — Day 0 / 12 / 16 / if needed | Shows reminders; follows the tone rule |
| 5 | Free help grid (3 tools + 3 pillar guides) | Free help |
| 6 | Built-by-a-parent + final CTA | Sign-up |

## Privacy handling

- Screens are HTML/CSS recreations with a fictional child ("Maya").
- Excluded from every file: the owner's child's name, family surname, the case manager's name
  and email, the family phone number, and the district/IEP specifics.
- A scan for each of those runs before every commit and returns nothing
  (pattern kept out of the repo so it does not itself carry the names).

## Legal citations used in the mock screens

All are already published on waypointchild.com; primary sources:

- Ed Code §56321 — 15-day assessment-plan clock —
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56321.
- Ed Code §56343.5 — IEP meeting within 30 days of a written parent request —
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56343.5.
- Ed Code §56345(a)(2) — measurable annual goals —
  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=EDC&sectionNum=56345.
- 34 CFR §300.320(a)(2) — measurable annual goals (federal) —
  https://www.ecfr.gov/current/title-34/section-300.320

## Decisions needed

1. **How free is IEP analysis?** Today it is Premium
   (`waypoint-app/src/lib/entitlements.ts`, `PREMIUM_FEATURES`).
   - **A — recommended.** Free goal check on the site: rule-based, runs in the
     browser, nothing uploaded, no AI cost. Full AI analysis stays Premium and
     is shown as the upgrade.
   - **B.** A free account gets one full AI IEP analysis. Changes the free tier
     (app entitlements + pricing copy).
   - **C — not recommended.** Anonymous AI analysis on the website. Needs a new
     Edge Function (no CI coverage), rate limiting, AI cost, and handling a
     child's IEP without an account.
2. **Hero headline:** replace "Your child was just diagnosed…" with "The next
   step for your child — before you have to ask."?
3. **attune.coach:** correct URL, if a comparison is wanted.

## Build plan (after a go)

Initiative folder `Roadmap/initiatives/013-landing-showcase/` (≥3 PRs).

| PR | Scope | Gates |
|---|---|---|
| 1 | `PhoneFrame` component, screen recreations, new homepage sections in `waypoint-site/src/pages/index.astro`; new CTA ids in `src/lib/appLinks.ts` and the style guide | `npm run gates`, `/adversary`, owner approval |
| 2 | `/tools/iep-goal-check/` + homepage embed; pure rules module with vitest tests; guard test that the tool never fetches or stores | same |
| 3 | Only if option B: free-tier IEP analysis in the app | same, plus entitlement tests |

Homepage copy is family-facing and outside the draft-flow lane, so each PR
waits for the owner before merging.

## Incidental finding

Pricing disagrees: `waypoint-site/src/pages/pricing.astro` says Plus
$4.99/mo, Pro $9.99/mo; `waypoint-app/src/lib/entitlements.ts` says $99/yr or
$14.99/mo. Not changed here.
