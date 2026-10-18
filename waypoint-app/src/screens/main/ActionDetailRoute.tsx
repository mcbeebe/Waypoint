/**
 * The route wrapper for one action: loads it by id, binds the `useActions`
 * mutations to `ActionDetailScreen`, and owns the two things that only the
 * route can know — **where Back goes**, and what a parent sees when the
 * action is not there any more.
 *
 * It was an inline function inside `MainTabs.tsx`, where neither of those
 * could be tested: the file imports every screen in the app. Both behaviours
 * had shipped wrong (a Back that left the tab the parent came from, and a
 * missing action rendered as one bare sentence with no control at all), so it
 * lives in its own file and `ActionDetailRoute.test.tsx` renders it.
 */

import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import ActionDetailScreen from '@/screens/main/ActionDetailScreen';
import CompletionCheckIn from '@/components/CompletionCheckIn';
import { useFamily, useDiagnoses } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import { useToast } from '@/components/Toast';
import { FOLLOWUPS } from '@/lib/adaptiveEngine';
import { trackActionOutcome } from '@/lib/analytics';
import {
  actionReturnNavigation,
  actionUnavailableTitle,
  actionUnavailableBody,
  actionBackLabel,
  actionBackA11y,
  actionLoadFailedTitle,
  actionLoadFailedBody,
  actionLoadRetry,
} from '@/lib/actionReturn';
import { actionLockMessage } from '@/lib/actionLock';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';
import type { ActionLocale } from '@/lib/actionMeta';
import { useI18n } from '@/i18n';
import type { Action } from '@/types/database';
import { colors, brand, fonts, spacing, radii } from '@/lib/theme';

/** Loads an action by id and binds useActions mutations to ActionDetailScreen. */
export default function ActionDetailRoute({ route, navigation }: any) {
  const { actionId, returnTo } = (route.params ?? {}) as {
    actionId: string;
    returnTo?: unknown;
  };
  const { family } = useFamily();
  const { showToast } = useToast();
  const { locale } = useI18n();
  const uiLocale: ActionLocale = locale === 'es' ? 'es' : locale === 'vi' ? 'vi' : 'en';
  const { actions, loading, error, updateStatus, toggleStep, updateAction, refetch } = useActions({
    familyId: family?.id ?? '',
  });
  const [checkInAction, setCheckInAction] = React.useState<Action | null>(null);

  const action = actions.find(a => a.id === actionId);
  const dependency = action?.depends_on ? actions.find(a => a.id === action.depends_on) : undefined;
  const { diagnoses } = useDiagnoses(action?.child_id ?? undefined);

  /**
   * Back, for every way into this screen.
   *
   * A caller in another tab says where it came from (`returnTo`), because from
   * here `goBack()` cannot know: it either pops to the hidden Tracker tab's
   * list or bubbles to the tab navigator. The Navigator's context pill passes
   * the conversation, Plan's rows pass Plan — so a round trip ends on the
   * screen the parent left, with its state (a half-written question included)
   * untouched, because no params ride along.
   *
   * Without a `returnTo` nothing changes: a deep link opening this as the
   * stack root still falls back to the list, and a push from the Tracker list
   * still pops.
   */
  const goBack = React.useCallback(() => {
    const back = actionReturnNavigation(returnTo);
    if (back) {
      navigation.navigate(back.tab, back.options);
      return;
    }
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    // Deep links (waypointchild.com/actions/:id) can open this screen as
    // the stack root — fall back to the list so Back always works.
    navigation.navigate('TrackerList');
  }, [navigation, returnTo]);

  /** The one way off either of the two states below. */
  const backControl = (
    <TouchableOpacity
      onPress={goBack}
      style={styles.goneBack}
      accessibilityRole="button"
      accessibilityLabel={actionBackA11y(uiLocale)}
    >
      <Text style={styles.goneBackText}>{actionBackLabel(uiLocale)}</Text>
    </TouchableOpacity>
  );

  if (loading && !action) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }
  /**
   * The action is gone — dismissed or deleted since whatever points at it was
   * opened. The pill in a chat keeps pointing at it for the life of that
   * conversation, so this is reachable in normal use, and it used to be a dead
   * end: one grey sentence, no back control, on a tab bar with nothing lit.
   */
  /**
   * The fetch failed — which is NOT the same as the action being gone, and
   * `useActions` reports them the same way: an empty list either way. Saying
   * "removed from your plan" to a parent whose connection dropped is a false
   * statement about their plan, made by the app that keeps it.
   */
  if (!action && error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.goneTitle}>{actionLoadFailedTitle(uiLocale)}</Text>
        <Text style={styles.goneBody}>{actionLoadFailedBody(uiLocale)}</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={styles.goneBack}
          accessibilityRole="button"
          accessibilityLabel={actionLoadRetry(uiLocale)}
        >
          <Text style={styles.goneBackText}>{actionLoadRetry(uiLocale)}</Text>
        </TouchableOpacity>
        {backControl}
      </View>
    );
  }
  if (!action) {
    return (
      <View style={styles.centered}>
        <Text style={styles.goneTitle}>{actionUnavailableTitle(uiLocale)}</Text>
        <Text style={styles.goneBody}>{actionUnavailableBody(uiLocale)}</Text>
        {backControl}
      </View>
    );
  }

  return (
    <>
      <ActionDetailScreen
        /**
         * Keyed, so a different action gets a FRESH screen.
         *
         * Back is now a `navigate` to another tab, not a `pop`, so this screen
         * stays mounted after the parent leaves it — and it holds nine pieces
         * of draft state (a half-typed next step, a note, a due date, a
         * dismissal reason, three modals). Without this, the step a parent
         * started typing about "Apply for Medi-Cal" was still in the box when
         * they opened "Request an IEP assessment", and tapping Add wrote it
         * onto that action's checklist.
         */
        key={action.id}
        action={action}
        onUpdateStatus={(status, reason) => {
          // Dependency lock: this step builds on another that isn't done yet.
          // The predicate lives in `actionLock` because the tracker has the
          // same guard and the two disagreed — this one used to require the
          // dependency ROW to be loaded, so a step whose dependency had been
          // deleted was padlocked in the tracker and completable here.
          if (status === 'completed' || status === 'in_progress') {
            const locked = actionLockMessage(
              {
                dependsOn: action.depends_on,
                dependencyTitle: dependency?.title,
                dependencyCompleted: dependency?.status === 'completed',
              },
              uiLocale
            );
            if (locked) {
              showToast(locked, 'info');
              return;
            }
          }
          updateStatus(action.id, status, reason);
          if (status === 'completed' && family?.id) {
            trackActionOutcome(family.id, action.category, 'completed', family.regional_center ?? undefined);
          }
          if (status === 'completed' && action.follow_up_key && FOLLOWUPS[action.follow_up_key]) {
            setCheckInAction(action);
          }
        }}
        onToggleStep={stepIndex => toggleStep(action.id, stepIndex)}
        onUpdate={data => updateAction(action.id, data)}
        onBack={goBack}
      />
      <CompletionCheckIn
        action={checkInAction}
        familyId={family?.id ?? ''}
        ctx={{
          parentName: family?.parent_first_name,
          regionalCenterName: family?.regional_center,
          diagnoses: diagnoses.map(d => d.name),
        }}
        onClose={() => setCheckInAction(null)}
        onActionsAdded={refetch}
      />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.light,
    padding: spacing.lg,
  },
  goneTitle: {
    color: brand.ink,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    textAlign: 'center',
  },
  goneBody: {
    color: colors.mid,
    fontSize: fonts.sizes.md,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  goneBack: {
    marginTop: spacing.lg,
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  goneBackText: {
    color: colors.teal,
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
  },
});
