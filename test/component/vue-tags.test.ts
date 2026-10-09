import { flushPromises, mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import EncounterTracker from '../../src/ui/EncounterTracker.vue';
import { createVueCombat } from '../../src/combat/vueCombat';

it('adds an offered condition to the intended creature and closes before saving', async () => {
  let observeSave = () => {};
  const combat = createVueCombat({ getItem: () => null, setItem: () => observeSave() });
  const first = combat.addCreature();
  combat.addCreature();
  const tracker = mount(EncounterTracker, { props: { combat } });
  const addTag = combat.addTag;
  let actions = 0;
  combat.addTag = (...args) => {
    expect(tracker.find('.cond-pop').exists()).toBe(false);
    expect(tracker.find('.cond-backdrop').exists()).toBe(false);
    actions++;
    addTag(...args);
  };
  let saves = 0;
  try {
    observeSave = () => {
      expect(tracker.find('.cond-pop').exists()).toBe(false);
      expect(tracker.find('.cond-backdrop').exists()).toBe(false);
      saves++;
    };
    await tracker.get(`tr[data-id="${first}"] .cell-conditions .cond-add`).trigger('click');
    await tracker
      .findAll('.cond-opt')
      .find((option) => option.text() === 'Poisoned')!
      .trigger('click');
    await flushPromises();
    expect(saves).toBe(1);
    expect(actions).toBe(1);
    expect(tracker.get(`tr[data-id="${first}"] .cell-conditions`).text()).toContain('Poisoned');
    expect(tracker.get('tr[data-id="2"] .cell-conditions').text()).not.toContain('Poisoned');
  } finally {
    tracker.unmount();
  }
});

it('trims custom conditions and notes, rejects blanks and duplicates, renders text, and restores removals', async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const combat = createVueCombat(storage);
  combat.addCreature();
  const tracker = mount(EncounterTracker, { props: { combat } });
  const payload = '<img src=x onerror=alert(1)>';
  try {
    await tracker.get('.f-name').setValue(payload);
    for (const field of ['conditions', 'other']) {
      const cell = tracker.get(`.cell-${field}`);
      await cell.get('.cond-add').trigger('click');
      await tracker.get('.cond-search').setValue('   ');
      await tracker.get('.cond-search').trigger('keydown', { key: 'Enter' });
      expect(cell.findAll('.cond-pill')).toHaveLength(0);
      expect(tracker.find('.cond-opt-custom').exists()).toBe(false);
      await tracker.get('.cond-search').setValue(`  ${payload}  `);
      if (field === 'conditions') await tracker.get('.cond-opt-custom').trigger('click');
      else await tracker.get('.cond-search').trigger('keydown', { key: 'Enter' });
      await flushPromises();
      expect(cell.get('.vue-tag-text').text()).toBe(payload);
      expect(tracker.find('img').exists()).toBe(false);
      await cell.get('.cond-add').trigger('click');
      expect((tracker.get('.cond-search').element as HTMLInputElement).value).toBe('');
      await tracker.get('.cond-search').setValue(payload.toUpperCase());
      expect(tracker.find('.cond-opt-custom').exists()).toBe(false);
      await tracker.get('.cond-search').trigger('keydown', { key: 'Enter' });
      await flushPromises();
      expect(cell.findAll('.cond-pill')).toHaveLength(1);
    }
    const restored = mount(EncounterTracker, { props: { combat: createVueCombat(storage) } });
    try {
      expect(restored.find('.cond-pop').exists()).toBe(false);
      expect(restored.findAll('.vue-tag-text').map((tag) => tag.text())).toEqual([
        payload,
        payload,
      ]);
      await restored.get('.cell-other .cond-x').trigger('click');
      expect(restored.find('.cell-other .cond-pill').exists()).toBe(false);
      expect(createVueCombat(storage).state.creatures[0]).toMatchObject({
        conditions: [payload],
        other: [],
      });
      await restored.get('.cell-conditions .cond-x').trigger('click');
      expect(createVueCombat(storage).state.creatures[0]).toMatchObject({
        conditions: [],
        other: [],
      });
    } finally {
      restored.unmount();
    }
  } finally {
    tracker.unmount();
  }
});

it('filters offered conditions and dismisses without saving or persisting the query', async () => {
  let saves = 0;
  const combat = createVueCombat({
    getItem: () => null,
    setItem: () => {
      saves++;
    },
  });
  combat.addCreature();
  const tracker = mount(EncounterTracker, { props: { combat } });
  try {
    await tracker.get('.cell-conditions .cond-add').trigger('click');
    await tracker.get('.cond-search').setValue('pOiS');
    expect(
      tracker.findAll('.cond-opt:not(.cond-opt-custom)').map((option) => option.text()),
    ).toEqual(['Poisoned']);
    await tracker.get('.cond-search').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(tracker.get('.vue-tag-text').text()).toBe('Poisoned');
    await tracker.get('.cell-conditions .cond-add').trigger('click');
    expect(
      tracker
        .findAll('.cond-opt')
        .find((option) => option.text() === 'Poisoned')!
        .attributes('disabled'),
    ).toBeDefined();
    await tracker.get('.cond-search').setValue('unsaved');
    await tracker.get('.cond-backdrop').trigger('click');
    expect(saves).toBe(2);
    await tracker.get('.cell-other .cond-add').trigger('click');
    expect((tracker.get('.cond-search').element as HTMLInputElement).value).toBe('');
  } finally {
    tracker.unmount();
  }
});
