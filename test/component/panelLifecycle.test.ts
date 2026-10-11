import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { expect, it } from 'vitest';
import { usePanelLifecycle } from '../../src/ui/usePanelLifecycle';

function mountPanel(selectionFocus: 'before' | 'after' = 'before') {
  let lifecycle!: ReturnType<typeof usePanelLifecycle>;
  const wrapper = mount(
    defineComponent({
      setup() {
        const search = ref<HTMLInputElement>();
        lifecycle = usePanelLifecycle({
          alignment: 'left',
          selectionFocus,
          focusOnShow: () => search.value?.focus(),
        });
        return () =>
          h('div', [
            h('button', { ref: lifecycle.trigger }, 'Open'),
            lifecycle.open.value
              ? h('div', { ref: lifecycle.panel, role: 'dialog' }, [h('input', { ref: search })])
              : null,
          ]);
      },
    }),
    { attachTo: document.body },
  );
  return { wrapper, lifecycle };
}

it.each(['before', 'after'] as const)(
  'removes the panel before an action and restores focus %s the action',
  async (selectionFocus) => {
    const { wrapper, lifecycle } = mountPanel(selectionFocus);
    try {
      await lifecycle.show();
      expect(document.activeElement).toBe(wrapper.get('input').element);
      let actions = 0;
      await lifecycle.runAfterClose(() => {
        actions++;
        expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
        expect(document.activeElement === wrapper.get('button').element).toBe(
          selectionFocus === 'before',
        );
      });
      expect(actions).toBe(1);
      expect(document.activeElement).toBe(wrapper.get('button').element);
    } finally {
      wrapper.unmount();
    }
  },
);

it('keeps focus in a reopened panel when an earlier dismissal finishes', async () => {
  const { wrapper, lifecycle } = mountPanel();
  try {
    await lifecycle.show();
    const closing = lifecycle.close();
    const reopening = lifecycle.show();
    await Promise.all([closing, reopening]);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(document.activeElement).toBe(wrapper.get('input').element);
  } finally {
    wrapper.unmount();
  }
});

it('cancels a pending action and releases Escape handling when its owner unmounts', async () => {
  const { wrapper, lifecycle } = mountPanel();
  await lifecycle.show();
  let actions = 0;
  const selecting = lifecycle.runAfterClose(() => actions++);
  wrapper.unmount();
  await selecting;
  expect(actions).toBe(0);

  // Open another instance so cleanup is checked while its listener is registered.
  const next = mountPanel();
  const opening = next.lifecycle.show();
  next.wrapper.unmount();
  await opening;
  const escape = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
  document.dispatchEvent(escape);
  expect(escape.defaultPrevented).toBe(false);
});
