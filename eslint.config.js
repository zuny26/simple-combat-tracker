// JavaScript keeps no-undef; TypeScript uses vue-tsc for identifier checks.

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

// The complete set of browser globals the app currently uses. Deliberately
// hand-listed rather than pulled from a `globals` package.
// Extend this when the app starts using another browser API (setTimeout,
// console, navigator, matchMedia, requestAnimationFrame, etc.)
const browserGlobals = {
  document: 'readonly',
  window: 'readonly',
  localStorage: 'readonly',
};

const nodeGlobals = {
  globalThis: 'readonly',
  process: 'readonly',
  console: 'readonly',
};

export default [
  { ignores: ['dist/', 'coverage/', '.vite/', 'playwright-report/', 'test-results/'] },

  js.configs.recommended,
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.vue'],
  })),
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },

  // The theme registry and typed UI run in the browser.
  {
    files: ['src/**/*.ts', 'src/**/*.vue'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
  },

  // Mounted UI and combat tests run under Vitest.
  {
    files: ['test/**/*.js', 'test/**/*.ts', 'test/**/*.vue'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
  },

  // Playwright specs — Node modules that also contain browser code. Callbacks passed
  // to page.evaluate() / page.addInitScript() run in the page, so they reference
  // document, window and localStorage; without the browser globals here, no-undef
  // fails on them.
  {
    files: ['test/acceptance/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...nodeGlobals, ...browserGlobals },
    },
  },

  // Root-level config files, so `eslint .` does not report false no-undef here.
  {
    files: ['*.js', '*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
  },
];
