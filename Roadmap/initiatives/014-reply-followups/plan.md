# 014 — Plan

**Date:** 2026-10-09 · **Status:** draft

Four PRs, in order: **A → D → B → C** (owner, Oct 9: build D right after A, so imported emails record Cc from day one). Each one needs its migration hand-applied **before** the
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

## PR D: add an email thread from Gmail (`feat/add-thread`)

Owner ask (Oct 9): "add a thread into the app manually using a URL".
Owner picked: **paste a link or search** · **an unanswered newest message
shows on Home** · **built after PR A**.

**Why not a link alone:** today's Gmail web links (`#inbox/FMfcgz…`) are
opaque tokens wrapped with a per-account key. They cannot be turned into a
Gmail API thread ID, and the API never returns them
([googleworkspace/cli#858](https://github.com/googleworkspace/cli/issues/858);
[InboxSDK group](https://groups.google.com/g/inboxsdk/c/wlHOY4TeR2o)).
Older-style links (`#inbox/<16 hex chars>`) carry the legacy hex thread ID,
which the API accepts.

**Verified in the build (2026-10-09, against the owner's own Gmail, read-only):**
- API thread ids are 16 hex characters (e.g. `1a11…cee3`).
- The `viewUrl` that the Gmail API itself returns is
  `#all/thread-a:r-<signed decimal>`. That number is not the thread id in any
  base, so `thread-a` links are opaque too.
- `#…/thread-f:<decimal>` is the thread id in decimal (IMAP X-GM-THRID), so it
  is converted. A wrong guess can only find nothing, because the function
  opens the id rather than trusting it.

- **`_shared/gmailLink.ts` + app mirror `src/lib/gmailLink.ts`** (held equal by
  a mirror test, like `letterAddress`): `parseGmailInput(text)` returns one of:
  - `{kind:'thread', id}` for a legacy hex link or a bare hex ID;
  - `{kind:'opaque'}` for an `FMfcgz…` or other Gmail link;
  - `{kind:'search', q}` for plain words.
- **gmail Edge Function, two new actions:**
  - `find {input}`: a legacy link becomes one `threads.get` call; otherwise
    `threads.list` with `q`, max 10 results. Each result returns subject,
    participants, message count, last date, a snippet, and `alreadyTracked`.
    An opaque link returns `opaque_link` and never searches by itself.
  - `import {threadId, organization, requestId?}`:
    - fetches the thread at `format=full` (cap 50 messages);
    - skips messages already stored (`gmail_message_id`);
    - stores the family's own messages (From = the connected address, or the
      `SENT` label) as `outgoing` and everyone else's as `incoming`, with the
      chosen label, `request_id`, and `cc` from PR A;
    - read state: every incoming message is stamped `read_at` except the
      newest, when it is incoming and from the last 14 days. That one shows
      on Home (owner choice).
  - The thread ID is validated as hex. Every write goes through the user
    client (RLS).
- **Sync tracking change (both sync paths):** today a thread is followed only
  when it has an **outgoing** row. A thread the agency started and the family
  never answered has none, so it would import and then never sync. The sync
  will follow any thread with a stored `gmail_thread_id`. `threadOrganization`
  falls back to the earliest row of either direction when there is no
  outgoing one. That is a narrow change to 063's founder rule, so it gets
  tests.
- **App:**
  - "＋ Add an email thread" on Paper Trail, and "Add an email you already
    sent" on the request case screen, which presets the request;
  - a sheet with three steps: find → pick → confirm, with "When you press
    Add" steps (`sendSteps`-style, en/es/vi);
  - an opaque-link explainer and a not-connected state.
- **Migration 065 (`communications.settled_at`) moved up from PR C.** The
  adversarial review showed that a "recorded long after it arrived" rule on
  Home would also hide genuinely late-synced replies, and that only Home
  applied it, so the case screen and the request tracker disagreed. Imported
  history is now *settled* at import, and every surface skips settled
  messages: Home's reply card, the reply strip, the case screen, and the
  tracker badges. PR C adds only the "✓ Nothing to answer" UI on the same
  column.
- It touches an Edge Function, the sync and a migration, so it needs
  `/adversary` and the owner's go.

## PR B: replies keep the people copied (`feat/reply-all`)

- `GmailReplyModal` gains the Letters Cc control: chips with ✕, "+ Add", and
  the `addCc` and `MAX_CC` rules. A pending address blocks Send.
- Pre-fill comes **only** from the replied-to message's `cc` (everyone else on
  it), as Gmail's Reply all does. A sender who answered the family alone is
  answered alone. A message recorded before 064 starts with no one copied.
  (The first build also fell back to earlier messages; the review showed that
  re-copies people a sender deliberately left off.)
- People the family copied earlier in the thread rank first. Past MAX_CC, the
  rest are **named** as tap-to-add chips, never just counted. An address the
  send cannot carry (for example, non-ASCII) is named too, never dropped.
- The send passes `cc` (the server has accepted it since #313 and stored it
  since PR A). **Review and send** opens an in-sheet last look (To, Cc, the
  words) before **Send now**. It is the plan's confirm step, kept inside the
  sheet because a reply's subject must not be edited, or Gmail would break
  the thread.
- **No migration and no Edge Function change:** the reply insert path already
  stores `cc` (PR A).

## PR C: "Nothing to answer" (`feat/reply-settled`)

- **Migration 065** (`communications.settled_at`) ships in PR D; this PR
  adds the action on it.
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
