// order.test.js — initiative parsing and display order. Pure: no shared state.

import test from 'node:test';
import assert from 'node:assert/strict';

import { parseInit, sortedRows, initiativedRows } from '../js/order.js';

// A row carrying only the fields order.js reads.
function row(init, name) {
  return { init, name };
}

const names = (rows) => rows.map((r) => r.name);

test('parseInit treats blank and non-numeric values as parked', () => {
  assert.equal(parseInit(''), null);
  assert.equal(parseInit('   '), null);
  assert.equal(parseInit('abc'), null);
  assert.equal(parseInit(null), null);
  assert.equal(parseInit(undefined), null);
});

test('parseInit accepts zero and negative initiatives as real values', () => {
  // 0 is a legitimate initiative, not "blank" — the classic falsy-check bug.
  assert.equal(parseInit('0'), 0);
  assert.equal(parseInit('-3'), -3);
  assert.equal(parseInit('12'), 12);
  assert.equal(parseInit(' 7 '), 7);
});

test('rows sort by initiative numerically, not as strings', () => {
  // Guards the string-sort regression: '10' < '9' lexically, but 10 acts first.
  const rows = sortedRows([row('9', 'Nine'), row('10', 'Ten')]);
  assert.deepEqual(names(rows), ['Ten', 'Nine']);
});

test('equal initiative ties break by name, case-insensitively', () => {
  // Fixture chosen so case-insensitive and naive case-sensitive ASCII sorts
  // disagree: case-sensitive would yield ['Alice', 'Zed', 'apple', 'bob']
  // (capitals sort before all lowercase in ASCII), which would pass a test
  // built from an all-same-case or already-ASCII-ordered fixture.
  const rows = sortedRows([row('10', 'bob'), row('10', 'Alice'), row('10', 'Zed'), row('10', 'apple')]);
  assert.deepEqual(names(rows), ['Alice', 'apple', 'bob', 'Zed']);
});

test('parked rows sit at the bottom in insertion order', () => {
  const rows = sortedRows([
    row('', 'ParkedFirst'),
    row('5', 'Five'),
    row('', 'ParkedSecond'),
    row('20', 'Twenty'),
  ]);
  assert.deepEqual(names(rows), ['Twenty', 'Five', 'ParkedFirst', 'ParkedSecond']);
});

test('initiativedRows excludes parked rows entirely', () => {
  const rows = initiativedRows([row('', 'Parked'), row('5', 'Five'), row('20', 'Twenty')]);
  assert.deepEqual(names(rows), ['Twenty', 'Five']);
});

test('a zero-initiative row participates in the turn order', () => {
  const rows = initiativedRows([row('0', 'Zero'), row('', 'Parked')]);
  assert.deepEqual(names(rows), ['Zero']);
});

test('sorting does not mutate the input array', () => {
  const input = [row('5', 'Five'), row('20', 'Twenty')];
  sortedRows(input);
  assert.deepEqual(names(input), ['Five', 'Twenty']);
});
