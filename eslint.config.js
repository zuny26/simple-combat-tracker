// eslint.config.js — flat config. Three blocks, because the three kinds of file
// in this repo see three different sets of globals.
//
// The point of linting here is no-undef: with no typechecker and no build step,
// it is the only automated thing that catches a typo'd identifier or a function
// renamed in one module but not in its callers. Stylistic rules stay OFF —
// conventions live in CLAUDE.md and are enforced by review, and style churn
// would bury real findings.

import js from '@eslint/js';

// The complete set of browser globals the app currently uses. Deliberately
// hand-listed rather than pulled from a `globals` package (see file header).
// Extend this when the app starts using another browser API (setTimeout,
// console, navigator, matchMedia, requestAnimationFrame, etc.)
const browserGlobals = {
  document: 'readonly',
  window: 'readonly',
  localStorage: 'readonly',
  confirm: 'readonly',
};

const nodeGlobals = {
  globalThis: 'readonly',
  process: 'readonly',
  console: 'readonly',
};

export default [
  { ignores: ['playwright-report/', 'test-results/'] },

  js.configs.recommended,

  // The app itself — runs in the browser, no bundler, ES modules only.
  {
    files: ['js/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: browserGlobals,
    },
    rules: {
      'no-unused-vars': 'error',
    },
  },

  // Tests — run under node --test.
  {
    files: ['test/**/*.js'],
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
    files: ['e2e/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...nodeGlobals, ...browserGlobals },
    },
  },

  // Root-level config files, so `eslint .` does not report false no-undef here.
  {
    files: ['*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: nodeGlobals,
    },
  },
];
