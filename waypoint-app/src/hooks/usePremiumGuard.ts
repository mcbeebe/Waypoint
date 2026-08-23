/**
 * Inline Premium guard (PRD W-E: E3) — for gating a single BUTTON rather
 * than a whole screen. `guard('Feature name')` returns true when the
 * family may proceed; otherwise it explains the value (never a dead end)
 * and routes to the pricing page, returning false so the caller aborts.
 *
 * Fails open while entitlements resolve — a network blip must never
 * block a paying family, and a free family sneaking one export during a
 * loading window costs nothing.
 */
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useFamily } from '@/hooks/useFamily';
import { useEntitlement } from '@/hooks/useEntitlement';
import { useToast } from '@/components/Toast';
import { gateCopy } from '@/lib/entitlements';

export function usePremiumGuard() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { isPremium, loading } = useEntitlement(family?.id);
  const { showToast } = useToast();

  const guard = useCallback(
    (feature: string): boolean => {
      if (loading || isPremium) return true;
      showToast(gateCopy(feature).title, 'info');
      (navigation as never as { navigate: (n: string) => void }).navigate('Pricing');
      return false;
    },
    [loading, isPremium, showToast, navigation]
  );

  return { isPremium, guard };
}
