import { describe, it, expect } from 'vitest';
import { looksLikePlanQuery } from './planQuery';

describe('looksLikePlanQuery — surfaces the Plan-tab shortcut on plan intent', () => {
  it('fires on plan intent in English', () => {
    for (const q of [
      'my action plan',
      'action plan',
      'what do I do next',
      'what should I do',
      'my tasks',
      'task list',
      'my to-do list',
      'todo list',
      "what's next",
    ]) {
      expect(looksLikePlanQuery(q), q).toBe(true);
    }
  });

  it('fires on plan intent in Spanish and Vietnamese, accents optional', () => {
    for (const q of ['mi plan', 'plan de acción', 'plan de accion', 'qué hago', 'que hago', 'mis tareas']) {
      expect(looksLikePlanQuery(q), `es: ${q}`).toBe(true);
    }
    for (const q of ['kế hoạch của tôi', 'ke hoach cua toi', 'việc cần làm', 'nhiệm vụ', 'bước tiếp theo']) {
      expect(looksLikePlanQuery(q), `vi: ${q}`).toBe(true);
    }
  });

  it('does NOT fire on a document "plan" or unrelated queries', () => {
    for (const q of [
      'IEP plan',
      'IPP plan',
      'they said no',
      'diapers',
      'what is an IPP',
      'regional center',
      'todo', // Spanish "everything" — deliberately excluded
      '',
      ' ',
      'a',
    ]) {
      expect(looksLikePlanQuery(q), q).toBe(false);
    }
  });

  it('matches whole words only — no leaking inside a longer word (adversary F1)', () => {
    // These are realistic domain queries the substring version wrongly caught:
    // "to do" inside "to document"/"to download", "my plan" inside "my plans",
    // "que hago" inside "porque hago".
    for (const q of [
      'how to document the IEP meeting',
      'how to download forms',
      'my plans for the IEP meeting',
      'my planner',
      'porque hago esto',
    ]) {
      expect(looksLikePlanQuery(q), q).toBe(false);
    }
  });
});
