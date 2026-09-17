/**
 * A tappable citation (Roadmap/Draft-Flow-Plan.md phase 9c). Waypoint's single
 * most defensible asset — a registry of authorities, each with the claim it
 * backs and the date a human last verified it — had zero UI consumers
 * (contentSources.ts existed only for tests). This is that first consumer: a
 * legal citation stops being inert grey text and becomes a seal a parent can
 * open to see the authority, exactly what Waypoint rests on it, when it was
 * verified, and a link to read the section themselves.
 *
 * A citation with no registry entry renders as plain text — never a dead tap,
 * never a promise of provenance the registry can't keep.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { sourcesForCitation } from '@/data/contentSources';
import type { FunnelLocale } from '@/lib/eligibility';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

interface CitationProps {
  citation: string;
  locale: FunnelLocale;
  /** Chip text size — already scaled by the host, so passed straight through. */
  fontSize?: number;
  /**
   * Extra words for the chip's accessibility label — for a host that prints
   * something beside the chip that belongs to it, such as the reviewed date on
   * a result card. Spoken as part of the chip so the two never separate in the
   * swipe order; the host hides its own visible copy from assistive tech.
   */
  detail?: string;
}

const STRINGS: Record<
  FunnelLocale,
  { why: string; verified: (d: string) => string; read: string; close: string }
> = {
  en: { why: 'Why this — the source', verified: (d) => `Verified ${d}`, read: 'Read the section', close: 'Close' },
  es: { why: 'Por qué — la fuente', verified: (d) => `Verificado ${d}`, read: 'Leer la sección', close: 'Cerrar' },
  vi: { why: 'Vì sao — nguồn', verified: (d) => `Đã xác minh ${d}`, read: 'Đọc điều luật', close: 'Đóng' },
};

// Month names per locale, so the verified date localizes WITHOUT a Date() (the
// tz suite exists because Date-based formatting shipped off-by-one-day bugs).
const MONTHS: Record<FunnelLocale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  vi: ['thg 1', 'thg 2', 'thg 3', 'thg 4', 'thg 5', 'thg 6', 'thg 7', 'thg 8', 'thg 9', 'thg 10', 'thg 11', 'thg 12'],
};

/**
 * ISO YYYY-MM-DD → a localized, timezone-immune date string.
 *
 * Exported so a host printing the same date beside the chip renders it the way
 * the sheet does. EligibilityResult showed `reviewed 2026-08-23` on the card
 * and `Verified Aug 23, 2026` inside it — the same day in two notations, left
 * for the reader to reconcile.
 */
export function fmtISO(iso: string, locale: FunnelLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const year = m[1];
  const mon = MONTHS[locale][Number(m[2]) - 1] ?? m[2];
  const day = Number(m[3]);
  if (locale === 'en') return `${mon} ${day}, ${year}`;
  return `${day} ${mon} ${year}`; // es/vi read day-first
}

export default function Citation({ citation, locale, fontSize = 11.5, detail }: CitationProps) {
  const sources = sourcesForCitation(citation);
  const [open, setOpen] = useState(false);
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const t = STRINGS[locale];

  // Unregistered: the citation still shows, but there is nothing verified to
  // open, so it is not a button.
  // The chip text scales with the reader's text-size setting like everything
  // else. It did not, while the icon beside it did (sz(13)) — so at 150% the
  // shield grew and the statute it labels stayed 11.5px. Multiplied, not
  // rounded, so the default (scale 1) renders exactly as before.
  const chipFont = fontSize * scale;
  const chipLine = Math.round(chipFont * 1.4);

  if (sources.length === 0) {
    return (
      <View style={styles.chip}>
        <Text style={[styles.chipText, { fontSize: chipFont, lineHeight: chipLine }]}>
          {citation}
        </Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.chip}
        // The chip is small by design (inline with the claim). NOTE: hitSlop
        // enlarges the target on native only — react-native-web's Pressable
        // ignores it, so on web the tappable area is the chip box itself
        // (~22px tall), under the repo's 44pt minimum. Tracked for a fix that
        // does not change the chip's visual size on every screen using it.
        hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={detail ? `${citation}. ${detail}. ${t.why}` : `${citation}. ${t.why}`}
      >
        <Ionicons name="shield-checkmark-outline" size={sz(13)} color={colors.dark} style={styles.chipIcon} />
        <Text style={[styles.chipText, { fontSize: chipFont, lineHeight: chipLine }]}>
          {citation}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.scrim}>
          {/* The dismiss target sits BEHIND the sheet rather than wrapping it.
              Wrapping made the whole sheet a descendant of a button — invalid
              HTML on web, where nested interactive content is not reliably
              operable and the title and claim were swallowed into a control
              named "Close". */}
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t.close}
          />
          <View style={styles.sheetWrap}>
            <SafeAreaView style={styles.sheet} edges={['bottom']} accessibilityViewIsModal>
              <View style={styles.grabber} />
              <ScrollView contentContainerStyle={styles.body}>
                <Text style={[styles.cite, { fontSize: sz(fonts.sizes.sm) }]}>{citation}</Text>
                {sources.map((source, i) => (
                  <View key={source.key} style={i > 0 ? styles.nextAuthority : undefined}>
                    <Text style={[styles.title, { fontSize: sz(fonts.sizes.lg), lineHeight: sz(24) }]}>
                      {source.title}
                    </Text>
                    <Text style={[styles.claim, { fontSize: sz(fonts.sizes.base), lineHeight: sz(21) }]}>
                      {source.claim}
                    </Text>
                    <View style={styles.verifiedRow}>
                      <Ionicons name="checkmark-circle-outline" size={sz(15)} color={colors.sage} />
                      <Text style={[styles.verified, { fontSize: sz(fonts.sizes.sm) }]}>
                        {t.verified(fmtISO(source.verifiedOn, locale))}
                      </Text>
                    </View>
                    <Pressable
                      style={({ pressed }) => [styles.readBtn, pressed && styles.dim]}
                      onPress={() => Linking.openURL(source.url).catch(() => {})}
                      accessibilityRole="link"
                      // Named, because a compound citation shows more than one
                      // "Read the section" and a screen reader would otherwise
                      // announce two identical links.
                      accessibilityLabel={`${t.read} — ${source.title}`}
                    >
                      <Ionicons name="open-outline" size={sz(16)} color={colors.teal} />
                      <Text style={[styles.readText, { fontSize: sz(fonts.sizes.base) }]}>{t.read}</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.dim]}
                  onPress={() => setOpen(false)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.closeText, { fontSize: sz(fonts.sizes.base) }]}>{t.close}</Text>
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  chipIcon: { marginRight: 4 },
  // colors.mid (#64748B) on this chip measured 4.344:1 — under WCAG AA's 4.5
  // floor for text this size, and a regression on the screens whose citation
  // used to sit on white (4.76:1). colors.dark clears it at 9.0:1.
  chipText: { color: colors.dark },
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
    paddingHorizontal: spacing.lg,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: spacing.sm },
  body: { paddingVertical: spacing.base, gap: spacing.sm },
  cite: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    color: colors.dark,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
    overflow: 'hidden',
  },
  title: { fontWeight: fonts.weights.extrabold, color: colors.navy },
  claim: { color: colors.dark },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  // A compound citation names several authorities; each gets its own block so
  // the claim a parent reads is the one the section they tap actually makes.
  nextAuthority: {
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  verified: { color: colors.sage, fontWeight: fonts.weights.semibold as '600' },
  readBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  readText: { color: colors.teal, fontWeight: fonts.weights.bold as '700' },
  closeBtn: { minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.mid, fontWeight: fonts.weights.semibold as '600' },
  dim: { opacity: 0.6 },
});
