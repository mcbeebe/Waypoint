/**
 * Eligibility Result (PRD W-B: B1) — onboarding ends in an answer, not a
 * profile: what this child likely qualifies for, what each item rests on,
 * and one clear next step. The post-onboarding reveal opens here.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { deriveEligibility, ageFromDob, toFunnelLocale } from '@/lib/eligibility';
import type { EligibilityStatus, FunnelLocale } from '@/lib/eligibility';
import { sdpAvailable } from '@/lib/processMap';
import { trackFunnelStep } from '@/lib/analytics';
import { useI18n } from '@/i18n';
import { colors, brand, semantic, fonts, spacing, radii } from '@/lib/theme';

/** Screen chrome in EN/ES/VI. */
const STRINGS: Record<FunnelLocale, {
  eyebrow: string;
  heroTitle: (name: string, count: number) => string;
  heroSub: (rc: string | null | undefined) => string;
  reviewed: string;
  trustLead: string;
  trustBody: string;
  ctaOffer: string;
  ctaMap: string;
  footerNote: string;
  yourChild: string;
  familyLink: string;
}> = {
  en: {
    eyebrow: 'YOUR RESULT',
    heroTitle: (name, count) =>
      `${name} may qualify for ${count} ${count === 1 ? 'thing' : 'things'} worth pursuing`,
    heroSub: (rc) =>
      `Based on what you told us${rc ? ` — served by ${rc}` : ''}. Every item cites the rule it comes from and the date we last checked it.`,
    reviewed: 'reviewed',
    trustLead: 'Why you can trust this. ',
    trustBody:
      'Nothing here is a guess — and when something depends on facts we don’t have (like income), we say "needs review" instead of promising.',
    ctaOffer: 'See how to get these — free help',
    ctaMap: 'See how to get these →',
    footerNote: 'Free. No card. We never sell your data.',
    yourChild: 'Your child',
    familyLink: 'See the family supports you can ask for →',
  },
  es: {
    eyebrow: 'SU RESULTADO',
    heroTitle: (name, count) =>
      `${name} podría calificar para ${count} ${count === 1 ? 'programa que vale la pena' : 'programas que valen la pena'}`,
    heroSub: (rc) =>
      `Basado en lo que nos contó${rc ? ` — atendido por ${rc}` : ''}. Cada punto cita la regla de la que proviene y la fecha en que la verificamos por última vez.`,
    reviewed: 'revisado',
    trustLead: 'Por qué puede confiar en esto. ',
    trustBody:
      'Nada aquí es una suposición — y cuando algo depende de datos que no tenemos (como los ingresos), decimos "requiere revisión" en lugar de prometer.',
    ctaOffer: 'Vea cómo obtenerlos — ayuda gratuita',
    ctaMap: 'Vea cómo obtenerlos →',
    footerNote: 'Gratis. Sin tarjeta. Nunca vendemos sus datos.',
    yourChild: 'Su hijo/a',
    familyLink: 'Vea los apoyos familiares que puede pedir →',
  },
  vi: {
    eyebrow: 'KẾT QUẢ CỦA QUÝ VỊ',
    heroTitle: (name, count) =>
      `${name} có thể đủ điều kiện cho ${count} chương trình đáng theo đuổi`,
    heroSub: (rc) =>
      `Dựa trên những gì quý vị cho biết${rc ? ` — được phục vụ bởi ${rc}` : ''}. Mỗi mục đều ghi rõ quy định làm căn cứ và ngày chúng tôi kiểm tra lần cuối.`,
    reviewed: 'đã kiểm tra',
    trustLead: 'Vì sao quý vị có thể tin điều này. ',
    trustBody:
      'Không có gì ở đây là phỏng đoán — và khi điều gì phụ thuộc vào thông tin chúng tôi chưa có (như thu nhập), chúng tôi ghi "cần xem xét" thay vì hứa hẹn.',
    ctaOffer: 'Xem cách nhận các quyền lợi này — trợ giúp miễn phí',
    ctaMap: 'Xem cách nhận các quyền lợi này →',
    footerNote: 'Miễn phí. Không cần thẻ. Chúng tôi không bao giờ bán dữ liệu của quý vị.',
    yourChild: 'Con quý vị',
    familyLink: 'Xem các hỗ trợ gia đình quý vị có thể đề nghị →',
  },
};

const STATUS_STYLE: Record<EligibilityStatus, { bg: string; fg: string; border: string }> = {
  enrolled: { bg: semantic.successBg, fg: semantic.success, border: semantic.success },
  likely: { bg: semantic.successBg, fg: semantic.success, border: semantic.success },
  review: { bg: semantic.warningBg, fg: semantic.warning, border: semantic.warning },
  later: { bg: brand.paper, fg: brand.inkFaint, border: brand.border },
};

export default function EligibilityResultScreen() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const child = children[0];
  const { diagnoses } = useDiagnoses(child?.id);
  const { locale } = useI18n();
  const funnelLocale: FunnelLocale = toFunnelLocale(locale);
  const S = STRINGS[funnelLocale];

  const result = useMemo(
    () =>
      deriveEligibility(
        {
          ageYears: ageFromDob(child?.date_of_birth),
          rcStatus: child?.rc_status,
          iepStatus: child?.iep_status,
          hasDiagnosis: diagnoses.length > 0,
        },
        funnelLocale
      ),
    [child?.date_of_birth, child?.rc_status, child?.iep_status, diagnoses.length, funnelLocale]
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

  const childName = child?.first_name || S.yourChild;
  const offerAvailable = sdpAvailable(child?.rc_status);

  return (
    <View style={styles.root}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEyebrow}>{S.eyebrow}</Text>
          <Text style={styles.heroTitle}>{S.heroTitle(childName, result.likelyCount)}</Text>
          <Text style={styles.heroSub}>{S.heroSub(family?.regional_center)}</Text>
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
                ⓘ {card.citation} · {S.reviewed} {card.reviewedOn}
              </Text>
              {/* The RC card names "family services" — make them reachable: the
                  tier of supports a family has to ask for (initiative 005-C).
                  Only when enrolled: the destination presupposes an IPP to write
                  the need into, so a not-yet-client (likely/review) doesn't see
                  a door to a screen that assumes standing they don't have. */}
              {card.key === 'regional_center' && card.status === 'enrolled' && (
                <Pressable
                  style={({ pressed }) => [styles.familyLink, pressed && { opacity: 0.6 }]}
                  onPress={() => (navigation as any).navigate('AskForSupports')}
                  accessibilityRole="button"
                  accessibilityLabel={S.familyLink}
                >
                  <Text style={styles.familyLinkText}>{S.familyLink}</Text>
                </Pressable>
              )}
            </View>
          );
        })}

        <View style={styles.trust}>
          <Text style={styles.trustText}>
            <Text style={styles.trustLead}>{S.trustLead}</Text>
            {S.trustBody}
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
          <Text style={styles.ctaText}>{offerAvailable ? S.ctaOffer : S.ctaMap}</Text>
        </Pressable>
        <Text style={styles.footerNote}>{S.footerNote}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: brand.paper },
  container: { flex: 1, backgroundColor: brand.paper },
  content: { padding: spacing.base, paddingBottom: spacing.base },
  // Warm light header card (was a dark navy hero — the "no dark portal band"
  // rule): cream ground, pine eyebrow, ink headline.
  hero: {
    backgroundColor: brand.headerTop,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  heroEyebrow: {
    color: brand.pine,
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: brand.ink,
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.extrabold,
    lineHeight: 30,
  },
  heroSub: { color: brand.inkFaint, fontSize: fonts.sizes.md, marginTop: spacing.sm, lineHeight: 20 },
  card: {
    backgroundColor: brand.panel,
    borderWidth: 1,
    borderColor: brand.border,
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
    color: brand.ink,
  },
  badge: { borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  badgeText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold },
  cardBody: { marginTop: spacing.sm, fontSize: fonts.sizes.md, color: brand.inkSoft, lineHeight: 20 },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  factLabel: { fontSize: fonts.sizes.sm, color: brand.inkFaint },
  factValue: {
    flexShrink: 1,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold,
    color: brand.ink,
    textAlign: 'right',
  },
  citation: { marginTop: spacing.sm, fontSize: fonts.sizes.xs, color: brand.inkFaint },
  familyLink: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: brand.border,
    minHeight: 32,
    justifyContent: 'center',
  },
  familyLinkText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold as '700',
    color: brand.pine,
  },
  trust: { backgroundColor: semantic.infoBg, borderRadius: radii.md, padding: spacing.base },
  trustText: { color: brand.inkSoft, fontSize: fonts.sizes.sm, lineHeight: 19 },
  trustLead: { fontWeight: fonts.weights.bold, color: semantic.info },
  footer: {
    padding: spacing.base,
    paddingBottom: spacing.lg,
    backgroundColor: brand.paper,
    borderTopWidth: 1,
    borderTopColor: brand.border,
  },
  cta: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: brand.pine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  footerNote: {
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: fonts.sizes.sm,
    color: brand.inkFaint,
  },
});
