// @vitest-environment node
import { expect, it } from 'vitest';
import { createBrowserStorage, createPersistedCombat, ENCOUNTER_KEY } from '../../src/combat/persistence';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

it('restores encounter inputs, progression and identity allocation across reloads', () => {
  const storage = memoryStorage();
  const combat = createPersistedCombat(storage);
  const id = combat.addCreature();
  combat.editCreature(id, { name: 'Goblin', init: '0', ac: '12', maxHP: 10, tempHP: 3 });
  combat.damage(id, 5);
  combat.addTag(id, 'conditions', 'Poisoned');
  combat.addTag(id, 'other', '<b>watch</b>');
  combat.start();
  combat.next();
  const restored = createPersistedCombat(storage);
  expect(restored.state).toEqual(combat.state);
  expect(restored.hp(id)?.current).toBe(8);
  expect(restored.state.round).toBe(2);
  expect(restored.addCreature()).toBe(2);
  restored.heal(id, 1);
  expect(createPersistedCombat(storage).hp(id)?.current).toBe(9);
});

const valid = {
  version: 1, nextId: 3, round: 1, started: true, activeId: 1,
  creatures: [
    { id: 1, init: '-2', name: 'Goblin', ac: '', maxHP: 10, tempHP: 0,
      damageTaken: 2, conditions: ['Poisoned'], other: [] },
    { id: 2, init: 'Infinity', name: '', ac: '', maxHP: 0, tempHP: 0,
      damageTaken: 0, conditions: [], other: [] },
  ],
};

it.each([
  ['malformed JSON', '{'],
  ['nonfinite JSON number', JSON.stringify(valid).replace('"maxHP":10', '"maxHP":1e400')],
  ['null root', 'null'],
  ['missing fields', '{}'],
  ['unsupported version', JSON.stringify({ ...valid, version: 2 })],
  ['invalid round', JSON.stringify({ ...valid, round: 1.5 })],
  ['zero started round', JSON.stringify({ ...valid, round: 0 })],
  ['missing active creature', JSON.stringify({ ...valid, activeId: 99 })],
  ['parked active creature', JSON.stringify({ ...valid, activeId: 2 })],
  ['pre-combat active creature', JSON.stringify({ ...valid, started: false, round: 0 })],
  ['pre-combat nonzero round', JSON.stringify({ ...valid, started: false, activeId: null })],
  ['null started active creature', JSON.stringify({ ...valid, activeId: null })],
  ['nonboolean started', JSON.stringify({ ...valid, started: 'yes' })],
  ['invalid next identity', JSON.stringify({ ...valid, nextId: 2 })],
  ['unsafe identity', JSON.stringify({ ...valid, nextId: 1e20 })],
  ...[
    { id: 0 }, { id: 1.5 }, { init: 10 }, { name: null }, { ac: 12 },
    { maxHP: -1 }, { tempHP: '3' }, { damageTaken: 11 }, { damageTaken: -1 },
    { conditions: 'Poisoned' }, { conditions: [false] }, { other: [''] },
    { conditions: ['Poisoned', 'poisoned'] }, { other: [' untrimmed '] },
  ].map(change => ['invalid creature ' + JSON.stringify(change), JSON.stringify({
    ...valid, creatures: [{ ...valid.creatures[0], ...change }, valid.creatures[1]],
  })]),
  ['duplicate identity', JSON.stringify({ ...valid, creatures: [valid.creatures[0], valid.creatures[0]] })],
  ['invalid creature list', JSON.stringify({ ...valid, creatures: {} })],
  ['null creature', JSON.stringify({ ...valid, creatures: [null] })],
])('recovers the whole encounter from %s and can save again', (_reason, saved) => {
  const storage = memoryStorage();
  storage.setItem(ENCOUNTER_KEY, saved!);
  const combat = createPersistedCombat(storage);
  expect(combat.state).toEqual({ creatures: [], round: 0, activeId: null, started: false });
  const id = combat.addCreature();
  combat.editCreature(id, { init: '0' });
  combat.start();
  expect(createPersistedCombat(storage).state.activeId).toBe(id);
});

it('saves every action and reset without touching preferences or legacy data', () => {
  const storage = memoryStorage();
  for (const key of ['dnd-ct-theme', 'sct-usage-dismissed', 'dnd-combat-tracker']) {
    storage.setItem(key, 'retain');
  }
  const combat = createPersistedCombat(storage);
  const check = () => expect(createPersistedCombat(storage).state).toEqual(combat.state);
  const first = combat.addCreature(); check();
  combat.editCreature(first, { init: '12', name: 'Goblin', maxHP: 10, tempHP: 2 }); check();
  const second = combat.duplicateCreature(first)!; check();
  combat.addTag(first, 'conditions', 'Poisoned'); check();
  combat.addTag(first, 'other', 'watch'); check();
  combat.removeTag(first, 'conditions', 'Poisoned'); check();
  combat.removeTag(first, 'other', 'watch'); check();
  combat.damage(first, 5); check();
  combat.heal(first, 1); check();
  combat.start(); check();
  combat.next(); check();
  combat.editCreature(second, { init: 'parked' }); check();
  combat.removeCreature(first); check();
  combat.reset(); check();
  expect(createPersistedCombat(storage).addCreature()).toBe(3);
  for (const key of ['dnd-ct-theme', 'sct-usage-dismissed', 'dnd-combat-tracker']) {
    expect(storage.getItem(key)).toBe('retain');
  }
});

it('writes only encounter inputs and progression and strips unknown saved fields', () => {
  const storage = memoryStorage();
  storage.setItem(ENCOUNTER_KEY, JSON.stringify({ ...valid, currentHP: 999,
    displayOrder: [2, 1], menu: true, confirmation: {}, search: 'foo', adjustment: 9,
    creatures: [{ ...valid.creatures[0], currentHP: 999, adjustment: 9 }, valid.creatures[1]],
  }));
  const combat = createPersistedCombat(storage);
  expect(combat.displayOrder.map(creature => creature.id)).toEqual([1, 2]);
  combat.next();
  expect(JSON.parse(storage.getItem(ENCOUNTER_KEY)!)).toEqual({ ...valid, round: 2 });
  expect(combat.hp(1)?.current).toBe(8);
});

it('leaves stored data untouched for reads and rejected or unchanged actions', () => {
  const storage = memoryStorage();
  const saved = JSON.stringify(valid, null, 2);
  storage.setItem(ENCOUNTER_KEY, saved);
  const combat = createPersistedCombat(storage);
  combat.hp(1); expect(combat.displayOrder).toHaveLength(2);
  combat.hasMeaningfulData(); combat.isEmptyCreature(1);
  combat.editCreature(1, { maxHP: NaN, name: 'Goblin' });
  combat.editCreature(99, { name: 'missing' });
  combat.damage(1, Infinity); combat.heal(1, -1);
  combat.duplicateCreature(99); combat.removeCreature(99);
  combat.addTag(1, 'conditions', 'poisoned'); combat.removeTag(1, 'other', 'absent');
  expect(storage.getItem(ENCOUNTER_KEY)).toBe(saved);
});

it.each(['read', 'write', 'both'])('keeps combat usable when storage fails on %s', failure => {
  const memory = memoryStorage();
  let failing = true;
  const storage = {
    getItem(key: string) {
      if (failing && failure !== 'write') throw new Error('blocked read');
      return memory.getItem(key);
    },
    setItem(key: string, value: string) {
      if (failing && failure !== 'read') throw new Error('quota exceeded');
      memory.setItem(key, value);
    },
  };
  const combat = createPersistedCombat(storage);
  const id = combat.addCreature();
  combat.editCreature(id, { init: '0', maxHP: 10 });
  combat.damage(id, 3);
  combat.start();
  combat.next();
  expect(combat.hp(id)?.current).toBe(7);
  expect(combat.state.round).toBe(2);
  failing = false;
  combat.heal(id, 1);
  expect(createPersistedCombat(storage).hp(id)?.current).toBe(8);
});


it('keeps browser storage access failures inside the persistence boundary', () => {
  // Node has no browser localStorage: even constructing the adapter must be safe.
  const combat = createPersistedCombat(createBrowserStorage());
  const id = combat.addCreature();
  combat.editCreature(id, { name: 'Goblin' });
  expect(combat.state.creatures[0]?.name).toBe('Goblin');
});

it('allocates unique safe identities after restoring the maximum counter and across reset', () => {
  const storage = memoryStorage();
  storage.setItem(ENCOUNTER_KEY, JSON.stringify({ ...valid, nextId: Number.MAX_SAFE_INTEGER }));
  const combat = createPersistedCombat(storage);
  expect(combat.addCreature()).toBe(Number.MAX_SAFE_INTEGER);
  expect(createPersistedCombat(storage).state.creatures).toHaveLength(3);
  expect(combat.addCreature()).toBe(3);
  expect(combat.duplicateCreature(1)).toBe(4);
  combat.reset();
  expect(combat.addCreature()).toBe(5);
  expect(createPersistedCombat(storage).addCreature()).toBe(6);
});

it('retains usable persisted progression when the round reaches its safe integer limit', () => {
  const storage = memoryStorage();
  storage.setItem(ENCOUNTER_KEY, JSON.stringify({ ...valid, round: Number.MAX_SAFE_INTEGER }));
  const combat = createPersistedCombat(storage);
  combat.next();
  combat.editCreature(1, { name: 'Still fighting' });
  const restored = createPersistedCombat(storage);
  expect(restored.state.round).toBe(Number.MAX_SAFE_INTEGER);
  expect(restored.state.activeId).toBe(1);
  expect(restored.state.creatures[0]?.name).toBe('Still fighting');
});

it('skips saves when clamped edits, HP actions and progression leave encounter facts unchanged', () => {
  const storage = memoryStorage();
  const empty = JSON.stringify({ version: 1, nextId: 1, round: 0, started: false,
    activeId: null, creatures: [] }, null, 2);
  storage.setItem(ENCOUNTER_KEY, empty);
  const combat = createPersistedCombat(storage);
  combat.reset(); combat.start(); combat.next();
  expect(storage.getItem(ENCOUNTER_KEY)).toBe(empty);

  const id = combat.addCreature();
  combat.editCreature(id, { init: '0', maxHP: 10 });
  combat.start();
  const full = JSON.stringify(JSON.parse(storage.getItem(ENCOUNTER_KEY)!), null, 2);
  storage.setItem(ENCOUNTER_KEY, full);
  combat.start(); combat.heal(id, 3); combat.editCreature(id, { tempHP: -2 });
  expect(storage.getItem(ENCOUNTER_KEY)).toBe(full);

  combat.editCreature(id, { tempHP: 1e20 });
  const temporary = JSON.stringify(JSON.parse(storage.getItem(ENCOUNTER_KEY)!), null, 2);
  storage.setItem(ENCOUNTER_KEY, temporary);
  combat.damage(id, 1);
  expect(storage.getItem(ENCOUNTER_KEY)).toBe(temporary);
  combat.editCreature(id, { tempHP: 0 });

  combat.damage(id, 10);
  const downed = JSON.stringify(JSON.parse(storage.getItem(ENCOUNTER_KEY)!), null, 2);
  storage.setItem(ENCOUNTER_KEY, downed);
  combat.damage(id, 3);
  expect(storage.getItem(ENCOUNTER_KEY)).toBe(downed);
});
