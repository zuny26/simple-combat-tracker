// wiring.dom.test.js — does main.js route events to the right action?
//
// The pure logic behind each action is already covered (hp.test.js, turns.test.js);
// what is untested is whether the delegated listeners on #creature-rows actually
// reach it. Routing is by CSS class, which makes those classes a contract between
// render.js and main.js — these tests fail loudly if one side renames without the
// other.
//
// main.js calls init() at module evaluation, so it must be imported AFTER bootDom()
// has installed the globals. That is why this file uses a dynamic import while the
// other DOM test files use static ones. init() runs exactly once per process; node
// --test gives each file its own process, and resetApp() resets state rather than
// re-running init() (which would double-wire every listener).

import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { bootDom, resetApp, seedCreature, row } from './domHarness.js';
import { state } from '../js/state.js';
import { currentHP } from '../js/hp.js';
import { renderTable } from '../js/render.js';

const { window } = bootDom();
await import('../js/main.js'); // runs init(): loads state, renders, wires listeners

beforeEach(resetApp);

// Set a field's value and fire the delegated `input` event the way a real edit does.
function type(el, value) {
  el.value = value;
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('the Dmg button applies the amount from its own row', () => {
  const c = seedCreature({ init: '10', name: 'Goblin', maxHP: 10 });
  renderTable();

  const tr = row(c.id);
  type(tr.querySelector('.f-adjust'), '3');
  tr.querySelector('.r-dmg').click();

  assert.equal(c.damageTaken, 3);
  assert.equal(currentHP(c), 7);
  assert.equal(tr.querySelector('.f-adjust').value, '', 'the amount field is cleared');
});

test('the Heal button applies the amount from its own row', () => {
  const c = seedCreature({ init: '10', name: 'Goblin', maxHP: 10, damageTaken: 6 });
  renderTable();

  const tr = row(c.id);
  type(tr.querySelector('.f-adjust'), '2');
  tr.querySelector('.r-heal').click();

  assert.equal(currentHP(c), 6);
});

test('Enter in the amount field never applies it', () => {
  // Deliberate: applying is an explicit button click only, so a stray Enter can never
  // take HP off the wrong creature.
  const c = seedCreature({ init: '10', name: 'Goblin', maxHP: 10 });
  renderTable();

  const input = row(c.id).querySelector('.f-adjust');
  type(input, '5');
  input.dispatchEvent(new window.KeyboardEvent('keydown', {
    key: 'Enter', bubbles: true, cancelable: true,
  }));

  assert.equal(c.damageTaken, 0, 'no damage was applied');
  assert.equal(input.value, '5', 'the typed amount is left alone');
});

test('editing Max HP re-clamps the damage accumulator', () => {
  const c = seedCreature({ init: '10', name: 'Goblin', maxHP: 20, damageTaken: 18 });
  renderTable();

  type(row(c.id).querySelector('.f-maxhp'), '10');

  assert.equal(c.maxHP, 10);
  assert.equal(c.damageTaken, 10, 'clamped to the new max');
  assert.equal(currentHP(c), 0);
});

test('removing an untouched row skips the confirm dialog', () => {
  const c = seedCreature({}); // every field at its makeCreature() default
  renderTable();

  row(c.id).querySelector('.btn-remove').click();

  assert.equal(state.creatures.length, 0, 'removed immediately');
  assert.equal(
    globalThis.document.getElementById('confirm-backdrop').hidden,
    true,
    'no dialog was raised',
  );
});

test('removing a named row asks first, and only removes on confirm', () => {
  const c = seedCreature({ init: '10', name: 'Goblin', maxHP: 10 });
  renderTable();

  row(c.id).querySelector('.btn-remove').click();

  assert.equal(state.creatures.length, 1, 'not removed yet');
  const backdrop = globalThis.document.getElementById('confirm-backdrop');
  assert.equal(backdrop.hidden, false, 'the dialog is showing');
  assert.match(
    globalThis.document.getElementById('confirm-title').textContent,
    /Remove "Goblin"\?/,
  );

  globalThis.document.getElementById('confirm-ok-btn').click();
  assert.equal(state.creatures.length, 0, 'removed after confirming');
});

test('cancelling the remove dialog leaves the creature alone', () => {
  const c = seedCreature({ init: '10', name: 'Goblin', maxHP: 10 });
  renderTable();

  row(c.id).querySelector('.btn-remove').click();
  globalThis.document.getElementById('confirm-cancel-btn').click();

  assert.equal(state.creatures.length, 1);
  assert.equal(globalThis.document.getElementById('confirm-backdrop').hidden, true);
});

test('the tag pill X removes exactly that tag', () => {
  const c = seedCreature({ init: '10', name: 'Goblin', conditions: ['Prone', 'Poisoned'] });
  renderTable();

  const poisoned = row(c.id).querySelector('.cond-x[data-tag="Poisoned"]');
  poisoned.click();

  assert.deepEqual(c.conditions, ['Prone']);
  assert.equal(row(c.id).querySelector('.cond-x[data-tag="Poisoned"]'), null);
});

test('the duplicate button copies the row in place', () => {
  const c = seedCreature({ init: '10', name: 'Goblin', maxHP: 10, damageTaken: 4 });
  renderTable();

  row(c.id).querySelector('.btn-dupe').click();

  assert.equal(state.creatures.length, 2);
  const copy = state.creatures[1];
  assert.equal(copy.name, 'Goblin 2');
  assert.equal(copy.damageTaken, 0, 'a copy enters at full HP');
  assert.ok(row(copy.id), 'the copy was rendered');
});
