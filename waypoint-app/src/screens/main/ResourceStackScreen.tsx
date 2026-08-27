/**
 * The Resource Stack (Resource-Stack plan, phase 4 — mockup Concept A):
 * all six benefit layers as a foundation diagram — secured layers solid,
 * the one next unlock highlighted with the screen's single primary CTA,
 * locked layers dashed and honest about what gates them. Teaches the
 * generic-services-first rule without prose: the order IS the strategy.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useRequests } from '@/hooks/useRequests';
import { useToast } from '@/components/Toast';
import { deriveResourceStack, MEDI_CAL_DEEMING_REQUEST_TITLE } from '@/lib/resourceStack';
import type { StackLayer, StackLayerKey } from '@/lib/resourceStack';
import { ageFromDob, toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import type { HomeStackParamList } from '@/types/navigation';
import type { Child } from '@/types/database';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const STRINGS: Record<FunnelLocale, {
  eyebrow: (name: string) => string;
  using: (n: number, total: number) => string;
  heroTitle: string;
  heroBody: string;
  buildsOn: string;
  nextUnlock: string;
  unlockCta: string;
  lockedNeeds: (layerTitle: string) => string;
  haveIt: string;
  startedIt: string;
  saveFailed: string;
  whyTitle: string;
  whyBody: string;
  yourChild: string;
}> = {
  en: {
    eyebrow: (name) => `${name.toUpperCase()}'S RESOURCE STACK`,
    using: (n, total) => `Using ${n} of ${total} layers`,
    heroTitle: 'Benefits stack. Each layer unlocks the next.',
    heroBody:
      "The layers you've secured fund the basics. California law lets an SDP spending plan buy only what's left — so the order below is strategy, not preference.",
    buildsOn: '▲ builds on',
    nextUnlock: 'Your next unlock',
    unlockCta: 'Unlock this layer →',
    lockedNeeds: (layerTitle) => `Locked — needs ${layerTitle}`,
    haveIt: 'We already have this ✓',
    startedIt: "We've started this — mark in progress",
    saveFailed: "Couldn't save that — please try again in a moment.",
    whyTitle: 'Why the order matters.',
    whyBody:
      "The SDP spending plan can't buy anything the school, Medi-Cal, or IHSS must already provide — so securing the lower layers first makes the budget go further, legally.",
    yourChild: 'Your child',
  },
  es: {
    eyebrow: (name) => `LA PILA DE RECURSOS DE ${name.toUpperCase()}`,
    using: (n, total) => `Usando ${n} de ${total} capas`,
    heroTitle: 'Los beneficios se apilan. Cada capa abre la siguiente.',
    heroBody:
      'Las capas que ya aseguró financian lo básico. La ley de California permite que un plan de gastos del SDP compre solo lo que falta — así que el orden de abajo es estrategia, no preferencia.',
    buildsOn: '▲ se apoya en',
    nextUnlock: 'Su próximo desbloqueo',
    unlockCta: 'Desbloquear esta capa →',
    lockedNeeds: (layerTitle) => `Bloqueado — necesita ${layerTitle}`,
    haveIt: 'Ya lo tenemos ✓',
    startedIt: 'Ya lo empezamos — marcar en proceso',
    saveFailed: 'No se pudo guardar — inténtelo de nuevo en un momento.',
    whyTitle: 'Por qué importa el orden.',
    whyBody:
      'El plan de gastos del SDP no puede comprar nada que la escuela, Medi-Cal o IHSS ya deban proveer — así que asegurar primero las capas de abajo hace rendir más el presupuesto, legalmente.',
    yourChild: 'Su hijo/a',
  },
  vi: {
    eyebrow: (name) => `CHỒNG QUYỀN LỢI CỦA ${name.toUpperCase()}`,
    using: (n, total) => `Đang dùng ${n} / ${total} tầng`,
    heroTitle: 'Quyền lợi xếp tầng. Mỗi tầng mở tầng kế tiếp.',
    heroBody:
      'Các tầng đã có lo phần căn bản. Luật California chỉ cho kế hoạch chi tiêu SDP mua những gì còn thiếu — nên thứ tự bên dưới là chiến lược, không phải sở thích.',
    buildsOn: '▲ dựa trên',
    nextUnlock: 'Tầng mở tiếp theo',
    unlockCta: 'Mở tầng này →',
    lockedNeeds: (layerTitle) => `Chưa mở — cần ${layerTitle}`,
    haveIt: 'Chúng tôi đã có ✓',
    startedIt: 'Chúng tôi đã bắt đầu — đánh dấu đang tiến hành',
    saveFailed: 'Không lưu được — vui lòng thử lại sau giây lát.',
    whyTitle: 'Vì sao thứ tự quan trọng.',
    whyBody:
      'Kế hoạch chi tiêu SDP không được mua thứ gì trường học, Medi-Cal hoặc IHSS phải cung cấp — nên bảo đảm các tầng dưới trước giúp ngân sách đi xa hơn, đúng luật.',
    yourChild: 'Con quý vị',
  },
};

/** Self-reported layers a family can mark as already-in-place. */
const SELF_REPORT_FIELD: Partial<Record<StackLayerKey, keyof Child>> = {
  medi_cal: 'medi_cal_status',
  ihss: 'ihss_status',
  ssi: 'ssi_status',
};

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function ResourceStackScreen() {
  const navigation = useNavigation<Nav>();
  const { family } = useFamily();
  const { children, updateChild } = useChildren(family?.id);
  const child = children[0];
  const { locale } = useI18n();
  const funnelLocale = toFunnelLocale(locale);
  const S = STRINGS[funnelLocale];
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  // An open tracked deeming request reads as applied — a sent letter must
  // show here as In progress without the family flipping anything.
  const { requests } = useRequests(family?.id);
  const mediCalRequested = useMemo(
    () =>
      requests.some(
        (r) =>
          r.title === MEDI_CAL_DEEMING_REQUEST_TITLE &&
          (r.status === 'requested' || r.status === 'in_progress' || r.status === 'granted')
      ),
    [requests]
  );

  const stack = useMemo(
    () =>
      deriveResourceStack(
        {
          ageYears: ageFromDob(child?.date_of_birth),
          rcStatus: child?.rc_status,
          iepStatus: child?.iep_status,
          mediCalStatus: child?.medi_cal_status,
          ihssStatus: child?.ihss_status,
          ssiStatus: child?.ssi_status,
          sdpStep: child?.sdp_step,
          mediCalRequested,
        },
        funnelLocale
      ),
    [child, funnelLocale, mediCalRequested]
  );

  const openLever = (layer: StackLayer) => {
    if (!layer.lever) return;
    (navigation as any).navigate(layer.lever.screen, layer.lever.params);
  };

  const markStatus = async (layer: StackLayer, status: 'active' | 'applied') => {
    const field = SELF_REPORT_FIELD[layer.key];
    if (!child || !field || saving) return;
    setSaving(true);
    try {
      const ok = await updateChild(child.id, { [field]: status });
      // A failed save must be loud — a silent no-op reads as a dead button.
      if (!ok) showToast(S.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  const titleFor = (key: StackLayerKey | null) =>
    stack.layers.find((l) => l.key === key)?.title ?? '';

  // Foundation at the bottom: render top-down from layer 6 to layer 1.
  const topDown = [...stack.layers].reverse();
  const childName = child?.first_name || S.yourChild;

  const renderLayer = (layer: StackLayer) => {
    const isNext = stack.nextUnlock?.key === layer.key;
    const locked = layer.status === 'locked';
    const later = layer.status === 'later';
    const secured = layer.status === 'secured';
    const canSelfReport =
      !!SELF_REPORT_FIELD[layer.key] && (layer.status === 'available' || layer.status === 'in_progress');
    return (
      <Pressable
        key={layer.key}
        style={[
          styles.card,
          secured && styles.cardSecured,
          layer.status === 'in_progress' && styles.cardProgress,
          locked && styles.cardLocked,
          isNext && styles.cardNext,
        ]}
        disabled={locked || later || !layer.lever}
        onPress={() => openLever(layer)}
      >
        <View style={styles.cardHead}>
          <Text style={[styles.cardTitle, (locked || later) && styles.cardTitleMuted, isNext && styles.cardTitleNext]}>
            {layer.n} · {layer.title}
          </Text>
          <View
            style={[
              styles.pill,
              secured && styles.pillSecured,
              layer.status === 'in_progress' && styles.pillProgress,
              isNext && styles.pillNext,
              locked && styles.pillLocked,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                secured && styles.pillTextSecured,
                layer.status === 'in_progress' && styles.pillTextProgress,
                isNext && styles.pillTextNext,
                locked && styles.pillTextLocked,
              ]}
            >
              {isNext ? S.nextUnlock : locked ? S.lockedNeeds(titleFor(layer.lockedBy)) : layer.statusLabel}
            </Text>
          </View>
        </View>
        <Text style={[styles.cardBody, (locked || later) && styles.cardBodyMuted]}>{layer.gets}</Text>
        {isNext && (
          <Pressable
            style={({ pressed }) => [styles.cta, pressed && styles.pressedDim]}
            onPress={(e) => {
              (e as { stopPropagation?: () => void })?.stopPropagation?.();
              openLever(layer);
            }}
          >
            <Text style={styles.ctaText}>{S.unlockCta}</Text>
          </Pressable>
        )}
        {canSelfReport && (
          <View style={styles.selfReportRow}>
            {layer.status === 'available' && (
              <Pressable
                style={({ pressed }) => [styles.haveBtn, (pressed || saving) && styles.pressedDim]}
                hitSlop={8}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={S.startedIt}
                onPress={(e) => {
                  // Don't let the tap also fire the card's navigation (web).
                  (e as { stopPropagation?: () => void })?.stopPropagation?.();
                  markStatus(layer, 'applied');
                }}
              >
                <Text style={styles.haveBtnText}>{S.startedIt}</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.haveBtn, (pressed || saving) && styles.pressedDim]}
              hitSlop={8}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={S.haveIt}
              onPress={(e) => {
                (e as { stopPropagation?: () => void })?.stopPropagation?.();
                markStatus(layer, 'active');
              }}
            >
              <Text style={styles.haveBtnText}>{S.haveIt}</Text>
            </Pressable>
          </View>
        )}
        <Text style={styles.citation}>ⓘ {layer.citation}</Text>
      </Pressable>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>{S.eyebrow(childName)}</Text>
        <View style={styles.usingPill}>
          <Text style={styles.usingPillText}>{S.using(stack.securedCount, stack.totalCount)}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{S.heroTitle}</Text>
        <Text style={styles.heroBody}>{S.heroBody}</Text>
      </View>

      {topDown.map((layer, i) => (
        <React.Fragment key={layer.key}>
          {renderLayer(layer)}
          {i < topDown.length - 1 && <Text style={styles.connector}>{S.buildsOn}</Text>}
        </React.Fragment>
      ))}

      <View style={styles.why}>
        <Text style={styles.whyText}>
          <Text style={styles.whyLead}>{S.whyTitle} </Text>
          {S.whyBody}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'], gap: spacing.sm },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  eyebrow: {
    flexShrink: 1,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    color: colors.teal,
  },
  usingPill: {
    backgroundColor: colors.navy,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  usingPillText: { color: colors.white, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  heroTitle: { color: colors.white, fontSize: fonts.sizes.xl, fontWeight: fonts.weights.extrabold },
  heroBody: { color: '#CBD5E1', fontSize: fonts.sizes.md, lineHeight: 19 },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    gap: spacing.xs,
  },
  cardSecured: { borderLeftWidth: 4, borderLeftColor: semantic.success },
  cardProgress: { borderLeftWidth: 4, borderLeftColor: colors.warning },
  cardLocked: {
    backgroundColor: colors.light,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
  },
  cardNext: { borderWidth: 2, borderColor: colors.teal },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  cardTitleMuted: { color: colors.mid },
  cardTitleNext: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.extrabold },
  pill: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillSecured: { backgroundColor: semantic.successBg, borderColor: semantic.successBg },
  pillProgress: { backgroundColor: semantic.warningBg, borderColor: semantic.warningBg },
  pillNext: { backgroundColor: '#E0F2FE', borderColor: '#E0F2FE' },
  pillLocked: { backgroundColor: semantic.dangerBg, borderColor: semantic.dangerBg },
  pillText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, color: colors.mid },
  pillTextSecured: { color: semantic.success },
  pillTextProgress: { color: semantic.warning },
  pillTextNext: { color: colors.teal },
  pillTextLocked: { color: semantic.danger },
  cardBody: { fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 19 },
  cardBodyMuted: { color: colors.mid },
  cta: {
    minHeight: 44,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  pressedDim: { opacity: 0.55 },
  selfReportRow: { gap: spacing.xs },
  haveBtn: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  haveBtnText: {
    color: colors.mid,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    textDecorationLine: 'underline',
  },
  citation: { fontSize: fonts.sizes.xs, color: colors.mid },
  connector: {
    textAlign: 'center',
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    color: colors.mid,
  },
  why: { backgroundColor: semantic.infoBg, borderRadius: radii.md, padding: spacing.base, marginTop: spacing.xs },
  whyText: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 19 },
  whyLead: { fontWeight: fonts.weights.bold, color: semantic.info },
});
