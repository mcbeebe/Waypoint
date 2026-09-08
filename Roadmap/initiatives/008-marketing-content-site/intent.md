# 008 — Marketing/content site (waypointchild.com)

**Date:** 2026-09-06 · **Status:** Open — Phase 0 shipped (#200–#204), Phase 1 building
**Artifacts:** intent.md (this) → plan.md (the four-phase build plan; also
published as the "Waypoint Site Build Plan" artifact) → PRs
**Serves:** `ROADMAP.md` v2.0 — the organic acquisition channel
(`Roadmap/Channel-Deep-Dive-Aug2026.md`); the working 12-page prototype
`Waypoint-Marketing-Site-Prototype.html` (PRs #195/#196/#198) is the design
source of truth. Registered retroactively: PRs #200–#204 shipped Phase 0
before this folder existed — the registry bar (≥3 PRs, a deploy surface) was
crossed at #201.

## Problem

Waypoint has no indexable presence. `www.waypointchild.com` serves the app
shell to crawlers, every acquisition channel analysis ranks organic
content + answer-engine citations as the highest-leverage channel for parents
searching at 2 a.m., and the 90-day indexation clock cannot start until real
pages live on the apex. Meanwhile the strategy imposes hard constraints: YMYL
content about other people's money and legal rights, zero email gates, review
by credentialed professionals before anything publishes, and full EN/ES parity
as a differentiator.

## The one danger to design against

**Publishing something a family relies on that is wrong.** Every mechanism in
the plan — the Zod-enforced review ladder, null-until-verified benefit
constants, `[TBC]` markers that block publish, the drafts-only-in-preview
build gate — exists to make "unreviewed content in front of a family" a build
error rather than a judgment call. Velocity failures are recoverable; a wrong
dollar figure or missed deadline claim on a page a parent trusted is not.

## The shape (what we're building)

An Astro static site in `waypoint-site/`, deployed as a second Vercel project
(D14), sharing the initiative-006 brand system with the app. Four phases:
Phase 0 rails (schema, analytics contract, content-ops SOPs, compliance
drafts — shipped), Phase 1 build + wedge content (templates, tools, cutover,
guides #1–7 through the full review loop), Phase 2 authority + Español
(21 RC pages, /es/, refresh sprints), Phase 3 moats (POS-disparity study,
embeds, closed-loop attribution). Full plan: `plan.md`.

## Done when

Phase exit gates in `plan.md`; the initiative closes when Phase 3's exit gate
is met or the owner re-scopes. The nearest gate (Phase 1): site live on the
apex, 12 pages at prototype parity, both tools working and stateless, guides
#1–7 published **with reviewer sign-off in frontmatter**, one attributed
signup verified in Supabase end-to-end.
