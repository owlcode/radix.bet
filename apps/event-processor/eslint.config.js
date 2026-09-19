import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    ignores: ['dist/']
  }
];
