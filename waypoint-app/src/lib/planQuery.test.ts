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
      "what's next",
      'to-do',
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
    // The trap: "IEP plan"/"IPP plan" are documents, not the action list.
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
});
