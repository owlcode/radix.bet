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
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname
      }
    }
  },
  {
    ignores: ['dist/']
  }
];
