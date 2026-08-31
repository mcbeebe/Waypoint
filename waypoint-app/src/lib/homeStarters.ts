/**
 * Home search starters (owner request, Aug 31 2026 — the Home & search refresh).
 *
 * A blank search box is the hardest thing to face when you don't yet know what
 * to type. These are four tappable openers under the composer: tapping one
 * seeds the search with a real query, so a parent sees what Waypoint can do
 * before they've typed a word.
 *
 * Each `seed` is a genuine query the Home search already answers (an article, a
 * guide, a tool, or — always — the AI). Pure and trilingual so parity and the
 * "no dead starter" invariant are unit-testable; HomeScreen just renders them.
 */
import type { FunnelLocale } from '@/lib/eligibility';

function picker(locale: FunnelLocale) {
  return (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
}

export interface HomeStarter {
  key: string;
  /** Ionicons name for the chip. */
  icon: string;
  /** The short chip label. */
  label: string;
  /** The query it drops into the search box. */
  seed: string;
  /**
   * True for a starter whose rich result depends on content not yet on this
   * branch (sibling support ships in initiative 005). It never dead-ends — the
   * AI answers it today — so the "every starter resolves in the library" test
   * skips only these, and they light up on their own once the content lands.
   */
  pendingContent?: boolean;
}

export function getHomeStarters(locale: FunnelLocale = 'en'): HomeStarter[] {
  const L = picker(locale);
  return [
    {
      key: 'said_no',
      icon: 'chatbubble-ellipses-outline',
      label: L('They said no', 'Dijeron que no', 'Họ từ chối'),
      seed: L('they said no', 'dijeron que no', 'họ từ chối'),
    },
    {
      key: 'read_iep',
      icon: 'document-text-outline',
      label: L('Read my IEP', 'Leer mi IEP', 'Đọc IEP của tôi'),
      seed: L('read my IEP', 'leer mi IEP', 'đọc IEP của tôi'),
    },
    {
      key: 'sibling_support',
      icon: 'people-circle-outline',
      label: L('Sibling support', 'Apoyo para hermanos', 'Hỗ trợ anh chị em'),
      seed: L('sibling support', 'apoyo para hermanos', 'hỗ trợ anh chị em'),
      pendingContent: true,
    },
    {
      key: 'respite',
      icon: 'bed-outline',
      label: L('Respite', 'Relevo', 'Chăm sóc thay thế'),
      seed: L('respite', 'relevo', 'respite'),
    },
  ];
}
