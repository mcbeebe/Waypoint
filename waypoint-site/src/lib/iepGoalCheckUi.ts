/**
 * Browser wiring for the IEP goal check, shared by /tools/iep-goal-check/
 * and the homepage embed. Renders with DOM APIs only (textContent, never
 * innerHTML of anything the parent typed) and sends analytics that carry the
 * tool id, locale and rating — never the goal itself. Covered by the privacy
 * guard in iepGoalCheck.test.ts.
 */
import { checkGoal } from './iepGoalCheck';
import { base64url } from './appLinks';

export const TOOL_ID = 'iep-goal-check';

const EXAMPLES: Record<string, string> = {
  vague: 'Maya will improve her reading skills.',
  strong:
    'By May 2027, when given a grade-level passage, Maya will answer 4 of 5 comprehension questions correctly in 3 of 4 trials, as measured by teacher-charted data.',
};

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * Wires one goal-check widget. Every element is found inside `root`, so the
 * page and an embed can coexist without id collisions.
 *
 * Expected children: `textarea[data-gc-input]`, `button[data-gc-run]`,
 * `[data-gc-result]`, optional `button[data-gc-example="vague|strong"]`, and
 * an optional `a[data-gc-save]` deep link whose wp_ctx gets the rating.
 *
 * @param root - The widget's container element.
 * @param locale - Page locale for analytics.
 */
export function mountGoalCheck(root: HTMLElement, locale: 'en' | 'es' = 'en'): void {
  const input = root.querySelector<HTMLTextAreaElement>('[data-gc-input]');
  const run = root.querySelector<HTMLButtonElement>('[data-gc-run]');
  const out = root.querySelector<HTMLElement>('[data-gc-result]');
  if (!input || !run || !out) return;

  let started = false;
  const markStarted = () => {
    if (started) return;
    started = true;
    window.plausible?.('tool_started', { props: { tool_id: TOOL_ID, locale } });
  };
  // Only a parent's own typing counts as starting; trying an example does not.
  input.addEventListener('input', markStarted);

  root.querySelectorAll<HTMLButtonElement>('[data-gc-example]').forEach((b) => {
    b.addEventListener('click', () => {
      input.value = EXAMPLES[b.dataset.gcExample ?? ''] ?? '';
      render();
    });
  });
  run.addEventListener('click', render);

  // Summaries only into the deep link (D3): the rating, never the goal text.
  // Cleared whenever there is no rating, so a stale result never rides along.
  const save = root.querySelector<HTMLAnchorElement>('[data-gc-save]');
  const setSaveContext = (rating: string | null) => {
    if (!save) return;
    const url = new URL(save.href);
    if (rating) {
      const ctx = { v: 1, kind: 'tool', tool_id: TOOL_ID, inputs_summary: 'one IEP goal', result_summary: rating };
      url.searchParams.set('wp_ctx', base64url(JSON.stringify(ctx)));
    } else {
      url.searchParams.delete('wp_ctx');
    }
    save.href = url.toString();
  };

  function decline(message: string, outcome: string | null): void {
    out!.append(el('p', 'gc-empty', message));
    setSaveContext(null);
    if (outcome) window.plausible?.('tool_completed', { props: { tool_id: TOOL_ID, locale, outcome } });
  }

  function render(): void {
    const r = checkGoal(input!.value);
    out!.replaceChildren();
    if (!r) {
      decline('Paste a full goal first. Goals are usually one or two sentences about what your child will do.', null);
      return;
    }
    if (r.kind === 'not-english') {
      decline('This check can only read goals written in English for now.', 'not-english');
      return;
    }
    if (r.kind === 'not-a-goal') {
      decline(
        'This doesn\'t look like an annual goal. Goals usually say what your child "will" do, like "Maya will answer 4 of 5 questions." Baselines and service lines are separate parts of the IEP.',
        'not-a-goal',
      );
      return;
    }

    out!.append(el('p', 'gc-summary', `We spotted ${r.found} of 5 parts in the goal text.`));

    if (r.looksLikeSeveralGoals) {
      out!.append(el('p', 'gc-warn', 'This looks like more than one goal. Each goal should name all five parts, so try them one at a time.'));
    }

    const list = el('ul', 'gc-checks');
    for (const p of r.parts) {
      const li = el('li', p.present ? 'gc-yes' : 'gc-no');
      li.append(el('span', 'gc-ic', p.present ? '✓' : '?'));
      const body = el('span', 'gc-part');
      body.append(el('b', undefined, p.label));
      body.append(el('span', 'gc-state', p.present ? ' — spotted.' : ' — not spotted.'));
      if (!p.present) {
        body.append(el('small', undefined, p.hint));
        if (p.id === 'timeframe' || p.id === 'measurement') {
          body.append(el('small', undefined, 'Many IEP forms list this in its own box next to the goal. Check there before asking.'));
        }
      }
      li.append(body);
      list.append(li);
    }
    out!.append(list);

    if (r.ask) {
      const ask = el('div', 'gc-ask');
      ask.append(
        el('b', undefined, "If it isn't anywhere on the goal page, a friendly ask for the team"),
        el('p', undefined, `"${r.ask}"`),
      );
      out!.append(ask);
    }

    window.plausible?.('tool_completed', { props: { tool_id: TOOL_ID, locale, outcome: r.rating } });
    setSaveContext(r.rating);
  }
}
