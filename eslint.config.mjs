// FE-004 — ESLint 9 flat config. Replaces the legacy .eslintrc.cjs.
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/*.legacy.js',
      '**/_legacy-*.js',
      '**/vitest.config.js.timestamp-*',
      'apps/*/node_modules/**',
    ],
  },

  js.configs.recommended,

  // Shared defaults for every linted file.
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      eqeqeq: ['error', 'always'],
    },
  },

  // Browser-facing frontend code.
  {
    files: ['apps/web/**/*.{js,mjs}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Node-facing API code.
  {
    files: ['apps/api/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Tests — vitest globals + node + browser (for jsdom tests).
  {
    files: ['**/tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.jest,
        vi: 'readonly',
      },
    },
  },
];
