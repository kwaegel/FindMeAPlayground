// ESLint flat config for Svelte + Vite project.
// Uses eslint-plugin-svelte for .svelte file support.
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2022,
      },
    },
  },
  {
    // Vitest test files get test globals injected.
    files: ['tests/**/*.js', 'tests/**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
  },
  {
    // Ignore build outputs and node_modules.
    ignores: ['dist/', 'node_modules/', '.wrangler/'],
  },
];
