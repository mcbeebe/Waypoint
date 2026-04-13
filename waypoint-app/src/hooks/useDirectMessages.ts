/**
 * Direct Messages hook — send/receive DMs with conversation list
 * Phase 5: Sprint S44
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { DirectMessage } from '@/types/database';

interface Conversation {
  recipientId: string;
  recipientName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface UseDirectMessagesReturn {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  unreadTotal: number;
  fetchConversation: (recipientId: string) => Promise<DirectMessage[]>;
  sendMessage: (recipientId: string, body: string) => Promise<DirectMessage | null>;
  markConversationRead: (senderId: string) => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useDirectMessages(): UseDirectMessagesReturn {
  const [allMessages, setAllMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data, error: dbError } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(500);

      if (dbError) throw new Error(dbError.message);
      setAllMessages((data as DirectMessage[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  /** Build conversation list from messages */
  const conversations = useMemo((): Conversation[] => {
    if (!currentUserId) return [];

    const convMap = new Map<string, {
      recipientId: string;
      lastMessage: string;
      lastMessageAt: string;
      unreadCount: number;
    }>();

    for (const msg of allMessages) {
      const otherId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
      const existing = convMap.get(otherId);

      if (!existing || msg.created_at > existing.lastMessageAt) {
        convMap.set(otherId, {
          recipientId: otherId,
          lastMessage: msg.body.slice(0, 100),
          lastMessageAt: msg.created_at,
          unreadCount: existing?.unreadCount ?? 0,
        });
      }

      if (msg.recipient_id === currentUserId && !msg.is_read) {
        const curr = convMap.get(otherId);
        if (curr) curr.unreadCount++;
      }
    }

    return Array.from(convMap.values())
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .map((c) => ({
        ...c,
        recipientName: c.recipientId.slice(0, 8), // Placeholder — real app would join user profiles
      }));
  }, [allMessages, currentUserId]);

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, c) => sum + c.unreadCount, 0),
    [conversations]
  );

  const fetchConversation = useCallback(async (recipientId: string): Promise<DirectMessage[]> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error: dbError } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (dbError) throw new Error(dbError.message);
      return (data as DirectMessage[]) ?? [];
    } catch {
      return [];
    }
  }, []);

  const sendMessage = useCallback(async (recipientId: string, body: string): Promise<DirectMessage | null> => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: created, error: dbError } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          body,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const msg = created as DirectMessage;
      setAllMessages((prev) => [msg, ...prev]);
      return msg;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const markConversationRead = useCallback(async (senderId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('recipient_id', user.id)
        .eq('is_read', false);

      setAllMessages((prev) =>
        prev.map((m) =>
          m.sender_id === senderId && m.recipient_id === user.id && !m.is_read
            ? { ...m, is_read: true }
            : m
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const blockUser = useCallback(async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('user_blocks').insert({
        blocker_id: user.id,
        blocked_id: userId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  return { conversations, loading, error, unreadTotal, fetchConversation, sendMessage, markConversationRead, blockUser, refetch };
}
