/**
 * "Does this typed query mean 'take me to my action plan'?" (owner request,
 * Aug 31 2026). The Home composer surfaces a shortcut to the Plan tab when a
 * parent types plan intent — alongside the always-present pinned shortcut.
 *
 * Pure and node-tested, so the detection stays honest without rendering the
 * data-heavy HomeScreen. Matches on WHOLE-WORD boundaries, not raw substrings:
 * "to do" must never fire inside "how to document" or "how to download", and
 * "my plan" must never fire inside "my plans for the IEP". An "IEP plan" / "IPP
 * plan" is a document, not the action list, and must not be hijacked.
 */

/** Accent-, case-, and apostrophe-fold, so "qué hago" == "que hago" and
 *  Vietnamese diacritics/đ don't defeat the match. Mirrors learnLibrary's fold. */
function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/['’]/g, '');
}

/**
 * Fold, then collapse everything non-alphanumeric to single spaces and wrap in
 * spaces — so a phrase can be tested on word boundaries with a plain `includes`.
 * "to-do" and "to do" both normalize to " to do "; "document" stays one token,
 * so " to do " is never a substring of " to document ".
 */
function norm(s: string): string {
  return ` ${fold(s).replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

/**
 * Phrases that read as "take me to my action plan," trilingual. Each is
 * space-wrapped so matching is whole-word. Kept SPECIFIC: bare "to do"/"todo"
 * (ambiguous, and Spanish "todo" = "everything") is excluded in favor of the
 * unambiguous "to do list" / "todo list".
 */
const PLAN_PHRASES = [
  // English
  'action plan', 'my plan', 'my task', 'my tasks', 'task', 'tasks', 'task list',
  'to do list', 'todo list', 'what do i do', 'what should i do', 'next step',
  'whats next', 'my action', 'my actions',
  // Spanish
  'plan de accion', 'mi plan', 'mis tareas', 'lista de tareas', 'que hago',
  'que debo hacer', 'proximo paso', 'siguiente paso', 'mis acciones',
  // Vietnamese
  'ke hoach cua toi', 'viec can lam', 'nhiem vu', 'buoc tiep theo', 'viec cua toi',
].map(norm);

/** Does this typed query read as "take me to my action plan"? */
export function looksLikePlanQuery(query: string): boolean {
  const hay = norm(query);
  if (hay.trim().length < 2) return false;
  return PLAN_PHRASES.some((p) => hay.includes(p));
}
