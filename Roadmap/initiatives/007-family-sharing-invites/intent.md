# 007 — Family Sharing, made real

**Date:** 2026-09-01 · **Status:** Open — plan for owner go (no code yet)
**Artifacts:** intent.md (this) → analysis.md → plan.md → mockups → PRs
**Serves:** `ROADMAP.md` v2.0 ("GPS for the journey" — a journey two parents
walk together). Owner trigger: testing the Family Sharing screen on
waypointchild.com, "0 members / Just you so far", and asking to *activate the
family sharing mode*.

## Problem

Family Sharing looks finished — a Family Team screen, Members / Activity tabs,
an invite modal, roles (admin / member / viewer), an activity feed. It is
**three-quarters a shell**:

1. **The owner isn't seeded as a member.** The account that created the family
   has no `family_members` row, so the client shows no invite button and the
   database's row-level security (RLS) would block an invite anyway. This one
   is already fixed in code — migration **`027_family_owner_sharing.sql`** — but
   migrations here are applied by hand, and 027 hasn't been run on the live
   database (hence "0 members"). *(Layer A below.)*

2. **An invite goes nowhere.** `inviteMember` writes a `pending` row with a
   token; nothing emails the invitee, and no screen or function redeems the
   token into membership. A co-parent can be "invited" and never know.

3. **The deepest one — a member would see nothing.** The app's data is locked
   to the family *owner*, not to family *membership*. 21 core-table RLS policies
   read `family_id in (select id from families where user_id = auth.uid())`; the
   6 that use the `accessible_family_ids()` helper union owners **+ assigned
   staff**, still not co-parents. So even a fully-joined co-parent could open
   the app and see no child, no actions, no calendar, no documents. The sharing
   data model (`family_members`) is disconnected from the sharing of data.

The gap between what the screen promises and what it does is the problem. A
co-parent invited today is worse than no feature: it says "you're on the team"
and shows them an empty app.

## The one danger to design against

**A sharing bug is a privacy breach.** Every change here widens who can read a
family's most sensitive records — a disabled child's diagnoses, IEP documents,
medical history. Re-scoping RLS from "owner" to "membership" is the core of the
work and the thing most able to hurt: one policy that reads membership wrong, or
one SECURITY DEFINER function that trusts a token it shouldn't, exposes one
family's file to another. This initiative is gated the whole way — every schema
PR runs `/adversary` with the reviewer told to attack the RLS specifically, and
the owner applies each migration by hand and merges. Nothing here auto-ships.

## The shape (what we're building)

Two layers, separable so the cheap win isn't held hostage by the big one.

- **Layer A — turn the lights on (operational, today).** Apply migration 027.
  The owner becomes admin of their own family; the invite button appears;
  invites save. No new code. This is the "activate it" the owner asked for —
  but it only makes the *shell* usable, so we're honest that B is the feature.

- **Layer B — make an invite mean something (the initiative).**
  - **B1 — RLS to membership.** Extend `accessible_family_ids()` to also union
    `family_members` where `user_id = auth.uid()`, then migrate the owner-scoped
    core tables onto it. The security-critical heart.
  - **B2 — delivery.** An Edge Function that emails the invitee a branded,
    tokenized accept link.
  - **B3 — accept/redeem.** A deep-linked Join screen + a SECURITY DEFINER
    `accept_family_invitation(token)` that validates and creates the membership
    (bypassing the chicken-and-egg where a not-yet-member can't insert).
  - **B4 — roles that mean something.** `viewer` = read-only, `member` = edit,
    `admin` = manage people. Today RLS is all-or-nothing; this splits it.

## Open decisions (owner's, before/along the build)

1. **Free or premium?** Co-parent sharing is a natural premium feature (it was
   sketched near the E3 "document sharing" gate). Free, premium, or free-to-view
   / premium-to-add-editors? Changes B's gating, not its shape.
2. **How much does a member see?** All-or-nothing (a member sees the whole
   file) vs per-child or per-surface scoping. Recommend all-or-nothing for v1;
   per-child later. Named here because it sets how many policies B1 touches.
3. **Delivery provider.** No transactional email exists in the app today. Pick
   one (Resend / Postmark / Supabase Auth invite). Needs one env secret.

## Done when

A second parent gets an email, taps it, signs in, and sees the *same* child,
plan, calendar and documents as the owner — with edit or view rights matching
their role — and the owner can see them in Members and revoke them. Until then,
Layer A ships the honest partial ("invite saved, delivery coming") and the
screen says so rather than implying a teammate was added.
