/**
 * Gmail API service
 * Read inbox, create drafts, and send emails via the Gmail REST API.
 * Auth tokens managed by auth.ts (stored in SecureStore).
 */

import { getGoogleAccessToken, refreshGoogleToken } from './auth';
import type { GmailMessage } from '@/types/database';

const GMAIL_API = 'https://www.googleapis.com/gmail/v1/users/me';

/** Authenticated fetch with automatic 401 retry via token refresh */
async function gmailFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getGoogleAccessToken();
  if (!token) {
    throw new Error('No Google access token. Please sign in with Google first.');
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const newToken = await refreshGoogleToken();
    if (!newToken) {
      throw new Error('Google token refresh failed. Please sign in again.');
    }
    headers.Authorization = `Bearer ${newToken}`;
    response = await fetch(url, { ...options, headers });
  }

  if (response.status === 429) {
    const retryAfter = parseInt(response.headers.get('Retry-After') ?? '5', 10);
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    response = await fetch(url, { ...options, headers });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API error (${response.status}): ${errorText}`);
  }

  return response;
}

// ─── Read ────────────────────────────────────────────────────────────────────

interface FetchEmailsOptions {
  query?: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
}

interface FetchEmailsResult {
  messages: GmailMessage[];
  nextPageToken: string | null;
  resultSizeEstimate: number;
}

/**
 * Fetch email list from inbox. Returns message IDs + snippets.
 * Use getEmailDetail() for full content.
 */
export async function fetchEmails(
  options: FetchEmailsOptions = {}
): Promise<FetchEmailsResult> {
  const { query, maxResults = 20, pageToken, labelIds } = options;

  const params = new URLSearchParams({ maxResults: String(maxResults) });
  if (query) params.set('q', query);
  if (pageToken) params.set('pageToken', pageToken);
  if (labelIds?.length) params.set('labelIds', labelIds.join(','));

  const response = await gmailFetch(`${GMAIL_API}/messages?${params}`);
  const data = await response.json();

  const messageIds: Array<{ id: string; threadId: string }> = data.messages ?? [];

  // Fetch details for each message (batch of metadata)
  const messages = await Promise.all(
    messageIds.slice(0, maxResults).map(async (msg) => {
      try {
        return await getEmailDetail(msg.id);
      } catch {
        return null;
      }
    })
  );

  return {
    messages: messages.filter((m): m is GmailMessage => m !== null),
    nextPageToken: data.nextPageToken ?? null,
    resultSizeEstimate: data.resultSizeEstimate ?? 0,
  };
}

/**
 * Get full details for a single email message.
 */
export async function getEmailDetail(messageId: string): Promise<GmailMessage> {
  const response = await gmailFetch(
    `${GMAIL_API}/messages/${messageId}?format=full`
  );
  const data = await response.json();

  const headers = parseEmailHeaders(data.payload?.headers ?? []);
  const body = decodeEmailBody(data.payload);

  return {
    id: data.id,
    threadId: data.threadId,
    from: headers.from,
    to: headers.to,
    subject: headers.subject,
    snippet: data.snippet ?? '',
    body,
    date: headers.date,
    labelIds: data.labelIds ?? [],
  };
}

/** Extract common headers from Gmail message payload */
function parseEmailHeaders(
  headers: Array<{ name: string; value: string }>
): { from: string; to: string; subject: string; date: string } {
  const get = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? '';

  return {
    from: get('From'),
    to: get('To'),
    subject: get('Subject'),
    date: get('Date'),
  };
}

/** Decode email body from Gmail MIME payload (handles base64url) */
function decodeEmailBody(payload: Record<string, unknown> | undefined): string {
  if (!payload) return '';

  // Simple text/plain or text/html body
  const body = payload.body as { data?: string; size?: number } | undefined;
  if (body?.data) {
    return base64UrlDecode(body.data);
  }

  // Multipart — look for text/plain first, then text/html
  const parts = payload.parts as Array<Record<string, unknown>> | undefined;
  if (!parts) return '';

  for (const mimeType of ['text/plain', 'text/html']) {
    const part = parts.find((p) => p.mimeType === mimeType);
    const partBody = part?.body as { data?: string } | undefined;
    if (partBody?.data) {
      return base64UrlDecode(partBody.data);
    }
  }

  return '';
}

/** Decode base64url string (Gmail uses URL-safe base64) */
function base64UrlDecode(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

// ─── Draft & Send ────────────────────────────────────────────────────────────

/** Encode an email into RFC 2822 base64url format for Gmail API */
function encodeEmail(to: string, subject: string, body: string): string {
  const raw = [
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n');

  // Base64url encode
  const encoded = btoa(unescape(encodeURIComponent(raw)));
  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Create a draft email in the user's Gmail account.
 * Returns the draft ID for later sending.
 */
export async function createDraft(
  to: string,
  subject: string,
  body: string
): Promise<{ draftId: string; messageId: string }> {
  const raw = encodeEmail(to, subject, body);

  const response = await gmailFetch(`${GMAIL_API}/drafts`, {
    method: 'POST',
    body: JSON.stringify({
      message: { raw },
    }),
  });

  const data = await response.json();
  return {
    draftId: data.id,
    messageId: data.message?.id ?? '',
  };
}

/**
 * Send a previously created draft.
 */
export async function sendDraft(draftId: string): Promise<void> {
  await gmailFetch(`${GMAIL_API}/drafts/send`, {
    method: 'POST',
    body: JSON.stringify({ id: draftId }),
  });
}

/**
 * Send an email directly (without creating a draft first).
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string
): Promise<{ messageId: string }> {
  const raw = encodeEmail(to, subject, body);

  const response = await gmailFetch(`${GMAIL_API}/messages/send`, {
    method: 'POST',
    body: JSON.stringify({ raw }),
  });

  const data = await response.json();
  return { messageId: data.id };
}
