/**
 * Blog screen — Feed with featured hero, category tabs, and article reader
 * Phase 10: Sprint S75
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBlog } from '@/hooks/useBlog';
import type { BlogPost, BlogCategory } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const BLOG_CATEGORIES: Array<{ key: BlogCategory; label: string }> = [
  { key: 'advocacy', label: 'Advocacy' },
  { key: 'news', label: 'News' },
  { key: 'guides', label: 'Guides' },
  { key: 'stories', label: 'Stories' },
  { key: 'updates', label: 'Updates' },
];

export default function BlogScreen() {
  const [categoryFilter, setCategoryFilter] = useState<BlogCategory | undefined>(undefined);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const { posts, featuredPost, loading, hasMore, loadMore, refetch } = useBlog({ category: categoryFilter });

  if (selectedPost) {
    return (
      <BlogPostView post={selectedPost} onBack={() => setSelectedPost(null)} />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Blog</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterPill, !categoryFilter && styles.filterPillActive]}
          onPress={() => setCategoryFilter(undefined)}
        >
          <Text style={[styles.filterText, !categoryFilter && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {BLOG_CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.filterPill, categoryFilter === cat.key && styles.filterPillActive]}
            onPress={() => setCategoryFilter(categoryFilter === cat.key ? undefined : cat.key)}
          >
            <Text style={[styles.filterText, categoryFilter === cat.key && styles.filterTextActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          featuredPost ? (
            <TouchableOpacity style={styles.featuredCard} onPress={() => setSelectedPost(featuredPost)}>
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
              <Text style={styles.featuredTitle}>{featuredPost.title}</Text>
              {featuredPost.excerpt && (
                <Text style={styles.featuredExcerpt}>{featuredPost.excerpt}</Text>
              )}
              <View style={styles.featuredMeta}>
                <Text style={styles.metaAuthor}>{featuredPost.author}</Text>
                {featuredPost.published_at && (
                  <Text style={styles.metaDate}>
                    {new Date(featuredPost.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.postCard} onPress={() => setSelectedPost(item)}>
            <Text style={styles.postCategory}>{item.category.toUpperCase()}</Text>
            <Text style={styles.postTitle}>{item.title}</Text>
            {item.excerpt && <Text style={styles.postExcerpt} numberOfLines={2}>{item.excerpt}</Text>}
            <View style={styles.postMeta}>
              <Text style={styles.metaAuthor}>{item.author}</Text>
              {item.published_at && (
                <Text style={styles.metaDate}>
                  {new Date(item.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </Text>
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
            <Text style={styles.emptyEmoji}>📰</Text>
            <Text style={styles.emptyTitle}>No posts yet</Text>
          </View>
        }
        ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: spacing.md }} /> : null}
      />
    </SafeAreaView>
  );
}

/** Full blog post reader */
function BlogPostView({ post, onBack }: { post: BlogPost; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.articleHeader}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.articleContent}>
        <Text style={styles.articleCategory}>{post.category.toUpperCase()}</Text>
        <Text style={styles.articleTitle}>{post.title}</Text>
        <View style={styles.articleMeta}>
          <Text style={styles.metaAuthor}>{post.author}</Text>
          {post.published_at && (
            <Text style={styles.metaDate}>
              {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </Text>
          )}
        </View>
        <Text style={styles.articleBody}>{post.body}</Text>
        {post.tags.length > 0 && (
          <View style={styles.articleTags}>
            {post.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  filterRow: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.light },
  filterPillActive: { backgroundColor: colors.teal },
  filterText: { fontSize: 11, color: colors.dark },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  // Featured card
  featuredCard: {
    backgroundColor: colors.navy, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md,
  },
  featuredBadge: { backgroundColor: '#F59E0B', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm, marginBottom: spacing.sm },
  featuredBadgeText: { fontSize: 10, color: colors.white, fontWeight: '700' },
  featuredTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.white, lineHeight: 24 },
  featuredExcerpt: { fontSize: fonts.sizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: spacing.sm, lineHeight: 20 },
  featuredMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  // Post card
  postCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  postCategory: { fontSize: 10, color: colors.teal, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  postTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  postExcerpt: { fontSize: fonts.sizes.xs, color: colors.dark, lineHeight: 18, marginTop: 4 },
  postMeta: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  metaAuthor: { fontSize: fonts.sizes.xs, color: colors.teal, fontWeight: fonts.weights.medium as '500' },
  metaDate: { fontSize: fonts.sizes.xs, color: colors.mid },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  // Article view
  articleHeader: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  backText: { fontSize: fonts.sizes.sm, color: colors.teal },
  articleContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  articleCategory: { fontSize: 10, color: colors.teal, fontWeight: '700', letterSpacing: 0.5, marginBottom: spacing.sm },
  articleTitle: { fontSize: 24, fontWeight: '700', color: colors.navy, lineHeight: 30, marginBottom: spacing.sm },
  articleMeta: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  articleBody: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 24 },
  articleTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xl },
  tag: { backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm },
  tagText: { fontSize: 10, color: colors.mid },
});
