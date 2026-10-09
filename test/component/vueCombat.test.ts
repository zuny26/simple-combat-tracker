import { computed, watchEffect } from 'vue';
import { expect, it } from 'vitest';
import { createVueCombat } from '../../src/combat/vueCombat';

it('exposes live read-only encounter state and derived behavior to Vue consumers', () => {
  const combat = createVueCombat();
  const independent = createVueCombat();
  const summary = computed(() => ({
    names: combat.displayOrder.map(creature => creature.name),
    active: combat.state.activeId,
    round: combat.state.round,
  }));
  const totals: number[] = [];
  const stop = watchEffect(() => {
    totals.push(combat.state.creatures.reduce((total, creature) => total + combat.hp(creature.id)!.current, 0));
  }, { flush: 'sync' });
  try {
    const id = combat.addCreature();
    combat.editCreature(id, { name: 'Goblin', init: '10', maxHP: 10 });
    combat.start();
    expect(summary.value).toEqual({ names: ['Goblin'], active: id, round: 1 });
    combat.damage(id, 4);
    expect(totals.at(-1)).toBe(6);
    combat.removeCreature(id);
    expect(summary.value).toEqual({ names: [], active: null, round: 0 });
    expect(independent.state.creatures).toEqual([]);
  } finally {
    stop();
  }
});

it('restores persisted combat into Vue reactivity and saves subsequent actions', () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const original = createVueCombat(storage);
  const id = original.addCreature();
  original.editCreature(id, { maxHP: 10 });
  const restored = createVueCombat(storage);
  const current = computed(() => restored.hp(id)?.current);
  expect(current.value).toBe(10);
  restored.damage(id, 4);
  expect(current.value).toBe(6);
  expect(createVueCombat(storage).hp(id)?.current).toBe(6);
});
