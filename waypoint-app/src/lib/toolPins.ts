/**
 * Pinned tools (Roadmap/Home-Rebuild-Plan.md phase 4) — the toolbox a family
 * builds for itself.
 *
 * Twenty-six tools serve twenty-six different families. A parent fighting an
 * insurance denial and a parent three weeks from an IEP need different things
 * on top, and neither should have to hunt for theirs every morning. So the
 * tiles are chosen by the family, shared across the family (migration 048's
 * `families.tool_pins`), and capped — a grid of everything is the 26-tile
 * screen this redesign replaced.
 *
 * Pure — no react-native, no supabase — so the cap, the defaults, the
 * migration-safe parsing and the suggestion rule are unit-testable.
 */
import type { FunnelLocale } from '@/lib/eligibility';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

/**
 * Six is a full row on a phone and two rows on a tablet. Past that the tiles
 * stop being a shortcut and become the grid again.
 */
export const MAX_PINS = 6;

/** The three always-open action tools — what a family needs before it knows. */
export const DEFAULT_PINS = ['letters', 'requests', 'sent_received'] as const;

/** Opens before Waypoint offers to pin something. */
export const SUGGEST_AFTER = 3;

/**
 * What the column holds once a family has actually chosen.
 *
 * The column is `not null default '[]'::jsonb`, so a bare array cannot mean
 * "never chosen" — Postgres writes one into every row. This app therefore
 * writes an OBJECT, and reads a bare array as the untouched default. Without
 * that distinction the defaults were unreachable and every family — new and
 * existing — opened an empty toolbox.
 */
export interface StoredPins {
  v: 1;
  pins: string[];
}

export function encodePins(pins: string[]): StoredPins {
  return { v: 1, pins };
}

/** True once the family has made a choice — including "I removed them all". */
export function hasChosen(raw: unknown): boolean {
  return !!raw && typeof raw === 'object' && !Array.isArray(raw) &&
    Array.isArray((raw as { pins?: unknown }).pins);
}

/**
 * `families.tool_pins` is jsonb written by this app and read back through
 * PostgREST — but a hand-edited row, a failed migration, or a renamed tool
 * must not crash Home. Anything unrecognised is dropped, not guessed at.
 * Accepts both the stored object and a bare array (the column default, and
 * anything written before the object form).
 */
export function normalizePins(raw: unknown, validKeys: Iterable<string>): string[] {
  const valid = new Set(validKeys);
  const list = hasChosen(raw) ? (raw as StoredPins).pins : raw;
  if (!Array.isArray(list)) return [];
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    if (!valid.has(item)) continue;
    if (out.includes(item)) continue;
    if (out.length >= MAX_PINS) break;
    out.push(item);
  }
  return out;
}

/** The pins a family has never touched: the three action tools. */
export function defaultPins(validKeys: Iterable<string>): string[] {
  const valid = new Set(validKeys);
  return DEFAULT_PINS.filter((k) => valid.has(k));
}

export interface PinResult {
  pins: string[];
  ok: boolean;
  /** Present when the pin was refused — the UI says this out loud. */
  message?: string;
}

/**
 * Pinning is refused, never silently dropped, and never silently evicts
 * someone else's tile: a shared list where one parent's pin pushes out the
 * other's is the quiet-overwrite problem in a different costume.
 */
export function addPin(pins: string[], key: string, locale: FunnelLocale = 'en'): PinResult {
  const L = picker(locale);
  if (pins.includes(key)) return { pins, ok: true };
  if (pins.length >= MAX_PINS) {
    return {
      pins,
      ok: false,
      message: L(
        `You have ${MAX_PINS} tiles, which is the most that fit. Remove one first — nothing was changed.`,
        `Tiene ${MAX_PINS} accesos, el máximo que cabe. Quite uno primero — no se cambió nada.`,
        `Quý vị có ${MAX_PINS} ô, tối đa vừa màn hình. Hãy bỏ bớt một ô trước — chưa có gì thay đổi.`
      ),
    };
  }
  return { pins: [...pins, key], ok: true };
}

export function removePin(pins: string[], key: string): string[] {
  return pins.filter((k) => k !== key);
}

export interface SuggestInput {
  /** Tool key → how many times it has been opened on this device. */
  opens: Record<string, number>;
  pins: string[];
  /** Keys the family has already said no to. Asked once, never again. */
  declined: string[];
  validKeys: Iterable<string>;
}

/**
 * The one pin Waypoint offers: a tool opened repeatedly, never pinned, never
 * declined, and only while there is room for it. Offered in place — never as
 * a popup, and never twice for the same tool.
 *
 * Returns the most-opened qualifying key, or null. Ties break on the key so
 * the same suggestion is stable between renders.
 */
export function suggestPin(input: SuggestInput): string | null {
  if (input.pins.length >= MAX_PINS) return null;
  const valid = new Set(input.validKeys);
  const declined = new Set(input.declined);
  const candidates = Object.entries(input.opens)
    .filter(([key, count]) =>
      count >= SUGGEST_AFTER &&
      valid.has(key) &&
      !input.pins.includes(key) &&
      !declined.has(key)
    )
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  return candidates[0]?.[0] ?? null;
}

export interface PinStrings {
  heading: string;
  capHint: string;
  deviceOnly: string;
  edit: string;
  done: string;
  pin: string;
  unpin: string;
  emptyHint: string;
  suggestTitle: (label: string) => string;
  suggestBody: (label: string, opens: number) => string;
  suggestYes: string;
  suggestNo: string;
}

export function pinStrings(locale: FunnelLocale = 'en'): PinStrings {
  const L = picker(locale);
  return {
    heading: L('Pinned', 'Fijados', 'Đã ghim'),
    capHint: L(
      `Six tiles is the most that fit. Remove one to make room for another.`,
      `Seis accesos es el máximo que cabe. Quite uno para hacer sitio a otro.`,
      `Tối đa sáu ô. Hãy bỏ một ô để có chỗ cho ô khác.`
    ),
    deviceOnly: L(
      'These tiles are saved on this device only.',
      'Estos accesos están guardados solo en este dispositivo.',
      'Các ô này chỉ được lưu trên thiết bị này.'
    ),
    edit: L('Edit', 'Editar', 'Sửa'),
    done: L('Done', 'Listo', 'Xong'),
    pin: L('Pin to your tools', 'Fijar a sus herramientas', 'Ghim vào công cụ'),
    unpin: L('Remove from your tools', 'Quitar de sus herramientas', 'Bỏ khỏi công cụ'),
    // Scope stated honestly: pins follow the account across its devices.
    // They do NOT reach a co-parent yet — `useFamily` still resolves families
    // by user_id, which migration 048's own header says out loud.
    emptyHint: L(
      'Pin the tools you use most and they appear here, on every device you sign in on.',
      'Fije las herramientas que más usa y aparecerán aquí, en cada dispositivo donde inicie sesión.',
      'Ghim những công cụ quý vị dùng nhiều nhất; chúng sẽ hiện ở đây trên mọi thiết bị quý vị đăng nhập.'
    ),
    suggestTitle: (label) =>
      L(`Pin ${label}?`, `¿Fijar ${label}?`, `Ghim ${label}?`),
    suggestBody: (label, opens) =>
      L(
        `You have opened ${label} ${opens} times. Pinning puts it on top.`,
        `Ha abierto ${label} ${opens} veces. Fijarlo lo pone arriba.`,
        `Quý vị đã mở ${label} ${opens} lần. Ghim sẽ đưa nó lên đầu.`
      ),
    suggestYes: L('Pin it', 'Fijarlo', 'Ghim'),
    suggestNo: L('No thanks', 'No, gracias', 'Không, cảm ơn'),
  };
}
