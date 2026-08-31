/**
 * "Supports you can ask for" routing (initiative 005, PR B).
 *
 * SupportDetail reads live child data, so — like homeSearch.test.ts — this pins
 * the CONTRACT the screens depend on rather than rendering the data-heavy one:
 * every tap resolves to a real destination, never a dead tap (the defect class
 * routeGraph exists to kill).
 */
import { describe, it, expect } from 'vitest';
import { resolvesFrom } from '@/navigation/routeGraph';
import { getLearnArticles } from '@/lib/learnLibrary';

describe('every tap in the ask-for-supports flow resolves', () => {
  it('a list row opens the detail — SupportDetail resolves within the Home stack', () => {
    // AskForSupportsScreen does navigate('SupportDetail', { supportKey }).
    expect(resolvesFrom('Home', { screen: 'SupportDetail' })).toBe(true);
  });

  it('the list itself resolves from Home (the RC layer / Your Result land here in PR C)', () => {
    expect(resolvesFrom('Home', { screen: 'AskForSupports' })).toBe(true);
  });

  it('the detail’s draft CTA opens the IPP letter — Letters resolves from Home', () => {
    // SupportDetailScreen does navigate('Letters', { template: 'ipp_review_request', ... }).
    expect(resolvesFrom('Home', { screen: 'Letters' })).toBe(true);
  });

  it('the detail’s "ask Waypoint" opens the AI — NavigatorMain resolves', () => {
    expect(resolvesFrom('Home', { screen: 'NavigatorMain', tab: 'Navigator' })).toBe(true);
  });

  it('the list’s "full funding guide" link resolves — Reimbursables from Home', () => {
    expect(resolvesFrom('Home', { screen: 'Reimbursables' })).toBe(true);
  });

  it('the sibling article now lands here — its target resolves from the Learn (Navigator) stack', () => {
    const article = getLearnArticles().find((a) => a.key === 'sibling_support');
    expect(article?.target.screen, 'sibling article repointed to the new screen').toBe('AskForSupports');
    // ArticleScreen renders in the Navigator stack; the target names tab:'Home'.
    expect(resolvesFrom('Navigator', article!.target)).toBe(true);
  });
});
