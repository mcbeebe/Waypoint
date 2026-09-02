/**
 * "When did this land in my plan?" — the two pure bits behind the Action
 * Plan's added-date line and its NEW flag.
 *
 * Why it exists: when the Plan tab's Action Plan segment was merged into the
 * shared tracker (Sep 1 2026), the old Plan-only row's "Added <date>" line
 * went with it. A parent who saves three steps out of a Navigator answer then
 * opens the plan and cannot tell which rows are the ones they just added —
 * the list sorts by priority, so new items scatter. This module restores the
 * date and adds the flag, in one tested place, so both the Tracker tab and the
 * Plan segment say the same thing.
 *
 * Pure — no react-native, no I/O — so it lives in the `logic` vitest project.
 */

/** How long an action reads as "new". A day covers "I added it this morning". */
export const NEW_ACTION_WINDOW_MS = 24 * 60 * 60 * 1000;

type Locale = 'en' | 'es' | 'vi';

const ADDED_LABEL: Record<Locale, { today: string; yesterday: string; on: string }> = {
  en: { today: 'Added today', yesterday: 'Added yesterday', on: 'Added' },
  es: { today: 'Añadido hoy', yesterday: 'Añadido ayer', on: 'Añadido el' },
  vi: { today: 'Đã thêm hôm nay', yesterday: 'Đã thêm hôm qua', on: 'Đã thêm' },
};

const NEW_LABEL: Record<Locale, string> = { en: 'New', es: 'Nuevo', vi: 'Mới' };

const INTL_TAG: Record<Locale, string> = { en: 'en-US', es: 'es-ES', vi: 'vi-VN' };

/** The badge word, so the three locales stay in one place. */
export function newBadgeLabel(locale: Locale = 'en'): string {
  return NEW_LABEL[locale] ?? NEW_LABEL.en;
}

/**
 * Was this created inside the NEW window? Tolerant of a missing or unparsable
 * timestamp (a locally-created offline row may have neither) — those are NOT
 * flagged, because a false "New" on an item from last month is worse than no
 * flag at all.
 *
 * A future timestamp (clock skew between the device and Postgres) counts as
 * new: it is certainly not old.
 */
export function isNewlyAdded(
  createdAt: string | null | undefined,
  now: Date | number = Date.now()
): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  const nowMs = typeof now === 'number' ? now : now.getTime();
  return nowMs - created < NEW_ACTION_WINDOW_MS;
}

/** Local calendar-day difference, so "yesterday" means yesterday and not 24h. */
function dayDelta(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * "Added today" · "Added yesterday" · "Added Sep 2" — and "Added Sep 2, 2025"
 * once the year differs, so an old item never reads as a recent one.
 *
 * Returns '' for a missing or unparsable timestamp: the row then simply shows
 * no added line, rather than "Added Invalid Date".
 */
export function formatAddedOn(
  createdAt: string | null | undefined,
  now: Date | number = Date.now(),
  locale: Locale = 'en'
): string {
  if (!createdAt) return '';
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '';
  const today = typeof now === 'number' ? new Date(now) : now;
  const labels = ADDED_LABEL[locale] ?? ADDED_LABEL.en;

  const delta = dayDelta(created, today);
  if (delta === 0) return labels.today;
  if (delta === 1) return labels.yesterday;

  const sameYear = created.getFullYear() === today.getFullYear();
  const date = created.toLocaleDateString(INTL_TAG[locale] ?? INTL_TAG.en, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${labels.on} ${date}`;
}
