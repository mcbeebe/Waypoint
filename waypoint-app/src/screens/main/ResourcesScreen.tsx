/**
 * Resources screen — Browse guides with category/difficulty filtering
 * Phase 10: Sprints S72-S73
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useResources } from '@/hooks/useResources';
import type { Resource, ResourceCategory, DifficultyLevel } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const CATEGORY_CONFIG: Record<ResourceCategory, { label: string; emoji: string }> = {
  getting_started: { label: 'Getting Started', emoji: '🚀' },
  regional_center: { label: 'Regional Center', emoji: '🏛️' },
  iep: { label: 'IEP & School', emoji: '🏫' },
  insurance: { label: 'Insurance', emoji: '🏥' },
  legal: { label: 'Legal Rights', emoji: '⚖️' },
  transitions: { label: 'Transitions', emoji: '🔄' },
};

const DIFFICULTY_CONFIG: Record<DifficultyLevel, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: '#059669' },
  intermediate: { label: 'Intermediate', color: '#D97706' },
  advanced: { label: 'Advanced', color: '#DC2626' },
};

export default function ResourcesScreen({
  onOpenResource,
}: {
  onOpenResource?: (resource: Resource) => void;
}) {
  const [categoryFilter, setCategoryFilter] = useState<ResourceCategory | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  const { resources, loading, hasMore, loadMore, refetch } = useResources({
    category: categoryFilter,
    searchQuery,
  });

  if (selectedResource) {
    return (
      <ResourceDetailView
        resource={selectedResource}
        onBack={() => setSelectedResource(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Resources & Guides</Text>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search resources..."
          placeholderTextColor={colors.mid}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterPill, !categoryFilter && styles.filterPillActive]}
          onPress={() => setCategoryFilter(undefined)}
        >
          <Text style={[styles.filterText, !categoryFilter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {(Object.keys(CATEGORY_CONFIG) as ResourceCategory[]).map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterPill, categoryFilter === cat && styles.filterPillActive]}
            onPress={() => setCategoryFilter(categoryFilter === cat ? undefined : cat)}
          >
            <Text style={[styles.filterText, categoryFilter === cat && styles.filterTextActive]}>
              {CATEGORY_CONFIG[cat].emoji} {CATEGORY_CONFIG[cat].label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={resources}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resourceCard}
            onPress={() => onOpenResource ? onOpenResource(item) : setSelectedResource(item)}
          >
            <View style={styles.resourceHeader}>
              <Text style={styles.resourceTitle}>{item.title}</Text>
              <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_CONFIG[item.difficulty_level].color + '20' }]}>
                <Text style={[styles.difficultyText, { color: DIFFICULTY_CONFIG[item.difficulty_level].color }]}>
                  {DIFFICULTY_CONFIG[item.difficulty_level].label}
                </Text>
              </View>
            </View>
            <Text style={styles.resourceExcerpt} numberOfLines={2}>
              {item.body.slice(0, 150)}...
            </Text>
            <View style={styles.resourceMeta}>
              <Text style={styles.readTime}>{item.estimated_read_time} min read</Text>
              {item.tags.length > 0 && (
                <View style={styles.tagRow}>
                  {item.tags.slice(0, 2).map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No resources found</Text>
          </View>
        }
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: spacing.md }} /> : null}
      />
    </SafeAreaView>
  );
}

/** Resource detail view (S73) */
function ResourceDetailView({ resource, onBack }: { resource: Resource; onBack: () => void }) {
  const catConfig = CATEGORY_CONFIG[resource.category];
  const diffConfig = DIFFICULTY_CONFIG[resource.difficulty_level];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.detailContent}>
        <View style={styles.detailMeta}>
          <Text style={styles.detailCategory}>{catConfig.emoji} {catConfig.label}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: diffConfig.color + '20' }]}>
            <Text style={[styles.difficultyText, { color: diffConfig.color }]}>{diffConfig.label}</Text>
          </View>
          <Text style={styles.detailReadTime}>{resource.estimated_read_time} min read</Text>
        </View>
        <Text style={styles.detailTitle}>{resource.title}</Text>
        <Text style={styles.detailBody}>{resource.body}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  searchBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput: { backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fonts.sizes.sm, color: colors.dark },
  filterRow: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.light },
  filterPillActive: { backgroundColor: colors.teal },
  filterText: { fontSize: 11, color: colors.dark },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  resourceCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  resourceTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy, flex: 1 },
  difficultyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.sm },
  difficultyText: { fontSize: 9, fontWeight: fonts.weights.medium as '500' },
  resourceExcerpt: { fontSize: fonts.sizes.xs, color: colors.dark, lineHeight: 18, marginTop: spacing.sm },
  resourceMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  readTime: { fontSize: fonts.sizes.xs, color: colors.mid },
  tagRow: { flexDirection: 'row', gap: 4 },
  tag: { backgroundColor: colors.light, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  tagText: { fontSize: 9, color: colors.mid },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  // Detail
  detailHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText: { fontSize: fonts.sizes.sm, color: colors.teal },
  detailContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  detailMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  detailCategory: { fontSize: fonts.sizes.xs, color: colors.teal },
  detailReadTime: { fontSize: fonts.sizes.xs, color: colors.mid },
  detailTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.lg, lineHeight: 28 },
  detailBody: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 24 },
});
