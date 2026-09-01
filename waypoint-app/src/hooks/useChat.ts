/**
 * Chat hook — manages AI Navigator conversation state
 * Handles message persistence, streaming, and RAG retrieval
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyErrorMessage } from '@/lib/netRetry';
import { retrieveMultiSourceContext, type RAGResult } from '@/lib/rag';
import { streamNavigatorResponse, classifyIntent } from '@/lib/ai';
import type { ApiChatMessage, ChatContentBlock } from '@/lib/ai';
import { thumbUri } from '@/lib/chatImages';
import type { ChatImage } from '@/lib/chatImages';
import { parseTrailers, hasRichMeta, type ChatMeta } from '@/lib/followups';
import { trackEvent } from '@/lib/analytics';
import { extractMemoriesFromExchange } from '@/hooks/useMemories';
import type { ChatContext, ChatMessage, ToneLevel } from '@/types/database';

/** Runtime message type (includes streaming state) */
export interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  sources?: Array<{ source: string; section?: string | null; similarity: number }>;
  /** Tappable follow-up suggestions parsed from the response trailer */
  followUps?: string[];
  /** Structured card metadata (steps, rights, resources…) parsed from trailers */
  meta?: ChatMeta;
  /** Attached photo thumbnails (data URIs) — in-memory only, not persisted */
  images?: string[];
  createdAt: string;
}

interface UseChatOptions {
  familyId: string;
  context: ChatContext;
}

interface UseChatReturn {
  messages: UIMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  toneLevel: ToneLevel;
  sendMessage: (text: string, images?: ChatImage[]) => Promise<void>;
  setToneLevel: (tone: ToneLevel) => void;
  loadSession: (sessionId: string) => Promise<void>;
  startNewSession: () => void;
}

export function useChat(options: UseChatOptions): UseChatReturn {
  const { familyId, context } = options;

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

  /** Persist a message to Supabase (meta keeps the rich answer cards on reload) */
  const persistMessage = useCallback(async (
    sid: string,
    role: 'user' | 'assistant',
    content: string,
    sources?: Record<string, unknown>[],
    meta?: ChatMeta
  ) => {
    const { error: dbError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sid,
        role,
        content,
        sources: sources ?? null,
        meta: meta && (hasRichMeta(meta) || meta.followUps.length > 0) ? meta : null,
      });

    if (dbError) {
      console.warn('Failed to persist message:', dbError.message);
    }
  }, []);

  /** Send a user message (optionally with photo attachments) and get AI response */
  const sendMessage = useCallback(async (text: string, images?: ChatImage[]) => {
    const hasImages = !!images && images.length > 0;
    if ((!text.trim() && !hasImages) || isLoading) return;
    setError(null);
    setIsLoading(true);

    // Photos with no question still deserve a useful answer.
    const effectiveText =
      text.trim() ||
      'I attached photos of a document. Please read them and tell me what matters.';

    const userMessage: UIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text.trim() || '(photos attached)',
      images: hasImages ? images.map(thumbUri) : undefined,
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
        sid = await createSession(effectiveText);
        setSessionId(sid);
      }

      // Persist user message (text only — base64 photos stay in memory; a
      // reloaded session shows the note instead of the images)
      await persistMessage(
        sid,
        'user',
        hasImages
          ? `${text.trim() || '(photos attached)'}${text.trim() ? `\n[${images!.length} photo${images!.length === 1 ? '' : 's'} attached]` : ''}`
          : text.trim()
      );

      // Step 1: Classify intent (fast, uses Haiku)
      // Note: classification.suggestedTone is intentionally unused — auto-
      // switching tone would silently override the user's tone-bar choice.
      const classification = await classifyIntent(effectiveText);

      // Step 2: Retrieve relevant KB articles via RAG (multi-source for
      // cross-topic queries). Retrieval is optional: if it fails (e.g. no
      // embedding provider configured), answer from general knowledge
      // instead of failing the whole message.
      let ragResult: RAGResult;
      try {
        ragResult = await retrieveMultiSourceContext(effectiveText, classification.sources, {
          matchCount: 5,
        });
      } catch (ragError) {
        console.warn('[useChat] KB retrieval unavailable, continuing without it:', ragError);
        ragResult = { context: '', sources: [], queryTimeMs: 0, confidence: 'none' };
      }

      // Step 3: Build conversation history for API
      const apiMessages: ApiChatMessage[] = messages
        .filter((m) => !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content }));
      // Images ride as vision content blocks, before the text (API guidance).
      apiMessages.push(
        hasImages
          ? {
              role: 'user' as const,
              content: [
                ...images!.map<ChatContentBlock>((img) => ({
                  type: 'image',
                  source: { type: 'base64', media_type: img.media_type, data: img.data },
                })),
                { type: 'text', text: effectiveText },
              ],
            }
          : { role: 'user' as const, content: effectiveText }
      );

      // Step 4: Stream AI response
      const currentContext: ChatContext = { ...context, toneLevel };

      await streamNavigatorResponse(
        apiMessages,
        currentContext,
        ragResult.context,
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
            // Strip ALL [[...]] trailers BEFORE display/persistence so the
            // DB, Save-as-Action, and Email never see them; keep the parsed
            // metadata for card rendering.
            const { content, meta } = parseTrailers(fullText);

            // Finalize the message
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content,
                      followUps: meta.followUps,
                      meta,
                      isStreaming: false,
                      sources: ragResult.sources.map((s) => ({
                        source: s.source,
                        section: s.section ?? null,
                        similarity: s.similarity,
                      })),
                    }
                  : m
              )
            );

            // Persist assistant response (with card meta, so saved chats
            // reload with the same rich formatting)
            await persistMessage(sid!, 'assistant', content, ragResult.sources as unknown as Record<string, unknown>[], meta);

            // Memory extraction (P2): learn durable insights from this
            // exchange in the background so the AI knows the family better
            // next time. Fire-and-forget.
            extractMemoriesFromExchange([
              { role: 'user', content: effectiveText },
              { role: 'assistant', content },
            ]);

            // Anonymous exchange analytics (topic + urgency only, no text)
            trackEvent({
              familyId,
              eventType: 'chat_exchange',
              eventData: {
                category: meta.category ?? 'unknown',
                urgency: meta.urgency ?? 'low',
              },
              regionalCenter: context.regionalCenter ?? undefined,
            });
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
        },
        ragResult.confidence
      );
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't reach the Waypoint Navigator."));
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
            : m
        )
      );
      setIsLoading(false);
    }
  }, [isLoading, sessionId, messages, toneLevel, context, createSession, persistMessage]);

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

      const loaded: UIMessage[] = (data ?? []).map((msg: ChatMessage) => {
        const meta = (msg.meta as unknown as ChatMeta) ?? undefined;
        return {
          id: msg.id,
          role: msg.role,
          content: msg.content,
          sources: msg.sources as UIMessage['sources'],
          meta,
          followUps: meta?.followUps,
          createdAt: msg.created_at,
        };
      });

      setMessages(loaded);
      setSessionId(sid);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't reach the Waypoint Navigator."));
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
