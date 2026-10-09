import { describe, it, expect } from 'vitest';
import { addThreadSteps, ADD_THREAD_MAX_MESSAGES } from './addThreadSteps';
import { MAX_IMPORT_MESSAGES } from '../../supabase/functions/_shared/threadImport';

const NOW = new Date('2026-10-09T18:00:00Z');
const base = { orgLabel: 'Regional Center', lastFrom: 'Ana Rivera', now: NOW };

describe('addThreadSteps', () => {
  it('says what is copied, that nothing is sent, and that a fresh unanswered reply shows on Home', () => {
    const steps = addThreadSteps({ ...base, messageCount: 4, lastFromFamily: false, lastAt: '2026-10-08T18:00:00Z' });
    expect(steps).toEqual([
      'All 4 messages are copied into your Paper Trail under Regional Center. Nothing is sent, and nothing changes in Gmail.',
      'Waypoint checks the thread for new replies, and they show on Home.',
      'The newest message is from Ana Rivera and hasn’t been answered yet, so it shows on Home now as a reply.',
    ]);
  });

  it('an old newest message is filed as history; the family’s own newest message waits on nobody', () => {
    expect(
      addThreadSteps({ ...base, messageCount: 2, lastFromFamily: false, lastAt: '2026-09-01T18:00:00Z' })[2]
    ).toMatch(/more than 14 days old, so it’s filed as history/);
    expect(
      addThreadSteps({ ...base, messageCount: 2, lastFromFamily: true, lastAt: '2026-10-08T18:00:00Z' })[2]
    ).toBe('The newest message is yours, so nothing new shows on Home until a reply comes in.');
  });

  it('counts a single message and a thread over the cap honestly', () => {
    expect(addThreadSteps({ ...base, messageCount: 1, lastFromFamily: true, lastAt: '2026-10-08T00:00:00Z' })[0]).toMatch(
      /^Its message is copied/
    );
    expect(addThreadSteps({ ...base, messageCount: 80, lastFromFamily: true, lastAt: '2026-10-08T00:00:00Z' })[0]).toMatch(
      /^The newest 50 of its 80 messages are copied/
    );
  });

  it('never blames the agency (tone rule)', () => {
    const text = addThreadSteps({ ...base, messageCount: 3, lastFromFamily: false, lastAt: '2026-10-08T18:00:00Z' }).join(' ');
    expect(text).not.toMatch(/waiting on you|owe|missed|failed/i);
  });

  it('the app’s cap matches the function’s', () => {
    expect(ADD_THREAD_MAX_MESSAGES).toBe(MAX_IMPORT_MESSAGES);
  });
});
