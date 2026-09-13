/**
 * What survives the trip from a chat bubble into an email.
 *
 * RichText renders exactly the subset the system prompt allows — `**bold**`
 * and `•`/`-` bullets — and `stripInlineMarkdown` is what plain-text
 * consumers (action titles, letter drafts) run first. Anything it misses
 * goes out to an agency as literal punctuation.
 */
import { describe, it, expect } from 'vitest';
import { stripInlineMarkdown } from './RichText';

describe('stripInlineMarkdown', () => {
  it('unwraps bold', () => {
    expect(stripInlineMarkdown('Ask for **prior written notice** in writing')).toBe(
      'Ask for prior written notice in writing'
    );
  });

  it('unwraps single-asterisk emphasis', () => {
    // Owner report, 2026-09-12: "renewals need *current* data" reached a
    // draft addressed to an agency with the asterisks still in it.
    expect(stripInlineMarkdown('renewals need *current* data')).toBe('renewals need current data');
  });

  it('handles both markers in one line', () => {
    expect(stripInlineMarkdown('**Note:** bring *every* report')).toBe('Note: bring every report');
  });

  it('leaves a lone asterisk alone', () => {
    expect(stripInlineMarkdown('3 * 4 hours per week')).toBe('3 * 4 hours per week');
  });

  it('does not swallow a bullet list', () => {
    // Bullets are "•"/"-", never "*", so a leading marker must survive for
    // RichText to still see the line as a bullet.
    const list = '- Call the coordinator\n- Ask for the *current* authorization end date';
    expect(stripInlineMarkdown(list)).toBe(
      '- Call the coordinator\n- Ask for the current authorization end date'
    );
  });

  it('does not pair asterisks across a line break', () => {
    const two = 'Ask for 20 hours *\nThen * confirm in writing';
    expect(stripInlineMarkdown(two)).toBe(two);
  });
});
