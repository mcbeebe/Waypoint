import { describe, it, expect } from 'vitest';
import {
  VERIFIER_BYTES,
  base64UrlFromBase64,
  base64UrlFromBytes,
  isValidVerifier,
  verifierFromBytes,
  challengeFromVerifier,
  statesMatch,
} from './pkce';

const bytes = (n: number, seed = 1) =>
  new Uint8Array(Array.from({ length: n }, (_, i) => (i * 37 + seed) % 256));

describe('base64UrlFromBase64', () => {
  it('swaps the URL-unsafe characters and strips padding', () => {
    expect(base64UrlFromBase64('ab+/cd==')).toBe('ab-_cd');
  });

  it('leaves an already-safe string alone', () => {
    expect(base64UrlFromBase64('abcXYZ019')).toBe('abcXYZ019');
  });
});

describe('verifierFromBytes', () => {
  const verifier = verifierFromBytes(bytes(VERIFIER_BYTES));

  it('produces 43 characters from 32 bytes — the RFC 7636 minimum', () => {
    expect(verifier).toHaveLength(43);
  });

  it('satisfies the RFC alphabet and length rules', () => {
    expect(isValidVerifier(verifier)).toBe(true);
  });

  it('never emits +, / or = — the three that break in a URL', () => {
    expect(verifier).not.toMatch(/[+/=]/);
  });

  it('differs when the bytes differ', () => {
    expect(verifierFromBytes(bytes(VERIFIER_BYTES, 9))).not.toBe(verifier);
  });
});

describe('isValidVerifier', () => {
  it('rejects anything shorter than 43 characters', () => {
    expect(isValidVerifier('a'.repeat(42))).toBe(false);
    expect(isValidVerifier('a'.repeat(43))).toBe(true);
  });

  it('rejects anything longer than 128', () => {
    expect(isValidVerifier('a'.repeat(129))).toBe(false);
  });

  it('rejects characters outside the unreserved set', () => {
    expect(isValidVerifier('a'.repeat(42) + '+')).toBe(false);
  });
});

describe('challengeFromVerifier', () => {
  it('base64url-encodes the digest it is given', async () => {
    const challenge = await challengeFromVerifier('verifier', async () => 'ab+/cd==');
    expect(challenge).toBe('ab-_cd');
  });

  it('passes the verifier through to the digest unchanged', async () => {
    let seen = '';
    await challengeFromVerifier('the-verifier', async (input) => {
      seen = input;
      return 'AAAA';
    });
    expect(seen).toBe('the-verifier');
  });
});

describe('statesMatch', () => {
  it('accepts an exact match', () => {
    expect(statesMatch('abc123', 'abc123')).toBe(true);
  });

  it('rejects a mismatch', () => {
    expect(statesMatch('abc123', 'abc124')).toBe(false);
  });

  it('rejects when either side is missing — no state means no binding', () => {
    expect(statesMatch(null, 'abc')).toBe(false);
    expect(statesMatch('abc', null)).toBe(false);
    expect(statesMatch('', '')).toBe(false);
  });

  it('rejects a length mismatch without throwing', () => {
    expect(statesMatch('abc', 'abcdef')).toBe(false);
  });
});
