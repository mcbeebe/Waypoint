/**
 * 099 transition-hour tracking (PRD W-C: C4) — the 40-hour cap with a hard
 * stop, an extension path, and a burn-rate forecast ("hits the cap ~Oct 3")
 * instead of a bare percentage. Pure math over service events; the cap is
 * sourced from benefitFigures (DDS July-2024 guidance) with provenance in
 * the content_sources registry.
 */
import { SDP_TRANSITION_HOURS_CAP } from '@/data/benefitFigures';
import type { ServiceEvent, TransitionExtension } from '@/types/database';

export interface TransitionHoursStatus {
  usedHours: number;
  /** 40 + approved extensions. */
  capHours: number;
  remainingHours: number;
  pctUsed: number; // 0–100, of the effective cap
  atWarning: boolean; // ≥80% of effective cap
  atCap: boolean;
  /** ISO date the cap is hit at the recent burn rate; null when no burn. */
  forecastCapDate: string | null;
  hasPendingExtension: boolean;
}

type HourEvent = Pick<ServiceEvent, 'activity_type' | 'minutes' | 'occurred_on'>;
type Extension = Pick<TransitionExtension, 'approved_on' | 'additional_hours'>;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Burn-rate window: recent activity predicts better than lifetime average. */
const FORECAST_WINDOW_DAYS = 28;

export function transitionHoursStatus(
  events: HourEvent[],
  extensions: Extension[] = [],
  now = new Date()
): TransitionHoursStatus {
  const hourEvents = events.filter((e) => e.activity_type === 'transition_099');
  const usedHours = round1(hourEvents.reduce((sum, e) => sum + e.minutes, 0) / 60);

  const approvedExtra = extensions
    .filter((x) => x.approved_on)
    .reduce((sum, x) => sum + Number(x.additional_hours), 0);
  const capHours = SDP_TRANSITION_HOURS_CAP + approvedExtra;

  const remainingHours = round1(Math.max(0, capHours - usedHours));
  const pctUsed = capHours > 0 ? Math.min(100, Math.round((usedHours / capHours) * 100)) : 100;

  // Burn rate: hours per day over the recent window.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - FORECAST_WINDOW_DAYS);
  const recentMinutes = hourEvents
    .filter((e) => new Date(`${e.occurred_on}T00:00:00`) >= windowStart)
    .reduce((sum, e) => sum + e.minutes, 0);
  const hoursPerDay = recentMinutes / 60 / FORECAST_WINDOW_DAYS;

  let forecastCapDate: string | null = null;
  if (remainingHours > 0 && hoursPerDay > 0) {
    const daysToCap = Math.ceil(remainingHours / hoursPerDay);
    const d = new Date(today);
    d.setDate(d.getDate() + daysToCap);
    forecastCapDate = d.toISOString().slice(0, 10);
  }

  return {
    usedHours,
    capHours,
    remainingHours,
    pctUsed,
    atWarning: pctUsed >= 80,
    atCap: usedHours >= capHours,
    forecastCapDate,
    hasPendingExtension: extensions.some((x) => !x.approved_on),
  };
}

export interface LogCheck {
  allowed: boolean;
  /** Why not, in the facilitator's language — never a bare error code. */
  reason: string | null;
}

/**
 * The hard stop (C4): hour 41 cannot be logged without an approved
 * extension. Called BEFORE writing the service event.
 */
export function canLogTransitionMinutes(
  minutes: number,
  events: HourEvent[],
  extensions: Extension[] = []
): LogCheck {
  const { usedHours, capHours, hasPendingExtension } = transitionHoursStatus(
    events,
    extensions
  );
  const afterHours = usedHours + minutes / 60;
  if (afterHours <= capHours) return { allowed: true, reason: null };
  const base = `This entry would put the case at ${round1(afterHours)}h against the ${capHours}h transition cap (DDS 099 guidance).`;
  return {
    allowed: false,
    reason: hasPendingExtension
      ? `${base} An extension request is pending — hours unlock when it is approved.`
      : `${base} Request an extension from the Regional Center first.`,
  };
}
