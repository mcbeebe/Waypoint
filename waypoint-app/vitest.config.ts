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
          // `.tz.test.tsx` belongs to the two projects below, which run it
          // in both hemispheres; excluding it here keeps it from running a
          // third time under the machine's own zone.
          include: ['src/**/*.test.tsx'],
          exclude: ['src/**/*.tz.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ui.tsx'],
        },
      },
      // Components whose behaviour depends on the calendar day, run EAST and
      // WEST — the same reasoning as the `tz`/`tz-west` logic projects, applied
      // to rendered screens.
      //
      // This exists because a date assertion in the plain `ui` project is
      // DECORATIVE: CI runs at TZ=UTC, where `toISOString().split('T')[0]` and
      // the local calendar day agree, so an onboarding test asserting the saved
      // birthday passed with the UTC bug still in place. Verified — it only went
      // red at UTC+7.
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
            'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
          },
        },
        test: {
          name: 'ui-tz',
          include: ['src/**/*.tz.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ui.tsx'],
          env: { TZ: 'Asia/Ho_Chi_Minh' },
        },
      },
      {
        resolve: {
          alias: {
            '@': path.resolve(__dirname, 'src'),
            'react-native': path.resolve(__dirname, 'node_modules/react-native-web'),
          },
        },
        test: {
          name: 'ui-tz-west',
          include: ['src/**/*.tz.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./vitest.setup.ui.tsx'],
          env: { TZ: 'America/Los_Angeles' },
        },
      },
    ],
  },
});
