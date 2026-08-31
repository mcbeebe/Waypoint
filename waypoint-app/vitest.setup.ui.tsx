/**
 * Harness for the component suite.
 *
 * Only the native edges are stubbed — storage, icons, safe-area insets and
 * navigation. Everything the tests actually assert on (layout, labels, roles,
 * what a press does) is the real component.
 */
import React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

/** In-memory AsyncStorage. Real enough: it persists within a test. */
const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
    removeItem: async (k: string) => void store.delete(k),
    clear: async () => void store.clear(),
  },
}));

vi.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => <span data-icon={name} />,
}));

/**
 * In-memory clipboard. Records what a "Copy to my notes" tool copied so a test
 * can assert the exact text a parent would paste into their own notes.
 */
export const clipboard = { text: null as string | null };
vi.mock('expo-clipboard', () => ({
  setStringAsync: async (v: string) => {
    clipboard.text = v;
    return true;
  },
  getStringAsync: async () => clipboard.text ?? '',
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

/**
 * Records what a component asked the navigator to do, so a test can assert
 * the SHAPE of the call — which is where the dead taps lived: a screen name
 * with no tab, aimed at a stack that does not register it.
 */
export const navigateCalls: { args: unknown[] }[] = [];
/** Route params a screen under test reads via useRoute — set before render. */
export const routeParams: Record<string, unknown> = {};
vi.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: (...args: unknown[]) => void navigateCalls.push({ args }),
    goBack: () => {},
    setOptions: () => {},
    addListener: () => () => {},
  }),
  useFocusEffect: () => {},
  useRoute: () => ({ params: routeParams }),
  useIsFocused: () => true,
}));

beforeEach(() => {
  navigateCalls.length = 0;
  for (const k of Object.keys(routeParams)) delete routeParams[k];
  store.clear();
  clipboard.text = null;
});

// Testing Library only auto-cleans when vitest globals are on. Without this
// every render stacks in the DOM and a query can match a previous test's
// component — which is a very confusing way to watch a passing test fail.
afterEach(cleanup);
