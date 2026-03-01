'use strict'

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: { project: true },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended-type-checked',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
    // Import boundary rules — critical for ADR-001
    'import/no-restricted-paths': ['error', {
      zones: [
        // web cannot import db or apps
        { target: './apps/web', from: './packages/db' },
        { target: './apps/web', from: './apps/api' },
        { target: './apps/web', from: './apps/pipeline' },
        // api cannot import internal schema or pipeline
        { target: './apps/api', from: './packages/db/src/internal-schema.ts' },
        { target: './apps/api', from: './apps/pipeline' },
        // shared has zero deps
        { target: './packages/shared', from: './packages/db' },
        { target: './packages/shared', from: './apps' },
      ],
    }],
  },
  ignorePatterns: ['node_modules', '.next', 'dist', 'migrations'],
}
