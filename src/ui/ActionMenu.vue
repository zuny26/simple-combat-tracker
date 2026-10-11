<script setup lang="ts">
import { useId } from 'vue';
import type { MenuItem } from './menu';
import { usePanelLifecycle } from './usePanelLifecycle';

const props = defineProps<{
  label: string;
  triggerClass: string;
  triggerId?: string;
  panelClass: string;
  items: readonly MenuItem[];
}>();
const emit = defineEmits<{ select: [id: string, trigger: HTMLButtonElement] }>();
const { open, trigger, panel, position, show, close, runAfterClose } = usePanelLifecycle({
  alignment: 'right',
  focusOnShow() {
    const options = buttons();
    (
      options.find((button) => button.getAttribute('aria-checked') === 'true') ?? options[0]
    )?.focus();
  },
  keydown,
});
const menuId = useId();
const buttons = () =>
  Array.from(panel.value?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? []);

async function toggle() {
  if (open.value) return close();
  await show();
}
function select(id: string) {
  return runAfterClose(() => {
    if (trigger.value) emit('select', id, trigger.value);
  });
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    // Resume native Tab navigation from the trigger, rather than a removed menu item.
    trigger.value?.focus();
    void close(false);
    return;
  }
  const options = buttons();
  const current = options.indexOf(document.activeElement as HTMLButtonElement);
  let destination: HTMLButtonElement | undefined;
  if (event.key === 'ArrowDown') destination = options[(current + 1) % options.length];
  else if (event.key === 'ArrowUp')
    destination = options[(current - 1 + options.length) % options.length];
  else if (event.key === 'Home') destination = options[0];
  else if (event.key === 'End') destination = options.at(-1);
  if (destination) {
    event.preventDefault();
    destination.focus();
  }
}
</script>

<template>
  <button
    :id="props.triggerId"
    ref="trigger"
    type="button"
    :class="triggerClass"
    :aria-label="label"
    aria-haspopup="menu"
    :aria-expanded="open"
    :aria-controls="open ? menuId : undefined"
    @click="toggle"
  >
    <slot />
  </button>
  <template v-if="open">
    <div class="cond-backdrop" @click="close()"></div>
    <div
      :id="menuId"
      ref="panel"
      :class="[panelClass, 'vue-action-menu']"
      :style="position"
      role="menu"
      :aria-label="label"
    >
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        :class="[
          panelClass === 'row-menu' ? 'row-menu-item' : 'app-menu-item',
          { 'is-danger': item.danger },
        ]"
        :role="item.theme ? 'menuitemradio' : 'menuitem'"
        :aria-checked="item.theme ? item.checked : undefined"
        tabindex="-1"
        @click="select(item.id)"
      >
        <span
          v-if="item.theme"
          class="theme-swatch"
          :style="{ '--sw-bg': item.theme.swatchBg, '--sw-dot': item.theme.swatchDot }"
        ></span>
        <span class="app-menu-label">{{ item.label }}</span>
        <svg v-if="item.theme" class="theme-check" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </button>
    </div>
  </template>
</template>
