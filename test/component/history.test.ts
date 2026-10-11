// @vitest-environment node
import { expect, it } from 'vitest';
import { createCombat } from '../../src/combat/combat';
import type { Combat } from '../../src/combat/combat';

const actions: [string, (combat: Combat, id: number) => void][] = [
  ['initiative', (combat, id) => combat.editCreature(id, { init: '' })],
  ['name', (combat, id) => combat.editCreature(id, { name: 'Orc' })],
  ['AC', (combat, id) => combat.editCreature(id, { ac: '19' })],
  ['Max HP', (combat, id) => combat.editCreature(id, { maxHP: 2 })],
  ['Temp HP', (combat, id) => combat.editCreature(id, { tempHP: 8 })],
  ['damage', (combat, id) => combat.damage(id, 6)],
  ['heal', (combat, id) => combat.heal(id, 3)],
  ['add condition', (combat, id) => combat.addTag(id, 'conditions', 'Prone')],
  ['remove condition', (combat, id) => combat.removeTag(id, 'conditions', 'Poisoned')],
  ['add note', (combat, id) => combat.addTag(id, 'other', 'Concentrating')],
  ['remove note', (combat, id) => combat.removeTag(id, 'other', 'Hidden')],
  [
    'add creature',
    (combat) => {
      combat.addCreature();
    },
  ],
  [
    'duplicate creature',
    (combat, id) => {
      combat.duplicateCreature(id);
    },
  ],
  ['remove active creature', (combat, id) => combat.removeCreature(id)],
  ['next turn', (combat) => combat.next()],
];

it.each(actions)('undoes and redoes %s with all encounter consequences', (_, action) => {
  const combat = createCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { init: '20', name: 'Goblin', ac: '12', maxHP: 12 });
  combat.damage(id, 5);
  combat.editCreature(id, { tempHP: 3 });
  combat.addTag(id, 'conditions', 'Poisoned');
  combat.addTag(id, 'other', 'Hidden');
  const second = combat.addCreature();
  combat.editCreature(second, { init: '10' });
  combat.start();
  const before = structuredClone(combat.state);
  action(combat, id);
  const after = structuredClone(combat.state);
  expect(after).not.toEqual(before);
  combat.undo();
  expect(combat.state).toEqual(before);
  combat.redo();
  expect(combat.state).toEqual(after);
});

it('undoes starting combat and wrapping rounds, including the last eligible creature removal', () => {
  const combat = createCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { init: '10' });
  combat.start();
  combat.undo();
  expect(combat.state).toMatchObject({ started: false, round: 0, activeId: null });
  combat.redo();
  combat.next();
  expect(combat.state.round).toBe(2);
  combat.undo();
  expect(combat.state.round).toBe(1);
  combat.removeCreature(id);
  expect(combat.state.started).toBe(false);
  combat.undo();
  expect(combat.state).toMatchObject({ started: true, round: 1, activeId: id });
});

it('bounds history at 20 actions and permits redoing all retained actions', () => {
  const combat = createCombat();
  const id = combat.addCreature();
  for (let value = 1; value <= 25; value++) combat.editCreature(id, { ac: String(value) });
  expect(combat.history.undoCount).toBe(20);
  for (let value = 0; value < 21; value++) combat.undo();
  expect(combat.state.creatures[0]?.ac).toBe('5');
  expect(combat.history).toMatchObject({ undoCount: 0, redoCount: 20 });
  for (let value = 0; value < 21; value++) combat.redo();
  expect(combat.state.creatures[0]?.ac).toBe('25');
  expect(combat.history).toMatchObject({ undoCount: 20, redoCount: 0 });
});

it('groups a focused field edit while saving every input and separates fields and actions', () => {
  const saves: string[] = [];
  const combat = createCombat(undefined, {
    onChange: (state) => {
      saves.push(state.creatures[0]?.name ?? '');
    },
  });
  const id = combat.addCreature();
  combat.beginEdit(id, 'name');
  for (const name of ['G', 'Go', 'Goblin']) combat.editCreature(id, { name });
  expect(saves.slice(-3)).toEqual(['G', 'Go', 'Goblin']);
  expect(combat.history.undoCount).toBe(2);
  combat.beginEdit(id, 'ac');
  combat.editCreature(id, { ac: '1' });
  combat.editCreature(id, { ac: '12' });
  combat.endEdit();
  combat.beginEdit(id, 'ac');
  combat.editCreature(id, { ac: '13' });
  combat.undo();
  expect(combat.state.creatures[0]?.ac).toBe('12');
  combat.undo();
  expect(combat.state.creatures[0]?.ac).toBe('');
  combat.undo();
  expect(combat.state.creatures[0]?.name).toBe('');
  combat.redo();
  expect(combat.state.creatures[0]?.name).toBe('Goblin');
});

it('ignores invalid and unchanged actions, preserves redo until a change, and never recycles IDs', () => {
  const combat = createCombat();
  const first = combat.addCreature();
  const second = combat.addCreature();
  combat.undo();
  const counts = { ...combat.history };
  combat.editCreature(first, { name: '', maxHP: NaN });
  combat.editCreature(99, { name: 'Missing' });
  combat.damage(first, -2);
  combat.heal(first, 5);
  combat.removeCreature(99);
  combat.removeTag(first, 'other', 'missing');
  combat.addTag(first, 'conditions', ' ');
  combat.start();
  combat.next();
  expect(combat.history).toEqual(counts);
  const third = combat.addCreature();
  expect(third).toBeGreaterThan(second);
  expect(combat.history.redoCount).toBe(0);
  combat.redo();
  expect(combat.state.creatures.map((creature) => creature.id)).toEqual([first, third]);
});

it('clears both histories on reset, even when all creatures have already been undone', () => {
  const combat = createCombat();
  combat.addCreature();
  combat.undo();
  combat.reset();
  combat.redo();
  expect(combat.state.creatures).toEqual([]);
  combat.addCreature();
  combat.reset();
  combat.undo();
  expect(combat.state.creatures).toEqual([]);
  expect(combat.history).toMatchObject({ undoCount: 0, redoCount: 0 });
  combat.addCreature();
  combat.undo();
  expect(combat.state.creatures).toEqual([]);
});
