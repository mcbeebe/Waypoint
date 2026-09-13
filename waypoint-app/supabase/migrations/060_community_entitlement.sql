-- 060: Waypoint is free for families whose child receives SSI, and for any
-- family who says they can't afford it. Owner decision, 2026-09-08.
--
-- The whole design rests on one asymmetry. A false positive costs us the
-- margin on a subscription that family was almost certainly never going to
-- buy. A false negative is a poor family hitting a paywall on the night
-- they got a denial letter. Those are not comparable, so every ambiguity
-- resolves toward the grant.
--
-- WHY NO DOCUMENTS, EVER.
--   · An SSI award letter carries the child's SSN, date of birth, and
--     disability determination. Accepting those uploads would create the
--     single most sensitive data store in this product in order to protect
--     ~$99 of margin. That trade is indefensible.
--   · Verification vendors cost more per check than the subscription is
--     worth at this price point.
--   · These parents already prove everything, repeatedly, to the regional
--     center, the district, the county and SSA. Making them prove poverty
--     to US is precisely the indignity this product exists to relieve.
--
-- WHY SSI IS THE VALIDATION.
-- SSA already means-tests childhood SSI, including parental deeming. A
-- child receiving SSI has ALREADY been determined by the federal government
-- to be in a household under the income and resource limits. There is no
-- stricter test we could apply and no reason to re-run one. The family also
-- already told us: children.ssi_status has been collected in onboarding
-- since 043. So the strongest signal available costs the family zero new
-- questions, and the grant lands before they ever see a paywall.
--
-- The second door exists because SSI misses people who are unambiguously
-- poor: most childhood SSI claims are denied on medical criteria, parental
-- deeming disqualifies many low-income working families, and applications
-- sit in backlog for months. Those families self-attest. One sentence, no
-- proof, no follow-up.

-- ── the new sponsor path ────────────────────────────────────────────────────
-- 'community' rather than 'hardship' or 'needs_based'. sponsor_type names
-- who is paying, and here the answer is genuinely "families who pay" — the
-- grant is funded by them. It is also the label a support agent will read
-- aloud one day, and nobody should have to hear "you're on the hardship
-- plan."
alter table public.entitlements
  drop constraint if exists entitlements_sponsor_type_check;

alter table public.entitlements
  add constraint entitlements_sponsor_type_check check (sponsor_type in (
    'self',          -- the family subscribes (Stripe)
    'facilitation',  -- active facilitation client (auto)
    'district', 'employer', 'licensee',
    'community'      -- fee waiver: child on SSI, or family self-attested
  ));

comment on column public.entitlements.sponsor_type is
  'Who covers this grant. ''community'' is a fee waiver funded by paying families — granted automatically when a child''s ssi_status is active, or on self-attestation. Never require documentation for it.';

-- ── door 1: a child on SSI, granted without being asked for ─────────────────
-- Mirrors sync_facilitation_entitlement. period_end stays NULL: this runs
-- until revoked, like every other sponsored grant. A family in poverty must
-- never receive a renewal prompt, because a renewal prompt is a re-ask, and
-- the re-ask is where we would lose them.
--
-- Note what this does NOT do: it never revokes. If a child comes off SSI,
-- the grant stands. Ending someone's free access because their benefit
-- lapsed — which is when money is tightest, not loosest — would be exactly
-- backwards. Revocation is a deliberate admin action only.
create or replace function public.sync_community_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ssi_status = 'active' then
    insert into public.entitlements (family_id, sponsor_type, source, status)
    values (new.family_id, 'community', 'ssi:' || new.id::text, 'active')
    on conflict (family_id, sponsor_type) where status = 'active'
    do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_child_ssi_entitlement on public.children;
create trigger on_child_ssi_entitlement
  after insert or update of ssi_status on public.children
  for each row execute function public.sync_community_entitlement();

-- ── door 2: self-attestation, no documentation ──────────────────────────────
-- Callable by the signed-in family for their own family row. The whole
-- server-side check is "is this your family" — there is deliberately
-- nothing else to satisfy.
create or replace function public.claim_community_entitlement(p_reason text default null)
returns public.entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_family uuid;
  v_row public.entitlements;
begin
  select id into v_family from public.families where user_id = auth.uid() limit 1;
  if v_family is null then
    raise exception 'no family for the current user';
  end if;

  -- Already granted (SSI trigger, or a second tap): return it rather than
  -- erroring. A family should never see a failure for asking twice.
  select * into v_row from public.entitlements
    where family_id = v_family and sponsor_type = 'community' and status = 'active'
    limit 1;
  if found then
    return v_row;
  end if;

  insert into public.entitlements (family_id, sponsor_type, source, status)
  values (
    v_family,
    'community',
    -- Free text, capped, stored only so we can learn who is asking and why.
    -- It is NOT evidence and is never reviewed to approve or deny.
    case when p_reason is null then 'self-attested'
         else 'self-attested: ' || left(p_reason, 280) end,
    'active'
  )
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.claim_community_entitlement(text) from public, anon;
grant execute on function public.claim_community_entitlement(text) to authenticated;

-- ── backfill: families who already told us, before this existed ─────────────
-- They answered the SSI question months ago and have been paying, or
-- hitting the free-tier cap, ever since. Granting on deploy rather than on
-- their next profile edit is the difference between a policy and a gesture.
insert into public.entitlements (family_id, sponsor_type, source, status)
select distinct c.family_id, 'community', 'ssi:backfill', 'active'
from public.children c
where c.ssi_status = 'active'
on conflict (family_id, sponsor_type) where status = 'active'
do nothing;
