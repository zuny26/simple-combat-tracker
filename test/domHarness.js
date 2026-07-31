// domHarness.js — boots a jsdom document from the REAL index.html, so the app's
// markup is part of the tested contract: a renamed id or a dropped element breaks
// these tests. render.js:63-65 reaches for #round-value, #start-next-btn and
// document.documentElement with no fallback, so a hand-written fixture would have to
// mirror index.html by hand and would silently drift.
//
// FIDELITY BOUNDARY — do not erode this:
// jsdom is for state->DOM correctness only. Focus semantics (.focus(),
// document.activeElement, and above all e.relatedTarget on focusout, which
// main.js:102 depends on) are NOT trusted here; those assertions live in e2e/ under a
// real browser. What jsdom CAN prove honestly is node identity — that reorderRows()
// moved the existing <tr> nodes instead of rebuilding them — because identity is not
// a focus concept. Cheap structural proof here, expensive real-browser proof there.
// If a jsdom test and an e2e test ever disagree, the jsdom test is wrong: delete it
// or promote it to e2e/.
//
// NOTE: this file uses `globalThis.document` rather than a bare `document` on
// purpose. The test/ block in eslint.config.js lists node globals only, and keeping
// it that way preserves no-undef's full strength in tests. Test files should
// destructure the { window, document } that bootDom() returns.

import { readFileSync } from 'node:fs';
// `URL` is a Node global, but the test/ block in eslint.config.js hand-lists only the
// three node globals the suite used before this file existed. Importing it keeps
// no-undef at full strength without widening that list (see the NOTE below).
import { URL } from 'node:url';
import { JSDOM } from 'jsdom';

import { installLocalStorage } from './helpers.js';
import { state, resetState } from '../js/state.js';
import { renderTable } from '../js/render.js';

// Two jsdom defaults we rely on:
//   - runScripts is off, so neither the pre-paint inline script nor
//     <script type="module" src="js/main.js"> executes. The test decides when init()
//     runs (see test/wiring.dom.test.js).
//   - external resources are not fetched, so the Google Fonts <link> is inert and the
//     suite stays offline.
export function bootDom() {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html);
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  installLocalStorage();
  return { window: dom.window, document: dom.window.document };
}

// Reset between tests WITHOUT re-running main.js's init() — that would double-wire
// every delegated listener. renderTable() sets body.innerHTML = '' (render.js:20-21),
// replacing the tbody's CHILDREN and never the tbody element itself, so listeners
// bound by wireEvents() survive.
//
// Popover panels are appended to document.body, OUTSIDE #creature-rows, so
// renderTable() cannot clean them up. A test that leaves one open would otherwise leak
// into the next, hence the explicit sweep here. beforeEach is enough — the sweep clears
// whatever the previous test left behind, and node --test gives each file its own
// process, so nothing leaks between files.
export function resetApp() {
  const doc = globalThis.document;
  for (const el of doc.querySelectorAll('.cond-backdrop, .cond-pop, .row-menu, .app-menu')) {
    el.remove();
  }
  const confirmBackdrop = doc.getElementById('confirm-backdrop');
  if (confirmBackdrop) confirmBackdrop.hidden = true;
  installLocalStorage();
  resetState();
  renderTable();
}

// Push a creature in makeCreature() shape with `fields` applied, and return it.
// Does NOT render — call renderTable() when the test is ready.
export function seedCreature(fields = {}) {
  const c = {
    id: state.nextId++,
    init: '',
    name: '',
    ac: '',
    maxHP: 0,
    tempHP: 0,
    damageTaken: 0,
    conditions: [],
    other: [],
    ...fields,
  };
  state.creatures.push(c);
  return c;
}

export function row(id) {
  return globalThis.document.querySelector(`#creature-rows tr[data-id="${id}"]`);
}
