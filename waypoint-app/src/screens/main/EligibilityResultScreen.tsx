/**
 * Eligibility Result (PRD W-B: B1) — onboarding ends in an answer, not a
 * profile: what this child likely qualifies for, what each item rests on,
 * and one clear next step. The post-onboarding reveal opens here.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { deriveEligibility, ageFromDob } from '@/lib/eligibility';
import type { EligibilityStatus } from '@/lib/eligibility';
import { sdpAvailable } from '@/lib/processMap';
import { trackFunnelStep } from '@/lib/analytics';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const STATUS_STYLE: Record<EligibilityStatus, { bg: string; fg: string; border: string }> = {
  enrolled: { bg: semantic.successBg, fg: semantic.success, border: semantic.success },
  likely: { bg: semantic.successBg, fg: semantic.success, border: semantic.success },
  review: { bg: semantic.warningBg, fg: semantic.warning, border: semantic.warning },
  later: { bg: colors.light, fg: colors.mid, border: colors.border },
};

export default function EligibilityResultScreen() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const child = children[0];
  const { diagnoses } = useDiagnoses(child?.id);

  const result = useMemo(
    () =>
      deriveEligibility({
        ageYears: ageFromDob(child?.date_of_birth),
        rcStatus: child?.rc_status,
        iepStatus: child?.iep_status,
        hasDiagnosis: diagnoses.length > 0,
      }),
    [child?.date_of_birth, child?.rc_status, child?.iep_status, diagnoses.length]
  );

  // Funnel: fire once per mount, once family context is known (B4).
  const tracked = useRef(false);
  useEffect(() => {
    if (family?.id && !tracked.current) {
      tracked.current = true;
      trackFunnelStep(family.id, 'eligibility_result_viewed', {
        regionalCenter: family.regional_center ?? undefined,
      });
    }
  }, [family?.id, family?.regional_center]);

  const childName = child?.first_name || 'Your child';
  const offerAvailable = sdpAvailable(child?.rc_status);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>YOUR RESULT</Text>
          <Text style={styles.heroTitle}>
            {childName} may qualify for {result.likelyCount}{' '}
            {result.likelyCount === 1 ? 'thing' : 'things'} worth pursuing
          </Text>
          <Text style={styles.heroSub}>
            Based on what you told us
            {family?.regional_center ? ` — served by ${family.regional_center}` : ''}. Every
            item cites the rule it comes from and the date we last checked it.
          </Text>
        </View>

        {result.cards.map((card) => {
          const s = STATUS_STYLE[card.status];
          return (
            <View key={card.key} style={[styles.card, { borderLeftColor: s.border }]}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.fg }]}>{card.statusLabel}</Text>
                </View>
              </View>
              <Text style={styles.cardBody}>{card.body}</Text>
              {card.factLabel && (
                <View style={styles.factRow}>
                  <Text style={styles.factLabel}>{card.factLabel}</Text>
                  <Text style={styles.factValue}>{card.factValue}</Text>
                </View>
              )}
              <Text style={styles.citation}>
                ⓘ {card.citation} · reviewed {card.reviewedOn}
              </Text>
            </View>
          );
        })}

        <View style={styles.trust}>
          <Text style={styles.trustText}>
            <Text style={styles.trustLead}>Why you can trust this. </Text>
            Nothing here is a guess — and when something depends on facts we don&apos;t
            have (like income), we say &quot;needs review&quot; instead of promising.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.cta}
          onPress={() =>
            offerAvailable
              ? (navigation as any).navigate('FundedOffer')
              : (navigation as any).navigate('ProcessMap')
          }
        >
          <Text style={styles.ctaText}>
            {offerAvailable ? 'See how to get these — free help' : 'See how to get these →'}
          </Text>
        </Pressable>
        <Text style={styles.footerNote}>Free. No card. We never sell your data.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light },
  container: { flex: 1 },
  content: { padding: spacing.base, paddingBottom: spacing.base },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroEyebrow: {
    color: colors.teal,
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.extrabold,
    lineHeight: 30,
  },
  heroSub: { color: '#CBD5E1', fontSize: fonts.sizes.md, marginTop: spacing.sm, lineHeight: 20 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  badge: { borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  badgeText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  cardBody: { marginTop: spacing.sm, fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 20 },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  factLabel: { fontSize: fonts.sizes.sm, color: colors.mid },
  factValue: {
    flexShrink: 1,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
    textAlign: 'right',
  },
  citation: { marginTop: spacing.sm, fontSize: fonts.sizes.xs, color: colors.mid },
  trust: { backgroundColor: semantic.infoBg, borderRadius: radii.md, padding: spacing.base },
  trustText: { color: colors.dark, fontSize: fonts.sizes.sm, lineHeight: 19 },
  trustLead: { fontWeight: fonts.weights.bold, color: semantic.info },
  footer: {
    padding: spacing.base,
    paddingBottom: spacing.lg,
    backgroundColor: colors.light,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  cta: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  footerNote: {
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: fonts.sizes.sm,
    color: colors.mid,
  },
});
