import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import EncounterConfirmation from '../../src/ui/EncounterConfirmation.vue';

it.each([true, false])(
  'handles an arbitrary confirmation request with acceptance %s',
  async (accepted) => {
    let actions = 0;
    const wrapper = mount(EncounterConfirmation, { props: { focusFallback: () => {} } });
    try {
      await wrapper.vm.confirm(
        {
          title: 'Clear notes?',
          message: 'Clear <b>all notes</b>?',
          acceptLabel: 'Clear notes',
          required: true,
          onAccept: () => actions++,
        },
        document.createElement('button'),
      );
      expect(wrapper.get('[role="dialog"]').text()).toContain('Clear notes?');
      expect(wrapper.get('#confirm-body').text()).toBe('Clear <b>all notes</b>?');
      expect(wrapper.find('#confirm-body b').exists()).toBe(false);
      expect(wrapper.get('#confirm-ok-btn').text()).toBe('Clear notes');
      expect(actions).toBe(0);
      await wrapper.get(accepted ? '#confirm-ok-btn' : '#confirm-cancel-btn').trigger('click');
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
      expect(actions).toBe(accepted ? 1 : 0);
    } finally {
      wrapper.unmount();
    }
  },
);
