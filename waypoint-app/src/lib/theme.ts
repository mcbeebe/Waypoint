// Design tokens from Waypoint mockups
export const colors = {
  navy: '#1B2A4A',
  teal: '#0891B2',
  coral: '#F97316',
  sage: '#10B981',
  dark: '#334155',
  mid: '#64748B',
  light: '#F8FAFC',
  white: '#FFFFFF',
  deep: '#0F172A',
  error: '#EF4444',
  warning: '#F59E0B',
  border: '#E2E8F0',
} as const;

/**
 * Semantic state colors (UX kit) — separate from the brand accent so
 * good/warning/critical states read consistently across every screen.
 * Each state has a foreground and a tinted background.
 */
export const semantic = {
  success: '#0E9F6E',
  successBg: '#E6F7F1',
  warning: '#B45309',
  warningBg: '#FDF3E3',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  info: '#2563EB',
  infoBg: '#EFF6FF',
} as const;

export const fonts = {
  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    base: 15,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
  },
  weights: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/**
 * Warm brand refresh (initiative 006 — owner-approved Aug 31 2026).
 *
 * ADDITIVE by design: the legacy `colors`/`semantic` above are untouched, so
 * screens migrate to the warm system ONE PR at a time (a big-bang recolor is
 * the failure mode the initiative guards against). New and migrated surfaces
 * read from `brand`.
 *
 * The palette came out of a hard audience critique (a stressed 45-yo caregiver
 * on her phone at 11pm): warm PAPER ground instead of the cold blue-gray,
 * navy used as INK only (no wall-to-wall dark chrome that reads
 * "insurance portal"), a deep PINE-TEAL for anything you tap, SAGE for
 * progress, and coral reserved strictly for true urgency.
 *
 * Roles — apply by rule, not taste:
 *   ink        every piece of text
 *   pine       interactive: buttons, links, the Ask bar
 *   sage       progress / positive / "you're moving forward"
 *   urgent     genuine urgency only (a blown statutory clock) — never decoration
 *   paper      the app background; panel = cards
 *
 * Contrast is a hard gate (the critique found real AA failures in the old
 * palette): pine/sageInk/urgent/ink all clear WCAG AA (≥4.5:1) as text or as a
 * button fill under white. `theme.test.ts` pins this so a future tweak can't
 * quietly regress it.
 */
export const brand = {
  paper: '#F5F1E9',
  headerTop: '#FBF6EC', // top of the light header gradient
  panel: '#FFFFFF',
  ink: '#22303A', // all text
  inkSoft: '#55606B', // secondary text (AA on paper/panel)
  inkFaint: '#6D6555', // meta text — AA on paper AND panel, unlike the old #94A3B8
  border: '#EAE3D5',
  borderStrong: '#E2D8C4',
  pine: '#0F766E', // primary action; white text on it clears AA
  pineDeep: '#115E56', // pressed / hover
  pineTint: '#E6F1EF',
  sage: '#0E9E6E', // progress fills
  sageInk: '#047857', // sage used as TEXT (fills fail as text, this passes)
  sageTint: '#E7F5EE',
  urgent: '#C2410C',
  urgentTint: '#FBEADD',
} as const;

/**
 * Brand type pairing (006): a warm serif for the human moments, a friendly,
 * highly-legible humanist sans for everything else — replacing the trendy
 * Bricolage / government-issue Public Sans the critique flagged. The families
 * are loaded at the app root; these are the RESOLVED family names per platform
 * (native needs the exact loaded face; web takes a CSS stack with a
 * metric-close fallback so PDF/no-font-load still reads right).
 */
export const brandType = {
  displayFamily: 'Newsreader',
  bodyFamily: 'Hanken Grotesk',
  displayFallback: 'Georgia, serif',
  bodyFallback: 'system-ui, sans-serif',
} as const;
