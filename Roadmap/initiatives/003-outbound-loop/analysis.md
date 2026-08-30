# 003 — Analysis (the ground the plan rests on)

Verified against the code on 2026-08-30. All paths under `waypoint-app/`.

## The promise, and its guard

- Current calm-state copy: `src/lib/homeTriage.ts:931–941` (`calmState()`,
  var `watching`) — *"…is the next date Waypoint is counting to. Check back —
  it will be here."* (EN/ES/VI, hard-coded trilingual, **not** in i18n).
- The note ordering the restore: `homeTriage.ts:928–931`.
- The original promise (to restore) is in git `5bf74a3`: *"Waypoint will tell
  you if <date> passes without a reply. Waypoint keeps watching your open
  requests."* + body *"You can close the app."* (EN/ES/VI).
- Guard to invert: `homeTriage.test.ts:340–342` asserts the calm body does NOT
  contain "will tell you". When restored, this flips to assert it does — but
  only under the `notificationsEnabled` branch.

## What is "time-critical" (what a reminder fires on)

`TRIAGE_LADDER` (`homeTriage.ts:44–53`), time-critical classes: `overdue`,
`reply`, `today`, `clock`. Urgency is a **pure function of stored dates + now**:

- Request clocks: `deadlineFor(request_type, requested_on, now)` from
  `@/lib/requestClocks` → `{ overdue, daysRemaining, dueOn }`. `overdue` when
  `daysRemaining < 0`; `clock` when `daysRemaining ≤ 10` (`CLOCK_WINDOW_DAYS`).
- Deadlines: `deadlineItems` window 14 days; `days < 0` overdue else clock.
- Actions: open = `{not_started, in_progress}`; `days < 0` overdue, `0` today.

Because these are pure over `requested_on`/`due_on`, **the reminder dates are
knowable in advance** — which is what makes the on-device lane (A) possible.

## Existing notification code (on-device only)

`src/hooks/useNotifications.ts`: `setNotificationHandler`, `requestPermissionsAsync`,
`scheduleNotificationAsync` (DATE trigger) for `Deadline` rows at 30/14/7/1/0
days; the id→row map persists to AsyncStorage. **Missing:** request-clock and
action coverage, a settings surface, quiet hours, and any server push. No
`getExpoPushTokenAsync` anywhere; no push-token table; no prefs table/column.

## Cron precedent (SQL-only; no pg_cron→Edge wiring exists)

- `041_billing_automation.sql`: `generate_anniversary_invoices()`
  (`security definer`), scheduled via a `pg_extension`-guarded
  `cron.schedule('anniversary-invoices','0 8 * * *', …)`. Append-only run log.
- `023_insights_aggregation.sql`: `cron.schedule('waypoint-aggregate-insights',
  '0 6 * * 1', …)` with the idempotent unschedule/reschedule pattern.
- Both run **inside Postgres** as owner via `security definer` — no JWT. Neither
  makes an HTTP call. Reaching an Edge Function from cron needs `pg_net` /
  `net.http_post`, which **no migration uses today** — new wiring for Lane B.

## Edge Functions (sender templates for Lane B)

`ai-proxy, delete-account, gmail, google-auth, stripe-webhook`.
- `gmail` is the existing outbound sender (JWT; `auth.getUser`; Gmail API; writes
  back to `communications`). A JWT-invoked push sender mirrors it.
- `stripe-webhook` is the no-user template: `verify_jwt=false` (config.toml),
  service-role client, shared-secret/signature check. A cron-invoked sender
  mirrors this + a `[functions.<name>] verify_jwt = false` block.

## Reply detection (Lane B trigger)

`gmail` sync (`action:'sync'`) inserts `communications` rows with
`direction:'incoming'`, idempotent on `gmail_message_id`
(`046_gmail_threads.sql` unique index), and returns `newReplies`. Read-side
"unanswered" predicate: `replyInbox.findUnansweredReply()` (incoming with no
newer outgoing on the same `gmail_thread_id`). **No `is_read`/`notified_at`
column exists** — Lane B adds `communications.notified_at` (migration 050) to
fire exactly once. Sync only runs when the app is open, so a true
app-closed reply push additionally needs **server-side Gmail polling**.

## Next migration number

Highest is `049_home_deferrals_rls_recursion.sql` (pending hand-apply). Lane B's
migration is **050**.
