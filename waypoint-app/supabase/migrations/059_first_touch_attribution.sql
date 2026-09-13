-- 059_first_touch_attribution.sql
--
-- First-touch attribution column (contract: waypoint-site/docs/analytics-taxonomy.md,
-- "First-touch attribution" section — the frozen D3 doc).
--
-- Target table: public.families.
--   families is the user-level record in this schema: it is the account row,
--   1:1 with auth.users via user_id (NOT NULL UNIQUE, 001_schema_v1.sql).
--   children/services/etc. hang off it; attribution belongs to the account,
--   not to any child or session, so families is the correct home.
--
-- Semantics (from D3, do not drift):
--   * Written ONCE at signup, from the payload the app persisted on /start
--     BEFORE auth began (sessionStorage / state param).
--   * Never overwritten. NULL means "no attribution captured" (direct app
--     visit, param stripping) — NULL is expected and is counted as leakage
--     in the monthly reconciliation, not backfilled.
--   * Shape: { "source", "medium", "landing_slug",
--              "wp": { "slug", "pillar", "cta", "locale", "ctx" },
--              "captured_at" }  -- captured_at is ISO-8601.

alter table public.families
  add column if not exists first_touch jsonb null;

comment on column public.families.first_touch is
  'Write-once first-touch attribution (D3 contract: waypoint-site/docs/analytics-taxonomy.md). '
  'Set exactly once at signup by app code; app code MUST use a guarded write '
  '(UPDATE ... SET first_touch = $1 WHERE id = $2 AND first_touch IS NULL) and '
  'MUST NOT include this column in any generic profile-update path. '
  'NULL = no attribution captured (expected leakage; never backfill, never overwrite). '
  'Source of truth for the north star: organic-attributed accounts qualified by first_plan_saved.';

-- Partial index for the north-star / monthly-reconciliation query
-- ("attributed accounts by source"). Partial on IS NOT NULL because the
-- reconciliation only scans attributed rows and most rows may be NULL.
create index if not exists idx_families_first_touch_source
  on public.families ((first_touch ->> 'source'))
  where first_touch is not null;

-- ---------------------------------------------------------------------------
-- Write-once enforcement: APP CODE, not a trigger (recommendation).
--
-- Decision: enforce write-once in application code, documented by the
-- COMMENT ON COLUMN above. Rationale:
--   * The only writer is the app's signup path; a guarded UPDATE
--     (... WHERE first_touch IS NULL) is race-safe and self-documenting.
--   * A BEFORE UPDATE trigger that raises on overwrite would also fire on
--     admin/support tooling and future data-repair migrations, turning a
--     one-line fix into a trigger-disable dance. This schema's existing
--     triggers (handle_updated_at) are value-setting, not policy-raising;
--     keeping policy out of triggers matches the codebase convention.
--   * RLS (002/016/053-058) already restricts WHO can write the row; this
--     column needs "at most once," which the guarded UPDATE provides.
--
-- If a DB-level backstop is ever wanted, the trigger below is the reviewed
-- form — ship it as its own numbered migration, not by uncommenting here:
--
--   create or replace function public.enforce_first_touch_write_once()
--   returns trigger
--   language plpgsql
--   as $$
--   begin
--     if old.first_touch is not null
--        and new.first_touch is distinct from old.first_touch then
--       raise exception 'families.first_touch is write-once (D3 contract)';
--     end if;
--     return new;
--   end;
--   $$;
--
--   create trigger enforce_first_touch_write_once
--     before update of first_touch on public.families
--     for each row execute function public.enforce_first_touch_write_once();
-- ---------------------------------------------------------------------------
