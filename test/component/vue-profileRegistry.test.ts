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
    expect(bookmark().attributes('aria-label')).toBe('Save profile: not saved');
    await bookmark().trigger('click');
    expect(bookmark().attributes('aria-label')).toBe('Saved profile: matching');
    expect(rows[1]!.get('.btn-bookmark').attributes('aria-label')).toBe('Saved profile: matching');
    expect(JSON.stringify(combat.state)).toBe(before);
    expect(combat.history.undoCount).toBe(history);
    await rows[0]!.get('.f-ac').setValue('15');
    expect(bookmark().attributes('aria-label')).toBe(
      'Saved profile: differences; existing profile kept',
    );
    await bookmark().trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect([...profiles.state.profiles.values()]).toEqual([{ name: 'Goblin', ac: '13', maxHP: 7 }]);
    await rows[0]!.get('.f-ac').setValue('13');
    await rows[0]!.get('.f-name').setValue(' goblin 3 ');
    expect(bookmark().attributes('aria-label')).toBe('Saved profile: matching');
    await rows[0]!.get('.f-maxhp').setValue('12');
    expect(bookmark().attributes('aria-label')).toContain('differences');
    await rows[0]!.get('.f-name').setValue('Orc');
    expect(bookmark().attributes('aria-label')).toBe('Save profile: not saved');
    await rows[0]!.get('.f-name').setValue(' ');
    expect(bookmark().attributes('disabled')).toBeDefined();
  } finally {
    wrapper.unmount();
  }
});
