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
