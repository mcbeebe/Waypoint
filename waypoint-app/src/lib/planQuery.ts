/**
 * "Does this typed query mean 'take me to my action plan'?" (owner request,
 * Aug 31 2026). The Home composer surfaces a shortcut to the Plan tab when a
 * parent types plan intent — alongside the always-present pinned shortcut.
 *
 * Pure and node-tested, so the detection stays honest without rendering the
 * data-heavy HomeScreen. Deliberately SPECIFIC: it fires on "my action plan" /
 * "what do I do next", not on every "plan" — an "IEP plan" or "IPP plan" is a
 * document, not the action list, and must not be hijacked to the Plan tab.
 */

/** Accent- and case-fold, so "qué hago" matches "que hago" and Vietnamese
 *  diacritics/đ don't defeat the match. Mirrors learnLibrary's fold. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    // Drop apostrophes so "what's next" matches the stored "whats next".
    .replace(/['’]/g, '');
}

/**
 * Phrases that read as "take me to my action plan," trilingual. Stored folded
 * (no accents) so the folded query matches directly.
 */
const PLAN_PHRASES = [
  // English
  'action plan', 'my plan', 'my tasks', 'my task', 'task list', 'to do', 'to-do',
  'what do i do', 'what should i do', 'next step', 'whats next', 'my actions', 'my action',
  // Spanish
  'plan de accion', 'mi plan', 'mis tareas', 'lista de tareas', 'que hago',
  'que debo hacer', 'proximo paso', 'siguiente paso', 'mis acciones',
  // Vietnamese
  'ke hoach cua toi', 'viec can lam', 'nhiem vu', 'buoc tiep theo', 'viec cua toi',
].map(fold);

/** Single words that on their own signal plan intent (English only — the
 *  Spanish "todo" means "everything," so it is deliberately NOT here). */
const PLAN_WORDS = new Set(['task', 'tasks']);

/** Does this typed query read as "take me to my action plan"? */
export function looksLikePlanQuery(query: string): boolean {
  const q = fold(query).trim();
  if (q.length < 2) return false;
  if (PLAN_PHRASES.some((p) => q.includes(p))) return true;
  return q.split(/[^a-z0-9]+/).some((w) => PLAN_WORDS.has(w));
}
