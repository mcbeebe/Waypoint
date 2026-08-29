/**
 * Tools (Home rebuild phase 4) — the toolbox becomes a place, not a drawer at
 * the bottom of Home.
 *
 * The tiles a family pinned sit on top, then everything else: search, the
 * three action rows with their live badges, and the four doors. All of it is
 * the shipped `ToolsArea` content, promoted to a screen and given a star on
 * every row so a family can build its own top shelf from wherever it is.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { ChildPicker, SelectedChildProvider, useSelectedChild } from '@/components/ChildPicker';
import { useToast } from '@/components/Toast';
import { announce } from '@/lib/accessibility';
import { useRequests } from '@/hooks/useRequests';
import { useCommunications } from '@/hooks/useCommunications';
import { useToolPins } from '@/hooks/useToolPins';
import PinnedTools from '@/components/PinnedTools';
import ToolsArea from '@/components/ToolsArea';
import { getAllTools } from '@/lib/toolsCatalog';
import { findUnansweredReply } from '@/lib/replyInbox';
import { activeRequestForReply } from '@/lib/requestCase';
import { ageFromDob, toFunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, radii, semantic, spacing } from '@/lib/theme';

export default function ToolsScreen() {
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  return (
    <SelectedChildProvider childRecords={children}>
      <ToolsScreenInner family={family} />
    </SelectedChildProvider>
  );
}

function ToolsScreenInner({ family }: { family: ReturnType<typeof useFamily>['family'] }) {
  // The Records door and the age-aware search placeholder are about ONE
  // child; taking children[0] showed a 15-year-old's parent Early Start copy.
  const { selectedChild: child } = useSelectedChild();
  const { locale } = useI18n();
  const funnelLocale = toFunnelLocale(locale);
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const [notice, setNotice] = useState<string | null>(null);
  const { showToast } = useToast();

  /**
   * The star that triggers a refusal can be anywhere down a 23-tool list, and
   * `accessibilityRole="alert"` does not announce on its own in React Native.
   * A cap that refuses silently is a cap the parent never learns about.
   */
  const say = (message: string) => {
    setNotice(message);
    showToast(message, 'error');
    announce(message);
  };

  const validKeys = useMemo(() => getAllTools('en').map((t) => t.key), []);
  const pins = useToolPins(family?.id, validKeys, funnelLocale);

  const { requests } = useRequests(family?.id);
  const { communications } = useCommunications(family?.id ?? '');
  const unanswered = useMemo(() => findUnansweredReply(communications), [communications]);
  const replyRequest = useMemo(
    () =>
      unanswered ? activeRequestForReply(unanswered.reply, requests, communications) : null,
    [unanswered, requests, communications]
  );

  const togglePin = (key: string, pinned: boolean) => {
    setNotice(null);
    if (pinned) {
      void pins.unpin(key).then((message) => {
        if (message) say(message);
      });
      return;
    }
    void pins.pin(key).then((message) => {
      if (message) say(message);
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <ChildPicker />
        <PinnedTools pins={pins} locale={funnelLocale} onNotice={say} />
        {!!notice && (
          <Text
            style={[styles.notice, { fontSize: sz(12.5), lineHeight: sz(18) }]}
            accessibilityRole="alert"
          >
            {notice}
          </Text>
        )}
        <ToolsArea
          selectedChildName={child?.first_name ?? null}
          requests={requests}
          communications={communications}
          hasUnansweredReply={!!unanswered && !replyRequest}
          childAgeYears={child ? ageFromDob(child.date_of_birth) : null}
          pinnedKeys={pins.pins}
          onTogglePin={togglePin}
          onOpened={pins.noteOpened}
        />
        <View style={styles.tail} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  scroll: { padding: spacing.lg },
  notice: {
    color: semantic.warning,
    backgroundColor: semantic.warningBg,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.base,
    fontWeight: fonts.weights.semibold,
  },
  scopeNote: { color: colors.mid, marginBottom: spacing.base },
  tail: { height: spacing.xl },
});
