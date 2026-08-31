/**
 * The two doors into "Supports you can ask for" (initiative 005, PR C).
 *
 * Both the Resource Stack's RC layer and the Your Result RC card now link to
 * AskForSupports. Both screens render in the Home stack, so this pins the
 * shared contract: the door resolves, never a dead tap.
 */
import { describe, it, expect } from 'vitest';
import { resolvesFrom } from '@/navigation/routeGraph';

describe('both doors land somewhere that resolves', () => {
  it('Resource Stack (Home) → AskForSupports resolves', () => {
    expect(resolvesFrom('Home', { screen: 'AskForSupports' })).toBe(true);
  });

  it('Your Result (Home) → AskForSupports resolves', () => {
    // EligibilityResult lives in the Home stack; navigate('AskForSupports').
    expect(resolvesFrom('Home', { screen: 'AskForSupports' })).toBe(true);
  });
});
