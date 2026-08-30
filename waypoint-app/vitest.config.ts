import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Two suites, because they need two worlds.
 *
 * - **logic** (`*.test.ts`, node): the pure modules. Fast, no DOM, no RN.
 * - **ui** (`*.test.tsx`, jsdom): components rendered through
 *   `react-native-web`, which is the same translation the web build already
 *   uses. These exist because three reviews in a row found defects the logic
 *   suite structurally could not see — a button wired to a screen that does
 *   not exist, a control a screen reader cannot reach, a card that renders
 *   its headline as a 10px badge.
 */
export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    projects: [
      {
        resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
        test: {
          name: 'logic',
          include: ['src/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
            // The app's own web build does exactly this.
            'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
          },
        },
        test: {
          name: 'ui',
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ui.tsx'],
        },
      },
    ],
  },
});
