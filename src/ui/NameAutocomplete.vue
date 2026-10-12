<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import type { ProfileRegistry, SavedProfile } from '../profiles/profileRegistry';
import { usePanelLifecycle } from './usePanelLifecycle';

const { name, profiles } = defineProps<{ name: string; profiles: ProfileRegistry }>();
const emit = defineEmits<{
  input: [event: Event];
  blur: [event: FocusEvent];
  select: [profile: SavedProfile];
}>();
const suggestions = computed(() => profiles.matching(name));
const selected = ref(-1);
const listId = useId();
const { open, trigger, panel, position, show, close, reposition, runAfterClose } =
  usePanelLifecycle<HTMLInputElement>({
    alignment: 'left',
    focusOnShow: () => {},
    onClose: () => {
      selected.value = -1;
    },
    restoreFocusOnDismiss: false,
  });

function outside(event: PointerEvent) {
  const target = event.target as Node;
  if (!trigger.value?.contains(target) && !panel.value?.contains(target)) void close(false);
}
watch(
  open,
  (value) => {
    if (value) document.addEventListener('pointerdown', outside);
    else document.removeEventListener('pointerdown', outside);
  },
  { flush: 'sync' },
);
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside));
watch(
  suggestions,
  () => {
    selected.value = -1;
    reposition();
  },
  { flush: 'post' },
);

function browse() {
  if (suggestions.value.length) void show();
}
async function input(event: Event) {
  emit('input', event);
  await nextTick();
  browse();
}
function blur(event: FocusEvent) {
  void close(false);
  emit('blur', event);
}
function select(profile: SavedProfile) {
  return runAfterClose(() => emit('select', profile));
}
async function keydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  if (event.key === 'Tab') {
    void close(false);
    return;
  }
  if (event.key === 'Enter' && open.value && selected.value >= 0) {
    event.preventDefault();
    const profile = suggestions.value[selected.value];
    if (profile) void select(profile);
    return;
  }
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  if (!suggestions.value.length) return;
  event.preventDefault();
  if (!open.value) await show();
  const count = suggestions.value.length;
  selected.value =
    event.key === 'ArrowDown'
      ? (selected.value + 1) % count
      : (selected.value <= 0 ? count : selected.value) - 1;
  await nextTick();
  panel.value?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
}
</script>

<template>
  <input
    ref="trigger"
    class="f-name"
    data-combat-field="name"
    type="text"
    role="combobox"
    aria-label="Name"
    aria-autocomplete="list"
    aria-haspopup="listbox"
    :aria-expanded="open"
    :aria-controls="open ? listId : undefined"
    :aria-activedescendant="open && selected >= 0 ? `${listId}-${selected}` : undefined"
    autocomplete="off"
    placeholder="—"
    :value="name"
    @focus="browse"
    @input="input"
    @blur="blur"
    @keydown="keydown"
  />
  <Teleport to="body">
    <div
      v-if="open"
      :id="listId"
      ref="panel"
      class="cond-pop profile-suggestions"
      :style="position"
      role="listbox"
      aria-label="Saved profiles"
    >
      <button
        v-for="(profile, index) in suggestions"
        :id="`${listId}-${index}`"
        :key="profile.name"
        type="button"
        role="option"
        class="cond-opt"
        :aria-selected="selected === index"
        tabindex="-1"
        @pointerdown.prevent
        @click="select(profile)"
      >
        {{ profile.name }}
      </button>
      <div v-if="!suggestions.length" class="cond-empty">No matching profiles</div>
    </div>
  </Teleport>
</template>
