/**
 * Staff shell — the facilitator's landing screen (PRD W-A / first slice of W-C).
 *
 * W0 scope: prove the role fork end-to-end. A staff login lands here — never
 * in parent onboarding — and sees their assigned families (via the
 * accessible_family_ids RLS path from migration 036). The full caseload
 * dashboard (ranking, clocks, stages) is W1b; this screen is its skeleton.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface AssignedFamily {
  id: string;
  parent_first_name: string | null;
  parent_last_name: string | null;
  regional_center: string | null;
}

export default function StaffHomeScreen() {
  const [families, setFamilies] = useState<AssignedFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCaseload = useCallback(async () => {
    try {
      setError(null);
      // RLS (036) scopes this to owned + actively assigned families; for a
      // staff account that means exactly the consented caseload.
      const { data, error: fetchError } = await supabase
        .from('families')
        .select('id, parent_first_name, parent_last_name, regional_center')
        .order('created_at', { ascending: false });
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      setFamilies(data ?? []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load caseload');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaseload();
  }, [fetchCaseload]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My caseload</Text>
        <Text style={styles.subtitle}>
          {families.length} {families.length === 1 ? 'family' : 'families'} · full
          dashboard arrives with the facilitation workspace
        </Text>
      </View>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={fetchCaseload} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={families}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetchCaseload} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No families assigned yet</Text>
                <Text style={styles.emptyBody}>
                  Families appear here once they consent to working with you.
                  Assignments are created by an admin and can be revoked by the
                  family at any time.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardName}>
                {[item.parent_first_name, item.parent_last_name]
                  .filter(Boolean)
                  .join(' ') || 'Family'}
              </Text>
              <Text style={styles.cardMeta}>
                {item.regional_center || 'Regional Center not set'}
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fonts.sizes.sm,
    color: colors.mid,
  },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardName: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  cardMeta: { marginTop: spacing.xs, fontSize: fonts.sizes.sm, color: colors.mid },
  empty: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  emptyBody: { marginTop: spacing.sm, fontSize: fonts.sizes.md, color: colors.mid },
  errorBox: { margin: spacing.base, padding: spacing.base },
  errorText: { color: colors.error, fontSize: fonts.sizes.md },
  retryButton: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  retryText: { color: colors.white, fontWeight: fonts.weights.bold },
});
