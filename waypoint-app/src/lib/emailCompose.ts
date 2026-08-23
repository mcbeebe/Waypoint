/**
 * Opening a prefilled email, without trapping the parent.
 *
 * Gmail's web compose URL (mail.google.com/mail/?view=cm…) is great on a
 * desktop browser, but on a phone browser Google intercepts it with a
 * "Gmail is better on the app" interstitial that drops the prefilled draft
 * entirely — a dead end mid-task. So phones (native app AND mobile web)
 * get a mailto: link, which opens whatever mail app the parent actually
 * uses with the subject and body intact.
 *
 * Pure module — no react-native imports — so the routing stays testable.
 */

export interface ComposeOptions {
  to?: string;
  subject: string;
  body: string;
}

export interface ComposeEnv {
  /** react-native Platform.OS */
  platformOS: string;
  /** navigator.userAgent on web */
  userAgent?: string;
  /** navigator.maxTouchPoints — iPadOS reports a Mac UA but has touch */
  maxTouchPoints?: number;
}

const MOBILE_UA_RE = /Android|iPhone|iPad|iPod|Windows Phone|Mobile Safari|IEMobile|Opera Mini/i;

/** True when this is a phone/tablet browser, where the Gmail URL breaks down. */
export function isMobileBrowser(env: ComposeEnv): boolean {
  if (env.platformOS !== 'web') return false;
  const ua = env.userAgent ?? '';
  if (MOBILE_UA_RE.test(ua)) return true;
  // iPadOS 13+ masquerades as desktop Macintosh but reports touch points
  return /Macintosh/i.test(ua) && (env.maxTouchPoints ?? 0) > 1;
}

/** mailto: with the subject/body encoded. */
export function mailtoUrl(opts: ComposeOptions): string {
  const params = new URLSearchParams();
  params.set('subject', opts.subject);
  // RFC 2368 requires CRLF (%0D%0A) for line breaks in mailto bodies —
  // Gmail's iOS handler drops lone \n (%0A) and flattens the draft into
  // one paragraph, losing the letter's formatting.
  params.set('body', opts.body.replace(/\r?\n/g, '\r\n'));
  // URLSearchParams encodes spaces as "+", which mail apps render literally
  const query = params.toString().replace(/\+/g, '%20');
  return `mailto:${opts.to ? encodeURIComponent(opts.to) : ''}?${query}`;
}

/** Gmail's web compose window — desktop browsers only. */
export function gmailComposeUrl(opts: ComposeOptions): string {
  const params = new URLSearchParams({ view: 'cm', fs: '1', su: opts.subject, body: opts.body });
  if (opts.to) params.set('to', opts.to);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export interface ComposeTarget {
  url: string;
  /** 'gmail' = desktop Gmail web; 'mail' = the device's mail app */
  kind: 'gmail' | 'mail';
  /** Button label matching where this actually goes */
  label: string;
}

/**
 * Where "send this" should point, given the device.
 * Desktop web → Gmail compose. Everything else → the mail app.
 */
export function composeTarget(opts: ComposeOptions, env: ComposeEnv): ComposeTarget {
  if (env.platformOS === 'web' && !isMobileBrowser(env)) {
    return { url: gmailComposeUrl(opts), kind: 'gmail', label: 'Open in Gmail' };
  }
  return { url: mailtoUrl(opts), kind: 'mail', label: 'Open in Mail app' };
}

/**
 * Very long bodies get truncated by some mail clients' URL handling, so
 * the UI copies the draft to the clipboard as a fallback past this size.
 */
export const LONG_BODY_CHARS = 1800;
