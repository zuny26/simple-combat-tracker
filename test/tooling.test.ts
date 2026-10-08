import { expect, test } from 'vitest';
import { mount } from '@vue/test-utils';
import ToolingProbe from './fixtures/ToolingProbe.vue';

// Temporary tooling probe: exercises SFC compilation, typed props, Composition API,
// and the mounted-UI seam without introducing a second running combat application.
test('a typed Vue input displays user text and emits an edited value', async () => {
  const wrapper = mount(ToolingProbe, { props: { label: '<b>Name</b>', modelValue: 'Goblin' } });
  try {
    expect(wrapper.get('label').text()).toBe('<b>Name</b>');
    expect(wrapper.find('b').exists()).toBe(false);
    expect(wrapper.get('input').element.value).toBe('Goblin');
    await wrapper.get('input').setValue('Ogre');
    expect(wrapper.emitted('update:modelValue')).toEqual([['Ogre']]);
  } finally {
    wrapper.unmount();
  }
});
