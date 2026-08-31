/**
 * The two doors into "Supports you can ask for" (initiative 005, PR C).
 *
 * The render tests (ResourceStackScreen.test.tsx, EligibilityResultScreen.test.tsx)
 * prove each door renders when it should and fires the real navigate. This adds
 * the one graph fact both rely on: the destination resolves from the Home stack
 * — the dead-tap fence — so neither door points at a screen that isn't there.
 */
import { describe, it, expect } from 'vitest';
import { resolvesFrom } from '@/navigation/routeGraph';

describe('the shared destination resolves (both doors live in the Home stack)', () => {
  it('AskForSupports resolves from Home', () => {
    expect(resolvesFrom('Home', { screen: 'AskForSupports' })).toBe(true);
  });
});
