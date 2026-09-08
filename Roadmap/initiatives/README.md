# Initiative registry

One row per initiative, one global ID sequence. This is where a future session
(or a returning owner) finds out what a PR series was and where its thinking
lives.

These live under `Roadmap/`, **not** `docs/` — `docs/` in this repo is the
deployed GitHub Pages web MVP, not documentation.

## When an initiative folder is required

Only when the work is expected to span **≥3 PRs or ≥2 sessions, touches a
deploy surface, or changes a locked decision.** Everything below that bar has
its PR description as the record — no folder, no row.

## The chain

```
intent.md      written BEFORE analysis — one page, five sections
analysis.md    optional — the research or audit the plan rests on
plan.md        the build plan
               ↓ each PR references the initiative ID
close-out      status flipped here and in the row below; superseded docs
               moved to Archive/<bucket>/ in the same commit
```

`ROADMAP.md` at the repo root stays the **plan of record** — the strategic
view, with its locked-decisions table and version banner. Initiatives are the
execution layer beneath it, and should link up to the ROADMAP section they
serve.

## Registry

| ID | Initiative | Status | PRs | Artifacts |
|----|------------|--------|-----|-----------|
| 001 | SDLC uplevel — real CI gates, honest standing instructions | Open | — | [intent](001-sdlc-uplevel/intent.md) |
| 002 | Edge Function typechecking + lint warnings to zero | Open | — | [intent](002-lint-warnings-and-edge-functions/intent.md) |
| 003 | The outbound loop (phase 7) — make the calm-state promise keepable | Open — Lane A shipped (#135–36), Lane B foundation shipped (#137), server half (7B-3/7B-4) built for owner go | #135, #136, #137 | [intent](003-outbound-loop/intent.md) · [analysis](003-outbound-loop/analysis.md) · [plan](003-outbound-loop/plan.md) |
| 004 | The Learn content engine (phase 8) — derive ~40 cited articles, a reader, SEO | Open — plan for owner go | — | [intent](004-learn-content-engine/intent.md) · [plan](004-learn-content-engine/plan.md) |
| 005 | Supports you have to ask for — help parents get RC-funded, non-automatic family supports (sibling support first) via the Resource Stack + Your Result | Open — owner go, building A–D | — | [intent](005-ask-for-supports/intent.md) · [plan](005-ask-for-supports/plan.md) |
| 006 | Brand refresh — compass mark + navy→teal→sage system + shared `<PageHeader>`/`<BrandCard>` kit, applied surface by surface | Open — owner approved compass + palette; building Phase 1 | — | [intent](006-brand-refresh/intent.md) · [plan](006-brand-refresh/plan.md) |
| 007 | Family Sharing, made real — owner seeded as member (027), RLS re-scoped owner→membership, invite email delivery + tokenized accept flow | **BLOCKED ON PROD — apply migration 058.** B1 (053) MERGED #182, B3 (054+055+Join) MERGED #183, B2 (Resend, 056+057) MERGED #184. Sep 2 2026: probed live and found all three sharing tables still raising 42P17 — 027 had been applied *after* 055 and silently restored the recursive policies (same policy names). 058 repairs it and self-checks. 027 must never be re-run after 055/058. | #182, #183, #184 | [intent](007-family-sharing-invites/intent.md) · [analysis](007-family-sharing-invites/analysis.md) · [plan](007-family-sharing-invites/plan.md) |
| 008 | Marketing/content site (waypointchild.com) — Astro site, review-gated YMYL content engine, apex cutover | Open — Phase 0 shipped (#200–#204, predating this folder); Phase 1 building | #200–#204, #205+ | [intent](008-marketing-content-site/intent.md) · [plan](008-marketing-content-site/plan.md) |

## Open decisions

Recorded here because they have no other home and keep resurfacing:

- ~~**gas-mvp: wire clasp, or declare it frozen-legacy?**~~ **RESOLVED
  2026-09-07 — neither: retired and archived.** The owner confirmed the surface
  no longer serves users, and it moved to
  `Archive/Retired-Surfaces/gas-mvp/` with a `.SUPERSEDED.md` record. The
  clasp question is moot; nothing there deploys. Worth keeping the lesson the
  question was circling: it was labelled "Active — Production" in CLAUDE.md for
  months after that stopped being true, which is how a later session came to
  prepare a production patch for a dead surface. A stale status label is not
  free.
- **`pages.yml`: manual only, or repoint at `main`?** Its automatic trigger
  was `push: branches: [dev]`, and no `dev` branch exists — so every deploy of
  the `docs/` web MVP has in fact been a manual dispatch. The dead trigger was
  removed on 2026-08-29 rather than silently repointed, because repointing it
  would start auto-publishing a directory that has never auto-published.
  *Owner's call.*

## Prior work, for orientation

The August 2026 payer-funded pivot ran a genuinely strong chain that predates
this registry and needs no backfill — it is already legible:

`Payer-Funded-Pivot-Review-Aug2026.md` → `Assumptions-Audit-Aug2026.md` (24
claims checked: 13 confirmed, 6 partly true, 3 unverifiable, 2 contradicted) →
`Market-Sizing` → `Options-Stack-Rank-Aug2026.md` → `PRD-SDP-and-Premium-v1.md`
→ `ROADMAP.md` v2.0.

Its one gap: the documents it reviews (`WaypointProductProposal.docx`, the
62-requirement requirements workbook, the prototype screens) were never
committed, so the citations in those two analyses do not resolve. Recovering
them into `Roadmap/inputs/` is a `[Mike]` item — the files exist only outside
this repo.
