-- 053: Family Sharing B1 — a co-parent MEMBER can see and work the family file.
--
-- Initiative 007 (Roadmap/initiatives/007-family-sharing-invites). Owner
-- decisions, Sep 2 2026: sharing is FREE, a member sees the WHOLE family file
-- (all-or-nothing, not per-child), and v1 has ONE working role — Member (view +
-- edit). Viewer (read-only) is deferred.
--
-- THE GAP THIS CLOSES. Family Sharing tracks membership in family_members, but
-- the app's data is locked to the family OWNER: most core tables read
-- `family_id in (select id from families where user_id = auth.uid())`. So a
-- co-parent with a membership row could open the app and see NO child, plan,
-- calendar or documents. This migration grants membership-scoped access to the
-- family-data tables — nothing else changes about who can JOIN a family.
--
-- APPROACH — ADDITIVE, reusing the proven helper. Every statement below only
-- ADDS a permissive "Family members ..." policy; it does not drop or rewrite any
-- existing owner or staff policy, so current access cannot regress (permissive
-- policies OR together — owners keep access via their own policy, members gain
-- it via the new one). Each new policy resolves the family set through
-- public.member_family_ids() — the SECURITY DEFINER function migration 049
-- already defined (owner ∪ family_members), which runs as its owner and so never
-- re-enters family_members' own policies (the 42P17 recursion the 007→048 path
-- hit; see 049's header). It is re-declared here, identical to 049, so this
-- migration is self-contained if applied before 049 has been.
--
-- WHY THIS IS SAFE TO SHIP BEFORE THE ACCEPT FLOW (B3). This only makes an
-- EXISTING family_members row grant data access. It creates no way to BECOME a
-- member: inserting into family_members is still gated by 007/027 (family admin
-- or owner), and the tokenised self-join is a later phase (B3) behind its own
-- SECURITY DEFINER RPC. Until then the only members are ones the owner added.
--
-- WHAT A MEMBER GETS (the whole family file):
--   children · diagnoses · appointments · deadlines · documents · document_shares
--   · iep_goals · iep_goal_logs · expenses · providers · services · communications
--   · family_memories · family_contacts · insurance_authorizations · action_notes
--   · actions · family_requests · sdp_cases · service_events · spending_plan_lines
--   · family_baselines · transition_extensions   (full read + write)
--   families                                      (READ only — the family record)
--   home_deferrals                                (already member-scoped in 049)
--
-- ON THE SDP FACILITATION TABLES (money-adjacent — an explicit owner decision):
--   sdp_cases carries budget amounts, service_events billable time,
--   spending_plan_lines the invoice inputs. Granting a co-parent WRITE to
--   billing-upstream data is the money lane CLAUDE.md says stops and waits. It
--   was held out of this migration for that reason, then the owner decided
--   (Sep 2 2026): "yes for now — a co-parent sees everything." So they are
--   included, read + write, matching the all-or-nothing "whole family file"
--   decision. Recorded in Roadmap/initiatives/007-family-sharing-invites/plan.md.
--
-- DELIBERATELY EXCLUDED from member access in v1 (each a real privacy/scope call
-- — a co-parent should NOT silently get these):
--   chat_sessions, chat_messages   — the owner's private AI Navigator history
--   entitlements                    — premium/billing (money is its own gate; a
--                                     member does not inherit premium in v1)
--   push_tokens                     — per-DEVICE notification tokens (not family data)
--   provider_family_connections, provider_messages, document_access_logs
--                                   — the Provider Portal, a different actor system
--   family_assignments, staff_access_log — who staff may see; an admin/owner act
--   invoices, invoice_lines, vendor_packets — staff/vendor billing
--   analytics_events                — anonymous telemetry, not user-facing data
--   google_accounts, profiles, direct_messages, user_blocks — per-user / community
--   families (WRITE)                — account-level settings stay with the owner.
--                                     One live consequence: a member's tool-pin
--                                     write (useToolPins → UPDATE families) is
--                                     denied and degrades to device-local, so the
--                                     pinned-tools set is owner-write in v1.
-- Any of these can be revisited in a later, deliberate migration.
--
-- NOTE (pre-existing, out of scope): action_stats is a VIEW over actions. If it
-- is not security_invoker, RLS on actions isn't applied through it for anyone —
-- worth a separate look, unaffected by this migration either way.
--
-- Apply by hand in the Supabase SQL editor, in order, like every migration. No
-- restart or cache flush is needed — PostgREST re-plans per request. This is a
-- pure RLS change: NO app code changes, so nothing in CI verifies it; it is
-- verifiable only against a live database. Re-runnable (drop policy if exists).

-- ── The membership helper (identical to 049; re-declared for self-containment) ──
create or replace function public.member_family_ids()
returns setof uuid
language sql
security definer
stable
set search_path = ''
as $$
  select id from public.families where user_id = auth.uid()
  union
  select fm.family_id from public.family_members fm where fm.user_id = auth.uid();
$$;

-- ── The family record: members READ it (owner still manages it) ──
drop policy if exists "Family members read family" on public.families;
create policy "Family members read family" on public.families for select
  using (id in (select public.member_family_ids()));

-- ── Family-data tables scoped directly by family_id (full read + write) ──
drop policy if exists "Family members access children" on public.children;
create policy "Family members access children" on public.children for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access providers" on public.providers;
create policy "Family members access providers" on public.providers for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access services" on public.services;
create policy "Family members access services" on public.services for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access documents" on public.documents;
create policy "Family members access documents" on public.documents for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access expenses" on public.expenses;
create policy "Family members access expenses" on public.expenses for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access appointments" on public.appointments;
create policy "Family members access appointments" on public.appointments for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access deadlines" on public.deadlines;
create policy "Family members access deadlines" on public.deadlines for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access actions" on public.actions;
create policy "Family members access actions" on public.actions for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access action notes" on public.action_notes;
create policy "Family members access action notes" on public.action_notes for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access communications" on public.communications;
create policy "Family members access communications" on public.communications for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access memories" on public.family_memories;
create policy "Family members access memories" on public.family_memories for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access contacts" on public.family_contacts;
create policy "Family members access contacts" on public.family_contacts for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access insurance" on public.insurance_authorizations;
create policy "Family members access insurance" on public.insurance_authorizations for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access document shares" on public.document_shares;
create policy "Family members access document shares" on public.document_shares for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access iep goals" on public.iep_goals;
create policy "Family members access iep goals" on public.iep_goals for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access iep goal logs" on public.iep_goal_logs;
create policy "Family members access iep goal logs" on public.iep_goal_logs for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access requests" on public.family_requests;
create policy "Family members access requests" on public.family_requests for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

-- ── SDP case data (family_id-scoped) — owner-approved, see header ──
drop policy if exists "Family members access sdp cases" on public.sdp_cases;
create policy "Family members access sdp cases" on public.sdp_cases for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access service events" on public.service_events;
create policy "Family members access service events" on public.service_events for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

drop policy if exists "Family members access baselines" on public.family_baselines;
create policy "Family members access baselines" on public.family_baselines for all
  using (family_id in (select public.member_family_ids()))
  with check (family_id in (select public.member_family_ids()));

-- ── Tables scoped by child_id → children ──
drop policy if exists "Family members access diagnoses" on public.diagnoses;
create policy "Family members access diagnoses" on public.diagnoses for all
  using (child_id in (
    select id from public.children where family_id in (select public.member_family_ids())
  ))
  with check (child_id in (
    select id from public.children where family_id in (select public.member_family_ids())
  ));

-- ── SDP child tables scoped by case_id → sdp_cases ──
drop policy if exists "Family members access extensions" on public.transition_extensions;
create policy "Family members access extensions" on public.transition_extensions for all
  using (case_id in (
    select id from public.sdp_cases where family_id in (select public.member_family_ids())
  ))
  with check (case_id in (
    select id from public.sdp_cases where family_id in (select public.member_family_ids())
  ));

drop policy if exists "Family members access plan lines" on public.spending_plan_lines;
create policy "Family members access plan lines" on public.spending_plan_lines for all
  using (case_id in (
    select id from public.sdp_cases where family_id in (select public.member_family_ids())
  ))
  with check (case_id in (
    select id from public.sdp_cases where family_id in (select public.member_family_ids())
  ));
