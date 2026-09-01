# 007 — Plan: Family Sharing, made real

**Date:** 2026-09-01 · **Status:** draft — for owner go (no code yet)
**Supersedes:** — · **Superseded-by:** —
**Reads on:** intent.md, analysis.md (both in this folder)

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

## Cross-cutting decisions (owner's — surfaced, not assumed)

1. **Free or premium?** Co-parent sharing sits near the E3 "document sharing"
   gate. Options: free · premium-to-invite · free-to-view/premium-to-add-editor.
   Affects B's gating only. *Recommend: free for v1 (trust/retention), revisit.*
2. **How much a member sees.** All-or-nothing (whole family file) vs per-child.
   *Recommend all-or-nothing v1; per-child is a later initiative.*
3. **Email provider** (B2) and **email-match on accept** (B3), as above.

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
