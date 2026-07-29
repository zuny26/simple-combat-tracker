// state.test.js — persistence, defensive normalization, and duplication.
// load() is the app's corruption firewall, so most of these feed it bad data.

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { installLocalStorage } from './helpers.js';
import {
  state,
  makeCreature,
  isEmptyCreature,
  load,
  save,
  duplicateCreature,
  resetState,
  hasTag,
  addTag,
  removeTag,
  toggleTag,
} from '../js/state.js';

const STORAGE_KEY = 'dnd-combat-tracker';

let store;

beforeEach(() => {
  store = installLocalStorage();
  resetState();
});

// Write a raw blob for load() to consume.
function persist(raw) {
  store.setItem(STORAGE_KEY, typeof raw === 'string' ? raw : JSON.stringify(raw));
}

test('load survives malformed JSON without throwing', () => {
  persist('{not json at all');
  assert.doesNotThrow(load);
  assert.deepEqual(state.creatures, []);
  assert.equal(state.round, 0);
  assert.equal(state.started, false);
});

test('load survives a non-object blob', () => {
  persist('"just a string"');
  assert.doesNotThrow(load);
  assert.deepEqual(state.creatures, []);
});

test('load survives a null blob', () => {
  persist('null');
  assert.doesNotThrow(load);
  assert.deepEqual(state.creatures, []);
});

test('load defaults creatures to an empty array when the key is missing', () => {
  persist({ round: 3 });
  load();
  assert.deepEqual(state.creatures, []);
  assert.equal(state.nextId, 1);
});

test('a legacy comma-separated conditions string is split into tags', () => {
  persist({ creatures: [{ id: 1, conditions: 'Prone, Poisoned' }] });
  load();
  assert.deepEqual(state.creatures[0].conditions, ['Prone', 'Poisoned']);
});

test('a legacy other string is kept whole, commas and all', () => {
  // Splitting would mangle a note that legitimately contains a comma.
  persist({ creatures: [{ id: 1, other: 'bitten by a snake, twice' }] });
  load();
  assert.deepEqual(state.creatures[0].other, ['bitten by a snake, twice']);
});

test('normalization coerces missing and junk fields to safe defaults', () => {
  persist({ creatures: [{ id: 1, maxHP: 'abc', tempHP: null, init: 12, name: null }] });
  load();
  const c = state.creatures[0];
  assert.equal(c.maxHP, 0);
  assert.equal(c.tempHP, 0);
  assert.equal(c.damageTaken, 0);
  assert.equal(c.init, '12', 'init normalizes to a string');
  assert.equal(c.name, '');
  assert.deepEqual(c.conditions, []);
  assert.deepEqual(c.other, []);
});

test('missing ids are backfilled above the highest existing id', () => {
  persist({ creatures: [{ name: 'A' }, { id: 5, name: 'B' }, { name: 'C' }] });
  load();
  assert.deepEqual(state.creatures.map((c) => c.id), [6, 5, 7]);
  assert.equal(state.nextId, 8, 'nextId must stay above every id in use');
});

test('a started combat with a dangling activeId reverts to pre-combat', () => {
  persist({ creatures: [{ id: 1 }], started: true, activeId: 99, round: 4 });
  load();
  assert.equal(state.activeId, null);
  assert.equal(state.started, false);
  assert.equal(state.round, 0);
});

test('a started combat with a valid activeId is preserved', () => {
  persist({ creatures: [{ id: 1, init: '10' }], started: true, activeId: 1, round: 4 });
  load();
  assert.equal(state.activeId, 1);
  assert.equal(state.started, true);
  assert.equal(state.round, 4);
});

test('save then load round-trips a combat', () => {
  const c = makeCreature();
  c.init = '15';
  c.name = 'Goblin';
  c.maxHP = 7;
  state.creatures = [c];
  state.round = 2;
  state.started = true;
  state.activeId = c.id;
  save();
  const blob = store.getItem(STORAGE_KEY);

  // resetState() itself calls save(), which would overwrite the blob we just
  // wrote with an empty one — put it back before loading.
  resetState();
  store.setItem(STORAGE_KEY, blob);

  load();
  assert.equal(state.creatures.length, 1);
  assert.equal(state.creatures[0].name, 'Goblin');
  assert.equal(state.round, 2);
  assert.equal(state.activeId, c.id);
});

test('duplicate numbers names in sequence', () => {
  const c = makeCreature();
  c.name = 'Goblin';
  state.creatures = [c];

  const second = duplicateCreature(c.id);
  assert.equal(second.name, 'Goblin 2');

  const third = duplicateCreature(c.id);
  assert.equal(third.name, 'Goblin 3', 'numbering continues past existing copies');
});

test('duplicating a blank name leaves it blank', () => {
  const c = makeCreature();
  state.creatures = [c];
  assert.equal(duplicateCreature(c.id).name, '');
});

test('a duplicate enters fresh but keeps its stat block', () => {
  const c = makeCreature();
  Object.assign(c, {
    name: 'Ogre',
    init: '14',
    ac: '11',
    maxHP: 59,
    tempHP: 5,
    damageTaken: 20,
    conditions: ['Prone'],
    other: ['bleeding'],
  });
  state.creatures = [c];

  const copy = duplicateCreature(c.id);
  assert.equal(copy.init, '14');
  assert.equal(copy.ac, '11');
  assert.equal(copy.maxHP, 59);
  assert.equal(copy.tempHP, 0, 'a copy carries no temp HP');
  assert.equal(copy.damageTaken, 0, 'a copy enters at full HP');
  assert.deepEqual(copy.conditions, [], 'a copy carries no conditions');
  assert.deepEqual(copy.other, [], 'a copy carries no notes');
});

test('a duplicate is spliced in directly after its source', () => {
  const a = makeCreature();
  a.name = 'A';
  const b = makeCreature();
  b.name = 'B';
  state.creatures = [a, b];

  const copy = duplicateCreature(a.id);
  assert.deepEqual(state.creatures.map((c) => c.id), [a.id, copy.id, b.id]);
});

test('duplicating an unknown id returns null', () => {
  assert.equal(duplicateCreature(12345), null);
});

test('isEmptyCreature distinguishes a fresh row from a touched one', () => {
  const c = makeCreature();
  assert.equal(isEmptyCreature(c), true);
  c.name = 'Goblin';
  assert.equal(isEmptyCreature(c), false);
});

test('resetState clears everything back to pre-combat', () => {
  const c = makeCreature();
  state.creatures = [c];
  state.round = 5;
  state.started = true;
  state.activeId = c.id;

  resetState();
  assert.deepEqual(state.creatures, []);
  assert.equal(state.round, 0);
  assert.equal(state.started, false);
  assert.equal(state.activeId, null);
  assert.equal(state.nextId, 1);
});

test('tags are added, matched case-insensitively, and de-duplicated', () => {
  const c = makeCreature();
  state.creatures = [c];

  addTag(c.id, 'conditions', 'Prone');
  addTag(c.id, 'conditions', 'prone');
  assert.deepEqual(c.conditions, ['Prone'], 'a case variant is not a new tag');
  assert.equal(hasTag(c, 'conditions', 'PRONE'), true);

  addTag(c.id, 'conditions', '   ');
  assert.deepEqual(c.conditions, ['Prone'], 'blank tags are ignored');
});

test('tags are removed and toggled case-insensitively', () => {
  const c = makeCreature();
  state.creatures = [c];

  addTag(c.id, 'conditions', 'Prone');
  removeTag(c.id, 'conditions', 'PRONE');
  assert.deepEqual(c.conditions, []);

  toggleTag(c.id, 'conditions', 'Stunned');
  assert.deepEqual(c.conditions, ['Stunned']);
  toggleTag(c.id, 'conditions', 'stunned');
  assert.deepEqual(c.conditions, []);
});
