/**
 * Home search routing invariants (owner request, Aug 31 2026).
 *
 * HomeScreen is too data-heavy to render in the ui suite, so instead of a
 * render test this pins the CONTRACT its search routing depends on — every kind
 * of result reaches a real destination, never a dead tap (the defect class
 * routeGraph exists to kill). Home routes: article → the reader (Article, in
 * the Navigator stack); a guide → its own target; a bare definition → the AI.
 */
import { describe, it, expect } from 'vitest';
import { searchLearn } from '@/lib/learnLibrary';
import { resolvesFrom } from '@/navigation/routeGraph';

describe('Home search sends every result somewhere that resolves', () => {
  it('an article result opens the reader — Article resolves from Home', () => {
    const hit = searchLearn('they said no').find((h) => h.kind === 'article');
    expect(hit, 'a caregiver phrase returns an article').toBeTruthy();
    // Home does navigate('Navigator', { screen: 'Article', ... }).
    expect(resolvesFrom('Home', { screen: 'Article', tab: 'Navigator' })).toBe(true);
  });

  it('a guide result opens its own screen — its target resolves from Home', () => {
    const hit = searchLearn('regional center').find((h) => h.kind === 'path' && !!h.target);
    expect(hit?.target, 'a system word returns a guide with a target').toBeTruthy();
    expect(resolvesFrom('Home', hit!.target!)).toBe(true);
  });

  it('a bare definition has no target, so Home hands it to the AI (never a dead tap)', () => {
    const hit = searchLearn('what is an IPP').find((h) => h.kind === 'glossary');
    expect(hit, 'a "what is" query returns a definition').toBeTruthy();
    expect(hit!.target, 'a definition is not navigable — Home falls back to the AI').toBeUndefined();
  });
});
