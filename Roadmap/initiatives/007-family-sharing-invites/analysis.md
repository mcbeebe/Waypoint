# 007 — Analysis: what's actually wired, and what isn't

**Date:** 2026-09-01 · Evidence for `plan.md`. Everything here is a direct read
of the migrations and the two client files, cited by path.

## The three gaps, in order of depth

### Gap 1 — the owner is not a member (already fixed in code, unapplied)

`family_members` (migration `007_family_sharing.sql`) has no row for the account
that created the family. The client derives the invite button from membership
(`useFamilySharing.ts` → `currentUserRole`), and the DB's RLS gates
invitation/member writes on an **admin membership row**:

```
create policy "Family admins can manage invitations" on family_invitations for all
  using (family_id in (select family_id from family_members
                       where user_id = auth.uid() and role = 'admin'));
```

With no row, the owner sees no button and (even via the client's owner
fallback) an invite INSERT is denied. **Migration `027_family_owner_sharing.sql`
already fixes this** — it backfills an admin `family_members` row for every
`families.user_id`, and broadens the member/invitation/activity policies so the
owner (`families.user_id = auth.uid()`) always counts as admin. It is written
and correct; it has not been applied to the live database (migrations here are
applied by hand — the screenshot's "0 members" is the tell). **This is
operational, not a code task.**

### Gap 2 — an invite is a dead letter

`inviteMember` (`useFamilySharing.ts`) does exactly one thing: INSERT a
`family_invitations` row (`status='pending'`, a generated `token`). Grep across
`src/` and `supabase/functions/`:

- **No email.** No Edge Function sends the invitee anything. The only
  "invitation email" in the codebase is Google Calendar's, unrelated
  (`ActionEventModal.tsx`).
- **No accept/redeem.** The `token` is **never read client-side** (grep:
  `invitation token never read client-side`). No screen, deep link, or RPC
  consumes it to create the invitee's membership and flip the invite to
  `accepted`.

So a co-parent can be "invited" and never learn of it; the pending row sits
forever. The screen implies a teammate was added; nothing happened.

### Gap 3 — a member would see nothing (the deep one)

The sharing data model (`family_members`) is **disconnected from the app's data
RLS.** Auditing the core tables:

| Scope pattern | Count | Tables (examples) |
|---|---|---|
| Owner-only: `family_id in (select id from families where user_id = auth.uid())` | **21 policies** | `children`, `appointments`, `documents`, `diagnoses`, `providers`, `services` (all in `002_row_level_security.sql`) |
| Helper: `family_id in (select accessible_family_ids())` | **6 policies** | `actions` (004), `family_requests` (037), `sdp_cases` (039), `entitlements` (042), `home_deferrals` (048/049) |

And the helper itself (`036_family_assignments_consent.sql`) is:

```
create or replace function public.accessible_family_ids()
  returns setof uuid language sql security definer stable set search_path = '' as $$
    select id from public.families where user_id = auth.uid()
    union
    select fa.family_id from public.family_assignments fa
      join public.staff s on s.id = fa.staff_id
      where s.auth_user_id = auth.uid() ...
  $$;
```

It unions **owners + assigned staff. Not `family_members`.** So even a
fully-joined co-parent, with a membership row, could open the app and read **no
child, no actions, no calendar, no documents** — every core table is closed to
them. Family Sharing shares *membership*, not *data*.

## What this means for the build

- **Gap 1** is a hand-applied migration (Layer A). No code.
- **Gap 3** is the real feature and the security-critical core: extend
  `accessible_family_ids()` to also union `family_members` where
  `user_id = auth.uid()`, then migrate the 21 owner-scoped policies onto the
  helper. `actions` already shows the target shape — the other 20 follow it.
  One helper is the single, testable chokepoint for "who can see this family",
  which is exactly what you want for a change this sensitive.
- **Gap 2** is delivery (an Edge Function that emails a tokenized link) + a
  redeem path (a SECURITY DEFINER `accept_family_invitation(token)` that a
  not-yet-member is allowed to call, plus a Join screen).

## Landmines (named for the plan and the `/adversary` pass)

1. **RLS recursion.** `049_home_deferrals_rls_recursion.sql` records a real
   incident: a policy that subqueries `family_members` from inside a
   `family_members` policy raised `42P17: infinite recursion`. Any new
   membership subquery must go through a `security definer` function (like
   `accessible_family_ids()` already is), never an inline self-referential
   subquery.
2. **Write vs read (roles).** Today the owner-scoped policies are `for all` —
   one gate for select+insert+update+delete. A `viewer` who should only read
   needs the policies split into `for select` (members ∪ viewers) vs write
   (members, not viewers). That roughly doubles the policy surface. v1 could
   ship member=read+write, viewer deferred, to cut scope — a plan decision.
3. **The accept RPC is the new trust boundary.** It runs `security definer`, so
   it must itself check the token is real, pending, unexpired, and that the
   signed-in user's email matches `invitee_email` (or deliberately not — a
   decision) before inserting membership. A weak check here joins the wrong
   person to a family. `/adversary` should attack this function specifically.
4. **`delete-account` / cascade.** Removing a member or an owner deleting their
   account must not orphan or expose data; check `delete-account` against the
   new membership rows.
