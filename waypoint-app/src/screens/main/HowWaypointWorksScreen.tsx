/**
 * How Waypoint Works — the app's own product-tour loop (not the Regional
 * Center / school process map, which is ProcessMapScreen). Tell → Plan →
 * Act → Track, tap-linked to what Waypoint does underneath each step.
 * Design record: Roadmap/How-It-Works-Visualization-Plan.md (Option B).
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { brand, fonts, spacing, radii } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;
type StageKey = 'tell' | 'plan' | 'act' | 'track';

const STAGE_ORDER: StageKey[] = ['tell', 'plan', 'act', 'track'];

const STAGE_ICON: Record<StageKey, { outline: IoniconName; filled: IoniconName }> = {
  tell: { outline: 'chatbubble-outline', filled: 'chatbubble' },
  plan: { outline: 'clipboard-outline', filled: 'clipboard' },
  act: { outline: 'paper-plane-outline', filled: 'paper-plane' },
  track: { outline: 'time-outline', filled: 'time' },
};

const TIP_ICON: IoniconName[] = ['home-outline', 'chatbubble-outline', 'shield-checkmark-outline'];

interface Strings {
  subtitle: string;
  hint: string;
  whatYouDo: string;
  stage: Record<StageKey, string>;
  loopNote: string;
  hoodLabel: string;
  hoodToggleShow: string;
  hoodToggleHide: string;
  engineLabel: string;
  engineRowSuffix: string;
  engine: Record<StageKey, string>;
  tipsLabel: string;
  tips: [string, string, string];
}

const STRINGS: Record<FunnelLocale, Strings> = {
  en: {
    subtitle: 'Same four moves, every time — here’s what you do, and what Waypoint is quietly doing for you.',
    hint: 'Tap a step to see what it triggers underneath.',
    whatYouDo: 'WHAT YOU DO',
    stage: { tell: 'Tell', plan: 'Plan', act: 'Act', track: 'Track' },
    loopNote: 'Loops back to Tell or Plan whenever something changes.',
    hoodLabel: 'UNDER THE HOOD',
    hoodToggleShow: 'Show what Waypoint is doing behind the scenes',
    hoodToggleHide: 'Hide what Waypoint is doing behind the scenes',
    engineLabel: 'WHAT WAYPOINT IS DOING',
    engineRowSuffix: 'what this triggers',
    engine: {
      tell: 'Reads your child’s profile — diagnosis, age, RC/IEP/insurance status — from onboarding.',
      plan: 'Matches your situation to California disability law — Lanterman Act, IDEA, Medi-Cal, SSI — with the citation attached.',
      act: 'Drafts the letter and calibrates its tone — friendly first, firmer only if it has to be.',
      track: 'Starts the legal clock (like a 60-day IPP timeline) and watches it for you.',
    },
    tipsLabel: 'HOW BEST TO USE IT',
    tips: [
      'Start at Home, not the menu — it always shows the one thing to do next.',
      'Type your situation in plain English — no legal terms required.',
      'Review before you send — you’re always in control of what goes out.',
    ],
  },
  es: {
    subtitle: 'Los mismos cuatro pasos, siempre — esto es lo que usted hace, y lo que Waypoint hace en silencio por usted.',
    hint: 'Toque un paso para ver qué activa por debajo.',
    whatYouDo: 'LO QUE USTED HACE',
    stage: { tell: 'Contar', plan: 'Planear', act: 'Actuar', track: 'Seguir' },
    loopNote: 'Vuelve a Contar o Planear cada vez que algo cambia.',
    hoodLabel: 'POR DENTRO',
    hoodToggleShow: 'Mostrar qué hace Waypoint detrás de escena',
    hoodToggleHide: 'Ocultar qué hace Waypoint detrás de escena',
    engineLabel: 'LO QUE WAYPOINT ESTÁ HACIENDO',
    engineRowSuffix: 'lo que esto activa',
    engine: {
      tell: 'Lee el perfil de su hijo/a — diagnóstico, edad, estado de Centro Regional/IEP/seguro — desde el registro inicial.',
      plan: 'Compara su situación con la ley de discapacidad de California — Ley Lanterman, IDEA, Medi-Cal, SSI — con la cita incluida.',
      act: 'Redacta la carta y ajusta el tono — primero amistoso, más firme solo si es necesario.',
      track: 'Inicia el plazo legal (como un plazo de 60 días para el IPP) y lo vigila por usted.',
    },
    tipsLabel: 'CÓMO SACARLE EL MAYOR PROVECHO',
    tips: [
      'Empiece en Inicio, no en el menú — siempre muestra lo único que debe hacer a continuación.',
      'Escriba su situación en lenguaje sencillo — no necesita términos legales.',
      'Revise antes de enviar — usted siempre tiene el control de lo que se envía.',
    ],
  },
  vi: {
    subtitle: 'Luôn là bốn bước như nhau — đây là những gì quý vị làm, và những gì Waypoint âm thầm làm cho quý vị.',
    hint: 'Chạm vào một bước để xem điều gì được kích hoạt bên dưới.',
    whatYouDo: 'NHỮNG GÌ QUÝ VỊ LÀM',
    stage: { tell: 'Cho biết', plan: 'Kế hoạch', act: 'Hành động', track: 'Theo dõi' },
    loopNote: 'Quay lại Cho biết hoặc Kế hoạch bất cứ khi nào có gì thay đổi.',
    hoodLabel: 'BÊN TRONG',
    hoodToggleShow: 'Hiện những gì Waypoint đang làm phía sau',
    hoodToggleHide: 'Ẩn những gì Waypoint đang làm phía sau',
    engineLabel: 'NHỮNG GÌ WAYPOINT ĐANG LÀM',
    engineRowSuffix: 'điều này kích hoạt',
    engine: {
      tell: 'Đọc hồ sơ của con quý vị — chẩn đoán, tuổi, tình trạng Trung tâm Khu vực/IEP/bảo hiểm — từ lúc đăng ký ban đầu.',
      plan: 'Đối chiếu tình huống của quý vị với luật khuyết tật California — Đạo luật Lanterman, IDEA, Medi-Cal, SSI — kèm theo trích dẫn.',
      act: 'Soạn thư và điều chỉnh giọng điệu — thân thiện trước, chỉ cứng rắn hơn khi cần thiết.',
      track: 'Bắt đầu đồng hồ pháp lý (như thời hạn 60 ngày cho IPP) và theo dõi giúp quý vị.',
    },
    tipsLabel: 'CÁCH SỬ DỤNG TỐT NHẤT',
    tips: [
      'Bắt đầu ở Trang chủ, không phải menu — luôn hiển thị một việc cần làm tiếp theo.',
      'Gõ tình huống của quý vị bằng ngôn ngữ đơn giản — không cần thuật ngữ pháp lý.',
      'Xem lại trước khi gửi — quý vị luôn kiểm soát những gì được gửi đi.',
    ],
  },
};

export default function HowWaypointWorksScreen() {
  const { locale } = useI18n();
  const funnelLocale: FunnelLocale = toFunnelLocale(locale);
  const S = STRINGS[funnelLocale];
  const [active, setActive] = useState<StageKey>('tell');
  const [hoodOpen, setHoodOpen] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>{S.subtitle}</Text>
      <Text style={styles.hint}>{S.hint}</Text>

      <Text style={styles.sectionLabel}>{S.whatYouDo}</Text>
      <View style={styles.chipRow}>
        {STAGE_ORDER.map((key, i) => {
          const isActive = active === key;
          return (
            <React.Fragment key={key}>
              <Pressable
                onPress={() => setActive(key)}
                accessibilityRole="button"
                accessibilityLabel={S.stage[key]}
                accessibilityState={{ selected: isActive }}
                aria-pressed={isActive}
                style={styles.chipCol}
              >
                <View style={[styles.chipCircle, isActive && styles.chipCircleActive]}>
                  <Ionicons
                    name={isActive ? STAGE_ICON[key].filled : STAGE_ICON[key].outline}
                    size={20}
                    color={isActive ? brand.panel : brand.pine}
                  />
                </View>
                <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                  {S.stage[key]}
                </Text>
              </Pressable>
              {i < STAGE_ORDER.length - 1 && (
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={brand.borderStrong}
                  style={styles.chipArrow}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      <View style={styles.loopNoteRow}>
        <Ionicons name="refresh-outline" size={16} color={brand.inkFaint} />
        <Text style={styles.loopNoteText}>{S.loopNote}</Text>
      </View>

      <Pressable
        onPress={() => setHoodOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={hoodOpen ? S.hoodToggleHide : S.hoodToggleShow}
        style={styles.seam}
      >
        <View style={styles.seamLine} />
        <View style={styles.seamPill}>
          <Text style={styles.seamPillText}>{S.hoodLabel}</Text>
          <Ionicons
            name={hoodOpen ? 'chevron-up' : 'chevron-down'}
            size={12}
            color={brand.inkFaint}
          />
        </View>
      </Pressable>

      {hoodOpen && (
        <View style={styles.enginePanel}>
          <Text style={styles.engineLabel}>{S.engineLabel}</Text>
          {STAGE_ORDER.map((key, i) => {
            const isActive = active === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActive(key)}
                accessibilityRole="button"
                accessibilityLabel={`${S.stage[key]} — ${S.engineRowSuffix}`}
                accessibilityState={{ selected: isActive }}
                aria-pressed={isActive}
                style={[
                  styles.engineRow,
                  isActive && styles.engineRowActive,
                  i === STAGE_ORDER.length - 1 && styles.engineRowLast,
                ]}
              >
                <Text style={[styles.engineRowLabel, isActive && styles.engineRowLabelActive]}>
                  {S.stage[key].toUpperCase()}
                </Text>
                <Text style={[styles.engineRowText, isActive && styles.engineRowTextActive]}>
                  {S.engine[key]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionLabel}>{S.tipsLabel}</Text>
      <View style={styles.tipsRow}>
        {S.tips.map((tip, i) => (
          <View key={i} style={styles.tipCard}>
            <Ionicons name={TIP_ICON[i]} size={18} color={brand.pine} />
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.paper },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  subtitle: {
    fontSize: fonts.sizes.md,
    color: brand.inkSoft,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  hint: {
    fontSize: fonts.sizes.sm,
    color: brand.pine,
    fontWeight: fonts.weights.semibold,
    marginBottom: spacing.base,
  },
  sectionLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.6,
    color: brand.inkFaint,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chipCol: {
    alignItems: 'center',
    width: 68,
    minHeight: 44,
    gap: 6,
  },
  chipCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: brand.pine,
    backgroundColor: brand.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipCircleActive: { backgroundColor: brand.pine },
  chipLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    color: brand.ink,
  },
  chipLabelActive: { color: brand.pine },
  chipArrow: { marginTop: 19 },
  loopNoteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: spacing.md,
  },
  loopNoteText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: brand.inkFaint,
    lineHeight: 18,
  },
  seam: {
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seamLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    borderTopWidth: 2,
    borderStyle: 'dashed',
    borderTopColor: brand.borderStrong,
  },
  seamPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: brand.paper,
    borderWidth: 1,
    borderColor: brand.borderStrong,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  seamPillText: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.5,
    color: brand.inkFaint,
  },
  enginePanel: {
    marginTop: spacing.md,
    backgroundColor: brand.ink,
    borderRadius: radii.lg,
    padding: spacing.base,
  },
  engineLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.6,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xs,
  },
  engineRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginHorizontal: -spacing.xs,
    borderRadius: radii.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  engineRowActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
  engineRowLast: { borderBottomWidth: 0 },
  engineRowLabel: {
    width: 50,
    flexShrink: 0,
    paddingTop: 2,
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 0.4,
    color: 'rgba(255,255,255,0.55)',
  },
  engineRowLabelActive: { color: brand.panel },
  engineRowText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 19,
  },
  engineRowTextActive: { color: 'rgba(255,255,255,0.96)' },
  tipsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipCard: {
    flex: 1,
    backgroundColor: brand.panel,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
  },
  tipText: {
    fontSize: fonts.sizes.xs,
    color: brand.ink,
    textAlign: 'center',
    lineHeight: 15,
  },
});
