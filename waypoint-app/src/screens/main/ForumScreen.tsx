/**
 * Forum screen — Category list and thread browser with new thread composer
 * Phase 5: Sprints S41, S43
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCategories, useThreads } from '@/hooks/useForum';
import { useFamily } from '@/hooks/useFamily';
import { useToast } from '@/components/Toast';
import type { ForumCategory, ForumThread } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

type ViewMode = 'categories' | 'threads';

export default function ForumScreen({
  onOpenThread,
}: {
  onOpenThread?: (thread: ForumThread) => void;
}) {
  const { family } = useFamily();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('categories');
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | null>(null);
  const [showComposer, setShowComposer] = useState(false);

  const { categories, loading: loadingCats, refetch: refetchCats } = useCategories();
  const {
    threads,
    loading: loadingThreads,
    hasMore,
    loadMore,
    createThread,
    refetch: refetchThreads,
  } = useThreads({ categoryId: selectedCategory?.id });

  const handleSelectCategory = useCallback((cat: ForumCategory) => {
    setSelectedCategory(cat);
    setViewMode('threads');
  }, []);

  const handleBackToCategories = useCallback(() => {
    setSelectedCategory(null);
    setViewMode('categories');
  }, []);

  const handleCreateThread = useCallback(async (data: {
    title: string;
    body: string;
    tags: string[];
  }) => {
    if (!selectedCategory) return;
    const displayName = family?.parent_first_name ?? 'Anonymous';
    const thread = await createThread({
      category_id: selectedCategory.id,
      title: data.title,
      body: data.body,
      tags: data.tags,
      author_display_name: displayName,
    });
    if (thread) {
      showToast('Thread created!', 'success');
      setShowComposer(false);
    }
  }, [selectedCategory, family, createThread, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {viewMode === 'threads' && (
          <TouchableOpacity onPress={handleBackToCategories} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {viewMode === 'categories' ? 'Community' : selectedCategory?.name ?? 'Threads'}
          </Text>
          {viewMode === 'categories' && (
            <Text style={styles.headerSubtitle}>Connect with other families</Text>
          )}
        </View>
        {viewMode === 'threads' && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowComposer(true)}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {viewMode === 'categories' ? (
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.categoryCard} onPress={() => handleSelectCategory(item)}>
              <Text style={styles.categoryEmoji}>{item.emoji}</Text>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryName}>{item.name}</Text>
                {item.description && <Text style={styles.categoryDesc}>{item.description}</Text>}
              </View>
              <View style={styles.categoryMeta}>
                <Text style={styles.threadCount}>{item.thread_count}</Text>
                <Text style={styles.threadCountLabel}>threads</Text>
              </View>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={loadingCats} onRefresh={refetchCats} />}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ThreadCard thread={item} onPress={() => onOpenThread?.(item)} />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={loadingThreads} onRefresh={refetchThreads} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No threads yet</Text>
              <Text style={styles.emptySubtitle}>Start the conversation!</Text>
            </View>
          }
          ListFooterComponent={hasMore ? <ActivityIndicator style={{ padding: spacing.md }} /> : null}
        />
      )}

      {/* New Thread Composer (S43) */}
      <ThreadComposer
        visible={showComposer}
        onSubmit={handleCreateThread}
        onClose={() => setShowComposer(false)}
      />
    </SafeAreaView>
  );
}

// ─── Thread Card ────────────────────────────────────────────────────────────

function ThreadCard({ thread, onPress }: { thread: ForumThread; onPress: () => void }) {
  const timeAgo = getTimeAgo(thread.last_post_at);

  return (
    <TouchableOpacity style={styles.threadCard} onPress={onPress}>
      <View style={styles.threadHeader}>
        {thread.is_pinned && <Text style={styles.pinnedBadge}>Pinned</Text>}
        <Text style={styles.threadTitle} numberOfLines={2}>{thread.title}</Text>
      </View>
      <Text style={styles.threadBody} numberOfLines={2}>{thread.body}</Text>
      <View style={styles.threadMeta}>
        <Text style={styles.threadAuthor}>{thread.author_display_name}</Text>
        <Text style={styles.threadDot}>·</Text>
        <Text style={styles.threadTime}>{timeAgo}</Text>
        <Text style={styles.threadDot}>·</Text>
        <Text style={styles.threadReplies}>{thread.post_count} replies</Text>
      </View>
      {thread.tags.length > 0 && (
        <View style={styles.tagRow}>
          {thread.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Thread Composer (S43) ──────────────────────────────────────────────────

function ThreadComposer({
  visible,
  onSubmit,
  onClose,
}: {
  visible: boolean;
  onSubmit: (data: { title: string; body: string; tags: string[] }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSaving(true);
    await onSubmit({ title: title.trim(), body: body.trim(), tags });
    setIsSaving(false);
    setTitle('');
    setBody('');
    setTagInput('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>New Thread</Text>
          <ScrollView>
            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="What's on your mind?"
              placeholderTextColor={colors.mid}
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.fieldLabel}>Message *</Text>
            <TextInput
              style={[styles.formInput, { height: 120, textAlignVertical: 'top' }]}
              placeholder="Share your question, experience, or advice..."
              placeholderTextColor={colors.mid}
              value={body}
              onChangeText={setBody}
              multiline
            />
            <Text style={styles.fieldLabel}>Tags (comma-separated)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g., IEP, autism, Regional Center"
              placeholderTextColor={colors.mid}
              value={tagInput}
              onChangeText={setTagInput}
            />
          </ScrollView>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (isSaving || !title.trim() || !body.trim()) && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving || !title.trim() || !body.trim()}
            >
              {isSaving ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.saveText}>Post</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  backBtn: { paddingRight: spacing.sm },
  backText: { fontSize: fonts.sizes.sm, color: colors.teal },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  headerSubtitle: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  addButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  addButtonText: { fontSize: 20, color: colors.white, fontWeight: '700' },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  // Category card
  categoryCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radii.md, padding: spacing.md, marginBottom: 8, gap: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  categoryEmoji: { fontSize: 28 },
  categoryInfo: { flex: 1 },
  categoryName: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  categoryDesc: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  categoryMeta: { alignItems: 'center' },
  threadCount: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.teal },
  threadCountLabel: { fontSize: 9, color: colors.mid },
  // Thread card
  threadCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  threadHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  pinnedBadge: { fontSize: 9, color: '#D97706', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm, fontWeight: '600' },
  threadTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy, flex: 1 },
  threadBody: { fontSize: fonts.sizes.xs, color: colors.dark, lineHeight: 18, marginBottom: spacing.sm },
  threadMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  threadAuthor: { fontSize: fonts.sizes.xs, color: colors.teal, fontWeight: fonts.weights.medium as '500' },
  threadDot: { fontSize: fonts.sizes.xs, color: colors.mid },
  threadTime: { fontSize: fonts.sizes.xs, color: colors.mid },
  threadReplies: { fontSize: fonts.sizes.xs, color: colors.mid },
  tagRow: { flexDirection: 'row', gap: 4, marginTop: spacing.sm },
  tag: { backgroundColor: colors.light, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.sm },
  tagText: { fontSize: 10, color: colors.mid },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, marginTop: spacing.sm },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '85%' },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.md },
  fieldLabel: { fontSize: fonts.sizes.xs, color: colors.mid, fontWeight: fonts.weights.medium as '500', marginBottom: 4, marginTop: spacing.sm },
  formInput: { backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.base, fontSize: fonts.sizes.sm, color: colors.dark },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: fonts.sizes.sm, color: colors.mid },
  saveButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, backgroundColor: colors.teal },
  saveButtonDisabled: { backgroundColor: colors.border },
  saveText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.medium as '500' },
});
