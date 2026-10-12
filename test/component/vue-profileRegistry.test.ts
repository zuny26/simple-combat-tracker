import { mount } from '@vue/test-utils';
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
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
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
    expect(profiles.state.profiles.get('goblin')?.ac).toBe('13');
  } finally {
    wrapper.unmount();
  }
});
