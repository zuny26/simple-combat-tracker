// hp.test.js — the temp-first HP model. Pure: every case builds its own creature
// object, so these tests share no state and need no reset.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clamp,
  clampDamage,
  currentHP,
  isDowned,
  applyDamage,
  applyHealing,
} from '../js/hp.js';

// A creature with only the fields hp.js touches.
function creature(over = {}) {
  return { maxHP: 0, tempHP: 0, damageTaken: 0, ...over };
}

test('clamp holds a value inside its bounds', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-3, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
});

test('currentHP derives max - damage + temp', () => {
  assert.equal(currentHP(creature({ maxHP: 10, tempHP: 0, damageTaken: 0 })), 10);
  assert.equal(currentHP(creature({ maxHP: 10, tempHP: 0, damageTaken: 4 })), 6);
  assert.equal(currentHP(creature({ maxHP: 10, tempHP: 3, damageTaken: 4 })), 9);
});

test('temp HP can push current HP above max', () => {
  assert.equal(currentHP(creature({ maxHP: 10, tempHP: 7 })), 17);
});

test('damage smaller than temp HP eats temp only', () => {
  const c = creature({ maxHP: 10, tempHP: 5 });
  applyDamage(c, 3);
  assert.equal(c.tempHP, 2);
  assert.equal(c.damageTaken, 0);
  assert.equal(currentHP(c), 12);
});

test('damage larger than temp HP zeroes temp and overflows into damageTaken', () => {
  const c = creature({ maxHP: 10, tempHP: 5 });
  applyDamage(c, 8);
  assert.equal(c.tempHP, 0);
  assert.equal(c.damageTaken, 3);
  assert.equal(currentHP(c), 7);
});

test('damage past max HP clamps and current HP floors at zero', () => {
  const c = creature({ maxHP: 10 });
  applyDamage(c, 25);
  assert.equal(c.damageTaken, 10, 'damageTaken never exceeds maxHP');
  assert.equal(currentHP(c), 0, 'current HP never goes negative');
});

test('healing reduces damageTaken and never touches temp HP', () => {
  const c = creature({ maxHP: 10, tempHP: 4, damageTaken: 6 });
  applyHealing(c, 4);
  assert.equal(c.damageTaken, 2);
  assert.equal(c.tempHP, 4, 'healing must not grant or consume temp HP');
  assert.equal(currentHP(c), 12);
});

test('healing cannot overheal past max HP', () => {
  const c = creature({ maxHP: 10, damageTaken: 3 });
  applyHealing(c, 100);
  assert.equal(c.damageTaken, 0);
  assert.equal(currentHP(c), 10);
});

test('a fresh creature with maxHP 0 is not downed', () => {
  // Unconfigured, not reduced to 0 — the distinction the module comment calls out.
  assert.equal(isDowned(creature()), false);
});

test('a creature with max depleted and no temp is downed', () => {
  assert.equal(isDowned(creature({ maxHP: 10, damageTaken: 10 })), true);
});

test('remaining temp HP keeps a creature standing', () => {
  assert.equal(isDowned(creature({ maxHP: 10, damageTaken: 10, tempHP: 3 })), false);
});

test('lowering max HP re-clamps a stale damage accumulator', () => {
  const c = creature({ maxHP: 20, damageTaken: 18 });
  c.maxHP = 10;
  clampDamage(c);
  assert.equal(c.damageTaken, 10);
  assert.equal(currentHP(c), 0);
});

test('currentHP self-clamps an un-normalized creature (stale damage from a just-lowered Max HP, before clampDamage runs)', () => {
  assert.equal(currentHP(creature({ maxHP: 10, tempHP: 0, damageTaken: 18 })), 0);
});

test('raising max HP lifts current HP back off zero', () => {
  const c = creature({ maxHP: 10, damageTaken: 10 });
  assert.equal(currentHP(c), 0);
  c.maxHP = 20;
  clampDamage(c);
  assert.equal(currentHP(c), 10);
});
