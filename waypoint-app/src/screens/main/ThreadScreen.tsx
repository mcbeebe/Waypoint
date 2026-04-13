/**
 * Thread screen — View posts and replies with reactions
 * Phase 5: Sprint S42
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePosts } from '@/hooks/useForum';
import { useFamily } from '@/hooks/useFamily';
import { useToast } from '@/components/Toast';
import type { ForumThread, ForumPost, ReactionType } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const REACTIONS: ReactionType[] = ['👍', '👏', '❤️'];

export default function ThreadScreen({
  thread,
  onBack,
}: {
  thread: ForumThread;
  onBack?: () => void;
}) {
  const { family } = useFamily();
  const { showToast } = useToast();
  const displayName = family?.parent_first_name ?? 'Anonymous';

  const { posts, loading, createPost, toggleReaction, reportPost, refetch } = usePosts(thread.id);

  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom on new posts
  useEffect(() => {
    if (posts.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [posts.length]);

  const handleSendReply = useCallback(async () => {
    if (!replyText.trim() || isSending) return;
    setIsSending(true);
    const post = await createPost({
      body: replyText.trim(),
      parent_post_id: replyingTo ?? undefined,
      author_display_name: displayName,
    });
    if (post) {
      setReplyText('');
      setReplyingTo(null);
    }
    setIsSending(false);
  }, [replyText, replyingTo, isSending, createPost, displayName]);

  const handleReport = useCallback((postId: string) => {
    Alert.alert('Report Post', 'Why are you reporting this post?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Inappropriate', onPress: () => { reportPost(postId, 'Inappropriate content'); showToast('Report submitted', 'success'); } },
      { text: 'Misinformation', onPress: () => { reportPost(postId, 'Misinformation'); showToast('Report submitted', 'success'); } },
      { text: 'Harassment', onPress: () => { reportPost(postId, 'Harassment'); showToast('Report submitted', 'success'); } },
    ]);
  }, [reportPost, showToast]);

  // Separate top-level posts from replies
  const topLevelPosts = posts.filter((p) => !p.parent_post_id);
  const repliesMap = new Map<string, ForumPost[]>();
  for (const post of posts) {
    if (post.parent_post_id) {
      const existing = repliesMap.get(post.parent_post_id) ?? [];
      existing.push(post);
      repliesMap.set(post.parent_post_id, existing);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{thread.title}</Text>
          <Text style={styles.headerMeta}>by {thread.author_display_name} · {thread.post_count} replies</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Thread Body + Posts */}
        <FlatList
          ref={flatListRef}
          data={[null, ...topLevelPosts]}
          keyExtractor={(item, i) => item?.id ?? 'thread-body'}
          renderItem={({ item }) => {
            if (!item) {
              // Thread body as first item
              return (
                <View style={styles.threadBody}>
                  <Text style={styles.threadBodyAuthor}>{thread.author_display_name}</Text>
                  <Text style={styles.threadBodyText}>{thread.body}</Text>
                  <Text style={styles.threadBodyTime}>{new Date(thread.created_at).toLocaleDateString()}</Text>
                </View>
              );
            }
            return (
              <View>
                <PostCard
                  post={item}
                  onReply={() => setReplyingTo(item.id)}
                  onReaction={(r) => toggleReaction(item.id, r)}
                  onReport={() => handleReport(item.id)}
                />
                {/* Nested replies (1 level) */}
                {repliesMap.get(item.id)?.map((reply) => (
                  <View key={reply.id} style={styles.replyIndent}>
                    <PostCard
                      post={reply}
                      onReaction={(r) => toggleReaction(reply.id, r)}
                      onReport={() => handleReport(reply.id)}
                      isReply
                    />
                  </View>
                ))}
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={loading ? <ActivityIndicator style={{ padding: spacing.xl }} /> : null}
        />

        {/* Reply Bar */}
        {!thread.is_locked && (
          <View style={styles.replyBar}>
            {replyingTo && (
              <View style={styles.replyingTo}>
                <Text style={styles.replyingToText}>Replying to a post</Text>
                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                  <Text style={styles.replyingToCancel}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.replyInputRow}>
              <TextInput
                style={styles.replyInput}
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write a reply..."
                placeholderTextColor={colors.mid}
                multiline
                maxLength={2000}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!replyText.trim() || isSending) && styles.sendButtonDisabled]}
                onPress={handleSendReply}
                disabled={!replyText.trim() || isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.sendIcon}>↑</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {thread.is_locked && (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedText}>This thread is locked</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Post Card ──────────────────────────────────────────────────────────────

function PostCard({
  post,
  onReply,
  onReaction,
  onReport,
  isReply,
}: {
  post: ForumPost;
  onReply?: () => void;
  onReaction: (r: ReactionType) => void;
  onReport: () => void;
  isReply?: boolean;
}) {
  const timeAgo = getTimeAgo(post.created_at);

  return (
    <View style={[styles.postCard, isReply && styles.postCardReply]}>
      <View style={styles.postHeader}>
        <Text style={styles.postAuthor}>{post.author_display_name}</Text>
        <Text style={styles.postTime}>{timeAgo}</Text>
      </View>
      <Text style={styles.postBody}>{post.body}</Text>
      <View style={styles.postActions}>
        {REACTIONS.map((r) => (
          <TouchableOpacity key={r} style={styles.reactionButton} onPress={() => onReaction(r)}>
            <Text style={styles.reactionEmoji}>{r}</Text>
          </TouchableOpacity>
        ))}
        {onReply && (
          <TouchableOpacity style={styles.replyButton} onPress={onReply}>
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.reportButton} onPress={onReport}>
          <Text style={styles.reportButtonText}>Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm,
  },
  backBtn: { paddingRight: spacing.sm },
  backText: { fontSize: fonts.sizes.sm, color: colors.teal },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  headerMeta: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  // Thread body
  threadBody: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md,
    borderLeftWidth: 3, borderLeftColor: colors.teal,
  },
  threadBodyAuthor: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.teal, marginBottom: 4 },
  threadBodyText: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 22 },
  threadBodyTime: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: spacing.sm },
  // Post card
  postCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  postCardReply: { backgroundColor: '#FAFBFC' },
  replyIndent: { marginLeft: 24 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  postAuthor: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  postTime: { fontSize: fonts.sizes.xs, color: colors.mid },
  postBody: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 20, marginBottom: spacing.sm },
  postActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reactionButton: { padding: 4 },
  reactionEmoji: { fontSize: 16 },
  replyButton: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm, backgroundColor: colors.light },
  replyButtonText: { fontSize: 11, color: colors.teal, fontWeight: fonts.weights.medium as '500' },
  reportButton: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm },
  reportButtonText: { fontSize: 11, color: colors.mid },
  // Reply bar
  replyBar: {
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  replyingTo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  replyingToText: { fontSize: fonts.sizes.xs, color: colors.teal },
  replyingToCancel: { fontSize: fonts.sizes.xs, color: colors.mid },
  replyInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  replyInput: {
    flex: 1, backgroundColor: colors.light, borderRadius: radii.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm, color: colors.dark, maxHeight: 80, minHeight: 40,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: colors.border },
  sendIcon: { fontSize: 20, color: colors.white, fontWeight: '700' },
  lockedBanner: { backgroundColor: '#FEF3C7', paddingVertical: spacing.sm, alignItems: 'center' },
  lockedText: { fontSize: fonts.sizes.xs, color: '#92400E' },
});
