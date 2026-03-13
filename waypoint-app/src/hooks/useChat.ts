/**
 * Chat hook — manages AI Navigator conversation state
 * Handles message persistence, streaming, and RAG retrieval
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { retrieveContext } from '@/lib/rag';
import { streamNavigatorResponse, classifyIntent } from '@/lib/ai';
import type { ChatContext, ChatMessage, ToneLevel } from '@/types/database';

/** Runtime message type (includes streaming state) */
export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  sources?: Array<{ source: string; similarity: number }>;
  createdAt: string;
}

interface UseChatOptions {
  familyId: string;
  context: ChatContext;
  anthropicKey: string;
  openAiKey: string;
}

interface UseChatReturn {
  messages: UIMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  toneLevel: ToneLevel;
  sendMessage: (text: string) => Promise<void>;
  setToneLevel: (tone: ToneLevel) => void;
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => void;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const { familyId, context, anthropicKey, openAiKey } = options;

  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [toneLevel, setToneLevel] = useState<ToneLevel>(context.toneLevel);
  const abortRef = useRef<AbortController | null>(null);

  /** Create a new chat session in Supabase */
  const createSession = useCallback(async (firstMessage: string): Promise<string> => {
    const title = firstMessage.slice(0, 100) + (firstMessage.length > 100 ? '...' : '');
    const { data, error: dbError } = await supabase
      .from('chat_sessions')
      .insert({ family_id: familyId, title })
      .select('id')
      .single();

    if (dbError) throw new Error(`Failed to create session: ${dbError.message}`);
    return data.id;
  }, [familyId]);

  /** Persist a message to Supabase */
  const persistMessage = useCallback(async (
    sid: string,
    role: 'user' | 'assistant',
    content: string,
    sources?: Record<string, unknown>[]
  ) => {
    const { error: dbError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sid,
        role,
        content,
        sources: sources ?? null,
      });

    if (dbError) {
      console.warn('Failed to persist message:', dbError.message);
    }
  }, []);

  /** Send a user message and get AI response */
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;
    setError(null);
    setIsLoading(true);

    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    // Add user message to UI immediately
    setMessages((prev) => [...prev, userMessage]);

    // Add placeholder assistant message for streaming
    const assistantId = `assistant-${Date.now()}`;
    const placeholderMessage: UIMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, placeholderMessage]);

    try {
      // Create session if needed
      let sid = sessionId;
      if (!sid) {
        sid = await createSession(text);
        setSessionId(sid);
      }

      // Persist user message
      await persistMessage(sid, 'user', text.trim());

      // Step 1: Classify intent (fast, uses Haiku)
      const classification = await classifyIntent(text, anthropicKey);

      // Step 2: Retrieve relevant KB articles via RAG
      const ragResult = await retrieveContext(text, openAiKey, {
        matchCount: 5,
        filterSource: classification.sources[0] ?? null,
      });

      // Step 3: Build conversation history for API
      const apiMessages = messages
        .filter((m) => !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: 'user' as const, content: text.trim() });

      // Step 4: Stream AI response
      const currentContext: ChatContext = { ...context, toneLevel };

      await streamNavigatorResponse(
        apiMessages,
        currentContext,
        ragResult.context,
        anthropicKey,
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: m.content + token }
                  : m
              )
            );
          },
          onComplete: async (fullText) => {
            // Finalize the message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: fullText,
                      isStreaming: false,
                      sources: ragResult.sources.map((s) => ({
                        source: s.source,
                        similarity: s.similarity,
                      })),
                    }
                  : m
              )
            );

            // Persist assistant response
            await persistMessage(sid!, 'assistant', fullText, ragResult.sources as unknown as Record<string, unknown>[]);
            setIsLoading(false);
          },
          onError: (err) => {
            setError(err.message);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
                  : m
              )
            );
            setIsLoading(false);
          },
        }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
            : m
        )
      );
      setIsLoading(false);
    }
  }, [isLoading, sessionId, messages, toneLevel, context, anthropicKey, openAiKey, createSession, persistMessage]);

  /** Load an existing chat session */
  const loadSession = useCallback(async (sid: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sid)
        .order('created_at', { ascending: true });

      if (dbError) throw new Error(dbError.message);

      const loaded: UIMessage[] = (data ?? []).map((msg: ChatMessage) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources as UIMessage['sources'],
        createdAt: msg.created_at,
      }));

      setMessages(loaded);
      setSessionId(sid);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  /** Start a new conversation */
  const startNewSession = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sessionId,
    toneLevel,
    sendMessage,
    setToneLevel,
    loadSession,
    startNewSession,
  };
}
