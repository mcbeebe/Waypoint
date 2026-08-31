/**
 * One support, opened up (initiative 005, PR B).
 *
 * What it is · the catch (why it isn't automatic) · how to ask (collaborative
 * steps + a sample script) · and the lever: draft the IPP request. The draft
 * CTA lands on the IPP-meeting-request letter, prefilled with the ask — PR D
 * swaps in a support-specific variant and the Request-tracker follow-up clock.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getFamilySupport, fillScript } from '@/lib/familySupports';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

const T: Record<
  FunnelLocale,
  {
    what: string;
    catch: string;
    how: string;
    scriptLabel: string;
    draft: string;
    ask: (name: string) => string;
    missing: string;
  }
> = {
  en: {
    what: 'What it is',
    catch: 'The catch',
    how: 'How to ask — start friendly',
    scriptLabel: 'You could say',
    draft: 'Draft this request for the IPP',
    ask: (name) => `Ask Waypoint about ${name.toLowerCase()}`,
    missing: 'That support isn’t available. Go back to the list.',
  },
  es: {
    what: 'Qué es',
    catch: 'El detalle',
    how: 'Cómo pedirlo — empiece con amabilidad',
    scriptLabel: 'Podría decir',
    draft: 'Redactar esta solicitud para el IPP',
    ask: (name) => `Preguntar a Waypoint sobre ${name.toLowerCase()}`,
    missing: 'Ese apoyo no está disponible. Vuelva a la lista.',
  },
  vi: {
    what: 'Đây là gì',
    catch: 'Điều cần lưu ý',
    how: 'Cách đề nghị — bắt đầu thân thiện',
    scriptLabel: 'Quý vị có thể nói',
    draft: 'Soạn yêu cầu này cho IPP',
    ask: (name) => `Hỏi Waypoint về ${name.toLowerCase()}`,
    missing: 'Hỗ trợ đó không có sẵn. Hãy quay lại danh sách.',
  },
};

export default function SupportDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const supportKey = (route.params as { supportKey?: string } | undefined)?.supportKey;
  const { locale } = useI18n();
  const fl = toFunnelLocale(locale);
  const t = T[fl];

  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  // The primary child by the house predicate (matches LettersScreen, which this
  // draft feeds), not a reliance on query ordering.
  const childName = (children.find((c) => c.is_primary) ?? children[0])?.first_name ?? null;

  const support = supportKey ? getFamilySupport(supportKey, fl) : null;

  if (!support) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.content}>
          <Text style={styles.missing} accessibilityRole="text">
            {t.missing}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const script = fillScript(support.script, childName, fl);

  // The draft lever (005-D): the support-specific "add this need to the IPP"
  // letter — collaborative, and its send opens a tracked request with a
  // follow-up clock (via sentNextFor). Seed the letter with the IPP-need hook
  // plus the parent's own script, so the ask is concrete.
  // The tracked-request title is shared tracker data, so it stays STABLE across
  // locales (English) — like the Medi-Cal deeming title — not the localized name.
  const trackName = getFamilySupport(supportKey ?? '', 'en')?.name ?? support.name;
  const draft = () =>
    (navigation as any).navigate('Letters', {
      template: 'ipp_need_request',
      question: `${support.ippNeedHook}\n\n${script}`,
      // Distinct tracked thread per support (the tracker dedups by title) —
      // a sibling-support ask and a respite ask are two requests, not one.
      trackTitle: `IPP need: ${trackName}`,
    });

  // The AI, seeded with the same ask so it opens already knowing the support.
  const ask = () =>
    (navigation as any).navigate('Navigator', {
      screen: 'NavigatorMain',
      params: { ask: script },
    });

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name={support.icon as any} size={24} color={colors.teal} />
          </View>
          <Text style={styles.title}>{support.name}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.what}</Text>
          <Text style={styles.para}>{support.whatItIs}</Text>
        </View>

        <View style={[styles.section, styles.catchSection]}>
          <Text style={[styles.label, styles.catchLabel]}>{t.catch}</Text>
          <Text style={styles.para}>{support.theCatch}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.how}</Text>
          {support.howToAsk.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
          <View style={styles.scriptBox}>
            <Text style={styles.scriptLabel}>{t.scriptLabel}</Text>
            <Text style={styles.scriptText}>“{script}”</Text>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.primaryCta, pressed && styles.primaryCtaPressed]}
          onPress={draft}
          accessibilityRole="button"
          accessibilityLabel={t.draft}
        >
          <Ionicons name="create-outline" size={18} color={colors.white} />
          <Text style={styles.primaryCtaText}>{t.draft}</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.secondaryCta, pressed && styles.secondaryCtaPressed]}
          onPress={ask}
          accessibilityRole="button"
          accessibilityLabel={t.ask(support.name)}
        >
          <Ionicons name="sparkles-outline" size={16} color={colors.teal} />
          <Text style={styles.secondaryCtaText}>{t.ask(support.name)}</Text>
        </Pressable>

        <Text style={styles.citation}>ⓘ {support.citation}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  missing: { fontSize: fonts.sizes.md, color: colors.mid },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: '#EFF9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: fonts.sizes.xl, fontWeight: fonts.weights.extrabold as '800', color: colors.navy },
  section: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  catchSection: { backgroundColor: semantic.warningBg, borderColor: '#FCD9A8' },
  label: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.extrabold as '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.teal,
    marginBottom: spacing.sm,
  },
  catchLabel: { color: semantic.warning },
  para: { fontSize: fonts.sizes.md, color: colors.dark, lineHeight: fonts.sizes.md * 1.5 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: '#E0F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.extrabold as '800', color: colors.teal },
  stepText: { flex: 1, fontSize: fonts.sizes.md, color: colors.dark, lineHeight: fonts.sizes.md * 1.4 },
  scriptBox: {
    backgroundColor: colors.light,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  scriptLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold as '700',
    color: colors.mid,
    marginBottom: 4,
  },
  scriptText: {
    fontSize: fonts.sizes.md,
    color: colors.navy,
    fontStyle: 'italic',
    lineHeight: fonts.sizes.md * 1.5,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    marginTop: spacing.xs,
  },
  primaryCtaPressed: { backgroundColor: '#0E7490' },
  primaryCtaText: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700' },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 46,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#A5F0FB',
    borderRadius: radii.md,
    marginTop: spacing.md,
  },
  secondaryCtaPressed: { backgroundColor: '#ECFEFF' },
  secondaryCtaText: { color: colors.teal, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold as '600' },
  citation: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
