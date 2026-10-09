// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createCombat } from '../src/combat/combat';

describe('isolated combat actions', () => {
  it('creates independent encounters and distinguishes empty entries from meaningful data', () => {
    const first = createCombat();
    const second = createCombat();
    const id = first.addCreature();
    expect(first.isEmptyCreature(id)).toBe(true);
    expect(first.hasMeaningfulData()).toBe(false);
    first.editCreature(id, { name: 'Goblin' });
    expect(first.isEmptyCreature(id)).toBe(false);
    expect(first.hasMeaningfulData()).toBe(true);
    expect(second.state.creatures).toEqual([]);
    expect(first.state.creatures[0]?.name).toBe('Goblin');
  });
});

it('derives descending finite initiative, stable name ties, and insertion order for parked creatures', () => {
  const combat = createCombat();
  const values = [
    ['Infinity', 'z'], ['10', 'beta'], ['', 'a'], ['10', 'Alpha'], ['10', 'alpha'],
    ['0', 'zero'], ['-2', 'negative'], ['NaN', 'b'], ['1e309', 'c'], ['   ', 'd'],
  ];
  for (const [init, name] of values) {
    const id = combat.addCreature();
    combat.editCreature(id, { init: init!, name: name! });
  }
  expect(combat.displayOrder.map(creature => creature.id)).toEqual([4, 5, 2, 6, 7, 1, 3, 8, 9, 10]);
  expect(combat.state.creatures.map(creature => creature.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

it('starts only with eligible creatures, advances on wrap, and follows identity across edits', () => {
  const combat = createCombat();
  combat.start();
  const a = combat.addCreature();
  combat.start();
  expect(combat.state).toMatchObject({ round: 0, activeId: null, started: false });
  const b = combat.addCreature();
  combat.editCreature(a, { init: '20' });
  combat.editCreature(b, { init: '10' });
  combat.start();
  expect(combat.state).toMatchObject({ round: 1, activeId: a, started: true });
  combat.editCreature(a, { init: '-1', name: 'Z' });
  expect(combat.state.activeId).toBe(a);
  combat.next();
  expect(combat.state).toMatchObject({ round: 2, activeId: b });
  combat.next();
  expect(combat.state).toMatchObject({ round: 2, activeId: a });
});

it.each(['remove', '', 'invalid', 'Infinity'])('reassigns the active creature at its previous position on departure (%s)', departure => {
  const combat = createCombat();
  const ids = [20, 10, 0].map(init => {
    const id = combat.addCreature();
    combat.editCreature(id, { init: String(init) });
    return id;
  });
  const [a, b, c] = ids as [number, number, number];
  combat.start();
  combat.next();
  if (departure === 'remove') combat.removeCreature(b);
  else combat.editCreature(b, { init: departure, name: 'changed simultaneously' });
  expect(combat.state).toMatchObject({ activeId: c, round: 1, started: true });
  combat.removeCreature(c);
  expect(combat.state).toMatchObject({ activeId: a, round: 1 });
  combat.editCreature(a, { init: '' });
  expect(combat.state).toMatchObject({ activeId: null, round: 0, started: false });
});

it('does not change the active creature when another creature leaves', () => {
  const combat = createCombat();
  const a = combat.addCreature();
  const b = combat.addCreature();
  combat.editCreature(a, { init: '0' });
  combat.editCreature(b, { init: '-1' });
  combat.next();
  expect(combat.state.round).toBe(0);
  combat.start();
  combat.removeCreature(b);
  combat.removeCreature(999);
  expect(combat.state.activeId).toBe(a);
  combat.next();
  expect(combat.state).toMatchObject({ activeId: a, round: 2 });
});

it('derives HP, absorbs damage with temporary HP, and heals normal HP without changing temporary HP', () => {
  const combat = createCombat();
  const id = combat.addCreature();
  expect(combat.hp(id)).toEqual({ current: 0, configured: false, downed: false });
  combat.editCreature(id, { maxHP: 20, tempHP: 5, init: '10' });
  combat.damage(id, 8);
  expect(combat.hp(id)).toEqual({ current: 17, configured: true, downed: false });
  combat.editCreature(id, { tempHP: 4 });
  combat.heal(id, 2);
  expect(combat.hp(id)?.current).toBe(23);
  combat.heal(id, 100);
  expect(combat.hp(id)?.current).toBe(24);
  combat.damage(id, 100);
  expect(combat.hp(id)).toEqual({ current: 0, configured: true, downed: true });
  combat.start();
  expect(combat.state.activeId).toBe(id);
  combat.editCreature(id, { maxHP: 10 });
  expect(combat.state.creatures[0]?.damageTaken).toBe(10);
  combat.editCreature(id, { maxHP: 15 });
  expect(combat.hp(id)?.current).toBe(5);
});

it('ignores invalid HP adjustments and keeps HP edits finite and nonnegative', () => {
  const combat = createCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { maxHP: 10, tempHP: 2 });
  for (const amount of [0, -1, NaN, Infinity, -Infinity]) {
    combat.damage(id, amount);
    combat.heal(id, amount);
  }
  expect(combat.hp(id)?.current).toBe(12);
  combat.editCreature(id, { maxHP: NaN, tempHP: Infinity });
  expect(combat.hp(id)?.current).toBe(12);
  combat.editCreature(id, { maxHP: -1, tempHP: -3 });
  expect(combat.hp(id)).toEqual({ current: 0, configured: false, downed: false });
  combat.damage(999, 2);
  combat.heal(999, 2);
  expect(combat.hp(999)).toBeNull();
});

it('duplicates fresh stats after the source with unique IDs and increasing case-insensitive name suffixes', () => {
  const combat = createCombat();
  const source = combat.addCreature();
  const later = combat.addCreature();
  combat.editCreature(source, { name: 'Goblin', init: '10', ac: '15', maxHP: 20, tempHP: 4 });
  combat.editCreature(later, { name: 'goblin 4' });
  combat.damage(source, 8);
  combat.addTag(source, 'conditions', 'Poisoned');
  combat.addTag(source, 'other', 'Concentrating');
  const copy = combat.duplicateCreature(source);
  expect(copy).not.toBe(source);
  expect(combat.state.creatures.map(creature => creature.id)).toEqual([source, copy, later]);
  expect(combat.state.creatures[1]).toEqual({ id: copy, init: '10', name: 'Goblin 5', ac: '15',
    maxHP: 20, tempHP: 0, damageTaken: 0, conditions: [], other: [] });
  const next = combat.duplicateCreature(copy!);
  expect(combat.state.creatures.find(creature => creature.id === next)?.name).toBe('Goblin 6');
  combat.editCreature(later, { name: '   ' });
  const blank = combat.duplicateCreature(later);
  expect(combat.state.creatures.find(creature => creature.id === blank)?.name).toBe('');
  expect(combat.duplicateCreature(999)).toBeNull();
});

it.each(['conditions', 'other'] as const)('adds and removes trimmed, nonblank, case-insensitively unique %s', field => {
  const combat = createCombat();
  const id = combat.addCreature();
  combat.addTag(id, field, '   ');
  expect(combat.isEmptyCreature(id)).toBe(true);
  combat.addTag(id, field, '  Poisoned  ');
  combat.addTag(id, field, 'POISONED');
  combat.addTag(id, field, '<b>custom, text</b>');
  expect(combat.state.creatures[0]?.[field]).toEqual(['Poisoned', '<b>custom, text</b>']);
  expect(combat.hasMeaningfulData()).toBe(true);
  combat.removeTag(id, field, ' poisoned ');
  expect(combat.state.creatures[0]?.[field]).toEqual(['<b>custom, text</b>']);
  combat.removeTag(999, field, 'absent');
  combat.addTag(999, field, 'absent');
});

it('resets creatures and progression and keeps subsequent identities unique', () => {
  const combat = createCombat();
  const original = combat.addCreature();
  combat.editCreature(original, { init: '10' });
  combat.start();
  combat.reset();
  expect(combat.state).toEqual({ creatures: [], activeId: null, round: 0, started: false });
  expect(combat.hasMeaningfulData()).toBe(false);
  expect(combat.addCreature()).not.toBe(original);
});

it('preserves active identity across name ties and advances through downed creatures', () => {
  const combat = createCombat();
  const a = combat.addCreature();
  const b = combat.addCreature();
  combat.editCreature(a, { init: '10', name: 'Alpha', maxHP: 10 });
  combat.editCreature(b, { init: '10', name: 'Beta', maxHP: 10 });
  combat.start();
  combat.editCreature(a, { name: 'Zulu' });
  expect(combat.displayOrder.map(creature => creature.id)).toEqual([b, a]);
  expect(combat.state.activeId).toBe(a);
  combat.damage(b, 10);
  combat.next();
  expect(combat.state).toMatchObject({ activeId: b, round: 2 });
  expect(combat.hp(b)?.downed).toBe(true);
});

it('inserts parked duplicates beside their source and does not share tag arrays', () => {
  const combat = createCombat();
  const source = combat.addCreature();
  const later = combat.addCreature();
  const copy = combat.duplicateCreature(source)!;
  combat.addTag(copy, 'conditions', 'Prone');
  expect(combat.displayOrder.map(creature => creature.id)).toEqual([source, copy, later]);
  expect(combat.state.creatures[0]?.conditions).toEqual([]);
  combat.editCreature(999, { init: '10' });
  expect(combat.state.creatures).toHaveLength(3);
});

it('increases duplicate suffixes beyond the safe-integer limit without repeating names', () => {
  const combat = createCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { name: 'Goblin 9007199254740992' });
  const copy = combat.duplicateCreature(id);
  expect(combat.state.creatures.find(creature => creature.id === copy)?.name).toBe('Goblin 9007199254740993');
});

it('retains existing injuries when temporary HP fully absorbs a large finite damage amount', () => {
  const combat = createCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { maxHP: 10 });
  combat.damage(id, 4);
  combat.editCreature(id, { tempHP: 1e20 });
  combat.damage(id, 1e20);
  expect(combat.hp(id)?.current).toBe(6);
  expect(combat.state.creatures[0]?.damageTaken).toBe(4);
});

it('absorbs ordinary damage entirely in temporary HP without changing existing injuries', () => {
  const combat = createCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { maxHP: 10 });
  combat.damage(id, 4);
  combat.editCreature(id, { tempHP: 5 });
  combat.damage(id, 2);
  expect(combat.state.creatures[0]).toMatchObject({ tempHP: 3, damageTaken: 4 });
  expect(combat.hp(id)).toEqual({ current: 9, configured: true, downed: false });
});

it('keeps removal and parking before combat in pre-combat', () => {
  const combat = createCombat();
  const first = combat.addCreature();
  const second = combat.addCreature();
  combat.editCreature(first, { init: '20' });
  combat.editCreature(second, { init: '10' });
  combat.removeCreature(first);
  combat.editCreature(second, { init: '' });
  expect(combat.state).toMatchObject({ round: 0, activeId: null, started: false });
  expect(combat.displayOrder.map(creature => creature.id)).toEqual([second]);
});
