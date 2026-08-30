# 003 — The outbound loop (Home rebuild phase 7)

**Date:** 2026-08-30 · **Status:** Open — plan + mockups for owner go
**Artifacts:** intent.md (this) → analysis.md → plan.md → one PR per lane
**Serves:** `ROADMAP.md` v2.0; `Roadmap/Home-Rebuild-Plan.md` phase 7

## Problem

Home's calm state used to promise: *"Waypoint will tell you if Sep 12 passes
without a reply. You can close the app."* That promise was **deliberately
removed** — `src/lib/homeTriage.ts:928` carries the note:

> Waypoint does NOT send notifications yet (phase 7), so the calm state cannot
> promise to tell anyone anything… Restore the promise in the same PR that
> makes it keepable.

Today it says the honest-but-weaker *"Check back — it will be here,"* and a
test (`homeTriage.test.ts:340`) actively guards against the word "will tell
you." So the single most valuable thing the app could do — let a parent close
the app and trust Waypoint to watch the clock — it does not do. A parent who
can't trust that has to keep checking, which is exactly the anxious, all-on-you
posture the whole product is trying to end.

Two things are already half-built and must not be re-invented:

- `expo-notifications` is installed (`~0.29.0`) and `useNotifications.ts`
  already schedules **on-device** reminders — but only for stored `Deadline`
  rows, not for the request clocks (statutory dates computed from
  `requested_on`) that produce most "Sep 12" moments, and not for plan actions.
- Reply events already land in `communications` (`direction='incoming'`) via
  the `gmail` sync function — but only when the app is open to run the sync,
  and there is no per-row `notified_at` to fire a push exactly once.

## Proposed outcome

The promise is keepable and restored. Concretely, checkable when:

- A parent with an open request that has a due date is told, on the device,
  when that date arrives without a reply — **with the app closed.**
- The calm-state promise copy is restored (all three locales) and its guard
  test inverted, and it renders **only** when notifications are actually
  granted — never as a promise the app can't keep.
- Notification copy obeys the escalation-tone rule: it states the *status of
  the answer* ("An answer on your assessment request is past due"), never an
  actor who failed ("They missed the deadline"). Pinned by a test.
- A parent can turn it on with a well-timed, contextual ask (not a cold OS
  prompt on first launch), set quiet hours, and turn any category off.

## Two lanes — this is the scope decision for the owner

The promise is **date-based**, and dates are known in advance, so the cheapest
thing that keeps it needs **no server at all**:

- **Lane A — on-device deadline/clock reminders (recommended as phase 7).**
  Extend the existing `useNotifications` scheduler to also cover request clocks
  and action due-dates, add the contextual permission ask + a settings screen +
  quiet hours, and restore the promise copy gated on permission. No push
  tokens, no cron, no Edge Function, no new server surface. Keeps the literal
  promise ("if Sep 12 passes") and ships behind one migration-free client PR
  plus the copy restore.

- **Lane B — server-initiated reply push (separate owner go).** "You have a
  reply" is a *server* event the device can't predict, so it needs the full
  greenfield stack: a `push_tokens` table + token capture, a `notified_at`
  dedupe column, a sender Edge Function, and — to fire while the app is closed
  — server-side Gmail polling on a `pg_cron`/`pg_net` schedule. This touches
  **three owner-gated stops at once** (family-facing, schema/migrations, the
  Edge Functions), and the server-side-Gmail-poll piece is the single biggest
  lift in the initiative.

**Recommendation:** ship Lane A as phase 7 (it keeps the promise, restores the
copy, and is low-risk), then decide Lane B on its own evidence. Building the
cron→pg_net→Expo pipeline before Lane A proves the appetite is premature.

## Affected parties / surfaces

- **Families:** the direct beneficiary — the app becomes trustworthy to close.
- **Surfaces (Lane A):** `useNotifications.ts`, a new notification-policy pure
  module, `homeTriage.ts` (copy restore + a `notificationsEnabled` input to the
  calm state), a settings screen under the Account menu, the permission ask.
- **Surfaces (Lane B):** migration 050 (`push_tokens`, `communications.notified_at`),
  a sender Edge Function, `supabase/config.toml`, and cron/pg_net wiring — all
  owner-gated.

## Constraints

- **No promise the app can't keep.** The restored copy renders only when
  permission is granted AND at least one category is on. Otherwise the calm
  state stays on today's honest "check back" wording. This gate is the whole
  reason the promise was pulled; it does not come back ungated.
- **Escalation tone governs every string a family sees**, notifications
  included — status of the answer, never blame. Locked decision; test-pinned.
- **On-device limits are real and must be designed around:** iOS keeps ~64
  pending local notifications; schedule at a civil local hour (not midnight);
  re-schedule on app open; cancel a date's reminder when a reply lands first.
- **Auto-ship does not apply.** Every lane here is family-facing; Lane B also
  hits schema and Edge Functions. `/adversary` + owner approval per PR.
- **Migration 049 is still pending hand-apply** — Lane B's migration is 050 and
  must not be built assuming 049 is live.

## Open questions — for the owner

1. **Scope:** Lane A only for phase 7 (recommended), or Lane A + Lane B now?
2. **Reply push (if Lane B):** is server-side Gmail polling in scope, or is
   "notify on reply when the app next syncs" acceptable for a first cut?
3. **Permission-ask timing:** at first open request with a live clock
   (recommended), or a gentler "enable in Settings" nudge with no proactive ask?
4. **Quiet hours default:** 9pm–8am local on by default, or off until set?
