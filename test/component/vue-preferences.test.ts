import { flushPromises, mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import EncounterTracker from '../../src/ui/EncounterTracker.vue';
import { createVueCombat } from '../../src/combat/vueCombat';

it('selects a theme after closing its picker and restores it independently of combat', async () => {
  const values = new Map<string, string>();
  let observeSave = () => {};
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      observeSave();
      values.set(key, value);
    },
  };
  const combat = createVueCombat(storage);
  combat.addCreature();
  const tracker = mount(EncounterTracker, { props: { combat, preferenceStorage: storage } });
  try {
    await tracker.get('#theme-trigger').trigger('click');
    observeSave = () => {
      expect(tracker.find('[role="menu"]').exists()).toBe(false);
      expect(tracker.find('.cond-backdrop').exists()).toBe(false);
    };
    await tracker
      .findAll('[role="menuitemradio"]')
      .find((option) => option.text() === 'Dracula')!
      .trigger('click');
    await flushPromises();
    expect(document.documentElement.dataset.theme).toBe('dracula');
    await tracker.get('#reset-btn').trigger('click');
    expect(combat.state.creatures).toHaveLength(0);
    const restored = mount(EncounterTracker, {
      props: { combat: createVueCombat(storage), preferenceStorage: storage },
    });
    try {
      expect(restored.get('#theme-trigger').text()).toContain('Dracula');
    } finally {
      restored.unmount();
    }
  } finally {
    tracker.unmount();
  }
});

it('restores dismissed help, reopens it from either control, and preserves preferences on New Combat', async () => {
  const values = new Map([
    ['sct-usage-dismissed', '1'],
    ['dnd-ct-theme', 'dark'],
  ]);
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
  const combat = createVueCombat(storage);
  const id = combat.addCreature();
  combat.editCreature(id, { name: 'Goblin' });
  const tracker = mount(EncounterTracker, { props: { combat, preferenceStorage: storage } });
  try {
    expect(tracker.find('.usage-callout').exists()).toBe(false);
    await tracker.get('#usage-help-btn').trigger('click');
    expect(tracker.get('.usage-callout').text()).toContain('How to run a fight');
    await tracker.get('#usage-dismiss-btn').trigger('click');
    await tracker.get('#app-menu-btn').trigger('click');
    expect(tracker.findAll('[role="menuitemradio"]').map((option) => option.text())).toEqual([
      'Organic Day',
      'Organic Night',
      'Dracula',
      'Alucard',
    ]);
    await tracker
      .findAll('[role="menuitem"]')
      .find((option) => option.text() === 'How to run a fight')!
      .trigger('click');
    await flushPromises();
    expect(tracker.find('[role="menu"]').exists()).toBe(false);
    expect(tracker.find('.usage-callout').exists()).toBe(true);
    await tracker.get('#usage-dismiss-btn').trigger('click');
    await tracker.get('#app-menu-btn').trigger('click');
    await tracker
      .findAll('[role="menuitem"]')
      .find((option) => option.text() === 'New Combat')!
      .trigger('click');
    await flushPromises();
    expect(tracker.find('[role="menu"]').exists()).toBe(false);
    expect(tracker.find('.cond-backdrop').exists()).toBe(false);
    expect(tracker.find('.confirm-dialog').exists()).toBe(true);
    await tracker.get('#confirm-ok-btn').trigger('click');
    const restored = mount(EncounterTracker, {
      props: { combat: createVueCombat(storage), preferenceStorage: storage },
    });
    try {
      expect(restored.get('#theme-trigger').text()).toContain('Organic Night');
      expect(restored.find('.usage-callout').exists()).toBe(false);
      expect(restored.find('tr[data-id]').exists()).toBe(false);
    } finally {
      restored.unmount();
    }
  } finally {
    tracker.unmount();
  }
});

it('keeps theme and help controls usable when preference reads and writes fail', async () => {
  const tracker = mount(EncounterTracker, {
    props: {
      combat: createVueCombat(),
      preferenceStorage: {
        getItem: () => {
          throw new Error('unavailable');
        },
        setItem: () => {
          throw new Error('unavailable');
        },
      },
    },
  });
  try {
    expect(tracker.get('#theme-trigger').text()).toContain('Organic Day');
    await tracker.get('#app-menu-btn').trigger('click');
    await tracker
      .findAll('[role="menuitemradio"]')
      .find((option) => option.text() === 'Alucard')!
      .trigger('click');
    await flushPromises();
    expect(tracker.get('#theme-trigger').text()).toContain('Alucard');
    await tracker.get('#usage-dismiss-btn').trigger('click');
    expect(tracker.find('.usage-callout').exists()).toBe(false);
    await tracker.get('#usage-help-btn').trigger('click');
    expect(tracker.find('.usage-callout').exists()).toBe(true);
    const fresh = mount(EncounterTracker, { props: { combat: createVueCombat() } });
    try {
      expect(fresh.get('#theme-trigger').text()).toContain('Organic Day');
    } finally {
      fresh.unmount();
    }
  } finally {
    tracker.unmount();
  }
});

it('closes row menus before duplication saves or removal opens confirmation', async () => {
  let observeSave = () => {};
  const combat = createVueCombat({ getItem: () => null, setItem: () => observeSave() });
  const id = combat.addCreature();
  combat.editCreature(id, { name: 'Goblin' });
  const tracker = mount(EncounterTracker, { props: { combat } });
  try {
    observeSave = () => {
      expect(tracker.find('[role="menu"]').exists()).toBe(false);
      expect(tracker.find('.cond-backdrop').exists()).toBe(false);
    };
    await tracker.get('tr[data-id="1"] .btn-menu').trigger('click');
    await tracker.get('[role="menuitem"]:first-child').trigger('click');
    await flushPromises();
    expect(
      tracker.findAll('.f-name').map((input) => (input.element as HTMLInputElement).value),
    ).toEqual(['Goblin', 'Goblin 2']);
    await tracker.get('tr[data-id="1"] .btn-menu').trigger('click');
    await tracker.get('[role="menuitem"]:last-child').trigger('click');
    await flushPromises();
    expect(tracker.find('[role="menu"]').exists()).toBe(false);
    expect(tracker.find('.confirm-dialog').exists()).toBe(true);
    await tracker.get('#confirm-cancel-btn').trigger('click');
    expect(combat.state.creatures).toHaveLength(2);
  } finally {
    tracker.unmount();
  }
});
