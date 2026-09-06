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
          exclude: ['src/**/*.tz.test.ts'],
          environment: 'node',
        },
      },
      {
        // Dates, run east of Greenwich. A statutory deadline computed by
        // slicing a UTC string out of a local-midnight Date is a day early
        // for every family in a UTC+ timezone — and under the default TZ the
        // two agree, so the logic suite cannot see it. A mutation sweep
        // caught this test being decorative; this project is the fix.
        resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
        test: {
          name: 'tz',
          include: ['src/**/*.tz.test.ts'],
          environment: 'node',
          env: { TZ: 'Asia/Ho_Chi_Minh' },
        },
      },
      {
        // The SAME files, run WEST of Greenwich — where Waypoint's families
        // actually live. One timezone is not a timezone suite: an adversary
        // pass found `created_at` being bucketed on its UTC day, which is
        // invisible at UTC+7 (a late local evening is still the same UTC
        // date) and an off-by-one every evening in California. East catches
        // the "a day early" class; west catches the "a day late" class.
        resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
        test: {
          name: 'tz-west',
          include: ['src/**/*.tz.test.ts'],
          environment: 'node',
          env: { TZ: 'America/Los_Angeles' },
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
