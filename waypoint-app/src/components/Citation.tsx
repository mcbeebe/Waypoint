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
import { sourceForCitation } from '@/data/contentSources';
import type { FunnelLocale } from '@/lib/eligibility';
import { useTextScale } from '@/lib/textSize';
import { brand, fonts, spacing, radii } from '@/lib/theme';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

interface CitationProps {
  citation: string;
  locale: FunnelLocale;
  /** Chip text size — already scaled by the host, so passed straight through. */
  fontSize?: number;
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

/** ISO YYYY-MM-DD → a localized, timezone-immune date string. */
function fmtISO(iso: string, locale: FunnelLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const year = m[1];
  const mon = MONTHS[locale][Number(m[2]) - 1] ?? m[2];
  const day = Number(m[3]);
  if (locale === 'en') return `${mon} ${day}, ${year}`;
  return `${day} ${mon} ${year}`; // es/vi read day-first
}

export default function Citation({ citation, locale, fontSize = 11.5 }: CitationProps) {
  const source = sourceForCitation(citation);
  const [open, setOpen] = useState(false);
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const t = STRINGS[locale];

  // Unregistered: the citation still shows, but there is nothing verified to
  // open, so it is not a button.
  if (!source) {
    return (
      <View style={styles.chip}>
        <Text style={[styles.chipText, { fontSize, lineHeight: Math.round(fontSize * 1.4) }]}>
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
        // The chip is small by design (inline with the claim); hitSlop brings
        // the touch target to the 44pt minimum without inflating the visual.
        hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={`${citation}. ${t.why}`}
      >
        <Ionicons name="shield-checkmark-outline" size={sz(13)} color={brand.inkFaint} style={styles.chipIcon} />
        <Text style={[styles.chipText, { fontSize, lineHeight: Math.round(fontSize * 1.4) }]}>
          {citation}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel={t.close}>
          {/* Inner press is swallowed so a tap on the sheet doesn't close it. */}
          <Pressable style={styles.sheetWrap} onPress={() => {}}>
            <SafeAreaView style={styles.sheet} edges={['bottom']} accessibilityViewIsModal>
              <View style={styles.grabber} />
              <ScrollView contentContainerStyle={styles.body}>
                <Text style={[styles.cite, { fontSize: sz(fonts.sizes.sm) }]}>{citation}</Text>
                <Text style={[styles.title, { fontSize: sz(fonts.sizes.lg), lineHeight: sz(24) }]}>
                  {source.title}
                </Text>
                <Text style={[styles.claim, { fontSize: sz(fonts.sizes.base), lineHeight: sz(21) }]}>
                  {source.claim}
                </Text>
                <View style={styles.verifiedRow}>
                  <Ionicons name="checkmark-circle-outline" size={sz(15)} color={brand.sageInk} />
                  <Text style={[styles.verified, { fontSize: sz(fonts.sizes.sm) }]}>
                    {t.verified(fmtISO(source.verifiedOn, locale))}
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.readBtn, pressed && styles.dim]}
                  onPress={() => Linking.openURL(source.url).catch(() => {})}
                  accessibilityRole="link"
                  accessibilityLabel={t.read}
                >
                  <Ionicons name="open-outline" size={sz(16)} color={brand.pine} />
                  <Text style={[styles.readText, { fontSize: sz(fonts.sizes.base) }]}>{t.read}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.dim]}
                  onPress={() => setOpen(false)}
                  accessibilityRole="button"
                >
                  <Text style={[styles.closeText, { fontSize: sz(fonts.sizes.base) }]}>{t.close}</Text>
                </Pressable>
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: brand.pineTint,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  chipIcon: { marginRight: 4 },
  chipText: { color: brand.inkFaint },
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: brand.panel,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '85%',
    paddingHorizontal: spacing.lg,
  },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: brand.border, alignSelf: 'center', marginTop: spacing.sm },
  body: { paddingVertical: spacing.base, gap: spacing.sm },
  cite: {
    alignSelf: 'flex-start',
    backgroundColor: brand.pineTint,
    color: brand.inkFaint,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
    overflow: 'hidden',
  },
  title: { fontWeight: fonts.weights.extrabold, color: brand.ink },
  claim: { color: brand.inkSoft },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  verified: { color: brand.sageInk, fontWeight: fonts.weights.semibold as '600' },
  readBtn: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: brand.pine,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  readText: { color: brand.pine, fontWeight: fonts.weights.bold as '700' },
  closeBtn: { minHeight: MIN_TOUCH_TARGET, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: brand.inkFaint, fontWeight: fonts.weights.semibold as '600' },
  dim: { opacity: 0.6 },
});
