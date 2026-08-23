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
    // TS-aware unused detection (core rule mis-fires on TS constructs)
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
};
