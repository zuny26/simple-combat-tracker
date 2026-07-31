// reorder.dom.test.js — the structural half of the focus-survival invariant.
//
// reorderRows() must MOVE the existing <tr> nodes rather than rebuild them; that node
// identity is precisely what lets focus and an in-progress edit survive a re-sort.
// Identity is not a focus concept, so jsdom can prove it honestly. The consequence —
// that focus actually survived — is proven in e2e/focus-reorder.spec.js under a real
// browser. See the fidelity note in domHarness.js.

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bootDom, resetApp, seedCreature } from './domHarness.js';
import { renderTable, reorderRows, currentRowOrder } from '../js/render.js';

bootDom();

beforeEach(resetApp);

test('reorderRows moves the existing nodes instead of rebuilding them', () => {
  const aaa = seedCreature({ init: '5', name: 'Aaa' });
  const bbb = seedCreature({ init: '20', name: 'Bbb' });
  renderTable();

  assert.deepEqual(currentRowOrder(), [bbb.id, aaa.id], 'higher # sorts first');

  const rowAaa = globalThis.document.querySelector(`tr[data-id="${aaa.id}"]`);
  const nameInput = rowAaa.querySelector('.f-name');

  aaa.init = '30'; // Aaa now outranks Bbb
  reorderRows();

  assert.deepEqual(currentRowOrder(), [aaa.id, bbb.id], 'the DOM re-sorted');
  assert.equal(
    globalThis.document.querySelector(`tr[data-id="${aaa.id}"]`),
    rowAaa,
    'the same <tr> object was moved, not replaced',
  );
  assert.equal(
    rowAaa.querySelector('.f-name'),
    nameInput,
    'the same input object survived — this is what preserves focus',
  );
});

test('renderTable DOES rebuild, so it is the wrong tool for a re-sort', () => {
  // The counterpart to the test above: this is why CLAUDE.md restricts renderTable()
  // to structural changes only.
  const aaa = seedCreature({ init: '5', name: 'Aaa' });
  seedCreature({ init: '20', name: 'Bbb' });
  renderTable();

  const before = globalThis.document.querySelector(`tr[data-id="${aaa.id}"]`);
  renderTable();
  const after = globalThis.document.querySelector(`tr[data-id="${aaa.id}"]`);

  assert.notEqual(after, before, 'a rebuild replaces the node');
});

test('currentRowOrder reports the DOM, not the sorted model', () => {
  // main.js compares currentRowOrder() against sortedRows(state) to decide whether a
  // re-sort is needed at all. That comparison is only meaningful if this function
  // reads the DOM — if it ever started deriving from state, the short-circuit would
  // always claim "unchanged" and rows would stop moving.
  const aaa = seedCreature({ init: '5', name: 'Aaa' });
  const bbb = seedCreature({ init: '20', name: 'Bbb' });
  renderTable();

  aaa.init = '30'; // model changed; the DOM has not been told yet

  assert.deepEqual(currentRowOrder(), [bbb.id, aaa.id], 'still the old DOM order');
});

test('a blank # parks the row at the bottom regardless of insertion order', () => {
  const parked = seedCreature({ init: '', name: 'Parked' });
  const fighter = seedCreature({ init: '3', name: 'Fighter' });
  renderTable();

  assert.deepEqual(currentRowOrder(), [fighter.id, parked.id]);
});
