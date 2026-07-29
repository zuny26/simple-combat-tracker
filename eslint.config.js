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
// console, navigator, matchMedia, requestAnimationFrame, etc.) — otherwise
// that usage fails no-undef and the pre-commit hook blocks the commit.
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
