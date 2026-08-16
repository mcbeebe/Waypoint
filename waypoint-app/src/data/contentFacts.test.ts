/**
 * Content-fact regression guard (Wave 2.1) — scans the authored content
 * layer for known-stale legal figures so a copy-paste from an old source
 * can't silently reintroduce them. When one of these fails because the law
 * changed AGAIN, update both the content and this list.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const FILES = [
  'src/data/agencies.ts',
  'src/data/journeyMaps.ts',
  'src/data/reimbursables.ts',
  'src/lib/planGenerator.ts',
  'supabase/seed/kb_seed.sql',
];

const STALE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\$943/, reason: 'SSI federal benefit rate: $943 was the 2024 figure (2026 is $994, adjusted annually)' },
  { pattern: /onset before age 26/i, reason: 'ABLE age of onset: raised to 46 effective Jan 1, 2026 (ABLE Age Adjustment Act)' },
  { pattern: /\$18,000|\$18K|\$19K/, reason: 'CalABLE contribution limit: $20,000 in 2026 (tracks the gift-tax exclusion)' },
  { pattern: /30 (calendar )?days to (hold|schedule) (the |an )?IEP meeting/i, reason: 'Ed Code §56344: the IEP meeting shares the single 60-day clock from signed consent — there is no extra 30 days' },
  { pattern: /IEP (meeting )?within 30 (calendar )?days of (the )?evaluation/i, reason: 'same §56344 combined-clock rule' },
  { pattern: /Aid Paid Pending if filed within 10 days/i, reason: 'post-2021 Lanterman appeal rules: 30 days for aid paid pending' },
  { pattern: /'921': 'IRC'/, reason: 'San Diego city ZIPs belong to San Diego RC, not Inland' },
];

const read = (rel: string) => readFileSync(join(__dirname, '../..', rel), 'utf8');

describe('stale legal facts must not reappear', () => {
  for (const file of FILES) {
    describe(file, () => {
      const content = read(file);
      for (const { pattern, reason } of STALE_PATTERNS) {
        it(`has no match for ${pattern}`, () => {
          const match = content.match(pattern);
          expect(match, `${file}: found "${match?.[0]}" — ${reason}`).toBeNull();
        });
      }
    });
  }
});

describe('current facts are present', () => {
  it('SSI figure is the 2026 rate', () => {
    expect(read('src/data/agencies.ts')).toContain('$994');
  });
  it('ABLE age 46 is stated', () => {
    expect(read('src/data/agencies.ts')).toContain('age 46');
    expect(read('supabase/seed/kb_seed.sql')).toContain('age 46');
  });
  it('RC intake is stated as working days', () => {
    expect(read('src/lib/planGenerator.ts')).toContain('15 working days');
  });
});
