/**
 * Supports you can ask for (initiative 005, PR B) — the destination.
 *
 * A short, honest list of the Regional-Center-funded family supports a
 * coordinator rarely offers: sibling support, respite, camp/family recreation,
 * parent training. Each row carries the catch on its face and opens a detail
 * that ends in a draftable IPP request. Reached from the sibling Learn article
 * today; the two prominent doors (Resource Stack + Your Result) land in PR C.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFamilySupports } from '@/lib/familySupports';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

/** The framing a parent reads first — states the situation, collaborative. */
const INTRO: Record<FunnelLocale, string> = {
  en: "These aren't automatic. Each one has to connect to a need written into your child's IPP — so the ask starts by getting it into the plan. Tap one to see how.",
  es: 'No son automáticos. Cada uno tiene que conectarse con una necesidad escrita en el IPP de su hijo — así que el pedido empieza por incluirlo en el plan. Toque uno para ver cómo.',
  vi: 'Chúng không tự động. Mỗi hỗ trợ phải gắn với một nhu cầu được ghi trong IPP của con quý vị — nên hãy bắt đầu bằng việc đưa nó vào kế hoạch. Nhấn một mục để xem cách làm.',
};
/** The little chip on each row — the mechanic, in three words. */
const CATCH_CHIP: Record<FunnelLocale, string> = {
  en: 'Tie to an IPP need',
  es: 'Ligar a una necesidad del IPP',
  vi: 'Gắn với nhu cầu trong IPP',
};
/** A footer link to the broader funding guide, for breadth. */
const FUNDING_LINK: Record<FunnelLocale, string> = {
  en: 'See the full RC funding guide',
  es: 'Ver la guía completa de financiamiento del CR',
  vi: 'Xem hướng dẫn tài trợ TTKV đầy đủ',
};

export default function AskForSupportsScreen() {
  const navigation = useNavigation();
  const { locale } = useI18n();
  const fl = toFunnelLocale(locale);
  const supports = getFamilySupports(fl);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>{INTRO[fl]}</Text>

        {supports.map((s) => (
          <Pressable
            key={s.key}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => (navigation as any).navigate('SupportDetail', { supportKey: s.key })}
            accessibilityRole="button"
            accessibilityLabel={`${s.name}. ${s.tagline}`}
          >
            <View style={styles.icon}>
              <Ionicons name={s.icon as any} size={20} color={colors.teal} />
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{s.name}</Text>
              <Text style={styles.tagline}>{s.tagline}</Text>
              <View style={styles.catchChip}>
                <Text style={styles.catchChipText}>{CATCH_CHIP[fl]}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.mid} />
          </Pressable>
        ))}

        <Pressable
          style={({ pressed }) => [styles.fundingLink, pressed && styles.rowPressed]}
          onPress={() => (navigation as any).navigate('Reimbursables')}
          accessibilityRole="button"
          accessibilityLabel={FUNDING_LINK[fl]}
        >
          <Ionicons name="list-outline" size={16} color={colors.teal} />
          <Text style={styles.fundingLinkText}>{FUNDING_LINK[fl]}</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.mid} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  intro: {
    fontSize: fonts.sizes.md,
    color: colors.dark,
    lineHeight: fonts.sizes.md * 1.5,
    backgroundColor: semantic.infoBg,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: MIN_TOUCH_TARGET,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  rowPressed: { backgroundColor: '#F8FAFC' },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radii.sm,
    backgroundColor: '#EFF9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  name: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  tagline: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    marginTop: 2,
    lineHeight: fonts.sizes.sm * 1.45,
  },
  catchChip: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: semantic.warningBg,
    borderRadius: radii.sm,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  catchChipText: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold as '700',
    color: semantic.warning,
  },
  fundingLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  fundingLinkText: {
    flex: 1,
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
  },
});
