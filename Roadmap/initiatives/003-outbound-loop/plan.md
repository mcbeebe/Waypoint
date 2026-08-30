# 003 — Build plan

Two lanes. **Lane A is phase 7 proper** and is self-contained; **Lane B is a
separate owner go.** Every PR is family-facing → `/adversary` + owner approval.

## Lane A — on-device deadline/clock reminders (recommended: ship as phase 7)

No server surface. No migration. Keeps the promise for the date-based case.

### 7A-1 · The policy module (pure, tested)
`src/lib/notificationPolicy.ts` — decides, from the same inputs the ladder
already reads (requests, deadlines, actions, now, quiet-hours, granted
categories), the **set of (fireAt, category, title, body)** reminders a device
should hold. Reuses `deadlineFor` / the ladder's date math so copy and timing
never drift from Home. Trilingual, tone-correct (status not blame). Pure and
node-tested — no `expo-notifications` import here.

- Caps to stay under the iOS ~64 pending limit: nearest N per category, dropping
  farthest-out first; `log()`-equivalent surfaced in a dev assert, never silent.
- Lead times mirror the existing deadline reminders (30/14/7/1/0) but only for
  dates inside a horizon; a `due` reminder is scheduled at a **civil local hour**
  (default 9am), not the raw timestamp.

### 7A-2 · The scheduler (extends useNotifications)
Feed `notificationPolicy` output into the existing `scheduleNotificationAsync`
path; extend coverage from `Deadline` rows to request clocks + actions. On app
open: reconcile (cancel stale, add new, cancel a date whose reply already
landed via `findUnansweredReply`). Keep the AsyncStorage id-map.

### 7A-3 · The contextual permission ask
A pre-permission sheet shown when a family first has an open request with a live
clock (never a cold OS prompt on launch): *"Want Waypoint to watch this
deadline so you don't have to? We'll tell you if <date> passes."* → then the OS
prompt. Declining is remembered; a soft re-ask only from Settings.

### 7A-4 · The settings screen + quiet hours
Under the Account menu (where Profile/settings live post-phase-5): master
toggle, per-category (deadlines · actions · replies-when-Lane-B), quiet-hours
range, and a "test notification" row. Trilingual, ≥44px targets.

### 7A-5 · Restore the promise (the payoff)
Add a `notificationsEnabled` input to `calmState()`; when granted + ≥1 category
on, render the restored git-`5bf74a3` copy ("Waypoint will tell you if <date>
passes… You can close the app."), else keep today's "check back." Invert the
`homeTriage.test.ts:340` guard under the enabled branch; add a tone test.

**Lane A done when:** a closed-app device fires a tone-correct reminder on a
request clock's due date; the promise renders only when enabled; gates green;
`/adversary` memo in the PR; owner merges.

## Lane B — server-initiated reply push (separate owner go)

Greenfield server surface. Touches schema + Edge Functions → the narrower stops
win; owner-gated regardless of any auto-merge grant.

### 7B-1 · Migration 050 (owner hand-applies)
`push_tokens` (family_id, expo_token, platform, updated_at; RLS via
`member_family_ids()` per the 049 pattern) + `communications.notified_at`.
Built assuming 049 is already live.

### 7B-2 · Token capture (client)
`getExpoPushTokenAsync` on permission grant → upsert to `push_tokens`. Refresh
on change. Guarded for simulators/no-token.

### 7B-3 · The sender Edge Function
`push-send` — mirrors `stripe-webhook`'s no-user shape (`verify_jwt=false` +
shared-secret header), reads un-notified unanswered incoming rows, sends via the
Expo push API, stamps `notified_at`. Tone-correct copy. **No CI covers Edge
Functions** — treat as unverified; test by hand against a live project.

### 7B-4 · The trigger — the real decision inside Lane B
Two options, owner picks (open question #2):
- **(cheap) sync-time:** fire from `gmail` sync when `newReplies>0`. Only works
  while the app is open — low marginal value over Lane A's reconcile.
- **(real) server poll:** a `pg_cron` job → `pg_net` `net.http_post` → a
  server-side Gmail-sync-and-push Edge Function using stored refresh tokens.
  This is the true app-closed reply loop and the biggest single lift here.

**Lane B done when:** a reply arriving with the app closed produces exactly one
tone-correct push; dedupe holds across runs; owner has hand-applied 050 and
approved the Edge Function deploy.

## Sequence

`intent → analysis → plan (this) → [owner scope go]` →
Lane A: 7A-1 → 7A-2 → 7A-3/4 → 7A-5 (copy restore lands last, once keepable) →
`[owner go on Lane B]` → 7B-1 … 7B-4.

Mockups for the family-facing surfaces (permission ask, the notifications, the
settings screen, the restored promise) accompany this plan for the owner's go.
