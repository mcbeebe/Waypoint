-- 048: Home triage state — "Not today" and pinned tools
-- (Roadmap/Home-Rebuild-Plan.md, phases 2 and 4).
--
-- Two pieces of family state that the redesigned Home needs to be honest:
--
-- 1. home_deferrals — what someone set aside, and the day it comes back.
--    This is a table and not device storage on purpose: the 20-persona audit
--    found silent snoozes (#6, #10), where one parent dismissed a card and
--    the other never learned it existed. "Later with Undo" is a promise to
--    the whole family, so the record belongs to the family.
--
-- 2. families.tool_pins — the tools a family promoted to tiles. One shared
--    set per family (owner decision), not per child and not per device.
--
-- Additive and idempotent; safe to re-run.

create table if not exists public.home_deferrals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  -- The triage item id from lib/homeTriage.ts, e.g. "reply:<uuid>". Opaque
  -- here on purpose: the ladder owns its own id scheme, and an item that
  -- stops existing simply stops matching.
  item_id text not null,
  -- Local calendar date the item returns to Home. Stored as a date, and
  -- computed on the device so it matches the family's own "tomorrow".
  returns_on date not null,
  -- A label of what was set aside, so the Later list reads honestly even
  -- when the underlying item is gone by the time someone looks.
  title text,
  -- Who set it aside, so a co-parent sees whose call it was.
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (family_id, item_id)
);

create index if not exists home_deferrals_family_idx
  on public.home_deferrals (family_id, returns_on);

comment on table public.home_deferrals is
  'Home triage "Not today" — one row per set-aside item, with the day it returns. Family-scoped so a co-parent sees what was deferred.';

alter table public.home_deferrals enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'home_deferrals'
       and policyname = 'Families manage own deferrals'
  ) then
    create policy "Families manage own deferrals" on public.home_deferrals for all
      using (family_id in (select id from public.families where user_id = auth.uid()))
      with check (family_id in (select id from public.families where user_id = auth.uid()));
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'home_deferrals'
       and policyname = 'Assigned staff read deferrals'
  ) then
    create policy "Assigned staff read deferrals" on public.home_deferrals for select
      using (family_id in (select public.accessible_family_ids()));
  end if;
end
$$;

-- ── Pinned tools (phase 4) ──────────────────────────────────────────────────
-- A json array of tool keys from lib/toolsCatalog. Capped at six by the app,
-- not the database: the cap is a design choice about a tile grid, and a
-- constraint here would turn a future re-design into a migration.
alter table public.families
  add column if not exists tool_pins jsonb not null default '[]'::jsonb;

comment on column public.families.tool_pins is
  'Tools promoted to Home tiles — one shared set per family. App-capped at six.';
