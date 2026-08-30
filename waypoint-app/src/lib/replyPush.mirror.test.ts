/**
 * The `push-send` Edge Function ships a hand-copy of replyPush.ts at
 * supabase/functions/_shared/replyPush.ts (Deno cannot import app code). This
 * test imports BOTH and asserts they behave identically, so the copy that
 * actually reaches families can never silently drift from the tested one.
 *
 * The shared file is deliberately plain TypeScript with no Deno APIs and no
 * remote imports, precisely so vitest can load it here.
 */
import { describe, it, expect } from 'vitest';
import * as app from './replyPush';
import * as shipped from '../../supabase/functions/_shared/replyPush';
import type { ReplyRow } from './replyPush';

describe('the shipped Edge copy mirrors the tested module', () => {
  it('replyCopy is identical for every locale and both plurals', () => {
    for (const loc of ['en', 'es', 'vi'] as const) {
      for (const n of [1, 2, 5]) {
        expect(shipped.replyCopy(n, loc)).toEqual(app.replyCopy(n, loc));
      }
    }
  });

  it('pushLocale normalizes identically', () => {
    for (const raw of ['es', 'es-MX', 'vi', 'en-US', 'fr', '', null]) {
      expect(shipped.pushLocale(raw)).toBe(app.pushLocale(raw));
    }
  });

  it('the selection rule is identical on a mixed fixture', () => {
    const rows: ReplyRow[] = [
      { id: 'a', family_id: 'F', direction: 'incoming', gmail_thread_id: 't1', occurred_at: '2026-08-30T12:00:00Z', notified_at: null },
      { id: 'b', family_id: 'F', direction: 'outgoing', gmail_thread_id: 't1', occurred_at: '2026-08-30T13:00:00Z', notified_at: null },
      { id: 'c', family_id: 'G', direction: 'incoming', gmail_thread_id: 't2', occurred_at: '2026-08-30T12:00:00Z', notified_at: '2026-08-30T12:30:00Z' },
      { id: 'd', family_id: 'G', direction: 'incoming', gmail_thread_id: null, occurred_at: '2026-08-30T12:00:00Z', notified_at: null },
    ];
    expect(shipped.pendingReplyPushes(rows).map((r) => r.id)).toEqual(
      app.pendingReplyPushes(rows).map((r) => r.id)
    );
  });
});
