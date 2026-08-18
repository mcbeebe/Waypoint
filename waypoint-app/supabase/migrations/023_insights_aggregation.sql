-- 023: Insights aggregation — makes the Insights screen live (roadmap 7.3)
--
-- analytics_events has been receiving events since the retention wave, but
-- nothing ever computed aggregate_insights, so the Insights screen rendered
-- empty forever. This adds the weekly aggregation function + pg_cron
-- schedule, and runs it once immediately.
--
-- Privacy: aggregates only — per-RC and per-category rates with family
-- counts. The reader additionally hides anything under 10 families.

create extension if not exists pg_cron;

create or replace function public.compute_aggregate_insights()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Full recompute each run
  delete from public.aggregate_insights;

  -- RC success rate: completed share of action outcomes per Regional Center
  -- (trailing 90 days)
  insert into public.aggregate_insights
    (insight_type, dimension, metric_value, sample_size, period_start, period_end)
  select
    'rc_success_rate',
    regional_center,
    round(100.0 * count(*) filter (where event_data->>'outcome' = 'completed') / count(*), 1),
    count(distinct family_id),
    (now() - interval '90 days')::date,
    now()::date
  from public.analytics_events
  where event_type = 'action_outcome'
    and regional_center is not null
    and created_at > now() - interval '90 days'
  group by regional_center;

  -- Success by action category within each RC (dimension = category,
  -- RC carried in metadata so the reader can scope by center)
  insert into public.aggregate_insights
    (insight_type, dimension, metric_value, sample_size, period_start, period_end, metadata)
  select
    'action_type_success',
    coalesce(event_data->>'category', 'general'),
    round(100.0 * count(*) filter (where event_data->>'outcome' = 'completed') / count(*), 1),
    count(distinct family_id),
    (now() - interval '90 days')::date,
    now()::date,
    jsonb_build_object('regional_center', regional_center)
  from public.analytics_events
  where event_type = 'action_outcome'
    and regional_center is not null
    and created_at > now() - interval '90 days'
  group by regional_center, coalesce(event_data->>'category', 'general');

  -- Trending strategies: action categories by completion success across all
  -- families (trailing 30 days)
  insert into public.aggregate_insights
    (insight_type, dimension, metric_value, sample_size, period_start, period_end)
  select
    'trending_strategy',
    coalesce(event_data->>'category', 'general'),
    round(100.0 * count(*) filter (where event_data->>'outcome' = 'completed') / count(*), 1),
    count(distinct family_id),
    (now() - interval '30 days')::date,
    now()::date
  from public.analytics_events
  where event_type = 'action_outcome'
    and created_at > now() - interval '30 days'
  group by coalesce(event_data->>'category', 'general');
end;
$$;

-- Recompute every Monday 06:00 UTC (idempotent: unschedule if it exists)
do $$
begin
  perform cron.unschedule('waypoint-aggregate-insights');
exception when others then
  null; -- job didn't exist yet
end;
$$;

select cron.schedule(
  'waypoint-aggregate-insights',
  '0 6 * * 1',
  $$select public.compute_aggregate_insights()$$
);

-- Populate immediately so the screen has data as soon as events exist
select public.compute_aggregate_insights();
