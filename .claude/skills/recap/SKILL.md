---
name: recap
description: Report where this session's work actually stands — goal, status with evidence, blockers, and next steps. Use when the user asks "where are we", "status", "recap", or returns to a session after time away. Never starts new work.
---

# /recap — where do things actually stand?

You are reporting state, not making progress. **Starting any new work during a
recap is forbidden** — no edits, no commits, no new subagents, no "while I'm
here" fixes. If you notice something broken, it goes in the report as a next
step.

## Step 1 — Refresh anything that might be stale (spend a minute or two)

Do not report from memory; conversation context rots while work runs
elsewhere. Re-check, in this order:

- **The PR(s) this session opened or touched** — CI status on the *latest*
  commit, unresolved review threads, mergeability.
- **Any background jobs this session started** — did they finish, and what did
  they actually produce?
- **Migration state, whenever the work touched the database.** Migrations here
  are applied BY HAND, so "the migration file is committed" and "the migration
  is applied" are different facts. Say which one is true. Code that assumes an
  unapplied migration ships a feature that silently does nothing — that has
  already happened once in this repo.
- **Edge Functions, if touched** — they are excluded from `tsconfig.json` and
  have no tests, and `deploy-edge-functions.yml` ships them to the production
  project on merge. "It merged" is not evidence that it works.
- **`gas-mvp`, if touched** — it deploys by manual copy-paste into the Apps
  Script editor. A commit here is not a deploy.
- Anything the user linked earlier in the session.

## Step 2 — Report exactly four things

1. **The goal, in the words of whoever asked.** Quote or closely paraphrase
   the original request — not your reformulation. If scope changed mid-session,
   quote the change too.
2. **Where things actually stand, and what the evidence is.** For every claim
   of "done", name the proof: a merged PR number, a migration confirmed
   applied, a screenshot of the running app, a passing check on the latest
   commit. *A green suite is not proof a family can use the thing.* Since
   Aug 30 2026 the suite has three projects — `logic` (pure modules), `ui`
   (components rendered through react-native-web) and `tz` (dates east of
   Greenwich) — so a component render or a dead tap IS covered. What is still
   not covered: no screen or end-to-end test mounts a real navigator against
   real data, and nothing launches the app. Distinguish written / reviewed /
   merged / verified in the running app.
3. **What is blocked, split by kind.** Blocked on a **person** (owner
   approval, an App Store review, a DDS response) versus blocked on something
   **technical** (a failing check, a missing secret, an unapplied migration).
   Name the person or the failing thing specifically.
4. **Next steps, each with an owner.** A short list; every item tagged
   `[Claude]` or `[Mike]`. No unowned items.

Keep the whole recap under a screen. If a section is empty, say so in one line
rather than padding it.
