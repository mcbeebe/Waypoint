# 007 — Plan: Family Sharing, made real

**Date:** 2026-09-01 · **Status:** draft — for owner go (no code yet)
**Supersedes:** — · **Superseded-by:** —
**Reads on:** intent.md, analysis.md (both in this folder)
**Mockups:** Family Sharing Invites canvas — Members (activated), invite sheet,
invitation email, Join/Accept + edge states, in the warm brand:
https://claude.ai/code/artifact/ce97fce4-cb82-4503-87b4-ee27a2dc7813

Everything here is **owner-gated**: schema, migrations, an Edge Function, and
family-facing surfaces are each a hard stop in `CLAUDE.md`. Every code PR runs
`/adversary` (told to attack the RLS and the accept RPC specifically), posts the
memo, and waits for the owner to apply the migration by hand and merge. Nothing
auto-ships.

## Layer A — turn the lights on (owner, today, no code)

Apply **`027_family_owner_sharing.sql`** in the Supabase SQL editor (idempotent —
`on conflict do nothing`, `drop policy if exists`). Result: the owner becomes an
admin `family_members` row, "0 members" → "1 member", the **+ Invite** button
appears, and invites save. This is the "activate it" ask — but it only makes the
*shell* usable, so B is the actual feature. `scripts/build-pending-migrations.mjs`
can bundle 027→052 into one transaction if the owner wants to bring the DB fully
current at once.

## Layer B — make an invite mean something

Sequenced so each PR is independently reviewable and the risky core (B1) lands
before anything relies on it. One PR per phase unless noted.

### B0 — honest partial (small, first, unblocks nothing risky)

Before any of the below, make the screen tell the truth. Today it implies a
teammate was added. Change `useFamilySharing` copy + the pending card so an
invite reads "Invited — they'll get an email once delivery is on" and the
`/adversary`-flagged "0 members" owner case is handled. Ships the moment 027 is
applied; buys honesty while B1–B3 are built. *(Family-facing copy → gated.)*

### B1 — RLS to membership (the security-critical core)

- **Migration:** extend `accessible_family_ids()` to also
  `union select family_id from public.family_members where user_id = auth.uid()`
  (still one `security definer` function — no inline self-subquery, per the 049
  recursion incident).
- **Migration:** migrate the **21 owner-scoped policies** (`children`,
  `appointments`, `documents`, `diagnoses`, `providers`, `services`, …) from
  `select id from families where user_id = auth.uid()` to
  `select accessible_family_ids()` — the shape `actions` already uses.
- **Tests:** a SQL/pgTAP-style or scripted check that (a) an owner still sees
  their family, (b) a member sees it, (c) a non-member sees nothing, (d) no
  recursion. This is the phase `/adversary` attacks hardest.
- **Decision gate:** roles. v1 recommendation — **member = read+write, admin =
  member + manage people, viewer = deferred** (ship all-member-can-edit first;
  split `for select` vs write in a later phase). Cuts the policy surface in half
  and de-risks the first RLS cut. Owner confirms.

### B2 — delivery (Edge Function + email)

- New `supabase/functions/family-invite`: given an invitation id (admin-authed),
  send the invitee a branded email with a link
  `https://waypointchild.com/join?token=<token>`. Collaborative, warm tone (per
  the escalation-tone rule — this is a welcome, not a demand).
- One env secret for the provider. **Decision:** provider — Resend (simplest
  transactional) vs Postmark vs Supabase Auth invite. Recommend **Resend**.
- Call it from `inviteMember` after the row inserts; degrade honestly if the
  send fails (row saved, "email didn't go — retry"). *(Edge Function → gated,
  no CI covers it.)*

### B3 — accept / redeem (RPC + Join screen + deep link)

**Status (Sep 2 2026): BUILT for owner go — migration `054`, `JoinFamilyScreen`,
`lib/joinInvite.ts`, App wiring.** Two guarded `security definer` functions:
`preview_family_invitation(token)` (what the screen shows before committing —
inviter, role, does-this-account-match; no child data) and
`accept_family_invitation(token, display_name?)` (the one door: signed-in,
token exists, pending, unexpired, email-locked, idempotent for the acceptor,
closed to anyone else, role copied from the invite, row locked against double
taps). `expires_at` added (14 days). The Join screen is ROOT-level and rendered
before onboarding so a co-parent never gets pushed into "create your own
family"; the token is captured from the launch/warm URL and stashed so a
signed-out person comes back to Join after signing in; and App's onboarding
check gained the same membership fallback `useFamily` got in B1.

**Adversary pass (Sep 2 2026) — the accept RPC held; it found a ROOT-CAUSE bug
that predates B3:** `family_members`' own policies (007/016/027) subquery
`family_members` from inside a `family_members` policy → Postgres `42P17`
infinite recursion on every client read/write of that table (and, via the same
subqueries, of `family_invitations` and `activity_log`). Reproduced in a real
PG16 cluster built from the repo's SQL. It explains the "0 members / no
button" screenshot, and **applying 027 alone would not have fixed it** — 027
keeps the self-reference. Fixed by **migration `055`** (the 049 pattern: a new
`admin_family_ids()` beside `member_family_ids()`, and every policy on those
three tables pointed at them). 055 is also what makes B1's `useFamily`
membership fallback and this phase's onboarding fallback actually work.
Also hardened from the pass: identity read from `auth.users` with a confirmed-
email check (not the JWT claim — with "Confirm email" off, a stranger could
sign up as the invitee's address); `display_name` clamped; unique index on
`token`; masking edge cases; `joined` vs `already_used` split; infrastructure
failures (offline, 054 not yet applied) shown as a retryable "couldn't check"
instead of a false "revoked"; a loading timeout; the pending token cleared on
sign-out; and "Revoke" now toasts on the real result (a silent failure was a
link that still worked for 14 days).

- **Migration:** `accept_family_invitation(token text)` — `security definer`,
  the new trust boundary. Validates: token exists, `status='pending'`,
  unexpired, and (decision) the caller's email matches `invitee_email`. Inserts
  the `family_members` row with the invited role, flips the invite to
  `accepted`, `responded_at=now()`. Returns the family. Guards against
  double-accept and self-join to the wrong family.
- **Migration (optional):** add `expires_at` to `family_invitations` (default
  now()+14d) so a leaked link ages out.
- **Client:** a `JoinFamilyScreen` reached by the `join?token=` deep link (wire
  into the existing linking config). If signed out → sign in/up first, token
  preserved; then call the RPC and land in the app now showing the shared
  family. Handle expired / already-used / wrong-email states in copy.
- **`/adversary`:** attack the RPC — can it join an attacker to a stranger's
  family? Can a replayed token double-add? *(Schema + family-facing → gated.)*

### B4 — viewer role, if kept (later, optional)

Split the B1 policies into `for select` (members ∪ viewers) vs write (members).
Only if the owner wants a true read-only role; otherwise viewer collapses into
member and this phase drops.

## Cross-cutting decisions — CONFIRMED by owner (Sep 2 2026)

This is the decision record; the recommendations below were all accepted.

1. **Free or premium? → FREE for v1.** Co-parent sharing is trust/retention,
   not a paywall moment. Revisit later; premium *extras* stay possible.
2. **How much a member sees? → WHOLE family file** (all-or-nothing, not
   per-child). This is what `053_family_membership_rls.sql` implements. Per-child
   scoping is a later initiative.
3. **Roles for v1? → MEMBER only (view + edit).** Viewer (read-only) deferred —
   it doubles the RLS surface (a `for select` vs write split) and is not needed
   to ship. B4 remains the place it lands if wanted.
4. **Email provider? → RESEND** (simplest transactional; one env secret). Used
   in B2.

Email-match on accept (B3) stays **yes** — the tokenised link only works for the
invited address — unless the owner later relaxes it.

5. **SDP facilitation tables? → YES, a co-parent sees everything** (owner, Sep 2
   2026: "yes for now"). Surfaced by the B1 adversary pass: `sdp_cases` (budget
   amounts), `service_events` (billable time), `spending_plan_lines` (invoice
   inputs), `family_baselines`, `transition_extensions` are billing-upstream, so
   granting a co-parent write to them is the money lane that stops and waits.
   They were held out of `053`, the question was put to the owner explicitly,
   and the owner included them — read + write, consistent with decision 2's
   all-or-nothing. "For now" is noted: revisit if a read-only carve-out is ever
   wanted.

## Sequencing & size

`B0` (copy) → `B1` (RLS, the big one) → `B2` (delivery) → `B3` (accept) →
`B4` (viewer, optional). Five PRs, three of them touching schema and one an Edge
Function — comfortably an initiative. B1 and B3 are the ones that can hurt a
family's privacy; they get the sharpest `/adversary` and the owner's closest
read.

## Done when

A second parent gets the email, taps it, signs in, and sees the **same** child,
plan, calendar and documents as the owner — edit or view per role — and the
owner sees them in Members and can revoke. Until every phase lands, B0 keeps the
screen honest about what an invite does.
