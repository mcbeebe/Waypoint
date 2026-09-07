/**
 * Minimal, high-signal lint config (W0 cleanup — the `lint` script existed
 * with no config, so it always errored). Kept deliberately small: correctness
 * rules only, no style opinions — Prettier/format debates stay out of CI.
 */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  env: { es2022: true, browser: true, node: true },
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  ignorePatterns: ['node_modules/', 'dist/', 'web-build/', '.expo/', 'supabase/functions/'],
  overrides: [
    {
      // The helper module and the timezone suites reference the banned form on
      // purpose — one implements the replacement, the others assert against it.
      files: ['src/lib/localDate.ts', 'src/**/*.tz.test.ts', 'src/**/*.tz.test.tsx'],
      rules: { 'no-restricted-syntax': 'off' },
    },
  ],
  rules: {
    // Hooks correctness (existing disable-comments reference these rules)
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // Correctness
    'no-dupe-keys': 'error',
    'no-dupe-args': 'error',
    'no-unreachable': 'error',
    'no-constant-binary-expression': 'error',
    'no-self-compare': 'error',
    'no-template-curly-in-string': 'warn',
    'no-debugger': 'error',
    eqeqeq: ['warn', 'smart'],
    /**
     * The UTC-calendar-day class, banned at the gate.
     *
     * This bug has been found and fixed FOUR times in this repo — twice inline
     * (requestClocks.ts, RequestTrackerScreen.tsx), once in onboarding's
     * date_of_birth, and once as a 14-site sweep. Each time the fix was a
     * helper plus a comment, and each time the pattern came straight back,
     * because nothing stopped the next author typing it. A doc comment is not
     * enforceable; this is.
     *
     * `toISOString()` gives the UTC day. West of Greenwich the UTC day rolls
     * over at 4-5pm local, so "today" becomes TOMORROW every evening in
     * California — which is where Waypoint's families are. Use
     * `toLocalISODate` / `todayLocalISO` from src/lib/localDate.ts.
     *
     * Full timestamps (`toISOString()` with no slice) are untouched and
     * correct: a timestamptz column wants an instant.
     */
    'no-restricted-syntax': [
      'error',
      {
        selector:
          "CallExpression[callee.object.callee.property.name='toISOString'][callee.property.name='slice']",
        message:
          'toISOString().slice(0,10) is the UTC day, which is tomorrow after 4pm in California. Use toLocalISODate()/todayLocalISO() from @/lib/localDate.',
      },
      {
        selector:
          "MemberExpression[object.callee.object.callee.property.name='toISOString'][object.callee.property.name='split']",
        message:
          "toISOString().split('T')[0] is the UTC day, which is tomorrow after 4pm in California. Use toLocalISODate()/todayLocalISO() from @/lib/localDate.",
      },
    ],
    // TS-aware unused detection (core rule mis-fires on TS constructs)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
};
