// render.dom.test.js — what render.js builds, asserted against the real index.html.
// Focus is deliberately absent here; see the fidelity note in domHarness.js.

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bootDom, resetApp, seedCreature, row } from './domHarness.js';
import { renderTable } from '../js/render.js';

// Static imports are evaluated before this runs, which is fine: state.js and
// render.js touch `document` only inside functions, never at module scope.
bootDom();

beforeEach(resetApp);

test('a rendered row carries every class main.js routes on', () => {
  const c = seedCreature({ init: '15', name: 'Goblin', ac: '13', maxHP: 7 });
  renderTable();

  const tr = row(c.id);
  assert.ok(tr, 'the row was rendered');

  // These class names are the contract between render.js and main.js (see CLAUDE.md).
  // cond-x is excluded — it only exists once a tag does; covered separately below.
  const contract = [
    'f-init', 'f-name', 'f-ac', 'f-maxhp', 'f-temphp', 'f-adjust',
    'r-dmg', 'r-heal', 'cond-add', 'btn-dupe', 'btn-remove', 'btn-menu',
  ];
  for (const cls of contract) {
    assert.ok(tr.querySelector(`.${cls}`), `row is missing .${cls}`);
  }

  assert.equal(tr.querySelector('.f-init').value, '15');
  assert.equal(tr.querySelector('.f-name').value, 'Goblin');
  assert.equal(tr.querySelector('.f-ac').value, '13');
  assert.equal(tr.querySelector('.f-maxhp').value, '7');
});

test('the card layout gets a caption on every cell that loses a column header', () => {
  const c = seedCreature({ init: '15', name: 'Goblin', maxHP: 7 });
  renderTable();

  const labels = [...row(c.id).querySelectorAll('td[data-label]')]
    .map((td) => td.dataset.label);

  // Name and Actions deliberately have none: the name is the card's title and the
  // actions are unlabelled icons.
  assert.deepEqual(labels, [
    'Init', 'AC', 'Max HP', 'Temp HP', 'Current HP', 'Damage / Heal',
    'Conditions', 'Other',
  ]);
});

test('zero Max HP and zero Temp HP render blank, not "0"', () => {
  // hp.js treats 0 Max HP as "not configured yet" and 0 Temp HP as "none"; the em-dash
  // placeholder reads as either, a literal 0 does not.
  const c = seedCreature({ init: '15', name: 'Goblin' });
  renderTable();

  const tr = row(c.id);
  assert.equal(tr.querySelector('.f-maxhp').value, '');
  assert.equal(tr.querySelector('.f-temphp').value, '');
  assert.equal(tr.querySelector('.hp-cell').className, 'hp-cell hp-unconfigured');
});

test('a creature at zero current HP renders as downed', () => {
  const c = seedCreature({ init: '15', name: 'Goblin', maxHP: 10, damageTaken: 10 });
  renderTable();

  const tr = row(c.id);
  assert.ok(tr.classList.contains('downed'));
  assert.equal(tr.querySelector('.hp-downed-tag').textContent, 'DOWNED');
});

// CLAUDE.md's hardest rule: user data goes in via textContent or .value, never
// innerHTML. innerHTML is reserved for the static SVG icon constants. These two tests
// are what stop that from quietly regressing.

test('a creature name is never parsed as HTML', () => {
  const payload = '<img src=x onerror="throw new Error(1)">';
  const c = seedCreature({ init: '10', name: payload });
  renderTable();

  const tr = row(c.id);
  assert.equal(tr.querySelector('.f-name').value, payload, 'round-trips as text');
  assert.equal(tr.querySelectorAll('img').length, 0, 'no element was created');
});

test('a tag pill is never parsed as HTML', () => {
  const payload = '<b>bold</b>';
  const c = seedCreature({ init: '10', name: 'Goblin', conditions: [payload] });
  renderTable();

  const pill = row(c.id).querySelector('.cond-pill');
  assert.equal(pill.querySelectorAll('b').length, 0, 'no element was created');
  assert.ok(pill.textContent.includes(payload), 'shown verbatim as text');

  // main.js reads these two attributes to know what to remove.
  const x = pill.querySelector('.cond-x');
  assert.equal(x.dataset.field, 'conditions');
  assert.equal(x.dataset.tag, payload);
});
