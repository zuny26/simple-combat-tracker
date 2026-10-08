import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import EncounterTracker from '../src/ui/EncounterTracker.vue';
import { createVueCombat } from '../src/combat/vueCombat';

it('applies only the intended creature’s pending amount through explicit Damage and Heal controls', async () => {
  const combat = createVueCombat();
  for (const init of ['20', '10']) {
    const id = combat.addCreature();
    combat.editCreature(id, { init, maxHP: 12, tempHP: 3 });
  }
  const wrapper = mount(EncounterTracker, { props: { combat } });
  const first = wrapper.get('tr[data-id="1"]');
  const second = wrapper.get('tr[data-id="2"]');
  try {
    await first.get('.f-adjust').setValue('5.5');
    await second.get('.f-adjust').setValue('2');
    await first.get('.f-adjust').trigger('keydown', { key: 'Enter' });
    expect(first.get('.hp-number').text()).toBe('15 / 12');
    expect(second.get('.hp-number').text()).toBe('15 / 12');
    expect((first.get('.f-adjust').element as HTMLInputElement).value).toBe('5.5');
    // Pending amounts follow creature identity when keyed rows move.
    await first.get('.f-init').setValue('1');
    await first.get('.f-init').trigger('blur');
    await first.get('button.r-dmg').trigger('click');
    expect(first.get('.hp-number').text()).toBe('9.5 / 12');
    expect((first.get('.f-temphp').element as HTMLInputElement).value).toBe('');
    expect((first.get('.f-adjust').element as HTMLInputElement).value).toBe('');
    expect((second.get('.f-adjust').element as HTMLInputElement).value).toBe('2');
    expect(second.get('.hp-number').text()).toBe('15 / 12');
    await first.get('.f-temphp').setValue('4');
    await first.get('.f-adjust').setValue('100');
    await first.get('button.r-heal').trigger('click');
    expect(first.get('.hp-number').text()).toBe('16 / 12');
    expect((first.get('.f-temphp').element as HTMLInputElement).value).toBe('4');
    expect((first.get('.f-adjust').element as HTMLInputElement).value).toBe('');
    await second.get('button.r-dmg').trigger('click');
    expect(second.get('.hp-number').text()).toBe('13 / 12');
    expect((second.get('.f-adjust').element as HTMLInputElement).value).toBe('');
  } finally {
    wrapper.unmount();
  }
});

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

it.each(['', ' ', '0', '-3', 'invalid', 'NaN', 'Infinity', '1e309'])(
  'keeps HP intact when either adjustment button receives %j', async amount => {
    const combat = createVueCombat();
    const id = combat.addCreature();
    combat.editCreature(id, { maxHP: 12, tempHP: 3 });
    combat.damage(id, 5);
    const wrapper = mount(EncounterTracker, { props: { combat } });
    try {
      for (const action of ['r-dmg', 'r-heal']) {
        await wrapper.get('.f-adjust').setValue(amount);
        await wrapper.get(`button.${action}`).trigger('click');
        expect(wrapper.get('.hp-number').text()).toBe('10 / 12');
        expect((wrapper.get('.f-temphp').element as HTMLInputElement).value).toBe('');
      }
    } finally {
      wrapper.unmount();
    }
  },
);

it('updates maximum HP immediately and keeps downed creatures eligible for turns', async () => {
  const combat = createVueCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { init: '20', maxHP: 12, tempHP: 3 });
  const unconfigured = combat.addCreature();
  combat.editCreature(unconfigured, { init: '10' });
  const wrapper = mount(EncounterTracker, { props: { combat } });
  const row = wrapper.get(`tr[data-id="${id}"]`);
  try {
    await wrapper.get('#start-next-btn').trigger('click');
    await row.get('.f-adjust').setValue('8');
    await row.get('button.r-dmg').trigger('click');
    expect(row.get('.hp-number').text()).toBe('7 / 12');
    await row.get('.f-maxhp').setValue('4');
    expect(row.get('.cell-current').text()).toBe('DOWNED');
    expect(row.classes()).toContain('downed');
    await row.get('.f-maxhp').setValue('6');
    expect(row.get('.hp-number').text()).toBe('2 / 6');
    await row.get('.f-adjust').setValue('100');
    await row.get('button.r-dmg').trigger('click');
    expect(row.get('.cell-current').text()).toBe('DOWNED');
    expect((row.get('.f-adjust').element as HTMLInputElement).value).toBe('');
    expect(wrapper.get(`tr[data-id="${unconfigured}"] .cell-current`).text()).toBe('set HP');
    expect(wrapper.get(`tr[data-id="${unconfigured}"]`).classes()).not.toContain('downed');
    await wrapper.get('#start-next-btn').trigger('click');
    expect(wrapper.get('tr.active').attributes('data-id')).toBe(String(unconfigured));
    await wrapper.get('#start-next-btn').trigger('click');
    expect(wrapper.get('tr.active').attributes('data-id')).toBe(String(id));
    await row.get('.f-adjust').setValue('2');
    await row.get('button.r-heal').trigger('click');
    expect(row.get('.hp-number').text()).toBe('2 / 6');
    expect(row.classes()).not.toContain('downed');
  } finally {
    wrapper.unmount();
  }
});

it('adds empty creatures and saves editable fields for an independent encounter', async () => {
  const storage = createStorage();
  const wrapper = mount(EncounterTracker, { props: { combat: createVueCombat(storage) } });
  const independent = mount(EncounterTracker, { props: { combat: createVueCombat() } });
  try {
    await wrapper.get('#add-btn').trigger('click');
    const row = wrapper.get('tr[data-id]');
    for (const field of ['init', 'name', 'ac', 'maxhp', 'temphp']) {
      expect((row.get(`.f-${field}`).element as HTMLInputElement).value).toBe('');
    }
    expect(row.get('.cell-current').text()).toBe('set HP');
    await row.get('.f-init').setValue('-2');
    await row.get('.f-name').setValue('<img src=x onerror=alert(1)>');
    await row.get('.f-ac').setValue('15');
    await row.get('.f-maxhp').setValue('12');
    await row.get('.f-temphp').setValue('3');
    expect(row.get('.hp-number').text()).toBe('15 / 12');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(createVueCombat(storage).state.creatures[0]).toMatchObject({
      init: '-2', name: '<img src=x onerror=alert(1)>', ac: '15', maxHP: 12, tempHP: 3,
    });
    expect(independent.findAll('tr[data-id]')).toHaveLength(0);
  } finally {
    wrapper.unmount();
    independent.unmount();
  }
});

it('starts, advances, wraps, and reassigns the active creature while parked rows remain visible', async () => {
  const wrapper = mount(EncounterTracker, { props: { combat: createVueCombat() } });
  try {
    await wrapper.get('#add-btn').trigger('click');
    await wrapper.get('#start-next-btn').trigger('click');
    expect(wrapper.get('#round-value').text()).toBe('0');
    await wrapper.get('tr[data-id="1"] .f-init').setValue('0');
    await wrapper.get('#add-btn').trigger('click');
    await wrapper.get('tr[data-id="2"] .f-init').setValue('-2');
    await wrapper.get('#add-btn').trigger('click');
    await wrapper.get('#start-next-btn').trigger('click');
    expect(wrapper.get('#start-next-btn').text()).toBe('Next turn');
    expect(wrapper.get('tr.active').attributes('data-id')).toBe('1');
    expect(wrapper.get('#round-value').text()).toBe('1');
    await wrapper.get('#start-next-btn').trigger('click');
    expect(wrapper.get('tr.active').attributes('data-id')).toBe('2');
    await wrapper.get('#start-next-btn').trigger('click');
    expect(wrapper.get('tr.active').attributes('data-id')).toBe('1');
    expect(wrapper.get('#round-value').text()).toBe('2');
    await wrapper.get('tr[data-id="1"] .f-init').setValue('');
    expect(wrapper.get('tr.active').attributes('data-id')).toBe('2');
    await wrapper.get('tr[data-id="2"] .f-init').setValue('Infinity');
    expect(wrapper.find('tr.active').exists()).toBe(false);
    expect(wrapper.get('#start-next-btn').text()).toBe('Start');
    expect(wrapper.get('#round-value').text()).toBe('0');
    expect(wrapper.findAll('tr[data-id]')).toHaveLength(3);
  } finally {
    wrapper.unmount();
  }
});

it('saves sorting edits during input but waits for blur to change displayed order', async () => {
  const storage = createStorage();
  const combat = createVueCombat(storage);
  const first = combat.addCreature();
  combat.editCreature(first, { init: '20', name: 'Alpha' });
  const second = combat.addCreature();
  combat.editCreature(second, { init: '10', name: 'Beta' });
  combat.start();
  const wrapper = mount(EncounterTracker, { props: { combat } });
  const ids = () => wrapper.findAll('tr[data-id]').map(row => row.attributes('data-id'));
  try {
    await wrapper.get('tr[data-id="1"] .f-init').setValue('10');
    await wrapper.get('tr[data-id="1"] .f-name').setValue('Zulu');
    expect(ids()).toEqual(['1', '2']);
    const restored = mount(EncounterTracker, { props: { combat: createVueCombat(storage) } });
    try {
      expect(restored.findAll('tr[data-id]').map(row => row.attributes('data-id'))).toEqual(['2', '1']);
      expect((restored.get('tr[data-id="1"] .f-name').element as HTMLInputElement).value).toBe('Zulu');
      expect(restored.get('tr.active').attributes('data-id')).toBe('1');
      expect(restored.get('#round-value').text()).toBe('1');
    } finally {
      restored.unmount();
    }
    await wrapper.get('tr[data-id="1"] .f-name').trigger('blur');
    expect(ids()).toEqual(['2', '1']);
    expect(wrapper.get('tr.active').attributes('data-id')).toBe('1');
  } finally {
    wrapper.unmount();
  }
});

it('shows restored downed HP, clamps maximum edits, and preserves decimal drafts while typing', async () => {
  const combat = createVueCombat();
  const id = combat.addCreature();
  combat.editCreature(id, { init: '10', maxHP: 10 });
  combat.damage(id, 10);
  const wrapper = mount(EncounterTracker, { props: { combat } });
  try {
    expect(wrapper.get('tr[data-id]').classes()).toContain('downed');
    expect(wrapper.get('.cell-current').text()).toBe('DOWNED');
    await wrapper.get('#start-next-btn').trigger('click');
    expect(wrapper.get('tr.active').attributes('data-id')).toBe(String(id));
    await wrapper.get('.f-temphp').setValue('2');
    expect(wrapper.get('.hp-number').text()).toBe('2 / 10');
    expect(wrapper.get('tr[data-id]').classes()).not.toContain('downed');
    await wrapper.get('.f-maxhp').trigger('focus');
    await wrapper.get('.f-maxhp').setValue('1.');
    expect((wrapper.get('.f-maxhp').element as HTMLInputElement).value).toBe('1.');
    await wrapper.get('.f-maxhp').setValue('1.5');
    expect(wrapper.get('.hp-number').text()).toBe('2.5 / 1.5');
    await wrapper.get('.f-maxhp').setValue('invalid');
    expect(wrapper.get('.hp-number').text()).toBe('2.5 / 1.5');
    await wrapper.get('.f-maxhp').trigger('blur');
    expect((wrapper.get('.f-maxhp').element as HTMLInputElement).value).toBe('1.5');
    await wrapper.get('.f-maxhp').setValue('');
    expect(wrapper.get('.cell-current').text()).toBe('set HP');
    expect(wrapper.get('tr[data-id]').classes()).not.toContain('downed');
  } finally {
    wrapper.unmount();
  }
});
