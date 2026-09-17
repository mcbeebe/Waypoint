# 008 — Chabot local tools (hyper-local pilot)

**Date:** 2026-09-06 · **Status:** Open — paper tools awaiting owner fill-in;
hub prototype built and published (Sep 10 2026)
**Artifacts:** intent.md (this) → recommendations.md → navigator-draft.md →
google-group-kit.md → hub-plan.md → exports
**Serves:** `ROADMAP.md` v2.0 — a hyper-local, school-level expression of the
"GPS for the journey" promise. Owner trigger: "build a series of hyper-localized
tools for parents and families at the elementary school level — start with my
son's school, Chabot."

## Problem

Waypoint navigates the county/state layer (Regional Centers, Medi-Cal, IEP law).
But a family's daily friction lives at **one school site**: who at Chabot do I
ask for an SST, which after-school program can actually handle my kid, which
five families here have walked this road. That knowledge exists — scattered in
BPN threads, hallway conversations, and veteran parents' heads — and no tool
holds it at school granularity.

## The one danger to design against

**Building a mini-Waypoint instead of a paper flyer.** The owner's brief says
IMMEDIATELY: a 1–2 pager, an email list, a simple page. The failure mode is
scope creep into app features before a single Chabot parent has been helped.
Everything in this initiative must be shippable by one parent in days, with no
infrastructure a PTA volunteer couldn't maintain.

**Amendment, Sep 10 2026 — the owner deliberately crossed this line, once.**
Across four asks ("it may need to be a purpose-built app" → "more truly
interactive and collaborative… I don't want to be a bottleneck" → "build the
updated hub with real-time discussions, moderation dashboard"), the owner
directed a full community hub. It exists at `hub/chabot-hub.html`; the reasoning,
the settled decisions, and what is still open are recorded in `hub-plan.md`.

This guardrail is **unchanged for the paper tools** — the Navigator, the flyer
and the Google Group kit stay shippable-in-days by one parent. The hub is a
separate, larger, owner-directed bet, and it is still only one HTML file with no
backend, so abandoning it costs nothing. Read this amendment before concluding
the initiative lost its discipline.

## The shape

A **"one school kit"** piloted at Anthony Chabot Elementary (OUSD, Rockridge):
a Family Navigator 1-pager, a private Google Group, a single static page, and
small paper tools (child profile, season calendar). If the pilot works, the kit
becomes a template any elementary school can clone — that is the product
insight being tested, not the code.

Locked: **collaborative-first tone** everywhere (owner rule, Aug 2026) — every
template "asks," never "demands"; framing states the status of an ask, never
blames an actor. Legal claims (assessment timelines, eligibility) carry
citations and the "not legal advice" banner.

## Done when

- Navigator 1-pager drafted, owner fills in site-specific names, printed and in
  the front office / backpack folder.
- Google Group live with ≥5 seed families; 1-pager points to it.
- Recommendations doc records the full idea slate and what was chosen.
- Contact details and meeting times re-verified against live OUSD pages before
  anything goes to print (web-search snapshots are not print-ready facts).
- This is **family-facing, tone-bearing, legal-framing** material leaving the
  desk → every deliverable waits for the owner; nothing auto-ships.
