# 014 — Plan

**Date:** 2026-10-09 · **Status:** draft

Three PRs, in order. Each one needs its migration hand-applied **before** the
deploy that uses it. The app tolerates a missing column, following the 062
pattern (`'cc' in row`), so a late apply degrades the feature but breaks
nothing.

## PR A: record who was copied (`feat/comm-cc`)

- **Migration 064** adds `communications.cc text[]`, nullable, with no
  backfill.
- **Edge Functions** (gmail `send` and `draft`, the gmail `sync` action, and
  `_shared/gmailSync.ts` for poll-replies):
  - Outgoing rows store the validated `parseCc` list.
  - Incoming rows store everyone else on the message: (To ∪ Cc) minus the
    family's own Gmail address and minus the sender. That list is what a
    reply-all needs.
  - The address parsing lives in `_shared/mime.ts`, with unit tests.
- **App:** `Communication.cc?` type. Paper Trail rows show a "Cc …" line, using
  the Key Contacts name where one matches, otherwise the address. The data
  export (`dataExport.ts`, `select('*')`) carries the column with no change.
  The request dossier lists the Cc on each email in its thread section.
- **Letters:** `handleMarkSent` writes `cc` on the hand-off (mail-app) path
  too, so all three send paths agree.

## PR B: replies keep the people copied (`feat/reply-all`)

- `GmailReplyModal` gains the Letters Cc control: chips with ✕, "+ Add", and
  the `addCc` and `MAX_CC` rules. A pending address blocks Send.
- Pre-fill comes from the replied-to row's `cc`. For a row stored before PR A,
  it falls back to the newest outgoing row on the thread that has a `cc`.
  Otherwise it starts empty.
- The send passes `cc` (the server already accepts it since #313). The confirm
  sheet lists To and Cc.
- **No migration, but it does touch an Edge Function:** the reply insert path
  stores `cc` from PR A.

## PR C: "Nothing to answer" (`feat/reply-settled`)

- **Migration 065** adds `communications.settled_at timestamptz`.
- **`replyInbox.ts`:** a settled reply counts as answered for
  `findUnansweredReply` and `unreadReplies`, and its unread state clears too.
  A **new** reply on the same thread is a different row, so it still
  surfaces.
- **Home:** the reply rung gains a secondary "✓ Nothing to answer" action next
  to "Draft your answer". It shows a toast with Undo (the session overlay,
  like `sessionReads`, so the card leaves at once) and stamps `settled_at`
  through `.select('id')`, so a missing column reports failure rather than
  faking success.
- **Paper Trail:** a "✓ Nothing to answer" badge, and a toggle between
  "✓ Nothing to answer" and "Needs an answer after all".
- **Request clocks are untouched.** Overdue still fires if the promised answer
  never comes, and a test pins that.
- **Copy** in en/es/vi, following the neutral-tone rule.

## Verification (every PR)

- `tsc`, `eslint --quiet`, all four vitest projects, prod and `--dev` web
  bundles, and `check-claude-md` with the counts bumped.
- Edge code is type-checked with the stub harness, because `deno check`
  cannot reach deno.land from here.
- `/adversary` memo in each PR, then the owner's go before merge.
