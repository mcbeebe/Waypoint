/**
 * The subject ai-proxy writes for a letter, cleaned into one safe header.
 *
 * The draft prompt never produced a subject, so every letter went out under
 * its template's title — on 2026-10-07 a note asking a provider for a written
 * recommendation went as "IPP Meeting Request — <child>". A second small model
 * call now writes the subject from the finished letter; whatever it returns
 * passes through `cleanSubject` before it can become an email header. The
 * Edge Functions have no tests of their own, so this is where that is pinned.
 *
 * Names below are invented: this repository is public.
 */
import { describe, it, expect } from 'vitest';
import { cleanSubject, MAX_SUBJECT_CHARS } from '../../supabase/functions/_shared/subjectLine';

const ch = (code: number) => String.fromCharCode(code);

describe('cleanSubject', () => {
  it('passes a plain subject through untouched', () => {
    expect(cleanSubject('Written recommendation for 1:1 support — Maya Lopez')).toBe(
      'Written recommendation for 1:1 support — Maya Lopez'
    );
  });

  it('strips a label the model added despite being told not to', () => {
    for (const reply of [
      'Subject: IPP review request — Maya Lopez',
      '**Subject:** IPP review request — Maya Lopez',
      '**Subject**: IPP review request — Maya Lopez',
      'Subject line: IPP review request — Maya Lopez',
      `Subject${ch(0xff1a)} IPP review request — Maya Lopez`, // fullwidth colon
    ]) {
      expect(cleanSubject(reply)).toBe('IPP review request — Maya Lopez');
    }
    expect(cleanSubject('Asunto: Solicitud de reunión del IPP')).toBe('Solicitud de reunión del IPP');
    expect(cleanSubject('Chủ đề: Yêu cầu họp IPP')).toBe('Yêu cầu họp IPP');
    expect(cleanSubject('V/v: Yêu cầu họp IPP')).toBe('Yêu cầu họp IPP');
  });

  it('keeps a subject that merely starts like a label', () => {
    expect(cleanSubject('Subjectively hard month — Maya Lopez')).toBe('Subjectively hard month — Maya Lopez');
  });

  it('drops quotes wrapped around the whole reply — only as a matched pair', () => {
    expect(cleanSubject('"Follow-up on Maya’s assessment"')).toBe('Follow-up on Maya’s assessment');
    expect(cleanSubject(`${ch(0x201c)}Follow-up on Maya’s assessment${ch(0x201d)}`)).toBe(
      'Follow-up on Maya’s assessment'
    );
    // Quoted legal terms, and a closing apostrophe, are part of the subject.
    expect(cleanSubject('Request for "Prior Written Notice"')).toBe('Request for "Prior Written Notice"');
    expect(cleanSubject('"Stay put" request — Maya Lopez')).toBe('"Stay put" request — Maya Lopez');
    expect(cleanSubject('Follow-up on the twins’')).toBe('Follow-up on the twins’');
    // A label inside the quotes is still a label.
    expect(cleanSubject('"Subject: IPP review request — Maya Lopez"')).toBe('IPP review request — Maya Lopez');
  });

  it('strips a stacked label, and refuses a lead-in as a subject', () => {
    expect(cleanSubject('Subject: Subject: IPP review request')).toBe('IPP review request');
    expect(cleanSubject("Here's a subject line:")).toBeNull();
    expect(cleanSubject('Subject line for this email:')).toBeNull();
  });

  it('removes pre-encoded MIME words, which would decode into text nobody reviewed', () => {
    // "Withdrawal of all requests", base64 — sent raw, decoded at the recipient.
    expect(cleanSubject('=?UTF-8?B?V2l0aGRyYXdhbCBvZiBhbGwgcmVxdWVzdHM=?= — Maya')).toBe('— Maya');
    expect(cleanSubject('=?utf-8?q?Withdrawal?=')).toBeNull();
  });

  it('takes the first non-blank line only — a reply that runs on is not a subject', () => {
    expect(cleanSubject('\n\nRecords request — Maya Lopez\nThis subject names the request.')).toBe(
      'Records request — Maya Lopez'
    );
    expect(cleanSubject(`Records request${ch(0x2028)}Bcc: someone@else.com`)).toBe('Records request');
    expect(cleanSubject(`Records request\rBcc: someone@else.com`)).toBe('Records request');
  });

  it('removes control, invisible and direction-override characters', () => {
    const out = cleanSubject(`Records${ch(0)}request${ch(7)} for ${ch(0x202e)}Maya${ch(0x2066)}`)!;
    expect(out).toBe('Records request for Maya');
    const hidden = cleanSubject(`IPP${ch(0x200b)}review${ch(0x2060)}request${ch(0xfeff)}${ch(0x61c)}`)!;
    expect(hidden).toBe('IPP review request');
    expect([...out].every((c) => c.charCodeAt(0) >= 0x20 && c.charCodeAt(0) !== 0x202e)).toBe(true);
  });

  it('bounds the length, cutting on a character — never half an emoji', () => {
    const long = cleanSubject('x'.repeat(400))!;
    expect(Array.from(long)).toHaveLength(MAX_SUBJECT_CHARS);
    expect(long.endsWith('…')).toBe(true);

    const emoji = String.fromCodePoint(0x1f600);
    const out = cleanSubject('a'.repeat(MAX_SUBJECT_CHARS - 2) + emoji + 'b'.repeat(10))!;
    for (let i = 0; i < out.length; i++) {
      const c = out.charCodeAt(i);
      if (c >= 0xd800 && c <= 0xdbff) {
        const next = out.charCodeAt(i + 1);
        expect(next >= 0xdc00 && next <= 0xdfff).toBe(true);
        i++;
      } else {
        expect(c >= 0xdc00 && c <= 0xdfff).toBe(false);
      }
    }
  });

  it('returns null when there is nothing usable, so the app falls back to its own subject', () => {
    for (const reply of [null, undefined, '', '   \n  ', 'Subject:', '""', '**Subject:**']) {
      expect(cleanSubject(reply)).toBeNull();
    }
  });
});
