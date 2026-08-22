import { describe, it, expect, vi } from 'vitest';
import { isTransientNetworkError, friendlyErrorMessage, retryQuery } from './netRetry';

describe('isTransientNetworkError', () => {
  it('recognises what each platform calls a dead connection', () => {
    expect(isTransientNetworkError('TypeError: Load failed')).toBe(true);      // Safari
    expect(isTransientNetworkError('TypeError: Failed to fetch')).toBe(true);  // Chrome
    expect(isTransientNetworkError('Network request failed')).toBe(true);      // RN
    expect(isTransientNetworkError(new Error('The request timed out'))).toBe(true);
    expect(isTransientNetworkError({ message: 'NetworkError when attempting to fetch' })).toBe(true);
  });

  it('does not mistake a real rejection for a blip', () => {
    expect(isTransientNetworkError('new row violates row-level security policy')).toBe(false);
    expect(isTransientNetworkError('column actions.foo does not exist')).toBe(false);
    expect(isTransientNetworkError(null)).toBe(false);
  });
});

describe('friendlyErrorMessage', () => {
  it('never shows a raw JS network error to a parent', () => {
    const msg = friendlyErrorMessage(new Error('TypeError: Load failed'));
    expect(msg).toBe("Couldn't reach Waypoint — check your connection and try again.");
    expect(msg).not.toMatch(/TypeError/);
  });

  it('explains an expired session and a permission failure', () => {
    expect(friendlyErrorMessage('JWT expired')).toMatch(/session expired/i);
    expect(friendlyErrorMessage('permission denied for table actions')).toMatch(/permission/i);
  });

  it('passes a real database complaint through, minus the JS wrapper', () => {
    expect(friendlyErrorMessage('Error: duplicate key value')).toBe('duplicate key value');
  });

  it('falls back when there is nothing to say', () => {
    expect(friendlyErrorMessage(undefined, 'Could not save.')).toBe('Could not save.');
  });
});

describe('retryQuery', () => {
  const sleep = () => Promise.resolve();

  it('retries a blip and succeeds', async () => {
    const run = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'Load failed' } })
      .mockResolvedValueOnce({ data: ['ok'], error: null });

    const result = await retryQuery(run, { sleep });
    expect(result.data).toEqual(['ok']);
    expect(result.error).toBeNull();
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('gives up after the configured attempts and returns the last error', async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: { message: 'Load failed' } });
    const result = await retryQuery(run, { attempts: 3, sleep });
    expect(run).toHaveBeenCalledTimes(3);
    expect(result.error?.message).toBe('Load failed');
  });

  it('does NOT retry a real error — an honest answer beats a slow one', async () => {
    const run = vi.fn().mockResolvedValue({ data: null, error: { message: 'permission denied' } });
    await retryQuery(run, { sleep });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('treats a thrown fetch failure the same as a returned one', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Load failed'))
      .mockResolvedValueOnce({ data: 'recovered', error: null });
    const result = await retryQuery(run, { sleep });
    expect(result.data).toBe('recovered');
  });
});

describe('friendlyErrorMessage — the messages parents actually saw', () => {
  it('translates Safari’s "Load failed" instead of printing it', () => {
    // This exact string reached the Documents screen as a red banner
    expect(friendlyErrorMessage(new TypeError('Load failed'))).toBe(
      "Couldn't reach Waypoint — check your connection and try again."
    );
  });

  it('translates Chrome’s equivalent the same way', () => {
    expect(friendlyErrorMessage(new TypeError('Failed to fetch'))).toBe(
      friendlyErrorMessage(new TypeError('Load failed'))
    );
  });

  it('uses the caller’s context when there is no message at all', () => {
    expect(friendlyErrorMessage(undefined, "Couldn't load your documents.")).toBe(
      "Couldn't load your documents."
    );
  });

  it('never leaks a raw JS error prefix', () => {
    expect(friendlyErrorMessage(new Error('column "analysis" does not exist'))).not.toMatch(
      /^(TypeError|Error):/
    );
  });
});
