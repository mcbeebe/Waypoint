/**
 * PKCE (RFC 7636) for the SMART on FHIR authorization code flow.
 *
 * Epic requires PKCE with the S256 method for every public client, which
 * is what Waypoint is: a phone app can't hold a client secret, so the
 * proof that the app redeeming the code is the one that requested it has
 * to come from a verifier it generated and kept.
 *
 * The encoding and shape rules live here as pure functions so they can be
 * tested without a crypto backend or a network. Callers inject the random
 * bytes and the SHA-256 digest.
 */

/** RFC 7636: 43–128 chars from the unreserved set. 32 bytes → 43 chars. */
export const VERIFIER_BYTES = 32;
const MIN_VERIFIER_LEN = 43;
const MAX_VERIFIER_LEN = 128;

/**
 * base64url per RFC 4648 §5: the base64 alphabet with +/ swapped for -_
 * and the padding removed. Plain base64 in a URL is a silent 400 later.
 */
export function base64UrlFromBase64(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** base64url-encode raw bytes. */
export function base64UrlFromBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  const base64 =
    typeof btoa === 'function'
      ? btoa(binary)
      : // Node / test environments
        Buffer.from(binary, 'binary').toString('base64');
  return base64UrlFromBase64(base64);
}

/** True when a verifier satisfies RFC 7636's length and alphabet rules. */
export function isValidVerifier(verifier: string): boolean {
  return (
    verifier.length >= MIN_VERIFIER_LEN &&
    verifier.length <= MAX_VERIFIER_LEN &&
    /^[A-Za-z0-9\-._~]+$/.test(verifier)
  );
}

/** Build a verifier from random bytes. */
export function verifierFromBytes(bytes: Uint8Array): string {
  return base64UrlFromBytes(bytes);
}

/**
 * The challenge sent on the authorize request: base64url(SHA256(verifier)).
 *
 * `sha256Base64` returns a standard base64 digest — expo-crypto's
 * CryptoEncoding.BASE64 — and this converts it to base64url.
 */
export async function challengeFromVerifier(
  verifier: string,
  sha256Base64: (input: string) => Promise<string>
): Promise<string> {
  return base64UrlFromBase64(await sha256Base64(verifier));
}

/** An opaque value binding a callback to the request that started it. */
export function stateFromBytes(bytes: Uint8Array): string {
  return base64UrlFromBytes(bytes);
}

/**
 * Constant-time-ish equality for the returned `state`. Not a secret
 * comparison in the cryptographic sense, but it avoids the early-exit
 * that makes a naive `===` leak length.
 */
export function statesMatch(expected: string | null, received: string | null): boolean {
  if (!expected || !received) return false;
  if (expected.length !== received.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return diff === 0;
}
