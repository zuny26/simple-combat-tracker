<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue';
import type { ProfileRegistry, SavedProfile } from '../profiles/profileRegistry';
import { usePanelLifecycle } from './usePanelLifecycle';

const { name, profiles } = defineProps<{ name: string; profiles: ProfileRegistry }>();
const emit = defineEmits<{
  input: [event: Event];
  blur: [event: FocusEvent];
  select: [profile: SavedProfile];
  delete: [profile: SavedProfile, trigger: HTMLElement];
}>();
const suggestions = computed(() => profiles.matching(name));
const selected = ref(-1);
const listId = useId();
let skipNextFocus = false;
const { open, trigger, panel, position, show, close, reposition, runAfterClose } =
  usePanelLifecycle<HTMLInputElement>({
    alignment: 'left',
    matchTriggerWidth: true,
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
    if (!suggestions.value.length) void close(false);
    else reposition();
  },
  { flush: 'post' },
);

function browse() {
  if (suggestions.value.length) void show();
}
function focus() {
  if (skipNextFocus) skipNextFocus = false;
  else browse();
}
async function input(event: Event) {
  emit('input', event);
  await nextTick();
  browse();
}
function blur(event: FocusEvent) {
  if (!panel.value?.contains(event.relatedTarget as Node | null)) void close(false);
  emit('blur', event);
}
async function deleteProfile(profile: SavedProfile) {
  if (!(await close(false)) || !trigger.value) return;
  // The suggestion is gone; restore modal focus to Name without reopening the picker.
  skipNextFocus = true;
  emit('delete', profile, trigger.value);
}
function select(profile: SavedProfile) {
  return runAfterClose(() => emit('select', profile));
}
function deleteKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    skipNextFocus = true;
    return;
  }
  if (event.key !== 'Tab') return;
  skipNextFocus = true;
  trigger.value?.focus();
  void close(false);
  if (event.shiftKey) event.preventDefault();
}
async function keydown(event: KeyboardEvent) {
  if (event.isComposing) return;
  if (event.key === 'Tab') {
    void close(false);
    return;
  }
  if (event.key === 'ArrowRight' && open.value && selected.value >= 0) {
    event.preventDefault();
    panel.value
      ?.querySelector<HTMLButtonElement>(`[data-delete-index="${selected.value}"]`)
      ?.focus();
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
    aria-haspopup="grid"
    :aria-expanded="open"
    :aria-controls="open ? listId : undefined"
    :aria-activedescendant="open && selected >= 0 ? `${listId}-${selected}` : undefined"
    autocomplete="off"
    placeholder="—"
    :value="name"
    @focus="focus"
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
      role="grid"
      aria-label="Saved profiles"
      @focusout="open && !panel?.contains($event.relatedTarget as Node | null) && close(false)"
    >
      <div
        v-for="(profile, index) in suggestions"
        :key="profile.name"
        class="profile-suggestion"
        role="row"
      >
        <div
          :id="`${listId}-${index}`"
          role="gridcell"
          class="profile-choice"
          :aria-selected="selected === index"
        >
          <button
            type="button"
            class="cond-opt"
            tabindex="-1"
            @pointerdown.prevent
            @click="select(profile)"
          >
            {{ profile.name }}
          </button>
        </div>
        <div role="gridcell">
          <button
            type="button"
            class="profile-delete"
            :aria-label="`Delete saved profile ${profile.name}`"
            :data-delete-index="index"
            tabindex="-1"
            @pointerdown.prevent
            @click="deleteProfile(profile)"
            @keydown="deleteKeydown"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
