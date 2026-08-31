/**
 * Journey Map (roadmap 1.4) — the diagnosis-specific phased timeline with
 * "You are here." Ported from the GAS MVP journey screen, using the richer
 * phase data merged from the Waypoint-Journey-Maps prototype.
 *
 * Merged (owner, Aug 31 2026): the old "This Stage" detail screen is absorbed
 * here. An expanded stage now carries its steps inline — each one expandable to
 * the "why," a guide link and an Ask, with a ＋ that adds it to the plan (and
 * shows "✓ On plan" when it already is). A stage-scoped AI ask bar sits just
 * below the stage header. There is no longer a tap-through to a separate screen.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import { useToast } from '@/components/Toast';
import {
  getJourneyForDiagnosis,
  getJourneyKeyForDiagnosis,
  getPhaseIndexForAge,
} from '@/data/journeyMaps';
import {
  phaseToActions,
  phaseQuestion,
  phaseChips,
  entityStanding,
  standingLabel,
  entityExplainer,
  cadenceNote,
  entityGuide,
  entityStepQuestion,
  type EntityStandings,
} from '@/lib/journeyActions';
import { onPlanTitles } from '@/lib/planMembership';
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
  // Journey tab's root. Its destination screens (the resource stack, entity
  // guides) live ONLY in the Home stack, so every interior tap into that stack
  // must name tab:'Home' — a bare navigate from the Journey tab resolves to
  // nothing. `initial:false` keeps HomeMain beneath, so Back always has
  // somewhere to go. (Navigator and Calendar are tabs, reached directly.)
  const goHome = (screen: string, params?: Record<string, unknown>) =>
    (navigation as any).navigate('Home', { screen, params, initial: false });
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const primaryChild = children.find(c => c.is_primary) || children[0];
  const childName = primaryChild?.first_name ?? null;
  const { diagnoses } = useDiagnoses(primaryChild?.id);
  const { scale } = useTextScale();
  const journeyLocale = useI18n().locale;
  const esUI = journeyLocale === 'es';
  const viUI = journeyLocale === 'vi';
  const sz = (n: number) => Math.round(n * scale);

  const { createAction, actions } = useActions({ familyId: family?.id ?? '' });
  const { showToast } = useToast();

  const journey = useMemo(
    () => getJourneyForDiagnosis(diagnoses.map(d => d.name)),
    [diagnoses]
  );
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
  const standings: EntityStandings = useMemo(
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
  // Only one stage is open at a time, so a single keyed value tracks which step
  // (if any) has its "learn more" expanded: `${phaseIndex}:${stepIndex}`.
  const [openStep, setOpenStep] = useState<string | null>(null);
  // Immediate "just added" feedback by title, before the actions list refetches.
  // The durable source of truth is `plannedTitles`, reconciled from the DB.
  const [addedTitles, setAddedTitles] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  // Stage-scoped ask bar text (one stage open at a time, so one query is fine).
  const [query, setQuery] = useState('');

  // "Already on the plan" reconciled from the REAL actions list — matches the
  // deterministic step title, scoped to this child + system source, so it
  // survives leaving and returning without stacking a duplicate.
  const plannedTitles = useMemo(
    () => onPlanTitles(actions, primaryChild?.id),
    [actions, primaryChild?.id]
  );
  const isAdded = useCallback(
    (title: string) => addedTitles.has(title) || plannedTitles.has(title),
    [addedTitles, plannedTitles]
  );

  /** Add one step from a stage to the plan (dedup lives in createAction). */
  const addOne = useCallback(
    async (draft: { title: string; description: string; category: any; priority: any }) => {
      if (busy || isAdded(draft.title)) return;
      setBusy(true);
      const created = await createAction({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        priority: draft.priority,
        child_id: primaryChild?.id,
        source: 'system',
      });
      setBusy(false);
      if (created) {
        setAddedTitles(prev => new Set(prev).add(draft.title));
        showToast('Added to your Action Plan', 'success');
      } else {
        showToast("Couldn't add that — please try again.", 'error');
      }
    },
    [busy, isAdded, createAction, primaryChild?.id, showToast]
  );

  /** Add every not-yet-added step from a stage. */
  const addAll = useCallback(
    async (drafts: ReturnType<typeof phaseToActions>) => {
      if (busy) return;
      setBusy(true);
      let added = 0;
      const nowAdded = new Set(addedTitles);
      for (const d of drafts) {
        if (isAdded(d.title)) continue;
        const created = await createAction({
          title: d.title,
          description: d.description,
          category: d.category,
          priority: d.priority,
          child_id: primaryChild?.id,
          source: 'system',
        });
        if (created) {
          added++;
          nowAdded.add(d.title);
        }
      }
      setBusy(false);
      setAddedTitles(nowAdded);
      showToast(
        added > 0
          ? `${added} step${added === 1 ? '' : 's'} added to your plan`
          : 'These are already on your plan.',
        'success'
      );
    },
    [busy, addedTitles, isAdded, createAction, primaryChild?.id, showToast]
  );

  /** Seed the Navigator with a question and open it. */
  const ask = useCallback(
    (seed: string) => {
      const q = seed.trim();
      if (!q) return;
      (navigation as any).navigate('Navigator', {
        screen: 'NavigatorMain',
        params: { ask: q },
      });
      setQuery('');
    },
    [navigation]
  );

  /** Jump to the Action Plan (the Plan tab). */
  const openPlan = useCallback(() => {
    (navigation as any).navigate('Calendar', { screen: 'PlanMain' });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          accessibilityLabel={esUI ? 'Su resultado' : viUI ? 'Kết quả của quý vị' : 'Your Result'}
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
          const drafts = isOpen ? phaseToActions(phase, childName) : [];
          const chips = isOpen ? phaseChips(phase, journey.title, childName) : [];
          const anyPlanned = drafts.some(d => isAdded(d.title));
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
              <View style={styles.phaseCardTouch}>
                <View style={[styles.phaseCard, isOpen && { borderColor: phase.color, borderWidth: 1.5 }]}>
                  {/* Tapping the header opens/closes the stage in place — no
                      tap-through to a separate screen any more. */}
                  <TouchableOpacity
                    onPress={() => setExpanded(isOpen && expanded !== null ? null : i)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    accessibilityLabel={`${phase.label}, ages ${phase.age}${isCurrent ? ', current phase' : ''}. ${isOpen ? 'Collapse this stage' : 'Open this stage and its next steps'}.`}
                  >
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
                      <Ionicons
                        name={isOpen ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colors.mid}
                      />
                    </View>
                  </TouchableOpacity>

                  {isOpen && (
                    <View style={styles.phaseBody}>
                      <Text style={[styles.phaseDescription, { fontSize: sz(14), lineHeight: sz(21) }]}>
                        {phase.description}
                      </Text>

                      {phase.alert ? (
                        <View style={styles.alertTile}>
                          <Text style={[styles.alertText, { fontSize: sz(13), lineHeight: sz(19) }]}>
                            ⚠️ {phase.alert}
                          </Text>
                        </View>
                      ) : null}

                      {/* Stage-scoped AI ask bar — below the stage header block
                          (owner, Aug 31), aligned with the RC Funding Guide. */}
                      <View style={styles.askCard}>
                        <View style={styles.composer}>
                          <Ionicons name="search" size={sz(18)} color={colors.teal} />
                          <TextInput
                            style={[styles.composerInput, { fontSize: sz(14) }]}
                            value={query}
                            onChangeText={setQuery}
                            placeholder={`Ask about ${phase.label} — “What’s due now?”`}
                            placeholderTextColor={colors.mid}
                            returnKeyType="search"
                            onSubmitEditing={() =>
                              ask(query.trim() || phaseQuestion(phase, journey.title, childName))
                            }
                            accessibilityLabel={`Ask Waypoint about the ${phase.label} stage`}
                          />
                          <Pressable
                            style={({ pressed }) => [styles.askBtn, pressed && styles.askBtnPressed]}
                            onPress={() =>
                              ask(query.trim() || phaseQuestion(phase, journey.title, childName))
                            }
                            accessibilityRole="button"
                            accessibilityLabel="Ask Waypoint your question"
                          >
                            <Ionicons name="sparkles" size={sz(13)} color={colors.white} />
                            <Text style={[styles.askBtnText, { fontSize: sz(12.5) }]}>Ask</Text>
                          </Pressable>
                        </View>
                        <View style={styles.chips}>
                          {chips.map(c => (
                            <Pressable
                              key={c.label}
                              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                              onPress={() => ask(c.ask)}
                              hitSlop={{ top: 8, bottom: 8 }}
                              accessibilityRole="button"
                              accessibilityLabel={c.label}
                            >
                              <Text style={[styles.chipText, { fontSize: sz(11.5) }]}>{c.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>

                      {/* Recommended next steps — the old "This Stage" detail,
                          inline. Each step expands to the why + guide + Ask, and
                          the ＋ adds it (or shows "✓ On plan" when it already is). */}
                      {drafts.length > 0 && (
                        <View style={styles.sectionRow}>
                          <Text style={[styles.sectionTitle, { fontSize: sz(14) }]}>
                            Recommended next steps
                          </Text>
                          <TouchableOpacity
                            onPress={() => addAll(drafts)}
                            disabled={busy}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            accessibilityRole="button"
                            accessibilityLabel="Add every step from this stage to my plan"
                          >
                            <Text style={[styles.addAllText, { fontSize: sz(12.5) }]}>Add all</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {drafts.map((draft, j) => {
                        const entity = phase.entities[j];
                        const added = isAdded(draft.title);
                        const key = `${i}:${j}`;
                        const open = openStep === key;
                        // Suppress on combined "A / B" rows — a single-system
                        // chip there is ambiguous (which system is "active"?).
                        const standing = entity.name.includes('/')
                          ? null
                          : entityStanding(entity.name, standings);
                        const standLabel = standing ? standingLabel(entity.name, standing) : null;
                        const explainer = entityExplainer(entity.name);
                        const cadence = cadenceNote(entity.time ?? '');
                        const guide = entityGuide(entity);
                        return (
                          <View key={`${entity.name}-${j}`} style={styles.stepCard}>
                            <View style={styles.stepRow}>
                              <TouchableOpacity
                                style={styles.stepBody}
                                onPress={() => setOpenStep(open ? null : key)}
                                accessibilityRole="button"
                                accessibilityState={{ expanded: open }}
                                accessibilityLabel={`${entity.name}: ${entity.action}.${standLabel ? ` ${standLabel}.` : ''} ${open ? 'Hide' : 'Show'} details.`}
                              >
                                <Text style={[styles.stepWho, { color: phase.color, fontSize: sz(11) }]}>
                                  {entity.name.toUpperCase()}
                                  {entity.time ? ` · ${entity.time}` : ''}
                                </Text>
                                <Text style={[styles.stepAction, { fontSize: sz(14), lineHeight: sz(20) }]}>
                                  {entity.action}
                                </Text>
                                <View style={styles.stepMetaRow}>
                                  {standLabel && (
                                    <View
                                      style={[
                                        styles.standChip,
                                        standing === 'in_place' ? styles.standInPlace : styles.standInMotion,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.standChipText,
                                          standing === 'in_place' ? styles.standInPlaceText : styles.standInMotionText,
                                        ]}
                                      >
                                        {standLabel}
                                      </Text>
                                    </View>
                                  )}
                                  <Text style={[styles.learnMore, { color: phase.color }]}>
                                    {open ? 'Hide' : 'Learn more'} {open ? '▲' : '▼'}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                              {added ? (
                                <View
                                  style={styles.onPlanPill}
                                  accessible
                                  accessibilityRole="text"
                                  accessibilityLabel={`${entity.action} is on your Action Plan`}
                                >
                                  <Text style={styles.onPlanPillText}>✓ On plan</Text>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={styles.addButton}
                                  onPress={() => addOne(draft)}
                                  disabled={busy}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Add "${entity.action}" to my plan`}
                                >
                                  <Text style={styles.addButtonText}>＋</Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            {open && (
                              <View style={styles.stepDetail}>
                                {!!explainer && (
                                  <Text style={[styles.detailText, { fontSize: sz(13.5), lineHeight: sz(20) }]}>
                                    {explainer}
                                  </Text>
                                )}
                                {!!cadence && (
                                  <Text style={[styles.detailCadence, { fontSize: sz(12.5), lineHeight: sz(18) }]}>
                                    {cadence}
                                  </Text>
                                )}
                                <View style={styles.detailActions}>
                                  {guide && (
                                    <TouchableOpacity
                                      style={styles.detailLink}
                                      onPress={() => goHome(guide.screen, guide.params)}
                                      accessibilityRole="button"
                                      accessibilityLabel={guide.label}
                                    >
                                      <Text style={[styles.detailLinkText, { color: phase.color }]}>
                                        📘 {guide.label} ›
                                      </Text>
                                    </TouchableOpacity>
                                  )}
                                  <TouchableOpacity
                                    style={styles.detailLink}
                                    onPress={() =>
                                      ask(entityStepQuestion(entity, phase, journey.title, childName))
                                    }
                                    accessibilityRole="button"
                                    accessibilityLabel={`Ask Waypoint about ${entity.name}: ${entity.action}`}
                                  >
                                    <Text style={[styles.detailLinkText, { color: colors.teal }]}>
                                      🧭 Ask Waypoint about this step ›
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}

                      {/* Once anything from this stage is on the plan, a
                          persistent card to go see it (owner, Aug 31). */}
                      {anyPlanned && (
                        <TouchableOpacity
                          style={styles.seePlanCard}
                          onPress={openPlan}
                          accessibilityRole="button"
                          accessibilityLabel="See your Action Plan"
                        >
                          <Text style={styles.seePlanIcon}>📋</Text>
                          <View style={styles.seePlanBody}>
                            <Text style={[styles.seePlanTitle, { fontSize: sz(14) }]}>See your Action Plan</Text>
                            <Text style={[styles.seePlanSub, { fontSize: sz(12) }]}>
                              Track, schedule and check off what you added.
                            </Text>
                          </View>
                          <Text style={[styles.seePlanChevron, { color: colors.teal }]}>›</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.milestoneTile}>
                        <Text style={[styles.milestoneText, { fontSize: sz(13), lineHeight: sz(19) }]}>
                          🏁 Milestone: {phase.milestone}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}

        {/* CTAs */}
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={openPlan}
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
  // ── Stage ask bar (aligned with the RC Funding Guide) ──────────────────────
  askCard: {
    backgroundColor: '#F0FAFC',
    borderWidth: 1,
    borderColor: '#D8ECF1',
    borderRadius: radii.lg,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: '#B9E2EC',
    paddingLeft: spacing.base,
    paddingRight: spacing.xs + 2,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  composerInput: { flex: 1, color: colors.navy, paddingVertical: 0 },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  askBtnPressed: { backgroundColor: '#0E7490' },
  askBtnText: { color: colors.white, fontWeight: fonts.weights.bold as '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#D6E6EC',
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
  },
  chipPressed: { backgroundColor: '#E0F2F7' },
  chipText: { color: colors.dark, fontWeight: fonts.weights.semibold as '600' },
  // ── Recommended next steps ─────────────────────────────────────────────────
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  addAllText: {
    color: colors.teal,
    fontWeight: fonts.weights.bold as '700',
  },
  stepCard: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 6,
  },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  stepBody: { flex: 1 },
  stepWho: { fontWeight: fonts.weights.bold as '700', letterSpacing: 0.4 },
  stepAction: { color: colors.dark, marginTop: 3, fontWeight: fonts.weights.semibold as '600' },
  stepMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  standChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.full },
  // Info-teal, not done-green: this states a system fact ("IEP active"), it is
  // not a step-completion checkmark.
  standInPlace: { backgroundColor: '#E6F5F9' },
  standInMotion: { backgroundColor: '#FEF3C7' },
  standChipText: { fontSize: 11, fontWeight: fonts.weights.bold as '700' },
  standInPlaceText: { color: '#076C86' },
  standInMotionText: { color: '#92400E' },
  learnMore: { fontSize: 11.5, fontWeight: fonts.weights.semibold as '600' },
  stepDetail: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  detailText: { color: colors.dark },
  detailCadence: { color: colors.mid },
  detailActions: { marginTop: 4, gap: 4 },
  detailLink: { minHeight: 40, justifyContent: 'center' },
  detailLinkText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold as '600' },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 17, color: colors.white, fontWeight: '700' },
  onPlanPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  onPlanPillText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold as '700', color: '#047857' },
  seePlanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#EFF9FB',
    borderWidth: 1,
    borderColor: '#B9E2EC',
    borderRadius: radii.md,
    padding: spacing.base,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  seePlanIcon: { fontSize: 20 },
  seePlanBody: { flex: 1 },
  seePlanTitle: { fontWeight: fonts.weights.bold as '700', color: colors.navy },
  seePlanSub: { color: colors.mid, marginTop: 2 },
  seePlanChevron: { fontSize: 22, fontWeight: fonts.weights.bold as '700' },
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
  alertTile: {
    backgroundColor: semantic.warningBg,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
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
