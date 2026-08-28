/**
 * Escalation Ladder — the four rungs when Regional Center services aren't
 * working (Process Map Depth plan, Aug 2026). Collaborative first, firmer
 * only as rungs go unanswered; each rung's letter builds the record the
 * next rung needs. Rung data lives in lib/escalationLadder.ts.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getEscalationRungs } from '@/lib/escalationLadder';
import type { RungTone } from '@/lib/escalationLadder';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const OCRA_URL =
  'https://www.disabilityrightsca.org/what-we-do/programs/office-of-clients-rights-advocacy-ocra';

const STRINGS: Record<FunnelLocale, {
  title: string;
  subtitle: string;
  why: string;
  ocraCta: string;
  toneEyebrow: string;
}> = {
  en: {
    title: 'The escalation ladder',
    subtitle:
      'Climb one rung at a time — each rung creates the paper trail the next rung needs, and every rung has a one-tap letter. It starts friendly and collaborative; the tone firms up only when a rung goes unanswered.',
    why:
      "Why a ladder, not a list: order matters twice over. The paper trail — rung 1's written record is rung 2's evidence, and rung 2's Notice of Action is what an advocate at rung 4 works with. And the relationship — your coordinator is a years-long partner. Starting collaborative keeps the door open, and makes your record look reasonable if you ever do have to climb.",
    ocraCta: 'Find your OCRA advocate',
    toneEyebrow: 'TONE',
  },
  es: {
    title: 'La escalera de escalamiento',
    subtitle:
      'Suba un peldaño a la vez — cada peldaño crea el expediente que el siguiente necesita, y cada peldaño tiene una carta de un toque. Empieza amistoso y colaborativo; el tono se endurece solo cuando un peldaño queda sin respuesta.',
    why:
      'Por qué una escalera y no una lista: el orden importa dos veces. El expediente — el registro escrito del peldaño 1 es la evidencia del peldaño 2, y la Notificación de Acción del peldaño 2 es con lo que trabaja un defensor en el peldaño 4. Y la relación — su coordinador/a es un aliado de años. Empezar colaborativo mantiene la puerta abierta, y hace que su expediente se vea razonable si alguna vez tiene que escalar.',
    ocraCta: 'Encuentre a su defensor de OCRA',
    toneEyebrow: 'TONO',
  },
  vi: {
    title: 'Nấc thang leo thang',
    subtitle:
      'Leo từng nấc một — mỗi nấc tạo hồ sơ mà nấc kế tiếp cần, và mỗi nấc có lá thư soạn sẵn một chạm. Bắt đầu thân thiện và hợp tác; giọng điệu chỉ cứng rắn dần khi một nấc không được hồi đáp.',
    why:
      'Vì sao là nấc thang, không phải danh sách: thứ tự quan trọng gấp đôi. Hồ sơ — văn bản của nấc 1 là bằng chứng cho nấc 2, và Thông báo Hành động của nấc 2 là thứ người bênh vực ở nấc 4 dùng để làm việc. Và mối quan hệ — điều phối viên là đồng hành nhiều năm. Bắt đầu hợp tác giữ cánh cửa mở, và làm hồ sơ của quý vị trông hợp lý nếu có lúc phải leo thang.',
    ocraCta: 'Tìm người bênh vực OCRA của quý vị',
    toneEyebrow: 'GIỌNG ĐIỆU',
  },
};

const TONE_STYLE: Record<RungTone, { bg: string; fg: string }> = {
  collaborative: { bg: semantic.successBg, fg: semantic.success },
  firm: { bg: semantic.infoBg, fg: colors.teal },
  formal: { bg: semantic.warningBg, fg: semantic.warning },
  advocate: { bg: semantic.successBg, fg: semantic.success },
};

export default function EscalationLadderScreen() {
  const navigation = useNavigation();
  const { locale } = useI18n();
  const funnelLocale: FunnelLocale = toFunnelLocale(locale);
  const S = STRINGS[funnelLocale];
  const rungs = getEscalationRungs(funnelLocale);

  const openLetter = (template: string) => {
    (navigation as any).navigate('Letters', { template });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{S.title}</Text>
      <Text style={styles.subtitle}>{S.subtitle}</Text>

      {rungs.map((rung, i) => {
        const tone = TONE_STYLE[rung.tone];
        const first = i === 0;
        return (
          <View key={rung.key} style={styles.rungRow}>
            <View style={styles.railCol}>
              <View style={[styles.rungDot, first && styles.rungDotFirst]}>
                <Text style={[styles.rungDotText, first && styles.rungDotTextFirst]}>
                  {rung.n}
                </Text>
              </View>
              {i < rungs.length - 1 && <View style={styles.rail} />}
            </View>
            <View style={[styles.card, first && styles.cardFirst]}>
              <Text style={styles.cardTitle}>{rung.title}</Text>
              <View style={[styles.toneChip, { backgroundColor: tone.bg }]}>
                <Text style={[styles.toneChipText, { color: tone.fg }]}>
                  {S.toneEyebrow} · {rung.toneLabel.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.cardBody}>{rung.body}</Text>
              <View style={styles.clockChip}>
                <Text style={styles.clockChipText}>⏱ {rung.clock}</Text>
              </View>
              {rung.leverTemplate ? (
                <Pressable
                  style={[styles.lever, first && styles.leverPrimary]}
                  onPress={() => openLetter(rung.leverTemplate!)}
                  accessibilityRole="button"
                  accessibilityLabel={rung.leverLabel ?? undefined}
                >
                  <Text style={[styles.leverText, first && styles.leverTextPrimary]}>
                    {first ? '🤝' : '✉️'} {rung.leverLabel}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.lever, styles.leverAdvocate]}
                  onPress={() => Linking.openURL(OCRA_URL)}
                  accessibilityRole="button"
                  accessibilityLabel={S.ocraCta}
                >
                  <Text style={[styles.leverText, styles.leverTextAdvocate]}>
                    📞 {S.ocraCta}
                  </Text>
                </Pressable>
              )}
              <Text style={styles.citation}>ⓘ {rung.citation}</Text>
            </View>
          </View>
        );
      })}

      <View style={styles.why}>
        <Text style={styles.whyText}>{S.why}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.base,
    fontSize: fonts.sizes.md,
    color: colors.mid,
    lineHeight: 20,
  },
  rungRow: { flexDirection: 'row', gap: spacing.md },
  railCol: { alignItems: 'center', width: 30 },
  rungDot: {
    width: 30,
    height: 30,
    borderRadius: radii.full,
    borderWidth: 2,
    borderColor: colors.teal,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rungDotFirst: { backgroundColor: colors.teal },
  rungDotText: { color: colors.teal, fontWeight: fonts.weights.extrabold, fontSize: fonts.sizes.sm },
  rungDotTextFirst: { color: colors.white },
  rail: { width: 3, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardFirst: { borderColor: colors.teal, borderWidth: 2 },
  cardTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  toneChip: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.xs,
  },
  toneChipText: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.extrabold,
    letterSpacing: 0.5,
  },
  cardBody: {
    marginTop: spacing.sm,
    fontSize: fonts.sizes.md,
    color: colors.dark,
    lineHeight: 20,
  },
  clockChip: {
    marginTop: spacing.sm,
    backgroundColor: semantic.warningBg,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  clockChipText: { color: semantic.warning, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  lever: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  leverPrimary: { backgroundColor: colors.teal, borderColor: colors.teal },
  leverText: { fontWeight: fonts.weights.semibold, color: colors.dark, fontSize: fonts.sizes.md },
  leverTextPrimary: { color: colors.white },
  leverAdvocate: { borderColor: semantic.success },
  leverTextAdvocate: { color: semantic.success },
  citation: { marginTop: spacing.sm, fontSize: fonts.sizes.xs, color: colors.mid },
  why: {
    backgroundColor: semantic.warningBg,
    borderRadius: radii.md,
    padding: spacing.base,
    marginTop: spacing.xs,
  },
  whyText: { color: semantic.warning, fontSize: fonts.sizes.sm, lineHeight: 19 },
});
