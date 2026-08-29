/**
 * Request dossier (Request Case File plan, phase 3) — the one-request
 * evidence packet a parent hands an advocate, a fair-hearing officer, or a
 * compliance unit. FREE for every family: the export IS the leverage, and
 * gating it would gate the family's own record.
 *
 * Honesty rules, same as the case screen:
 * - Chronology uses eventAt() (the honest event time), never the stamped
 *   sent_at of a backdated hand-logged entry.
 * - Every item states its provenance; recalled items show BOTH dates
 *   (happened / logged) instead of pretending precision.
 * - The core table holds only exactly-linked items (stamped request_id or
 *   the request's founding letter). Items pulled in by email-thread
 *   closure are real but inferred, so they get their own clearly-labeled
 *   section rather than sitting unmarked among the attested rows.
 * - No immutability claims: the fingerprint covers the plain-text
 *   rendering produced at export time — it certifies neither this file
 *   nor the underlying records, and the copy says exactly that.
 *
 * The document is rendered in English deliberately — it is venue-facing
 * (hearing officers, agency compliance units), like statute citations.
 */
// Platform modules (react-native, expo-*) are imported lazily inside
// exportRequestDossier so the builders stay unit-testable under node.
import type { RequestCase, CaseEvent } from '@/lib/requestCase';
import { REQUEST_TYPE_LABELS } from '@/lib/requestClocks';

export interface DossierOptions {
  parentName?: string | null;
  childName?: string | null;
  /** ISO date; defaults to today at the I/O layer, injectable for tests. */
  generatedOn: string;
  /** SHA-256 hex of the text rendering; computed by exportRequestDossier. */
  contentHash?: string | null;
}

// Assert only what the events show — a complaint can be filed straight from
// Letters with no follow-up, and "went unanswered" is the record's story to
// tell (the table below), not this line's to overstate.
const STAGE_LINE: Record<RequestCase['stage'], string> = {
  ask: 'Initial request made; no written follow-up on record.',
  follow_up: 'A written follow-up has been sent.',
  formal: 'A formal complaint has been filed; its response clock is running.',
};

/**
 * One sentence on where the case stands. A denied request was answered —
 * with a no — so it never gets the "went unanswered" prose.
 */
function standingLine(kase: RequestCase): string {
  if (kase.request.status === 'denied') {
    const noaSent = kase.events.some(
      (e) =>
        e.communication.direction === 'outgoing' &&
        e.communication.status === 'sent' &&
        e.communication.template_key === 'noa_request'
    );
    return noaSent
      ? 'The request was denied; the written decision (Notice of Action) has been requested.'
      : 'The request was denied; the next step is requesting the written decision (Notice of Action).';
  }
  return STAGE_LINE[kase.stage];
}

const PROVENANCE_TEXT: Record<CaseEvent['provenance'], string> = {
  gmail: 'Email — provider-dated',
  contemporaneous: 'Logged within 48 hours',
  recalled: 'Recalled later',
};

/** Only a phone or in-person ask may honestly be described as spoken. */
function request_was_spoken(channel: string | null): boolean {
  return channel === 'phone' || channel === 'in_person' || channel === 'in person';
}

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateOnly(isoDate: string): string {
  return fmt(`${isoDate}T00:00:00`);
}

/** Core (exactly-linked) vs thread-inferred events, both already in honest order. */
export function splitDossierEvents(kase: RequestCase): {
  core: CaseEvent[];
  thread: CaseEvent[];
} {
  return {
    core: kase.events.filter((e) => e.linkage !== 'gmail_thread'),
    thread: kase.events.filter((e) => e.linkage === 'gmail_thread'),
  };
}

function describeEvent(e: CaseEvent): string {
  const c = e.communication;
  const what =
    c.direction === 'incoming'
      ? 'Received'
      : c.kind === 'call'
        ? 'Phone call'
        : c.kind === 'meeting'
          ? 'Meeting'
          : c.kind === 'note'
            ? 'Note'
            : c.status === 'draft'
              ? 'Drafted (not sent)'
              : 'Sent';
  return `${what}: ${c.subject}`;
}

function provenanceLineFor(e: CaseEvent): string {
  if (e.provenance === 'recalled') {
    return `${PROVENANCE_TEXT.recalled} — happened ${fmt(e.when)}, logged ${fmt(e.communication.created_at)}`;
  }
  return PROVENANCE_TEXT[e.provenance];
}

/** Plain-text dossier — the share-sheet / clipboard rendering. */
export function buildRequestDossierText(kase: RequestCase, opts: DossierOptions): string {
  const r = kase.request;
  const { core, thread } = splitDossierEvents(kase);
  const lines: string[] = [];
  lines.push(`REQUEST DOSSIER — ${r.title}`);
  lines.push(`${REQUEST_TYPE_LABELS[r.request_type]}${opts.childName ? ` · for ${opts.childName}` : ''}`);
  lines.push(kase.provenanceLine);
  if (kase.deadline) {
    lines.push(
      `Legal deadline: ${fmtDateOnly(kase.deadline.dueOn)} (${kase.deadline.citation})` +
        (kase.deadline.overdue ? ` — passed ${-kase.deadline.daysRemaining} days ago` : '')
    );
  } else {
    lines.push('No statutory deadline applies to this request type.');
  }
  lines.push(`Status: ${r.status}${r.decided_on ? ` (decided ${fmtDateOnly(r.decided_on)})` : ''} · ${standingLine(kase)}`);
  lines.push('');
  lines.push(`RECORD (${core.length} item${core.length === 1 ? '' : 's'}, oldest first)`);
  if (core.length === 0) {
    lines.push(
      request_was_spoken(r.channel)
        ? '- Nothing in writing yet — this request was tracked from a spoken ask.'
        : '- No written items are linked to this request yet.'
    );
  }
  for (const e of core) {
    lines.push(`- ${fmt(e.when)} · ${describeEvent(e)} [${provenanceLineFor(e)}]`);
    if (e.communication.body) lines.push(`  ${e.communication.body.slice(0, 400)}`);
  }
  if (thread.length > 0) {
    lines.push('');
    lines.push(`SAME EMAIL THREAD (${thread.length} item${thread.length === 1 ? '' : 's'} — linked by thread, not individually stamped)`);
    for (const e of thread) {
      lines.push(`- ${fmt(e.when)} · ${describeEvent(e)} [${provenanceLineFor(e)}]`);
    }
  }
  lines.push('');
  lines.push(
    `Prepared ${fmtDateOnly(opts.generatedOn)}${opts.parentName ? ` by ${opts.parentName}` : ''} from records kept in Waypoint as events occurred or were recalled. ` +
      'Items marked "Email — provider-dated" carry the email provider\'s timestamps; items marked "Recalled later" state both the remembered date and the date they were logged.'
  );
  if (opts.contentHash) {
    // No reproducibility promise: the hashed text includes the export date
    // and day counts, so a later export of the same record hashes anew.
    lines.push(
      `Record fingerprint (SHA-256, computed over this dossier's plain-text rendering at export time, before this line was added): ${opts.contentHash}. ` +
        'It fingerprints this export\'s text content, not this file and not the underlying records.'
    );
  }
  return lines.join('\n');
}

// ── HTML rendering (self-contained; prints to PDF on any platform) ──────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function eventRow(e: CaseEvent): string {
  const c = e.communication;
  const body = c.body
    ? `<div class="body">${esc(c.body.slice(0, 600))}${c.body.length > 600 ? '…' : ''}</div>`
    : '';
  return `<tr>
<td class="date">${esc(fmt(e.when))}</td>
<td>${esc(describeEvent(e))}${body}</td>
<td class="prov">${esc(provenanceLineFor(e))}</td>
</tr>`;
}

export function renderRequestDossierHtml(kase: RequestCase, opts: DossierOptions): string {
  const r = kase.request;
  const { core, thread } = splitDossierEvents(kase);
  const deadlineLine = kase.deadline
    ? `Legal deadline: <b>${esc(fmtDateOnly(kase.deadline.dueOn))}</b> (${esc(kase.deadline.citation)})` +
      (kase.deadline.overdue
        ? ` — <span class="overdue">passed ${-kase.deadline.daysRemaining} days ago</span>`
        : '')
    : 'No statutory deadline applies to this request type.';
  return `<!doctype html><html><head><meta charset="utf-8">
<title>Request Dossier — ${esc(r.title)}</title>
<style>
  body{font-family:-apple-system,Segoe UI,sans-serif;color:#1F2937;max-width:760px;margin:40px auto;padding:0 20px;line-height:1.5}
  h1{color:#1B2A4A;margin-bottom:2px} h2{color:#1B2A4A;border-bottom:2px solid #0891B2;padding-bottom:6px;margin-top:32px}
  .meta{color:#5B6B7C;font-size:13px}
  table{border-collapse:collapse;width:100%;font-size:14px;margin-top:10px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid #DDE3E6;vertical-align:top}
  th{color:#5B6B7C;text-transform:uppercase;font-size:11px;letter-spacing:.05em}
  .date{white-space:nowrap;color:#1B2A4A;font-weight:600}
  .prov{font-size:12px;color:#5B6B7C;white-space:normal}
  .body{margin-top:4px;font-size:12.5px;color:#374151;white-space:pre-wrap}
  .overdue{color:#DC2626;font-weight:700}
  .foot{margin-top:36px;font-size:12px;color:#5B6B7C;border-top:1px solid #DDE3E6;padding-top:12px}
  .hash{font-family:ui-monospace,monospace;word-break:break-all}
  @media print{body{margin:12px auto}}
</style></head><body>
<h1>Request Dossier — ${esc(r.title)}</h1>
<p class="meta">${esc(REQUEST_TYPE_LABELS[r.request_type])}${opts.childName ? ` · for ${esc(opts.childName)}` : ''} · ${esc(kase.provenanceLine)}</p>
<p>${deadlineLine}<br>Status: <b>${esc(r.status)}</b>${r.decided_on ? ` (decided ${esc(fmtDateOnly(r.decided_on))})` : ''} · ${esc(standingLine(kase))}</p>

<h2>The record (${core.length} item${core.length === 1 ? '' : 's'}, oldest first)</h2>
<table><tr><th>Date</th><th>What happened</th><th>How it was recorded</th></tr>
${core.map(eventRow).join('') || `<tr><td colspan="3">${
    request_was_spoken(r.channel)
      ? 'Nothing in writing yet — this request was tracked from a spoken ask.'
      : 'No written items are linked to this request yet.'
  }</td></tr>`}
</table>

${
  thread.length > 0
    ? `<h2>Same email thread (${thread.length} item${thread.length === 1 ? '' : 's'})</h2>
<p class="meta">These messages belong to the same email conversation as the record above. They are included by thread, not individually stamped to the request.</p>
<table><tr><th>Date</th><th>What happened</th><th>How it was recorded</th></tr>
${thread.map(eventRow).join('')}
</table>`
    : ''
}

<p class="foot">
Prepared ${esc(fmtDateOnly(opts.generatedOn))}${opts.parentName ? ` by ${esc(opts.parentName)}` : ''} from records kept in Waypoint as events occurred or were recalled.
Items marked “Email — provider-dated” carry the email provider's timestamps; items marked “Recalled later” state both the remembered date and the date they were logged.
${opts.contentHash ? `<br>Record fingerprint (SHA-256, computed over this dossier's plain-text rendering at export time, before the fingerprint was added): <span class="hash">${esc(opts.contentHash)}</span>. It fingerprints this export's text content, not this file and not the underlying records.` : ''}
</p>
</body></html>`;
}

// ── Platform I/O ────────────────────────────────────────────────────────────

/**
 * Export the dossier: web opens the printable document in a new tab (print
 * → save as PDF); native renders a real PDF and hands it to the share
 * sheet. Free on every tier. Returns false only when nothing could be
 * produced at all.
 */
export async function exportRequestDossier(
  kase: RequestCase,
  opts: Omit<DossierOptions, 'generatedOn' | 'contentHash'> & { generatedOn?: string }
): Promise<boolean> {
  // Never reject: the caller keys its error toast (and its button state) off
  // the boolean, so every failure path must resolve.
  try {
    const { Platform, Share } = await import('react-native');
    // Local calendar date — "Prepared <tomorrow>" from a UTC slice would be
    // an own-goal in a document whose premise is date honesty.
    const today = new Date();
    const generatedOn =
      opts.generatedOn ??
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const base: DossierOptions = { ...opts, generatedOn, contentHash: null };
    // The fingerprint is a bonus, not a gate — export without it if the
    // crypto module is unavailable (e.g. an OTA/native version mismatch).
    let contentHash: string | null = null;
    try {
      const Crypto = await import('expo-crypto');
      contentHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        buildRequestDossierText(kase, base)
      );
    } catch {
      contentHash = null;
    }
    const withHash: DossierOptions = { ...base, contentHash };
    if (Platform.OS === 'web') {
      const html = renderRequestDossierHtml(kase, withHash);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      // window.open returns null when a popup blocker eats it — that is a
      // failure the parent must hear about, not a silent success.
      const opened = window.open(url, '_blank');
      if (!opened) {
        URL.revokeObjectURL(url);
        return false;
      }
      return true;
    }
    try {
      // Native: a real one-tap PDF via expo-print, then the share sheet.
      const Print = await import('expo-print');
      const Sharing = await import('expo-sharing');
      const { uri } = await Print.printToFileAsync({
        html: renderRequestDossierHtml(kase, withHash),
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Request dossier — ${kase.request.title}`,
        });
        return true;
      }
      // No share sheet (rare) — fall back to the plain-text system share.
      await Share.share({ message: buildRequestDossierText(kase, withHash) });
      return true;
    } catch {
      // Last resort: the text rendering through the system share sheet.
      await Share.share({ message: buildRequestDossierText(kase, withHash) });
      return true;
    }
  } catch {
    return false;
  }
}
