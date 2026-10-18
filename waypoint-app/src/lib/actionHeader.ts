/**
 * The copy on `ActionDetailScreen`'s own in-body header controls — Edit, the
 * email and share icons, and the text-size pill — said, and said aloud.
 *
 * ── Why these four were English in a trilingual app ────────────────────────
 * The header is the oldest part of the screen (Sprint 3), written before this
 * app had an `i18n` provider at all, and it is the one strip a parent cannot
 * scroll past: the way out, the way to edit, the two ways to send it on, and
 * the control that makes the whole screen legible. Everything BELOW it was
 * translated as the screen grew — `actionMeta`, `actionAsk`,
 * `actionFreshness` — so a Spanish-reading parent met a fully Spanish action
 * under an English bar. The `/adversary` pass on PR #341 verified it on the
 * one control that PR was about.
 *
 * The accessibility labels are in here too, and not only the visible words,
 * because a label is copy: an English `accessibilityLabel` on a Spanish
 * screen is read out in English by a Spanish VoiceOver voice, which is worse
 * than the visible text being English — the parent cannot even see the word
 * to guess at it.
 *
 * ── Why "Aa 100%" is not in here ───────────────────────────────────────────
 * The text-size pill's visible label is `Aa` plus a number: two letters that
 * mean "letters" in all three languages, and the same digits. Translating it
 * would invent a difference that does not exist. Its SPOKEN label is another
 * matter, and is here.
 *
 * Pure — no react-native, no navigation — so it lives in the `logic` vitest
 * project and every string can be checked without rendering a screen. The
 * rendered controls are asserted separately, in `ActionDetailScreen.test.tsx`.
 */

import type { ActionLocale } from '@/lib/actionMeta';

function picker(locale: ActionLocale) {
  return <T,>(en: T, es: T, vi: T): T => (locale === 'es' ? es : locale === 'vi' ? vi : en);
}

/** The visible word on the Edit control. */
export function actionHeaderEdit(locale: ActionLocale = 'en'): string {
  return picker(locale)('Edit', 'Editar', 'Sửa');
}

/** The same control, said aloud — it names what is being edited. */
export function actionHeaderEditA11y(locale: ActionLocale = 'en'): string {
  return picker(locale)('Edit this action', 'Editar esta acción', 'Sửa việc này');
}

/**
 * The mail icon. It opens the tracked-email composer, so the label says
 * "write" — a parent who hears "Email" cannot tell whether the tap sends
 * anything, and on this screen some taps do.
 */
export function actionHeaderEmailA11y(locale: ActionLocale = 'en'): string {
  return picker(locale)(
    'Write an email about this action',
    'Escribir un correo sobre esta acción',
    'Viết email về việc này'
  );
}

/** The share icon: the native share sheet, or the clipboard on desktop web. */
export function actionHeaderShareA11y(locale: ActionLocale = 'en'): string {
  return picker(locale)(
    'Share this action with someone',
    'Compartir esta acción con alguien',
    'Chia sẻ việc này với người khác'
  );
}

/**
 * The text-size pill, said aloud at its current setting.
 *
 * "percent" is spelled out rather than left as `%` for the same reason the
 * arrow is dropped from the back label: a screen reader is being handed a
 * sentence, not a glyph. The number is passed in already rounded.
 */
export function actionHeaderTextSizeA11y(percent: number, locale: ActionLocale = 'en'): string {
  return picker(locale)(
    `Text size ${percent} percent. Tap to change.`,
    `Tamaño del texto ${percent} por ciento. Toque para cambiar.`,
    `Cỡ chữ ${percent} phần trăm. Nhấn để thay đổi.`
  );
}
