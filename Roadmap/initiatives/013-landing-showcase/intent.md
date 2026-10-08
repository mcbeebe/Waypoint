# 013 — Landing showcase + free IEP goal check

**Date:** 2026-10-08 · **Status:** Open — owner go 2026-10-08 (option A, new headline)
**Artifacts:** intent.md (this) → plan.md → PR 1 (goal check) → PR 2 (homepage)
**Mockup + proposal:** `Roadmap/mockups/landing-showcase/` (branch
`design/landing-showcase-mockup`).

## Problem

The waypointchild.com homepage explains Waypoint in words but never shows the
app working. A family cannot see the AI Navigator, a drafted email, a
deadline heads-up, or an IEP read for them before deciding to sign up. And
the free help on the page is a list of links: nothing on the homepage itself
helps a parent in the first minute.

## Intent

1. **Sign-up:** show the product doing the work — the proactive Home heads-up,
   Navigator answers with their law, the drafted email, the action plan, the
   benefits stack, and IEP analysis — as code-built screens with a fictional
   family. Never the owner's real data.
2. **Free help:** a free IEP tool on the page. Owner decision (option A,
   2026-10-08): a **rule-based goal check that runs only in the browser** —
   paste one annual goal, see which of five parts of a measurable goal it
   names, get a friendly ask for the team. Nothing is uploaded, no AI, no
   cost. The full AI IEP analysis stays a Premium app feature
   (`waypoint-app/src/lib/entitlements.ts`) and is shown as the upgrade.
3. **Headline:** "The next step for your child — before you have to ask."
   (owner approved 2026-10-08).

## Non-goals

- No AI or network call from the site. No change to app entitlements,
  pricing, or Edge Functions.
- The goal check is not a legal or educational judgment of the IEP; it
  checks whether a goal *names* the parts that make it measurable.

## Stops that still apply

Family-facing copy outside the draft-flow lane: each PR runs the site gates
and `/adversary`, posts the memo, and waits for the owner to merge.
