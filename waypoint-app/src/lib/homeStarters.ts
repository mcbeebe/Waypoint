/**
 * Home search starters (owner request, Aug 31 2026 — the Home & search refresh).
 *
 * A blank search box is the hardest thing to face when you don't yet know what
 * to type. These are four tappable openers under the composer: tapping one
 * seeds the search with a real query, so a parent sees what Waypoint can do
 * before they've typed a word.
 *
 * Each `seed` is a genuine query the Home search answers with the RIGHT result
 * (an article or tool — and always the AI as a floor). Pure and trilingual so
 * parity, "no dead starter", and "the seed finds its intended article" are all
 * unit-testable; HomeScreen just renders them.
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
    },
    {
      key: 'respite',
      icon: 'bed-outline',
      label: L('Respite', 'Relevo', 'Chăm sóc thay thế'),
      // The seed is the word the FUNDING article indexes, not the label. In
      // Spanish that's "respiro" (its summary), not the more common "relevo"
      // (which the sibling-support article's summary also uses, so "relevo"
      // would open the wrong article). In Vietnamese the native phrase
      // "chăm sóc thay thế" top-resolves to the sibling article too, so the
      // seed stays "respite" — the word that reliably lands the funding guide.
      seed: L('respite', 'respiro', 'respite'),
    },
  ];
}
