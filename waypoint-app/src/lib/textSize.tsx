/**
 * App-wide text-size preference (UX 3: text scaling).
 * A simple multiplier applied to reading-heavy screens; persisted so the
 * choice sticks across sessions. Steps: 100% → 115% → 130% → 150%.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@waypoint_text_scale';
export const TEXT_SCALE_STEPS = [1.0, 1.15, 1.3, 1.5] as const;

interface TextScaleContextValue {
  scale: number;
  /** Advance to the next step (wraps back to 100%). */
  cycleScale: () => void;
  setScale: (scale: number) => void;
}

const TextScaleContext = createContext<TextScaleContextValue>({
  scale: 1.0,
  cycleScale: () => {},
  setScale: () => {},
});

export function TextScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScaleState] = useState(1.0);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(v => {
        const parsed = v ? parseFloat(v) : NaN;
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 2) setScaleState(parsed);
      })
      .catch(() => {});
  }, []);

  const setScale = useCallback((next: number) => {
    setScaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
  }, []);

  const cycleScale = useCallback(() => {
    setScaleState(prev => {
      const idx = TEXT_SCALE_STEPS.findIndex(s => Math.abs(s - prev) < 0.01);
      const next = TEXT_SCALE_STEPS[(idx + 1) % TEXT_SCALE_STEPS.length];
      AsyncStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <TextScaleContext.Provider value={{ scale, cycleScale, setScale }}>
      {children}
    </TextScaleContext.Provider>
  );
}

export function useTextScale() {
  return useContext(TextScaleContext);
}
