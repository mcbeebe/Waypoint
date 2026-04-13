/**
 * Messages screen — Direct messaging conversation list and chat
 * Phase 5: Sprint S45
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { useToast } from '@/components/Toast';
import type { DirectMessage } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

type ViewMode = 'list' | 'conversation';

export default function MessagesScreen() {
  const { showToast } = useToast();
  const {
    conversations,
    loading,
    unreadTotal,
    fetchConversation,
    sendMessage,
    markConversationRead,
    blockUser,
    refetch,
  } = useDirectMessages();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [selectedRecipientName, setSelectedRecipientName] = useState('');
  const [conversationMessages, setConversationMessages] = useState<DirectMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const openConversation = useCallback(async (recipientId: string, recipientName: string) => {
    setSelectedRecipientId(recipientId);
    setSelectedRecipientName(recipientName);
    setViewMode('conversation');
    setLoadingConv(true);
    const msgs = await fetchConversation(recipientId);
    setConversationMessages(msgs);
    setLoadingConv(false);
    await markConversationRead(recipientId);
  }, [fetchConversation, markConversationRead]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || !selectedRecipientId || isSending) return;
    setIsSending(true);
    const msg = await sendMessage(selectedRecipientId, messageText.trim());
    if (msg) {
      setConversationMessages((prev) => [...prev, msg]);
      setMessageText('');
    }
    setIsSending(false);
  }, [messageText, selectedRecipientId, isSending, sendMessage]);

  useEffect(() => {
    if (conversationMessages.length > 0 && viewMode === 'conversation') {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [conversationMessages.length, viewMode]);

  const handleBlock = useCallback(async () => {
    if (!selectedRecipientId) return;
    await blockUser(selectedRecipientId);
    showToast('User blocked', 'success');
    setViewMode('list');
  }, [selectedRecipientId, blockUser, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {viewMode === 'conversation' && (
          <TouchableOpacity onPress={() => setViewMode('list')} style={styles.backBtn}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {viewMode === 'list' ? 'Messages' : selectedRecipientName}
          </Text>
          {viewMode === 'list' && unreadTotal > 0 && (
            <Text style={styles.headerSubtitle}>{unreadTotal} unread</Text>
          )}
        </View>
        {viewMode === 'conversation' && (
          <TouchableOpacity onPress={handleBlock} style={styles.blockBtn}>
            <Text style={styles.blockText}>Block</Text>
          </TouchableOpacity>
        )}
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.recipientId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convCard}
              onPress={() => openConversation(item.recipientId, item.recipientName)}
            >
              <View style={styles.convAvatar}>
                <Text style={styles.convAvatarText}>
                  {item.recipientName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.convInfo}>
                <Text style={styles.convName}>{item.recipientName}</Text>
                <Text style={styles.convPreview} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              <View style={styles.convMeta}>
                <Text style={styles.convTime}>{getTimeAgo(item.lastMessageAt)}</Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>✉️</Text>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>Message other parents from the community forum</Text>
            </View>
          }
        />
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={90}
        >
          {loadingConv ? (
            <ActivityIndicator style={{ padding: spacing.xl }} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={conversationMessages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isMine = item.sender_id !== selectedRecipientId;
                return (
                  <View style={[styles.msgRow, isMine && styles.msgRowMine]}>
                    <View style={[styles.msgBubble, isMine ? styles.msgBubbleMine : styles.msgBubbleTheirs]}>
                      <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{item.body}</Text>
                    </View>
                  </View>
                );
              }}
              contentContainerStyle={styles.msgListContent}
            />
          )}

          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              placeholderTextColor={colors.mid}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!messageText.trim() || isSending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!messageText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.sendIcon}>↑</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

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
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  headerSubtitle: { fontSize: fonts.sizes.xs, color: colors.teal, marginTop: 2 },
  blockBtn: { paddingHorizontal: spacing.sm },
  blockText: { fontSize: fonts.sizes.xs, color: '#DC2626' },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  // Conversation card
  convCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radii.md, padding: spacing.md, marginBottom: 6, gap: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  convAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  convAvatarText: { fontSize: 16, color: colors.white, fontWeight: '700' },
  convInfo: { flex: 1 },
  convName: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.navy },
  convPreview: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  convMeta: { alignItems: 'flex-end', gap: 4 },
  convTime: { fontSize: fonts.sizes.xs, color: colors.mid },
  unreadBadge: { backgroundColor: colors.teal, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { fontSize: 10, color: colors.white, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, marginTop: spacing.sm, textAlign: 'center' },
  // Conversation view
  msgListContent: { padding: spacing.md, paddingBottom: spacing.xl },
  msgRow: { marginBottom: spacing.sm },
  msgRowMine: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '78%', borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.base },
  msgBubbleMine: { backgroundColor: colors.teal, borderBottomRightRadius: 4 },
  msgBubbleTheirs: { backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  msgText: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 20 },
  msgTextMine: { color: colors.white },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, gap: 8,
  },
  input: {
    flex: 1, backgroundColor: colors.light, borderRadius: radii.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm, color: colors.dark, maxHeight: 80, minHeight: 40,
  },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { backgroundColor: colors.border },
  sendIcon: { fontSize: 20, color: colors.white, fontWeight: '700' },
});
