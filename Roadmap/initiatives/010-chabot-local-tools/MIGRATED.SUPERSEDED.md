# 010 — Chabot local tools: MIGRATED OUT OF THIS REPOSITORY

**Date:** 2026-09-13 · **Status:** superseded
**Supersedes:** — · **Superseded-by:** [`mcbeebe/school-hub`](https://github.com/mcbeebe/school-hub)

This initiative's work now lives in its own repository:

> **https://github.com/mcbeebe/school-hub**

Everything that was here — the hub prototype and its five QA suites, the
Family Navigator handout, the Google Group kit, the export generators, and
all four planning documents — moved there on 2026-09-13, verified
byte-identical. **The copies under `Archive/Old-Project-Plans/010-chabot-local-tools/`
are frozen. Do not edit them; they will drift.**

## A note on the number

This was **initiative 008** for its whole life in this repository, and
school-hub's own `README.md` and `CLAUDE.md` still say so. It is 010 here
because the branch carrying it sat unmerged long enough for `main` to assign
008 to the marketing/content site and 009 to the i18n sweep. Renumbering the
registry row was the only way to keep "one row per initiative, one global ID
sequence" true. The historical 008 references in school-hub are accurate
about where the work came from and are deliberately left alone.

## Why it moved

School Hub outgrew a Waypoint initiative folder. It is a distinct product:
its own users (parents at one Oakland elementary school), its own backend
decision (Firebase, not Waypoint's Supabase), and its own five-year handoff
story to a PTA volunteer.

Separate repositories also keep a future Waypoint integration a *deliberate
choice* rather than an accident of layout. That integration — a referral path
from a school hub into Waypoint when local peer knowledge runs out — is
Phase 2 of the new repo's `ROADMAP.md` and is **not decided**.

## What changed in the move

Two path bugs the move exposed were fixed there rather than carried:
`make-docs.js` and `make-group-kit.js` hardcoded an absolute path into *this*
repository, and `make-flyer.js` read and wrote relative to the working
directory. All three now resolve relative to the script.

Otherwise the migrated content is byte-for-byte what was here.

## Where to look now

| For | Go to |
|---|---|
| The plan of record | `ROADMAP.md` in school-hub |
| The Phase 1 build plan | `docs/plan.md` |
| Why a feature decision was made | `docs/hub-plan.md` |
| The app and its tests | `hub/` |
