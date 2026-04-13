-- Phase 8: Analytics & outcome tracking
-- Anonymous telemetry for action outcomes, KB helpfulness, and aggregate insights

-- ─── Analytics Events ───────────────────────────────────────────────────────
create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete set null,
  event_type text not null, -- 'action_outcome', 'draft_used', 'kb_helpful', 'kb_unhelpful', 'feature_used'
  event_data jsonb default '{}',
  -- Anonymized context for aggregation
  regional_center text,
  diagnosis_tags text[] default '{}',
  created_at timestamptz default now() not null
);

-- ─── Aggregate Insights (weekly computed) ───────────────────────────────────
create table public.aggregate_insights (
  id uuid primary key default gen_random_uuid(),
  insight_type text not null, -- 'rc_success_rate', 'action_type_success', 'trending_strategy'
  dimension text not null, -- e.g., 'ELARC', 'autism', 'fair_hearing'
  metric_value numeric not null,
  sample_size integer not null,
  period_start date not null,
  period_end date not null,
  metadata jsonb default '{}',
  computed_at timestamptz default now() not null
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index idx_analytics_type on public.analytics_events(event_type);
create index idx_analytics_rc on public.analytics_events(regional_center);
create index idx_analytics_created on public.analytics_events(created_at desc);
create index idx_insights_type on public.aggregate_insights(insight_type, dimension);
create index idx_insights_period on public.aggregate_insights(period_end desc);

-- ─── RLS ────────────────────────────────────────────────────────────────────
alter table public.analytics_events enable row level security;
alter table public.aggregate_insights enable row level security;

-- Events: users can write own, service role reads all
create policy "Users can log own events" on analytics_events for insert
  with check (family_id in (select id from families where user_id = auth.uid()));

-- Insights: anyone authenticated can read (they're anonymized/aggregated)
create policy "Authenticated users can read insights" on aggregate_insights for select
  using (auth.uid() is not null);
