/**
 * "Waypoint noticed" — proactive gap prompts on Home (P3).
 *
 * Deterministic rules (lib/gapRules) + AI-noticed gap memories surface the
 * top thing this specific family may be missing, with one tap to ask the
 * Navigator about it. Dismissals persist per gap id.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { detectGaps, type GapInput, type GapPrompt } from '@/lib/gapRules';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const DISMISSED_KEY = 'waypoint_dismissed_gaps';
const MAX_SHOWN = 2;

interface GapPromptsCardProps {
  familyId: string;
  childAgeYears: number | null;
  diagnoses: string[];
  rcStatus: string | null;
  iepStatus: string | null;
  insurance: string | null;
}

export default function GapPromptsCard(props: GapPromptsCardProps) {
  const navigation = useNavigation<any>();
  const [dismissed, setDismissed] = useState<Set<string> | null>(null);
  const [memoryGaps, setMemoryGaps] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY)
      .then((raw) => setDismissed(new Set(raw ? (JSON.parse(raw) as string[]) : [])))
      .catch(() => setDismissed(new Set()));
  }, []);

  // AI-noticed gaps from the memory system
  useEffect(() => {
    if (!props.familyId) return;
    supabase
      .from('family_memories')
      .select('content')
      .eq('family_id', props.familyId)
      .eq('kind', 'gap')
      .eq('archived', false)
      .order('updated_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setMemoryGaps((data ?? []).map((m: { content: string }) => m.content)));
  }, [props.familyId]);

  const gaps = useMemo(() => {
    if (dismissed === null) return [];
    const input: GapInput = {
      childAgeYears: props.childAgeYears,
      diagnoses: props.diagnoses,
      rcStatus: props.rcStatus,
      iepStatus: props.iepStatus,
      insurance: props.insurance,
      memoryGaps,
    };
    return detectGaps(input).filter((g) => !dismissed.has(g.id)).slice(0, MAX_SHOWN);
  }, [props, memoryGaps, dismissed]);

  const handleDismiss = useCallback(async (gap: GapPrompt) => {
    setDismissed((prev) => {
      const next = new Set(prev ?? []);
      next.add(gap.id);
      AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next])).catch(() => {});
      return next;
    });
  }, []);

  const handleAsk = useCallback((gap: GapPrompt) => {
    navigation.navigate('Navigator', {
      screen: 'NavigatorMain',
      params: { ask: gap.ask },
    });
  }, [navigation]);

  if (gaps.length === 0) return null;

  return (
    <View style={styles.container}>
      {gaps.map((gap) => (
        <View key={gap.id} style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.emoji}>{gap.emoji}</Text>
            <View style={styles.headerBody}>
              <Text style={styles.kicker}>WAYPOINT NOTICED</Text>
              <Text style={styles.title}>{gap.title}</Text>
            </View>
            <TouchableOpacity
              style={styles.dismissBtn}
              onPress={() => handleDismiss(gap)}
              accessibilityRole="button"
              accessibilityLabel={`Dismiss: ${gap.title}`}
            >
              <Text style={styles.dismissX}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.body}>{gap.body}</Text>
          <TouchableOpacity
            style={styles.askBtn}
            onPress={() => handleAsk(gap)}
            accessibilityRole="button"
            accessibilityLabel="Ask Waypoint about this"
          >
            <Text style={styles.askBtnText}>Ask Waypoint about this →</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: '#FDF8EC',
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F0E2BE',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  emoji: {
    fontSize: 22,
  },
  headerBody: {
    flex: 1,
  },
  kicker: {
    fontSize: 10,
    fontWeight: fonts.weights.bold as '700',
    color: '#B48A1F',
    letterSpacing: 1,
  },
  title: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    lineHeight: 21,
    marginTop: 1,
  },
  dismissBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissX: {
    fontSize: 13,
    color: colors.mid,
  },
  body: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  askBtn: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 38,
    justifyContent: 'center',
  },
  askBtnText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
});
