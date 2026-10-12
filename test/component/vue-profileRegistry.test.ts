import { flushPromises, mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import EncounterTracker from '../../src/ui/EncounterTracker.vue';
import { createVueCombat } from '../../src/combat/vueCombat';
import { createProfileRegistry } from '../../src/profiles/profileRegistry';

it('saves through the row bookmark and reacts to edits in every row without changing combat', async () => {
  const combat = createVueCombat();
  const profiles = createProfileRegistry();
  const first = combat.addCreature();
  combat.editCreature(first, { name: 'Goblin', ac: '13', maxHP: 7 });
  combat.duplicateCreature(first);
  const wrapper = mount(EncounterTracker, { props: { combat, profiles } });
  try {
    const rows = wrapper.findAll('tr[data-id]');
    const before = JSON.stringify(combat.state);
    const history = combat.history.undoCount;
    const bookmark = () => rows[0]!.get('.btn-bookmark');
    expect(bookmark().attributes('aria-label')).toBe('Save profile');
    await bookmark().trigger('click');
    expect(bookmark().attributes('aria-label')).toBe('Profile saved');
    expect(rows[1]!.get('.btn-bookmark').attributes('aria-label')).toBe('Profile saved');
    expect(JSON.stringify(combat.state)).toBe(before);
    expect(combat.history.undoCount).toBe(history);
    await rows[0]!.get('.f-ac').setValue('15');
    expect(bookmark().attributes('aria-label')).toBe('Update profile');
    await bookmark().trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    await wrapper.get('#confirm-cancel-btn').trigger('click');
    expect([...profiles.state.profiles.values()]).toEqual([{ name: 'Goblin', ac: '13', maxHP: 7 }]);
    await rows[0]!.get('.f-ac').setValue('13');
    await rows[0]!.get('.f-name').setValue(' goblin 3 ');
    expect(bookmark().attributes('aria-label')).toBe('Profile saved');
    await rows[0]!.get('.f-maxhp').setValue('12');
    expect(bookmark().attributes('aria-label')).toBe('Update profile');
    await rows[0]!.get('.f-name').setValue('Orc');
    expect(bookmark().attributes('aria-label')).toBe('Save profile');
    await rows[0]!.get('.f-name').setValue(' ');
    expect(bookmark().attributes('disabled')).toBeDefined();
  } finally {
    wrapper.unmount();
  }
});

it('closes the creature menu before saving and uses the current bookmark label', async () => {
  const combat = createVueCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { name: 'Goblin', ac: '13', maxHP: 7 });
  let savedAfterClosing = false;
  const profiles = createProfileRegistry({
    getItem: () => null,
    setItem: () => {
      savedAfterClosing = !wrapper.find('[role="menu"]').exists();
    },
  });
  const wrapper = mount(EncounterTracker, { props: { combat, profiles } });
  const openMenu = async () => wrapper.get('.btn-menu').trigger('click');
  const menuItem = () => wrapper.get('[role="menuitem"]');
  try {
    await openMenu();
    expect(menuItem().text()).toBe('Save profile');
    await menuItem().trigger('click');
    expect(savedAfterClosing).toBe(true);
    expect(profiles.bookmarkState(combat.state.creatures[0]!)).toBe('matching');
    await openMenu();
    expect(menuItem().text()).toBe('Profile saved');
    await wrapper.get('.btn-menu').trigger('click');
    await wrapper.get('.f-ac').setValue('15');
    await openMenu();
    expect(menuItem().text()).toBe('Update profile');
    await menuItem().trigger('click');
    await flushPromises();
    expect(wrapper.find('[role="menu"]').exists()).toBe(false);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(profiles.state.profiles.get('goblin')?.ac).toBe('13');
  } finally {
    wrapper.unmount();
  }
});

it.each([
  { ac: '15', maxHP: 12, changes: ['AC: 13 → 15', 'Max HP: 7 → 12'] },
  { ac: '15', maxHP: 7, changes: ['AC: 13 → 15'] },
  { ac: '13', maxHP: 12, changes: ['Max HP: 7 → 12'] },
])(
  'reviews only changed profile stats before accepting or canceling $changes',
  async ({ ac, maxHP, changes }) => {
    const combat = createVueCombat();
    const profiles = createProfileRegistry();
    profiles.save({ name: 'Goblin', ac: '13', maxHP: 7 });
    const first = combat.addCreature();
    combat.editCreature(first, { name: 'Goblin 2', ac, maxHP, tempHP: 3 });
    const second = combat.addCreature();
    combat.editCreature(second, { name: ' goblin 3 ', ac, maxHP });
    const third = combat.addCreature();
    combat.editCreature(third, { name: 'GOBLIN', ac: '13', maxHP: 7 });
    const wrapper = mount(EncounterTracker, { props: { combat, profiles } });
    try {
      const before = JSON.stringify(combat.state);
      const history = combat.history.undoCount;
      const bookmark = () => wrapper.get(`tr[data-id="${first}"] .btn-bookmark`);
      await bookmark().trigger('click');
      const dialog = wrapper.get('[role="dialog"]');
      expect(dialog.get('h2').text()).toBe('Update saved profile Goblin?');
      expect(dialog.find('p').exists()).toBe(false);
      expect(dialog.findAll('li').map((item) => item.text())).toEqual(changes);
      await wrapper.get('#confirm-cancel-btn').trigger('click');
      expect(profiles.find('Goblin')).toEqual({ name: 'Goblin', ac: '13', maxHP: 7 });
      await bookmark().trigger('click');
      await wrapper.get('#confirm-ok-btn').trigger('click');
      expect(profiles.find('Goblin')).toEqual({ name: 'Goblin', ac, maxHP });
      for (const id of [first, second]) {
        expect(wrapper.get(`tr[data-id="${id}"] .btn-bookmark`).attributes('aria-label')).toBe(
          'Profile saved',
        );
      }
      expect(wrapper.get(`tr[data-id="${third}"] .btn-bookmark`).attributes('aria-label')).toBe(
        'Update profile',
      );
      expect(JSON.stringify(combat.state)).toBe(before);
      expect(combat.history.undoCount).toBe(history);
      await bookmark().trigger('click');
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
      expect(profiles.state.profiles.size).toBe(1);
    } finally {
      wrapper.unmount();
    }
  },
);

it('closes name suggestions before applying and saving a profile, then updates HP drafts and bookmarks', async () => {
  let applying = false;
  let closedAtSave = false;
  const combat = createVueCombat({
    getItem: () => null,
    setItem: () => {
      if (applying) closedAtSave = !wrapper.find('[role="grid"]').exists();
    },
  });
  const id = combat.addCreature();
  const profiles = createProfileRegistry();
  profiles.save({ name: 'Goblin', ac: '13', maxHP: 7 });
  const wrapper = mount(EncounterTracker, {
    props: { combat, profiles },
    global: { stubs: { Teleport: true } },
  });
  try {
    await wrapper.get('.f-name').trigger('focus');
    expect(wrapper.get('.profile-choice .cond-opt').text()).toContain('Goblin');
    applying = true;
    await wrapper.get('.profile-choice .cond-opt').trigger('click');
    await flushPromises();
    expect(closedAtSave).toBe(true);
    expect(wrapper.find('[role="grid"]').exists()).toBe(false);
    expect(wrapper.get('.f-name').element).toHaveProperty('value', 'Goblin');
    expect(wrapper.get('.f-ac').element).toHaveProperty('value', '13');
    expect(wrapper.get('.f-maxhp').element).toHaveProperty('value', '7');
    expect(wrapper.get('.btn-bookmark').attributes('aria-label')).toBe('Profile saved');
    expect(combat.state.creatures).toHaveLength(1);
    expect(combat.hp(id)?.normal).toBe(7);
  } finally {
    wrapper.unmount();
  }
});

it('cancels or confirms profile deletion without applying suggestions or changing any encounter creature', async () => {
  const combat = createVueCombat();
  const profiles = createProfileRegistry();
  profiles.save({ name: 'Goblin', ac: '13', maxHP: 7 });
  profiles.save({ name: 'Orc', ac: '15', maxHP: 20 });
  const first = combat.addCreature();
  combat.applyProfile(first, profiles.find('Goblin')!);
  combat.duplicateCreature(first);
  const third = combat.addCreature();
  combat.editCreature(third, { ac: '18', maxHP: 30, tempHP: 4 });
  const before = JSON.stringify(combat.state);
  const history = combat.history.undoCount;
  const wrapper = mount(EncounterTracker, {
    attachTo: document.body,
    props: { combat, profiles },
    global: { stubs: { Teleport: true } },
  });
  try {
    const name = wrapper.get(`tr[data-id="${third}"] .f-name`);
    const requestDeletion = async () => {
      await name.trigger('focus');
      await wrapper.get('button[aria-label="Delete saved profile Goblin"]').trigger('click');
      await flushPromises();
      expect(wrapper.find('[role="grid"]').exists()).toBe(false);
      expect(wrapper.get('[role="dialog"] h2').text()).toBe('Delete saved profile Goblin?');
      expect(JSON.stringify(combat.state)).toBe(before);
    };
    await requestDeletion();
    await wrapper.get('#confirm-cancel-btn').trigger('click');
    expect(profiles.find('Goblin')).toBeDefined();
    await requestDeletion();
    await wrapper.get('#confirm-ok-btn').trigger('click');
    expect(profiles.find('Goblin')).toBeUndefined();
    for (const id of [first, combat.state.creatures[1]!.id]) {
      expect(wrapper.get(`tr[data-id="${id}"] .btn-bookmark`).attributes('aria-label')).toBe(
        'Save profile',
      );
    }
    expect(JSON.stringify(combat.state)).toBe(before);
    expect(combat.history.undoCount).toBe(history);
    await name.trigger('focus');
    expect(wrapper.findAll('.profile-choice .cond-opt').map((option) => option.text())).toEqual([
      'Orc',
    ]);
  } finally {
    wrapper.unmount();
  }
});
