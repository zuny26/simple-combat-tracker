<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId } from 'vue';
import type { MenuItem } from './menu';

const props = defineProps<{
  label: string; triggerClass: string; triggerId?: string; panelClass: string; items: readonly MenuItem[];
}>();
const emit = defineEmits<{ select: [id: string, trigger: HTMLButtonElement] }>();
const open = ref(false);
const trigger = ref<HTMLButtonElement>();
const panel = ref<HTMLDivElement>();
const menuId = useId();
const position = ref({ left: '8px', top: '8px' });
const buttons = () => Array.from(panel.value?.querySelectorAll<HTMLButtonElement>('[role^="menuitem"]') ?? []);

async function close(restoreFocus = true) {
  open.value = false;
  document.removeEventListener('keydown', keydown);
  await nextTick();
  if (restoreFocus) trigger.value?.focus();
}
async function toggle() {
  if (open.value) return close();
  open.value = true;
  document.addEventListener('keydown', keydown);
  await nextTick();
  if (!open.value || !trigger.value || !panel.value) return;
  const anchor = trigger.value.getBoundingClientRect();
  const bounds = panel.value.getBoundingClientRect();
  position.value = {
    left: `${Math.max(8, Math.min(anchor.right - bounds.width, window.innerWidth - bounds.width - 8))}px`,
    top: `${Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - bounds.height - 8))}px`,
  };
  const options = buttons();
  (options.find(button => button.getAttribute('aria-checked') === 'true') ?? options[0])?.focus();
}
async function select(id: string) {
  await close();
  if (trigger.value) emit('select', id, trigger.value);
}
function keydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    void close();
    return;
  }
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
  else if (event.key === 'ArrowUp') destination = options[(current - 1 + options.length) % options.length];
  else if (event.key === 'Home') destination = options[0];
  else if (event.key === 'End') destination = options.at(-1);
  if (destination) {
    event.preventDefault();
    destination.focus();
  }
}
onBeforeUnmount(() => document.removeEventListener('keydown', keydown));
</script>

<template>
  <button :id="props.triggerId" ref="trigger" type="button" :class="triggerClass" :aria-label="label"
    aria-haspopup="menu" :aria-expanded="open" :aria-controls="open ? menuId : undefined" @click="toggle">
    <slot />
  </button>
  <template v-if="open">
    <div class="cond-backdrop" @click="close()"></div>
    <div :id="menuId" ref="panel" :class="[panelClass, 'vue-action-menu']" :style="position" role="menu" :aria-label="label">
      <button v-for="item in items" :key="item.id" type="button" :class="[panelClass === 'row-menu' ? 'row-menu-item' : 'app-menu-item', { 'is-danger': item.danger }]"
        :role="item.theme ? 'menuitemradio' : 'menuitem'" :aria-checked="item.theme ? item.checked : undefined"
        tabindex="-1" @click="select(item.id)">
        <span v-if="item.theme" class="theme-swatch" :style="{ '--sw-bg': item.theme.swatchBg, '--sw-dot': item.theme.swatchDot }"></span>
        <span class="app-menu-label">{{ item.label }}</span>
        <svg v-if="item.theme" class="theme-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
      </button>
    </div>
  </template>
</template>
