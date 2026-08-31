/**
 * Journey Map (roadmap 1.4) — the diagnosis-specific phased timeline with
 * "You are here." Ported from the GAS MVP journey screen, using the richer
 * phase data merged from the Waypoint-Journey-Maps prototype.
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import {
  getJourneyForDiagnosis,
  getJourneyKeyForDiagnosis,
  getPhaseIndexForAge,
} from '@/data/journeyMaps';
import { entityLever, entityStanding } from '@/lib/journeyActions';
import { useRequests } from '@/hooks/useRequests';
import { MEDI_CAL_DEEMING_REQUEST_TITLE } from '@/lib/resourceStack';
import { useI18n } from '@/i18n';
import { Card } from '@/components/ui';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

function ageYears(dob: string | null): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years--;
  return Math.max(0, years);
}

export default function JourneyScreen() {
  const navigation = useNavigation();
  // JourneyScreen is mounted both in the Home stack AND (owner request) as the
  // Journey tab's root. Its destination screens (phases, the resource stack,
  // entity levers) live ONLY in the Home stack, so every interior tap must name
  // tab:'Home' — a bare navigate from the Journey tab resolves to nothing.
  // `initial:false` keeps HomeMain beneath, so Back always has somewhere to go.
  const goHome = (screen: string, params?: Record<string, unknown>) =>
    (navigation as any).navigate('Home', { screen, params, initial: false });
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const primaryChild = children.find(c => c.is_primary) || children[0];
  const { diagnoses } = useDiagnoses(primaryChild?.id);
  const { scale } = useTextScale();
  const journeyLocale = useI18n().locale;
  const esUI = journeyLocale === 'es';
  const viUI = journeyLocale === 'vi';
  const sz = (n: number) => Math.round(n * scale);

  const journey = useMemo(
    () => getJourneyForDiagnosis(diagnoses.map(d => d.name)),
    [diagnoses]
  );
  // Passed to the phase screen so its link stays serializable
  const journeyKey = useMemo(
    () => getJourneyKeyForDiagnosis(diagnoses.map(d => d.name)),
    [diagnoses]
  );
  const years = ageYears(primaryChild?.date_of_birth ?? null);
  const currentPhase = getPhaseIndexForAge(years, journey);

  // Live standings so the map agrees with the Resource Stack: rows for
  // systems the family already secured say so instead of "Do this".
  const { requests: familyRequests } = useRequests(family?.id);
  const mediCalRequested = useMemo(
    () => familyRequests.some(r => r.title === MEDI_CAL_DEEMING_REQUEST_TITLE),
    [familyRequests]
  );
  const standings = useMemo(
    () => ({
      rcStatus: primaryChild?.rc_status,
      iepStatus: primaryChild?.iep_status,
      mediCalStatus: primaryChild?.medi_cal_status,
      ihssStatus: primaryChild?.ihss_status,
      ssiStatus: primaryChild?.ssi_status,
      mediCalRequested,
    }),
    [primaryChild, mediCalRequested]
  );

  const [expanded, setExpanded] = useState<number | null>(null);
  const openIndex = expanded ?? currentPhase;

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.hero, { backgroundColor: colors.navy }]}>
          <Text style={styles.heroIcon}>{journey.icon}</Text>
          <Text style={[styles.heroTitle, { fontSize: sz(22) }]}>
            {primaryChild ? `${primaryChild.first_name}'s Journey` : 'Your Journey'}
          </Text>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Text style={[styles.heroChipText, { fontSize: sz(12) }]}>{journey.title}</Text>
            </View>
            {primaryChild?.date_of_birth && (
              <View style={styles.heroChip}>
                <Text style={[styles.heroChipText, { fontSize: sz(12) }]}>Age {years}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Resource Stack — the six benefit layers, foundation-up */}
        <Pressable
          style={styles.stackEntry}
          onPress={() => goHome('ResourceStack')}
          accessibilityRole="button"
        >
          <Text style={styles.stackEntryIcon}>🧱</Text>
          <View style={styles.stackEntryBody}>
            <Text style={[styles.stackEntryTitle, { fontSize: sz(15) }]}>
              {esUI ? 'La pila de recursos' : viUI ? 'Chồng quyền lợi' : 'The Resource Stack'}
            </Text>
            <Text style={[styles.stackEntrySub, { fontSize: sz(12.5) }]}>
              {esUI
                ? 'Seis capas de beneficios — cada una abre la siguiente. Vea cuáles usa ya.'
                : viUI
                  ? 'Sáu tầng quyền lợi — mỗi tầng mở tầng kế tiếp. Xem quý vị đang dùng tầng nào.'
                  : 'Six benefit layers — each unlocks the next. See which ones you’re using.'}
            </Text>
          </View>
          <Text style={styles.stackEntryGo}>→</Text>
        </Pressable>

        {/* Your Result — the eligibility snapshot, same card shape as the stack
            above (owner request, Aug 31 2026). Opens in the Home stack, where
            EligibilityResult is registered. */}
        <Pressable
          style={styles.stackEntry}
          onPress={() => goHome('EligibilityResult')}
          accessibilityRole="button"
        >
          <Text style={styles.stackEntryIcon}>🎯</Text>
          <View style={styles.stackEntryBody}>
            <Text style={[styles.stackEntryTitle, { fontSize: sz(15) }]}>
              {esUI ? 'Su resultado' : viUI ? 'Kết quả của quý vị' : 'Your Result'}
            </Text>
            <Text style={[styles.stackEntrySub, { fontSize: sz(12.5) }]}>
              {esUI
                ? 'Para qué puede calificar su hijo/a — con la regla detrás de cada punto.'
                : viUI
                  ? 'Con quý vị có thể đủ điều kiện cho gì — kèm quy định của từng mục.'
                  : 'What your child may qualify for — with the rule behind each one.'}
            </Text>
          </View>
          <Text style={styles.stackEntryGo}>→</Text>
        </Pressable>

        {/* Intro */}
        <Card>
          <Text style={[styles.intro, { fontSize: sz(14.5), lineHeight: sz(22) }]}>
            {journey.intro}
          </Text>
        </Card>

        {/* Timeline */}
        {journey.phases.map((phase, i) => {
          const isCurrent = i === currentPhase;
          const isOpen = i === openIndex;
          return (
            <View key={i} style={styles.phaseWrap}>
              {/* Timeline rail */}
              <View style={styles.rail}>
                <View
                  style={[
                    styles.railDot,
                    { borderColor: phase.color },
                    isCurrent && { backgroundColor: phase.color },
                  ]}
                />
                {i < journey.phases.length - 1 && <View style={styles.railLine} />}
              </View>

              {/* Phase card */}
              <TouchableOpacity
                style={styles.phaseCardTouch}
                onPress={() =>
                  goHome('JourneyPhase', { journeyKey, phaseIndex: i })
                }
                accessibilityRole="button"
                accessibilityLabel={`${phase.label}, ages ${phase.age}${isCurrent ? ', current phase' : ''}. Opens next steps for this stage.`}
              >
                <View style={[styles.phaseCard, isOpen && { borderColor: phase.color, borderWidth: 1.5 }]}>
                  {isCurrent && (
                    <View style={[styles.hereBadge, { backgroundColor: phase.color }]}>
                      <Text style={[styles.hereBadgeText, { fontSize: sz(10) }]}>📍 YOU ARE HERE</Text>
                    </View>
                  )}
                  <View style={styles.phaseHead}>
                    <Text style={[styles.phaseIcon, { fontSize: sz(22) }]}>{phase.icon}</Text>
                    <View style={styles.phaseHeadText}>
                      <Text style={[styles.phaseAge, { fontSize: sz(11), color: phase.color }]}>
                        AGES {phase.age}
                      </Text>
                      <Text style={[styles.phaseLabel, { fontSize: sz(16) }]}>{phase.label}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setExpanded(isOpen && expanded !== null ? null : i)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isOpen }}
                      accessibilityLabel={
                        isOpen ? `Hide ${phase.label} summary` : `Preview ${phase.label} summary`
                      }
                    >
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.mid}
                      />
                    </TouchableOpacity>
                  </View>

                  {isOpen && (
                    <View style={styles.phaseBody}>
                      <Text style={[styles.phaseDescription, { fontSize: sz(14), lineHeight: sz(21) }]}>
                        {phase.description}
                      </Text>

                      {phase.entities.map((e, j) => {
                        const lever = entityLever(e);
                        const standing = entityStanding(e.name, standings);
                        return (
                          <TouchableOpacity
                            key={j}
                            style={[styles.entityRow, { backgroundColor: phase.bg }]}
                            onPress={() => {
                              // Each row is operable: straight to its letter or
                              // screen; rows with no single lever open the
                              // stage's next-steps (add-to-plan) screen.
                              if (lever?.type === 'letter') {
                                goHome('Letters', { template: lever.template });
                              } else if (lever?.type === 'screen') {
                                goHome(lever.screen);
                              } else {
                                goHome('JourneyPhase', { journeyKey, phaseIndex: i });
                              }
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`${e.name}: ${e.action}. ${lever?.type === 'letter' ? 'Opens a pre-drafted letter.' : 'Opens the next step.'}`}
                          >
                            <View style={styles.entityNameRow}>
                              <Text style={[styles.entityName, { fontSize: sz(13) }]}>{e.name}</Text>
                              {standing && (
                                <View
                                  style={[
                                    styles.standingChip,
                                    standing === 'in_place'
                                      ? styles.standingInPlace
                                      : styles.standingInMotion,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.standingChipText,
                                      { fontSize: sz(10) },
                                      standing === 'in_place'
                                        ? styles.standingInPlaceText
                                        : styles.standingInMotionText,
                                    ]}
                                  >
                                    {standing === 'in_place'
                                      ? esUI ? '✓ En marcha' : viUI ? '✓ Đang có' : '✓ In place'
                                      : esUI ? 'En curso' : viUI ? 'Đang xử lý' : 'In progress'}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.entityAction, { fontSize: sz(13) }]}>{e.action}</Text>
                            <View style={styles.entityFoot}>
                              <Text style={[styles.entityTime, { fontSize: sz(11), color: phase.color }]}>
                                ⏱ {e.time}
                              </Text>
                              <Text style={[styles.entityGo, { fontSize: sz(11), color: phase.color }]}>
                                {lever?.type === 'letter'
                                  ? esUI ? '✉️ Redactar la carta →' : viUI ? '✉️ Soạn thư →' : '✉️ Draft the letter →'
                                  : standing === 'in_place'
                                    ? esUI ? 'Protegerlo →' : viUI ? 'Bảo vệ nó →' : 'Protect it →'
                                    : esUI ? 'Hacer esto →' : viUI ? 'Làm việc này →' : 'Do this →'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                      <View style={styles.milestoneTile}>
                        <Text style={[styles.milestoneText, { fontSize: sz(13), lineHeight: sz(19) }]}>
                          🏁 Milestone: {phase.milestone}
                        </Text>
                      </View>
                      <View style={styles.alertTile}>
                        <Text style={[styles.alertText, { fontSize: sz(13), lineHeight: sz(19) }]}>
                          ⚠️ {phase.alert}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[styles.nextStepsButton, { borderColor: phase.color }]}
                        onPress={() =>
                          goHome('JourneyPhase', { journeyKey, phaseIndex: i })
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Next steps for ${phase.label}`}
                      >
                        <Text style={[styles.nextStepsText, { color: phase.color, fontSize: sz(13) }]}>
                          {esUI ? 'Ver todos los pasos y agregarlos a mi plan →' : viUI ? 'Xem tất cả các bước & thêm vào kế hoạch →' : 'See all steps & add them to my plan →'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* CTAs */}
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={() => (navigation as any).navigate('Tracker')}
          accessibilityRole="button"
          accessibilityLabel="See your action plan"
        >
          <Text style={[styles.ctaPrimaryText, { fontSize: sz(15) }]}>See Your Action Plan →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaSecondary}
          onPress={() => (navigation as any).navigate('Navigator')}
          accessibilityRole="button"
          accessibilityLabel="Ask the AI Navigator"
        >
          <Text style={[styles.ctaSecondaryText, { fontSize: sz(15) }]}>🧭 Ask AI Navigator</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stackEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  stackEntryIcon: { fontSize: 22 },
  stackEntryBody: { flex: 1 },
  stackEntryTitle: { fontWeight: fonts.weights.extrabold, color: colors.navy },
  stackEntrySub: { color: colors.mid, marginTop: 2 },
  stackEntryGo: { fontSize: fonts.sizes.lg, color: colors.teal, fontWeight: fonts.weights.bold },
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  hero: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontWeight: fonts.weights.extrabold as '800',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  heroChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  heroChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  heroChipText: {
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
  intro: {
    color: colors.dark,
  },
  phaseWrap: {
    flexDirection: 'row',
  },
  rail: {
    width: 24,
    alignItems: 'center',
  },
  railDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    backgroundColor: colors.white,
    marginTop: 18,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
  },
  phaseCardTouch: {
    flex: 1,
  },
  phaseCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  hereBadge: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    marginBottom: spacing.sm,
  },
  hereBadgeText: {
    color: colors.white,
    fontWeight: fonts.weights.extrabold as '800',
    letterSpacing: 0.5,
  },
  phaseHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phaseIcon: {},
  phaseHeadText: {
    flex: 1,
  },
  phaseAge: {
    fontWeight: fonts.weights.bold as '700',
    letterSpacing: 0.6,
  },
  phaseLabel: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  phaseBody: {
    marginTop: spacing.md,
  },
  phaseDescription: {
    color: colors.dark,
    marginBottom: spacing.md,
  },
  entityRow: {
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  entityName: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  entityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  standingChip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  standingInPlace: { backgroundColor: semantic.successBg },
  standingInMotion: { backgroundColor: semantic.warningBg },
  standingChipText: { fontWeight: fonts.weights.bold as '700', letterSpacing: 0.3 },
  standingInPlaceText: { color: semantic.success },
  standingInMotionText: { color: semantic.warning },
  entityAction: {
    color: colors.dark,
    marginTop: 1,
  },
  entityFoot: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  entityGo: { fontWeight: '700' },
  entityTime: {
    fontWeight: fonts.weights.semibold as '600',
    marginTop: 3,
  },
  milestoneTile: {
    backgroundColor: semantic.successBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: 4,
    marginBottom: spacing.sm,
  },
  milestoneText: {
    color: semantic.success,
    fontWeight: fonts.weights.medium as '500',
  },
  nextStepsButton: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    marginTop: spacing.sm,
  },
  nextStepsText: { fontWeight: fonts.weights.bold as '700' },
  alertTile: {
    backgroundColor: semantic.warningBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  alertText: {
    color: semantic.warning,
    fontWeight: fonts.weights.medium as '500',
  },
  ctaPrimary: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaPrimaryText: {
    color: colors.white,
    fontWeight: fonts.weights.bold as '700',
  },
  ctaSecondary: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaSecondaryText: {
    color: colors.teal,
    fontWeight: fonts.weights.bold as '700',
  },
});
