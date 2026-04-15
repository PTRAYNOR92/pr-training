/** Shared ESLint config for the PR Training monorepo. */
module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-console': 'off',
    eqeqeq: ['error', 'always'],
  },
  overrides: [
    {
      files: ['apps/web/**/*.js'],
      env: { browser: true, node: false },
    },
    {
      files: ['apps/api/**/*.js'],
      env: { node: true, browser: false },
    },
    {
      files: ['**/*.test.js', '**/tests/**/*.js'],
      env: { jest: true, node: true },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', 'build/', 'coverage/', '**/*.legacy.js'],
};
