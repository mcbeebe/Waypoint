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
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

interface CitationProps {
  citation: string;
  locale: FunnelLocale;
  /** Optional style override for the chip text size, to match the host. */
  fontSize?: number;
}

const STRINGS: Record<
  FunnelLocale,
  { why: string; verified: (d: string) => string; read: string; close: string }
> = {
  en: {
    why: 'Why this — the source',
    verified: (d) => `Verified ${d}`,
    read: 'Read the section',
    close: 'Close',
  },
  es: {
    why: 'Por qué — la fuente',
    verified: (d) => `Verificado ${d}`,
    read: 'Leer la sección',
    close: 'Cerrar',
  },
  vi: {
    why: 'Vì sao — nguồn',
    verified: (d) => `Đã xác minh ${d}`,
    read: 'Đọc điều luật',
    close: 'Đóng',
  },
};

/** ISO YYYY-MM-DD → "Aug 23, 2026", with no Date() so timezone can't shift it. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtISO(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const mon = MONTHS[Number(m[2]) - 1] ?? m[2];
  return `${mon} ${Number(m[3])}, ${m[1]}`;
}

export default function Citation({ citation, locale, fontSize = 11.5 }: CitationProps) {
  const source = sourceForCitation(citation);
  const [open, setOpen] = useState(false);
  const t = STRINGS[locale];

  // Unregistered: the citation still shows, but there is nothing verified to
  // open, so it is not a button.
  if (!source) {
    return (
      <View style={styles.chip}>
        <Text style={[styles.chipText, { fontSize }]}>{citation}</Text>
      </View>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.chip}
        accessibilityRole="button"
        accessibilityLabel={`${citation}. ${t.why}`}
      >
        <Ionicons name="shield-checkmark-outline" size={13} color={colors.mid} style={styles.chipIcon} />
        <Text style={[styles.chipText, { fontSize }]}>{citation}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          {/* Inner press is swallowed so a tap on the card body doesn't close it. */}
          <Pressable style={styles.sheetWrap} onPress={() => {}}>
            <SafeAreaView style={styles.sheet} edges={['bottom']}>
              <View style={styles.grabber} />
              <ScrollView contentContainerStyle={styles.body}>
                <Text style={styles.cite}>{citation}</Text>
                <Text style={styles.title}>{source.title}</Text>
                <Text style={styles.claim}>{source.claim}</Text>
                <View style={styles.verifiedRow}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={colors.sage} />
                  <Text style={styles.verified}>{t.verified(fmtISO(source.verifiedOn))}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.readBtn, pressed && styles.dim]}
                  onPress={() => Linking.openURL(source.url).catch(() => {})}
                  accessibilityRole="link"
                  accessibilityLabel={t.read}
                >
                  <Ionicons name="open-outline" size={16} color={colors.teal} />
                  <Text style={styles.readText}>{t.read}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.closeBtn, pressed && styles.dim]}
                  onPress={() => setOpen(false)}
                  accessibilityRole="button"
                >
                  <Text style={styles.closeText}>{t.close}</Text>
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
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 7,
    minHeight: 24,
  },
  chipIcon: { marginRight: 4 },
  chipText: { color: colors.mid, lineHeight: 16 },
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
  },
  body: { paddingVertical: spacing.base, gap: spacing.sm },
  cite: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    color: colors.mid,
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 7,
    fontSize: fonts.sizes.sm,
    overflow: 'hidden',
  },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.extrabold, color: colors.navy, lineHeight: 24 },
  claim: { fontSize: fonts.sizes.base, color: colors.dark, lineHeight: 21 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  verified: { fontSize: fonts.sizes.sm, color: colors.sage, fontWeight: fonts.weights.semibold as '600' },
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
  readText: { color: colors.teal, fontWeight: fonts.weights.bold as '700', fontSize: fonts.sizes.base },
  closeBtn: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.mid, fontWeight: fonts.weights.semibold as '600', fontSize: fonts.sizes.base },
  dim: { opacity: 0.6 },
});
