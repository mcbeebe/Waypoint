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
--    Scope, stated honestly: the policies below follow 027's broadened form
--    (family_members OR the owning account), so the row is reachable by a
--    co-parent the day the app can resolve a shared family. It cannot today —
--    useFamily() still looks up families by user_id, which is an app-wide
--    limit, not one this table introduces. Until that changes, this is one
--    account's deferrals on every device it signs in on.
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
  'Home triage "Not today" — one row per set-aside item, with the day it returns. Family-scoped: reachable by the owning account and by family_members once the app resolves shared families.';

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'home_deferrals'
       and policyname = 'Families manage own deferrals'
  ) then
    -- The 027 form: a co-parent's family_members row counts, not only the
    -- owning account. 037's narrow form would have made this table
    -- owner-only forever, which is the opposite of why it exists.
    create policy "Families manage own deferrals" on public.home_deferrals for all
      using (
        family_id in (select family_id from public.family_members where user_id = auth.uid())
        or family_id in (select id from public.families where user_id = auth.uid())
      )
      with check (
        family_id in (select family_id from public.family_members where user_id = auth.uid())
        or family_id in (select id from public.families where user_id = auth.uid())
      );
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

-- RLS goes on AFTER the policies exist. Enabling it first leaves a window —
-- and, if the do-block above fails, a permanent state — where the table is
-- readable as empty and every write fails with an error the app does not
-- recognise as "not migrated", so deferrals vanish silently.
alter table public.home_deferrals enable row level security;

-- ── Pinned tools (phase 4) ──────────────────────────────────────────────────
-- A json array of tool keys from lib/toolsCatalog. Capped at six by the app,
-- not the database: the cap is a design choice about a tile grid, and a
-- constraint here would turn a future re-design into a migration.
alter table public.families
  add column if not exists tool_pins jsonb not null default '[]'::jsonb;

comment on column public.families.tool_pins is
  'Tools promoted to Home tiles — one shared set per family. App-capped at six.';
