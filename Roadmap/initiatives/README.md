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

## Open decisions

Recorded here because they have no other home and keep resurfacing:

- **gas-mvp: wire clasp, or declare it frozen-legacy?** It is labelled
  "Active — Production" and serves real families, yet deploys by manual
  copy-paste while a `.clasp.json` with a real `scriptId` has sat unused since
  March 2026. Today a commit there is not a deploy, and the running code can
  differ from what is in git with nothing to detect it. *Owner's call.*
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
