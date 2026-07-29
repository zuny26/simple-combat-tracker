// turns.test.js — turn/round flow over the shared `state` singleton.
// Every test starts from a reset state; seed() rebuilds the roster.

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { state, resetState } from '../js/state.js';
import {
  activeInitiativedIndex,
  start,
  next,
  revertToPreCombat,
  reassignActiveAfterLeaving,
  maybeRevertToPreCombat,
} from '../js/turns.js';

// Build a roster from initiative strings. Ids are 1..n in argument order, so
// seed('20', '10', '5') yields ids 1, 2, 3 already in sorted order.
function seed(...inits) {
  state.creatures = inits.map((init, i) => ({
    id: i + 1,
    init,
    name: `C${i + 1}`,
    ac: '',
    maxHP: 0,
    tempHP: 0,
    damageTaken: 0,
    conditions: [],
    other: [],
  }));
}

beforeEach(() => {
  resetState();
});

test('start is a no-op when nothing is initiatived', () => {
  seed('', '');
  start();
  assert.equal(state.started, false);
  assert.equal(state.round, 0);
  assert.equal(state.activeId, null);
});

test('start highlights the top initiatived row and opens round 1', () => {
  seed('20', '10', '5');
  start();
  assert.equal(state.started, true);
  assert.equal(state.round, 1);
  assert.equal(state.activeId, 1);
  assert.equal(activeInitiativedIndex(), 0);
});

test('next walks down the order without changing the round', () => {
  seed('20', '10', '5');
  start();
  next();
  assert.equal(state.activeId, 2);
  assert.equal(state.round, 1);
  next();
  assert.equal(state.activeId, 3);
  assert.equal(state.round, 1);
});

test('next past the last row wraps to the top and bumps the round', () => {
  seed('20', '10');
  start();
  next(); // -> id 2, last row
  next(); // wraps
  assert.equal(state.activeId, 1);
  assert.equal(state.round, 2);
});

test('next resumes at the top without bumping the round when the active creature has left', () => {
  seed('20', '10', '5');
  start();
  state.activeId = 999; // no longer in the initiatived list
  next();
  assert.equal(state.activeId, 1);
  assert.equal(state.round, 1, 'a vanished active creature must not advance the round');
});

test('next reverts to pre-combat when the order empties', () => {
  seed('20');
  start();
  state.creatures = [];
  next();
  assert.equal(state.started, false);
  assert.equal(state.round, 0);
  assert.equal(state.activeId, null);
});

test('revertToPreCombat clears the highlight and the round', () => {
  seed('20');
  start();
  revertToPreCombat();
  assert.equal(state.started, false);
  assert.equal(state.round, 0);
  assert.equal(state.activeId, null);
});

test('reassignActiveAfterLeaving picks the row now sitting at the old index', () => {
  seed('20', '10', '5');
  start();
  next(); // active = id 2, index 1
  state.creatures = state.creatures.filter((c) => c.id !== 2); // it leaves
  reassignActiveAfterLeaving(1);
  assert.equal(state.activeId, 3, 'the next row down takes the turn');
});

test('reassignActiveAfterLeaving wraps to the top when the last row left', () => {
  seed('20', '10');
  start();
  next(); // active = id 2, index 1 (last)
  state.creatures = state.creatures.filter((c) => c.id !== 2);
  reassignActiveAfterLeaving(1);
  assert.equal(state.activeId, 1);
});

test('reassignActiveAfterLeaving reverts to pre-combat when nothing is left', () => {
  seed('20');
  start();
  state.creatures = [];
  reassignActiveAfterLeaving(0);
  assert.equal(state.started, false);
  assert.equal(state.round, 0);
  assert.equal(state.activeId, null);
});

test('reassignActiveAfterLeaving falls back to the top row for a null index', () => {
  seed('20', '10');
  start();
  next();
  reassignActiveAfterLeaving(null);
  assert.equal(state.activeId, 1);
});

test('reassignActiveAfterLeaving does nothing before combat starts', () => {
  seed('20', '10');
  reassignActiveAfterLeaving(0);
  assert.equal(state.started, false);
  assert.equal(state.activeId, null);
});

test('maybeRevertToPreCombat reverts once every row is parked', () => {
  seed('20', '10');
  start();
  for (const c of state.creatures) c.init = '';
  maybeRevertToPreCombat();
  assert.equal(state.started, false);
  assert.equal(state.round, 0);
});

test('maybeRevertToPreCombat leaves a running combat alone', () => {
  seed('20', '10');
  start();
  maybeRevertToPreCombat();
  assert.equal(state.started, true);
  assert.equal(state.round, 1);
  assert.equal(state.activeId, 1);
});

test('activeInitiativedIndex returns -1 when there is no active creature', () => {
  seed('20');
  assert.equal(activeInitiativedIndex(), -1);
});
