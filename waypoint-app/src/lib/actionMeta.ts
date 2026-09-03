/**
 * One table for what an action's STATUS and PRIORITY are called and coloured.
 *
 * Why it exists: before this module the same two tables lived in five places
 * and had already drifted. Priority was `Med` on the list card
 * (ActionsScreen), `Medium` on the detail screen and `Medium` again in the
 * edit sheet, with three different colour sets and a fourth "urgent" hex in
 * `theme.ts` that none of them used. Status was `To Do`/`Done` on the card and
 * `Not Started`/`Completed` on the detail screen — the same action, two
 * vocabularies, depending on which screen a parent happened to be looking at.
 * Nothing pinned them to each other.
 *
 * Adding a priority picker to two more surfaces would have made five copies
 * six, so the tables are consolidated here first and pinned by
 * `actionMeta.test.ts`.
 *
 * Pure — no react-native, no I/O — so it lives in the `logic` vitest project
 * and can be imported by both screens and by the sort/filter module.
 */

import type { ActionPriority, ActionStatus } from '@/types/database';

export type ActionLocale = 'en' | 'es' | 'vi';

// ─── Status ─────────────────────────────────────────────────────────────────

/**
 * The order a parent moves through, left to right. `dismissed` is deliberately
 * last: it is an escape hatch, not a step on the path, and every control that
 * renders a compact set shows only the first three.
 */
export const STATUS_ORDER: readonly ActionStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'dismissed',
] as const;

/**
 * The three states that belong on a compact control (a list card, a segmented
 * bar). Dismissing is a deliberate act and stays behind a swipe or a secondary
 * button, so a mis-tap can never quietly remove a step from the plan.
 */
export const STATUS_PRIMARY: readonly ActionStatus[] = [
  'not_started',
  'in_progress',
  'completed',
] as const;

/**
 * Glyph and colour per status. The glyphs are the ones the card has always
 * used; the colours are the card's, which are the ones a parent sees most.
 */
export const STATUS_META: Record<
  ActionStatus,
  { glyph: string; color: string; tint: string }
> = {
  not_started: { glyph: '○', color: '#64748B', tint: '#F1F5F9' },
  in_progress: { glyph: '◐', color: '#0891B2', tint: '#E0F2FE' },
  completed: { glyph: '✓', color: '#047857', tint: '#E7F5EE' },
  dismissed: { glyph: '—', color: '#6D6555', tint: '#F1F5F9' },
};

const STATUS_LABELS: Record<ActionLocale, Record<ActionStatus, string>> = {
  en: {
    not_started: 'To Do',
    in_progress: 'In Progress',
    completed: 'Done',
    dismissed: 'Dismissed',
  },
  es: {
    not_started: 'Por hacer',
    in_progress: 'En curso',
    completed: 'Hecho',
    dismissed: 'Descartado',
  },
  vi: {
    not_started: 'Cần làm',
    in_progress: 'Đang làm',
    completed: 'Xong',
    dismissed: 'Đã bỏ',
  },
};

/** What this status is called, in the parent's language. */
export function statusLabel(status: ActionStatus, locale: ActionLocale = 'en'): string {
  return (STATUS_LABELS[locale] ?? STATUS_LABELS.en)[status];
}

/**
 * The spoken label for a status control, e.g. "Mark as In Progress".
 * Screen-reader users get the ACTION, not just the state name — a bare "Done"
 * reads as a description of the step rather than a button that changes it.
 */
export function statusActionLabel(
  status: ActionStatus,
  locale: ActionLocale = 'en'
): string {
  const name = statusLabel(status, locale);
  if (locale === 'es') return `Marcar como ${name}`;
  if (locale === 'vi') return `Đánh dấu là ${name}`;
  return `Mark as ${name}`;
}

// ─── Priority ───────────────────────────────────────────────────────────────

/** Most urgent first — the order every picker and every sort agrees on. */
export const PRIORITY_ORDER: readonly ActionPriority[] = [
  'urgent',
  'high',
  'medium',
  'low',
] as const;

/**
 * Sort rank. `agenda.ts` carries its own copy for a different shape of input;
 * `actionMeta.test.ts` pins the two to agree so they cannot drift apart.
 */
export const PRIORITY_RANK: Record<ActionPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const PRIORITY_META: Record<ActionPriority, { color: string; bg: string }> = {
  urgent: { color: '#B91C1C', bg: '#FEE2E2' },
  high: { color: '#C2410C', bg: '#FFF7ED' },
  medium: { color: '#1D4ED8', bg: '#EFF6FF' },
  low: { color: '#475569', bg: '#F1F5F9' },
};

const PRIORITY_LABELS: Record<ActionLocale, Record<ActionPriority, string>> = {
  en: { urgent: 'Urgent', high: 'High', medium: 'Medium', low: 'Low' },
  es: { urgent: 'Urgente', high: 'Alta', medium: 'Media', low: 'Baja' },
  vi: { urgent: 'Khẩn cấp', high: 'Cao', medium: 'Trung bình', low: 'Thấp' },
};

/**
 * The short form the list card's badge uses, where a full "Medium" crowds the
 * category and the calendar glyph off a narrow phone. Only `medium` differs.
 */
const PRIORITY_LABELS_SHORT: Record<ActionLocale, Partial<Record<ActionPriority, string>>> = {
  en: { medium: 'Med' },
  es: { medium: 'Media' },
  vi: { medium: 'Vừa' },
};

/** What this priority is called, in the parent's language. */
export function priorityLabel(
  priority: ActionPriority,
  locale: ActionLocale = 'en',
  short = false
): string {
  const table = PRIORITY_LABELS[locale] ?? PRIORITY_LABELS.en;
  if (short) {
    const compact = (PRIORITY_LABELS_SHORT[locale] ?? PRIORITY_LABELS_SHORT.en)[priority];
    if (compact) return compact;
  }
  return table[priority];
}

/** The spoken label for a priority control, e.g. "Set priority to High". */
export function priorityActionLabel(
  priority: ActionPriority,
  locale: ActionLocale = 'en'
): string {
  const name = priorityLabel(priority, locale);
  if (locale === 'es') return `Cambiar prioridad a ${name}`;
  if (locale === 'vi') return `Đặt mức ưu tiên thành ${name}`;
  return `Set priority to ${name}`;
}

// ─── Shared section headings ────────────────────────────────────────────────

const HEADINGS: Record<ActionLocale, { status: string; priority: string }> = {
  en: { status: 'Status', priority: 'Priority' },
  es: { status: 'Estado', priority: 'Prioridad' },
  vi: { status: 'Trạng thái', priority: 'Mức ưu tiên' },
};

/** "Status" / "Priority" as a section heading, in the parent's language. */
export function metaHeading(
  which: 'status' | 'priority',
  locale: ActionLocale = 'en'
): string {
  return (HEADINGS[locale] ?? HEADINGS.en)[which];
}
