# 005 — Supports you have to ask for

**Date:** 2026-08-31 · **Status:** Open — owner approved the full plan (Aug 31 2026)
**Artifacts:** intent.md (this) → plan.md → PRs A–D
**Serves:** `ROADMAP.md` v2.0 (the "GPS for the journey" promise); the Resource
Stack (`resourceStack.ts`) and the Eligibility Result funnel
(`eligibility.ts`); extends the `rc_money` Learn article and the Reimbursables
guide. Owner trigger: a @specialmamaheart Instagram post on RC-funded Sibling
Support Services and "the catch — it's not automatic."

## Problem

The Regional Center funds a whole tier of **family supports** — sibling groups
(Sibshops), sibling counseling/therapy, respite that frees up 1:1 time, family
recreation, parent training — that **no coordinator offers unprompted.** The
catch, stated exactly by the parent who flagged this: they are **not
automatic.** Each has to connect to an **identified need written into the IPP**
(W&I §4646.5 / §4648(a)). So getting one is an act of advocacy, not a form.

Waypoint already **teaches this mechanic** — the `rc_money` article says "what
the IPP lists, the Regional Center has to secure, so the ask starts by getting
the need written into the plan." But the research (Aug 31) found three gaps:

1. **Sibling support appears nowhere** — not in `reimbursables.ts`, not in the
   `rc_money` search terms, not in `ServiceType`, not in journey maps, not in
   tool search. A parent searching "Sibshop" / "sibling counseling" finds
   nothing.
2. **No support has a per-item "how do I get THIS one" flow.** The `UnlockGuide`
   WHAT/WHY/HOW/tip pattern — exactly what a non-automatic support needs — is
   built but wired only to Medi-Cal deeming and IHSS (`unlockGuideFor` returns
   `null` for the RC layer).
3. **The two surfaces the owner named already dead-end.** Your Result's RC card
   names "family services" but its CTA routes to FundedOffer/ProcessMap, never
   to a family-supports list. The Resource Stack's RC layer offers only a
   generic process map. The promise is made and not kept.

## The one danger to design against

**Turning "we help you advocate" into "we told you it exists."** A flat list of
services a parent still can't act on is the failure mode — that's most of what
exists today. Every support in this initiative must end in a **concrete,
draftable IPP request** in collaborative-first tone, handed to the Request
tracker with a follow-up clock — the same standard the Medi-Cal deeming path
already meets. Naming the support is table stakes; the deliverable is the ask.

## The shape (what we're building)

Not "add a sibling row." A **reusable per-support advocacy pattern** — *what it
is · the catch (identified need in the IPP) · how to ask (collaborative script)
· draft the IPP request* — that **sibling support ships first** and respite,
camp/family-recreation, parent training and equipment inherit. Reached from the
**two doors the owner named**: the Resource Stack RC layer and the Your Result
RC card.

Locked: **California only.** **Collaborative-first tone** (per the owner rule) —
every string is an *ask*, the framing states the situation ("it's not
automatic"), never blames an actor; it firms up only on the escalation ladder.
Content accuracy is gated against W&I §4646.5 / §4648(a) and the existing
`contentFacts` test discipline.

## Done when

- Sibling support (and the family-support tier) exist in the data model with a
  first-class advocacy layer (the catch + how-to-ask + the IPP-need hook),
  trilingual, citation-covered.
- A "Supports you can ask for" screen renders the list + a per-support detail
  ending in a draftable IPP request; the pattern is reusable, not sibling-only.
- Both doors reach it: the RC layer gets a real `unlockGuideFor` guide, and Your
  Result's "family services" becomes a live link.
- The draft lever produces a collaborative "add this to the IPP as an identified
  need" letter and hands off to the Request tracker with a follow-up clock.
- Each PR ships green (`tsc`/`vitest`/`eslint`) with an `/adversary` memo, and —
  being family-facing / legal-framing — **waits for the owner** (no auto-ship).
