# 011 — Citation receipts: make the provenance registry something a parent can open

**Date:** 2026-09-15 · **Status:** Open — app + site linking shipped (#279, #284, #286, #288, #289); three app surfaces deferred on an unresolved card-structure question (#291)
**Artifacts:** intent.md (this) → the PR bodies named below, each carrying its own `/adversary` memo
**Serves:** `ROADMAP.md` W1a — *"content provenance"* and the provenance registry + `content_sources` (migration 038). Also the Aug 2026 moat analysis, whose whole thesis is that a correct, checkable citation is the one layer an AI coding agent cannot cheaply reproduce.

> **Written mid-flight, against convention.** `README.md` says intent is written
> *before* analysis. This folder exists after five merged PRs, because the work
> crossed the ≥3-PR / ≥2-session / two-deploy-surface bar without anyone
> noticing it had. Recording it late is worth more than not recording it; the
> dates below say which parts are reconstruction and which are forward plan.

## Problem

Waypoint's provenance registry — `src/data/contentSources.ts`, mirrored into
`content_sources` by migration 038 — had **zero UI consumers**. Every statute
the app asserted was schema-validated, verification-dated, and invisible: a
parent read `W&I §4646.5(b)` as grey text with no way to reach the section, the
claim Waypoint rests on it, or the date a human last checked it. The marketing
site was worse: `sources[]` was link-rot-checked on every build and **nothing
rendered it at all**, despite the style guide saying since day one that a chip
"renders as a link to that URL".

So the asset the moat analysis calls the most defensible thing Waypoint owns
existed only for tests.

## The one danger to design against

**A tappable citation is an assertion; inert text is not.**

This is the lesson the initiative actually bought, and it cost two defects:

1. **`sourceForCitation` was first-match, and five chips name two statutes.**
   On four of them it returned the section that does *not* make the claim
   printed beside it. `Lanterman Act, W&I §4512 · §4643` sits above
   *"Assessment ≤120 days from intake"* and opened §4512 — entitlement basis,
   no income test, **nothing about 120 days** — linking to a table of contents,
   while the §4643 entry that carries the 120-day rule sat unreachable. That
   card is what every family who has not yet enrolled sees. As grey text the
   chip named both sections and asserted nothing about which said what. That
   was honest. Making it tappable is what turned a correct label into a wrong
   one. Fixed in #289: `sourcesForCitation()` returns **every** authority a
   chip names, each keeping its own verified claim and its own link.

2. **Nothing in the pipeline checks that a citation is the right one for the
   sentence beside it.** Typecheck, lint, 1,596 tests and two web builds all
   passed on the mis-citing version. The orphan guard only ever asked *"does
   this string resolve?"*, never *"does it resolve to the section that backs
   this claim?"* No amount of coverage testing closes that gap — it needs a
   person reading claims against statutes, which is exactly the case for the
   named reviewer in the moat memo's §05.

A third danger, carried from the site half: **a guess wearing a receipt's
clothes.** Where a page lists several sources that reduce to the same name, the
matcher returns `null` and the chip stays plain text rather than linking to a
coin flip.

## The shape

**Shipped**

| | |
|---|---|
| #279 | `<Citation>` component — chip opens authority, claim, verified date, link. Wired into Escalation Ladder, Process Map, Request Case. Export renamed to "Your case file" with a live count. |
| #284 | Site chips link to their `sources[]` entry; `Sources.astro` renders the list; `check-citations.mjs` guards dead anchors, duplicate ids and an orphan ratchet. 382 → 505 chips linked. |
| #286 / #288 | `cite:` frontmatter field, and the matcher that honours it. (#287 merged into a stale base and stranded the consumer on a branch; #288 landed it. **Delete the base branch when a stacked PR merges, or target `main` from the start.**) 508 linked / 21 plain. |
| #289 | Citation wired into Your Result, Resource Stack, SDP Journey, Support Detail. Compound-citation resolver. Chip contrast 4.34 → 9.45:1. Modal no longer nests its contents in a `<button>`. |
| #291 | Letters sent-moment citation opens. First UI coverage for the Request Tracker. |

**Deferred, for one shared reason**

Three surfaces still print a citation as inert text, and each sits **inside a
navigating `<Pressable>`**, so a `<Citation>` there nests a button inside a
button — invalid on web, and on native the outer card's accessibility grouping
hides the chip from VoiceOver entirely. Verified by rendering, not assumed: the
attempt produced exactly one `validateDOMNesting` warning and one nested button.

- **`RequestTrackerScreen.tsx:151`** — the whole card is the button.
- **`PlanScreen.tsx:351`** (from `planView.ts:241`) — the same `deadlineFor()`
  string. A targeted row is a `Pressable` (`:364`); an untargeted one is an
  `accessible` View (`:358`).
- **`LearnPanel.tsx`** — article rows (`:214`) and targeted hits (`:125`) are
  `Pressable`; glossary (`:243`) and untargeted hits (`:114`) are `accessible`
  containers, where a nested button stays reachable on web (verified by
  rendering) but may not on native.

Plan and LearnPanel share one shape: a `Pressable` when the row navigates, an
`accessible` View when it does not. So the card question below answers all
three surfaces at once rather than needing three answers. (Plan is the mildest
case — its row label already ends with `${entry.source}`, so a screen-reader
user does hear the statute, just not as something they can open.)

## Open decisions for the owner

1. **Restructure the Request Tracker card?** Make it a `View` and promote its
   existing *"🗂 Open the case file — thread, clock & next move ›"* line to the
   navigating control. Removes the nested button, the native unreachability,
   and the near-miss tap (a ~22px chip inside a card-sized button means a
   slightly-low tap navigates away instead of opening the receipt). It changes
   a shipped interaction, so it is not taken unilaterally. The same question
   answers `PlanScreen` and `LearnPanel`.
2. **Give `<Citation>` a surface variant.** It hard-codes a `#F1F5F9` fill, so
   on a coloured host its only "tappable" signal disappears: **1.003:1** against
   the cream clock pill, **1.115:1** against the overdue one — under SC 1.4.11's
   3:1 for a control boundary. A border or an `onSurface` prop fixes it once
   rather than per screen. Affects the already-merged Request Case too.
   Separately, the chip is still ~22px on web (`hitSlop` is native-only),
   against a 44pt house minimum.
3. **Derive `reviewedOn` from the registry.** Your Result holds two constants
   (`REVIEWED` in `eligibility.ts`, per-entry `verifiedOn` here) equal by test.
   Deriving would make drift impossible rather than merely detectable, and
   delete the constant.
4. **Three undeclared chips on `/guides/benefits/medi-cal-institutional-deeming/`.**
   Two share the text `DHCS Medi-Cal Eligibility` while backing different
   claims, against two candidate sources; a third names two authorities at once.
   Which source backs which claim is a content call, not an inference.
5. **21 plain chips site-wide**, now mostly compound chips naming 2+
   authorities, plus three on `.astro` pages the Markdown pipeline cannot reach.

## Done when

- Every citation a family sees is either openable or plainly not a link — no
  chip that looks tappable and is not, and none that is tappable and opens the
  wrong section.
- A compound citation opens **every** authority it names, each with its own
  claim and link.
- The remaining app surfaces are resolved one way or the other: wired, or
  recorded here as a deliberate no with the reason.
- A reviewer pass checks **claim↔statute pairings**, not just that each
  citation exists — the gap that no gate in this repo can close.
