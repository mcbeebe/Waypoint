/**
 * Sorting and filtering the action plan, as pure functions.
 *
 * Why it exists: the list's order was a hard-coded `useMemo` inside
 * `ActionsScreen` (priority → due date → newest) that a parent could not
 * change, and the only filter was status. This module makes both explicit and
 * testable so "show me what's overdue, oldest first" is a data question rather
 * than a rendering one.
 *
 * Two invariants the callers depend on, both load-bearing:
 *
 * 1. **Action objects are never cloned.** The Action Plan's focus view
 *    ("your next 3 steps") decides what to keep using object IDENTITY —
 *    `next3.includes(a)` and `keep.has(a)`. A sort that mapped to fresh
 *    objects would silently break the just-saved-item carve-out that
 *    `ActionsScreen.test.tsx` exists to protect, and no type would catch it.
 *    Every function here returns a new ARRAY of the SAME objects.
 *
 * 2. **Dates are compared on the local calendar day.** `due_date` is a Postgres
 *    `date` (`YYYY-MM-DD`, no zone). `new Date('2026-08-25')` parses that as
 *    UTC midnight, which is Aug 24 17:00 for a family in California — so a
 *    step due today reads as overdue. Everything here parses to LOCAL midnight
 *    instead. (The card's own inline `new Date(due) < new Date()` still has the
 *    old bug; it is not this module's to fix, and is called out in the PR.)
 *
 * Pure — no react-native, no I/O — so it lives in the `logic` vitest project.
 */

import type { Action, ActionPriority } from '@/types/database';
import { PRIORITY_RANK } from '@/lib/actionMeta';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * The dimension the plan is ordered by. Each reversible field sorts BOTH ways
 * (owner, Sep 3 — "should be able to sort both ways"); `smart` is a fixed
 * composite (priority → soonest deadline → newest) and does not reverse.
 *
 * This replaced a flat key list where the only reversible dimension was the
 * created date, split across two chips (`created_desc` / `created_asc`) while
 * due-date and priority had no reverse at all.
 */
export type ActionSortField = 'smart' | 'due_date' | 'priority' | 'created';

export type SortDir = 'asc' | 'desc';

export const SORT_FIELDS: readonly ActionSortField[] = [
  'smart',
  'due_date',
  'priority',
  'created',
] as const;

/** `smart` is a composite with one canonical order; the rest flip. */
export function isReversibleField(field: ActionSortField): boolean {
  return field !== 'smart';
}

/**
 * The direction a field selects to on FIRST tap — the one a parent expects by
 * default. Soonest deadline first; most urgent first; most recently added
 * first. Tapping the active field again flips to the opposite.
 */
export const DEFAULT_DIR: Record<ActionSortField, SortDir> = {
  smart: 'desc',
  due_date: 'asc',
  priority: 'desc',
  created: 'desc',
};

export type DueFilter = 'any' | 'overdue' | 'next7' | 'has_date' | 'no_date';
export type CreatedFilter = 'any' | 'last7' | 'last30' | 'older';

export interface ActionFilters {
  /** Empty means "any priority" — never treat `[]` as "match nothing". */
  priorities: ActionPriority[];
  due: DueFilter;
  created: CreatedFilter;
}

export const NO_FILTERS: ActionFilters = { priorities: [], due: 'any', created: 'any' };

// ─── Local-day helpers ──────────────────────────────────────────────────────

/**
 * Midnight, local time, of the calendar day a value falls on.
 *
 * Two kinds of input, and they must be read differently:
 *
 * - **Date-only** (`2026-09-03`, a Postgres `date` like `due_date`) names a
 *   calendar day with no instant and no zone. Build local midnight of exactly
 *   that day. `new Date('2026-09-03')` would parse it as UTC midnight, which
 *   is 17:00 the previous evening in California.
 * - **A full timestamp** (`created_at`) is a real instant; its calendar day is
 *   whatever the device's clock says. Parse it and take the local day.
 *
 * The `$` on the pattern is load-bearing. Without it the pattern also matched
 * the leading `YYYY-MM-DD` of every ISO timestamp, so `created_at` was bucketed
 * on its UTC date and the timestamp branch below was unreachable: a step added
 * at 19:30 Pacific counted as "added tomorrow". The `tz` suite ran only at
 * UTC+7, where a late local evening is still the same UTC date — the one zone
 * in which that bug cannot be seen. It now runs east AND west.
 *
 * Returns null for a missing or unparsable value so a bad row is simply
 * undated rather than silently "overdue since 1970".
 */
function localDayOf(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (m) {
    const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
    return Number.isNaN(t) ? null : t;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Midnight, local time, of the day `now` falls on. */
function startOfDay(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Whole calendar days from today to `dateStr` — negative means past. */
export function daysFromToday(
  dateStr: string | null | undefined,
  now: number = Date.now()
): number | null {
  const day = localDayOf(dateStr);
  if (day === null) return null;
  return Math.round((day - startOfDay(now)) / 86400000);
}

// ─── Sorting ────────────────────────────────────────────────────────────────

function rank(p: ActionPriority): number {
  return PRIORITY_RANK[p] ?? PRIORITY_RANK.medium;
}

/**
 * Order two steps by deadline, in the given direction. Dated steps ALWAYS come
 * before undated ones — in both directions — so reversing "soonest first" gives
 * "latest first", not "undated first". `desc` reads latest-dated first.
 */
function dueCmp(a: Action, b: Action, dir: SortDir): number {
  if (a.due_date && b.due_date) {
    return dir === 'asc' ? a.due_date.localeCompare(b.due_date) : b.due_date.localeCompare(a.due_date);
  }
  if (a.due_date) return -1;
  if (b.due_date) return 1;
  return 0;
}

/** Dated steps before undated ones, then soonest first — the `smart` tiebreak. */
function byDue(a: Action, b: Action): number {
  return dueCmp(a, b, 'asc');
}

function byCreatedDesc(a: Action, b: Action): number {
  return (b.created_at ?? '').localeCompare(a.created_at ?? '');
}

/**
 * A final tiebreak on id, so two steps added in the same batch (onboarding
 * inserts seven at once, sharing a timestamp) always land in the same order.
 * Without it the list can reshuffle between renders for no visible reason.
 */
function byId(a: Action, b: Action): number {
  return a.id.localeCompare(b.id);
}

/**
 * The comparator for a field in a direction.
 *
 * Only the PRIMARY key follows `dir`; the tiebreaks (priority, then newest,
 * then id) stay in a fixed orientation so equal-keyed steps keep one stable
 * order whichever way the primary points. Onboarding inserts seven steps
 * sharing a `created_at`; without the fixed `byId` floor the list would
 * reshuffle between renders, and reversing the tiebreaks too would make
 * "reverse" mean two different things depending on how deep the tie ran.
 */
function comparatorFor(field: ActionSortField, dir: SortDir): (a: Action, b: Action) => number {
  switch (field) {
    case 'due_date':
      return (a, b) =>
        dueCmp(a, b, dir) || rank(a.priority) - rank(b.priority) || byCreatedDesc(a, b) || byId(a, b);
    case 'priority': {
      // `desc` = most urgent first (rank 0 = urgent); `asc` = least urgent first.
      const sign = dir === 'desc' ? 1 : -1;
      return (a, b) => sign * (rank(a.priority) - rank(b.priority)) || byCreatedDesc(a, b) || byId(a, b);
    }
    case 'created': {
      // `desc` = newest first; `asc` = oldest first.
      const sign = dir === 'desc' ? 1 : -1;
      return (a, b) => sign * byCreatedDesc(a, b) || byId(a, b);
    }
    case 'smart':
    default:
      // The order the plan has always shipped — priority, then soonest
      // deadline, then newest, then id. `dir` is ignored: it is one canonical
      // ordering, not a reversible axis.
      return (a, b) => rank(a.priority) - rank(b.priority) || byDue(a, b) || byCreatedDesc(a, b) || byId(a, b);
  }
}

/**
 * Order the plan. Returns a NEW array of the SAME action objects — see the
 * identity invariant at the top of this file. `dir` defaults to the field's
 * natural direction (soonest / most urgent / newest first).
 */
export function sortActions(
  actions: Action[],
  field: ActionSortField = 'smart',
  dir: SortDir = DEFAULT_DIR[field] ?? 'desc'
): Action[] {
  return [...actions].sort(comparatorFor(field, dir));
}

// ─── Filtering ──────────────────────────────────────────────────────────────

function matchesDue(action: Action, filter: DueFilter, now: number): boolean {
  if (filter === 'any') return true;
  const days = daysFromToday(action.due_date, now);
  switch (filter) {
    case 'no_date':
      return days === null;
    case 'has_date':
      return days !== null;
    case 'overdue':
      // A step already finished is not overdue, however old its deadline —
      // "3 overdue" that counts things a parent has done is worse than no
      // count at all.
      return days !== null && days < 0 && action.status !== 'completed';
    case 'next7':
      return days !== null && days >= 0 && days <= 7;
    default:
      return true;
  }
}

function matchesCreated(action: Action, filter: CreatedFilter, now: number): boolean {
  if (filter === 'any') return true;
  const days = daysFromToday(action.created_at, now);
  // An unparsable stamp is never claimed to be recent — the same rule
  // `actionFreshness.isNewlyAdded` follows.
  if (days === null) return filter === 'older';
  const age = -days;
  if (filter === 'last7') return age <= 7;
  if (filter === 'last30') return age <= 30;
  return age > 30;
}

/**
 * Narrow the plan to what the parent asked for. Returns a NEW array of the
 * SAME action objects.
 */
export function filterActions(
  actions: Action[],
  filters: ActionFilters = NO_FILTERS,
  now: number = Date.now()
): Action[] {
  const { priorities, due, created } = filters;
  const wantPriority = priorities.length > 0 ? new Set(priorities) : null;
  return actions.filter(
    (a) =>
      (!wantPriority || wantPriority.has(a.priority)) &&
      matchesDue(a, due, now) &&
      matchesCreated(a, created, now)
  );
}

/**
 * How many filter dimensions are narrowing the list — the number on the
 * "Filters" button, and the signal that the plan is showing a subset.
 */
export function activeFilterCount(filters: ActionFilters = NO_FILTERS): number {
  return (
    (filters.priorities.length > 0 ? 1 : 0) +
    (filters.due !== 'any' ? 1 : 0) +
    (filters.created !== 'any' ? 1 : 0)
  );
}

/** Is anything narrowing the list right now? */
export function hasActiveFilters(filters: ActionFilters = NO_FILTERS): boolean {
  return activeFilterCount(filters) > 0;
}

// ─── Labels ─────────────────────────────────────────────────────────────────

type Locale = 'en' | 'es' | 'vi';

/**
 * Sort field names. Deliberately avoids the word "Added": the list card renders
 * "Added Aug 18" on every row, and a sort chip carrying the same word makes
 * every text query for the added-date line ambiguous — so the created-date
 * field is "Created", not "Date added". Direction (newest / oldest) is carried
 * by the arrow and the spoken `sortDirLabel`, not the chip's name.
 */
const SORT_LABELS: Record<Locale, Record<ActionSortField, string>> = {
  en: { smart: 'Suggested', due_date: 'Due date', priority: 'Priority', created: 'Created' },
  es: { smart: 'Sugerido', due_date: 'Fecha límite', priority: 'Prioridad', created: 'Creación' },
  vi: { smart: 'Đề xuất', due_date: 'Hạn chót', priority: 'Ưu tiên', created: 'Ngày tạo' },
};

export function sortLabel(field: ActionSortField, locale: Locale = 'en'): string {
  return (SORT_LABELS[locale] ?? SORT_LABELS.en)[field];
}

/**
 * The human phrase for a field in a direction — spoken to a screen reader, so
 * the bare ↑/↓ arrow (whose "up" means a different thing per field) never has
 * to carry the meaning alone. Empty for `smart`, which has no direction.
 */
const DIR_LABELS: Record<Locale, Record<Exclude<ActionSortField, 'smart'>, Record<SortDir, string>>> = {
  en: {
    due_date: { asc: 'soonest first', desc: 'latest first' },
    priority: { desc: 'most urgent first', asc: 'least urgent first' },
    created: { desc: 'newest first', asc: 'oldest first' },
  },
  es: {
    due_date: { asc: 'primero la más próxima', desc: 'primero la más lejana' },
    priority: { desc: 'más urgente primero', asc: 'menos urgente primero' },
    created: { desc: 'más recientes primero', asc: 'más antiguos primero' },
  },
  vi: {
    due_date: { asc: 'gần nhất trước', desc: 'xa nhất trước' },
    priority: { desc: 'khẩn cấp nhất trước', asc: 'ít khẩn cấp nhất trước' },
    created: { desc: 'mới nhất trước', asc: 'cũ nhất trước' },
  },
};

export function sortDirLabel(field: ActionSortField, dir: SortDir, locale: Locale = 'en'): string {
  if (field === 'smart') return '';
  return (DIR_LABELS[locale] ?? DIR_LABELS.en)[field][dir];
}

/** The arrow a chip shows: ascending points up, descending points down. */
export function sortDirArrow(dir: SortDir): string {
  return dir === 'asc' ? '↑' : '↓';
}

const DUE_LABELS: Record<Locale, Record<DueFilter, string>> = {
  en: {
    any: 'Any',
    overdue: 'Overdue',
    next7: 'Next 7 days',
    has_date: 'Has a date',
    no_date: 'No date',
  },
  es: {
    any: 'Cualquiera',
    overdue: 'Vencido',
    next7: 'Próximos 7 días',
    has_date: 'Con fecha',
    no_date: 'Sin fecha',
  },
  vi: {
    any: 'Bất kỳ',
    overdue: 'Quá hạn',
    next7: '7 ngày tới',
    has_date: 'Có hạn',
    no_date: 'Không có hạn',
  },
};

export function dueFilterLabel(f: DueFilter, locale: Locale = 'en'): string {
  return (DUE_LABELS[locale] ?? DUE_LABELS.en)[f];
}

const CREATED_LABELS: Record<Locale, Record<CreatedFilter, string>> = {
  en: { any: 'Any', last7: 'Last 7 days', last30: 'Last 30 days', older: 'Over 30 days' },
  es: {
    any: 'Cualquiera',
    last7: 'Últimos 7 días',
    last30: 'Últimos 30 días',
    older: 'Más de 30 días',
  },
  vi: { any: 'Bất kỳ', last7: '7 ngày qua', last30: '30 ngày qua', older: 'Hơn 30 ngày' },
};

export function createdFilterLabel(f: CreatedFilter, locale: Locale = 'en'): string {
  return (CREATED_LABELS[locale] ?? CREATED_LABELS.en)[f];
}

const HEADINGS: Record<Locale, { sort: string; filters: string; dateAdded: string; clear: string }> = {
  en: { sort: 'Sort', filters: 'Filters', dateAdded: 'Date added', clear: 'Clear all' },
  es: { sort: 'Orden', filters: 'Filtros', dateAdded: 'Fecha de creación', clear: 'Borrar todo' },
  vi: { sort: 'Sắp xếp', filters: 'Bộ lọc', dateAdded: 'Ngày tạo', clear: 'Xóa tất cả' },
};

export function sortUiLabel(
  which: 'sort' | 'filters' | 'dateAdded' | 'clear',
  locale: Locale = 'en'
): string {
  return (HEADINGS[locale] ?? HEADINGS.en)[which];
}
