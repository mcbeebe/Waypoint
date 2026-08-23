/**
 * Analytics service — anonymous outcome tracking and insights
 * Phase 8: Sprint S59
 *
 * All events are anonymized — no PII stored in analytics.
 * Insights are aggregated with minimum sample thresholds.
 */

import { supabase } from './supabase';

type EventType =
  | 'action_outcome'
  | 'draft_used'
  | 'kb_helpful'
  | 'kb_unhelpful'
  | 'feature_used'
  | 'chat_exchange'
  | 'funnel_step';

/**
 * Acquisition-funnel steps (PRD W-B: B4). The owner scorecard's
 * "free → booked" conversion is computed from these events:
 * booked ÷ registered, with per-source and per-language cuts.
 */
export type FunnelStep =
  | 'registered'
  | 'eligibility_result_viewed'
  | 'funded_offer_viewed'
  | 'booking_started'
  | 'booking_completed'
  | 'became_client';

/**
 * Track one acquisition-funnel step. Steps that can fire repeatedly
 * (viewing a result twice) are deduplicated at query time by taking each
 * family's first occurrence, so callers can fire unconditionally.
 */
export async function trackFunnelStep(
  familyId: string,
  step: FunnelStep,
  opts?: { source?: string; language?: string; regionalCenter?: string }
): Promise<void> {
  await trackEvent({
    familyId,
    eventType: 'funnel_step',
    eventData: {
      step,
      source: opts?.source ?? null,
      language: opts?.language ?? null,
    },
    regionalCenter: opts?.regionalCenter,
  });
}

interface TrackEventOptions {
  familyId: string;
  eventType: EventType;
  eventData?: Record<string, unknown>;
  regionalCenter?: string;
  diagnosisTags?: string[];
}

/**
 * Track an anonymized analytics event.
 * Best-effort — failures are silently ignored.
 */
export async function trackEvent(options: TrackEventOptions): Promise<void> {
  try {
    await supabase.from('analytics_events').insert({
      family_id: options.familyId,
      event_type: options.eventType,
      event_data: options.eventData ?? {},
      regional_center: options.regionalCenter ?? null,
      diagnosis_tags: options.diagnosisTags ?? [],
    });
  } catch {
    // Analytics is best-effort — don't break the app
  }
}

/** Track when an action has an outcome (approved/denied/completed) */
export async function trackActionOutcome(
  familyId: string,
  actionCategory: string,
  outcome: 'approved' | 'denied' | 'completed' | 'abandoned',
  regionalCenter?: string,
  diagnosisTags?: string[]
): Promise<void> {
  await trackEvent({
    familyId,
    eventType: 'action_outcome',
    eventData: { category: actionCategory, outcome },
    regionalCenter,
    diagnosisTags,
  });
}

/** Track when an AI-generated draft is actually used */
export async function trackDraftUsed(
  familyId: string,
  draftType: string,
  regionalCenter?: string
): Promise<void> {
  await trackEvent({
    familyId,
    eventType: 'draft_used',
    eventData: { draftType },
    regionalCenter,
  });
}

/** Track KB article helpfulness feedback */
export async function trackKBFeedback(
  familyId: string,
  kbSource: string,
  helpful: boolean
): Promise<void> {
  await trackEvent({
    familyId,
    eventType: helpful ? 'kb_helpful' : 'kb_unhelpful',
    eventData: { source: kbSource },
  });
}

// ─── Insights Retrieval ─────────────────────────────────────────────────────

const MIN_SAMPLE_SIZE = 10;

export interface AggregateInsight {
  insightType: string;
  dimension: string;
  metricValue: number;
  sampleSize: number;
  periodStart: string;
  periodEnd: string;
  metadata: Record<string, unknown>;
}

/**
 * Fetch aggregate insights for a specific regional center.
 * Only returns insights with sufficient sample size.
 */
export async function getInsightsForRC(regionalCenter: string): Promise<AggregateInsight[]> {
  try {
    // Two shapes: rc_success_rate keys the RC in `dimension`;
    // action_type_success keys the category in `dimension` and carries the
    // RC in metadata (so the bar labels can show the category).
    const [byDimension, byMetadata] = await Promise.all([
      supabase
        .from('aggregate_insights')
        .select('*')
        .eq('dimension', regionalCenter)
        .gte('sample_size', MIN_SAMPLE_SIZE)
        .order('period_end', { ascending: false })
        .limit(20),
      supabase
        .from('aggregate_insights')
        .select('*')
        .eq('metadata->>regional_center', regionalCenter)
        .gte('sample_size', MIN_SAMPLE_SIZE)
        .order('period_end', { ascending: false })
        .limit(20),
    ]);

    const data = [...(byDimension.data ?? []), ...(byMetadata.data ?? [])];
    return (data ?? []).map((row: Record<string, unknown>) => ({
      insightType: row.insight_type as string,
      dimension: row.dimension as string,
      metricValue: row.metric_value as number,
      sampleSize: row.sample_size as number,
      periodStart: row.period_start as string,
      periodEnd: row.period_end as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch trending strategies across all families.
 */
export async function getTrendingStrategies(): Promise<AggregateInsight[]> {
  try {
    const { data, error } = await supabase
      .from('aggregate_insights')
      .select('*')
      .eq('insight_type', 'trending_strategy')
      .gte('sample_size', MIN_SAMPLE_SIZE)
      .order('metric_value', { ascending: false })
      .limit(10);

    if (error) return [];
    return (data ?? []).map((row: Record<string, unknown>) => ({
      insightType: row.insight_type as string,
      dimension: row.dimension as string,
      metricValue: row.metric_value as number,
      sampleSize: row.sample_size as number,
      periodStart: row.period_start as string,
      periodEnd: row.period_end as string,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  } catch {
    return [];
  }
}
