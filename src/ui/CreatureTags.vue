<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { Combat, ReadonlyCreature } from '../combat/combat';

const { combat, creature, field } = defineProps<{
  combat: Combat;
  creature: ReadonlyCreature;
  field: 'conditions' | 'other';
}>();
const offered =
  field === 'conditions'
    ? [
        'Blinded',
        'Charmed',
        'Concentration',
        'Deafened',
        'Exhaustion',
        'Frightened',
        'Grappled',
        'Incapacitated',
        'Invisible',
        'Paralyzed',
        'Petrified',
        'Poisoned',
        'Prone',
        'Restrained',
        'Stunned',
        'Unconscious',
      ]
    : [];
const open = ref(false);
const query = ref('');
const trigger = ref<HTMLButtonElement>();
const search = ref<HTMLInputElement>();
const panel = ref<HTMLDivElement>();
const position = ref({ left: '8px', top: '8px' });
const label = field === 'conditions' ? 'Add a condition' : 'Add a note';
const filtered = computed(() =>
  offered.filter((value) => value.toLowerCase().includes(query.value.trim().toLowerCase())),
);
const applied = (value: string) =>
  creature[field].some((tag) => tag.toLowerCase() === value.toLowerCase());
const custom = computed(
  () =>
    query.value.trim() &&
    !applied(query.value.trim()) &&
    !offered.some((value) => value.toLowerCase() === query.value.trim().toLowerCase()),
);

function positionPicker() {
  if (!open.value || !panel.value || !trigger.value) return;
  const anchor = trigger.value!.getBoundingClientRect();
  const bounds = panel.value!.getBoundingClientRect();
  position.value = {
    left: `${Math.max(8, Math.min(anchor.left, window.innerWidth - bounds.width - 8))}px`,
    top: `${Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - bounds.height - 8))}px`,
  };
}
// Query changes can grow the free-text option after an initially short panel opens.
watch(query, positionPicker, { flush: 'post' });
async function show() {
  query.value = '';
  open.value = true;
  document.addEventListener('keydown', keydown);
  await nextTick();
  if (!open.value) return;
  positionPicker();
  search.value?.focus();
}
async function close() {
  open.value = false;
  query.value = '';
  document.removeEventListener('keydown', keydown);
  await nextTick();
}
function keydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return;
  event.preventDefault();
  void close().then(() => trigger.value?.focus());
}
async function apply(value: string) {
  // Wait for the Vue patch: no action or save can run under a visible picker.
  await close();
  combat.addTag(creature.id, field, value);
  trigger.value?.focus();
}
function enter() {
  if (!query.value.trim()) return;
  void apply(filtered.value[0] ?? query.value.trim());
}
onBeforeUnmount(() => document.removeEventListener('keydown', keydown));
</script>

<template>
  <div class="cond-cell vue-tags">
    <span v-for="tag in creature[field]" :key="tag" class="cond-pill">
      <span class="vue-tag-text">{{ tag }}</span>
      <button
        type="button"
        class="cond-x"
        :aria-label="`Remove ${tag}`"
        @click="combat.removeTag(creature.id, field, tag)"
      >
        ×
      </button>
    </span>
    <button
      ref="trigger"
      type="button"
      class="cond-add"
      :aria-label="label"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="show"
    >
      <span class="cond-add-plus">+</span> Add
    </button>
    <template v-if="open">
      <div class="cond-backdrop" @click="close"></div>
      <div
        ref="panel"
        class="cond-pop vue-tag-picker"
        :style="position"
        role="dialog"
        :aria-label="label"
      >
        <input
          ref="search"
          v-model="query"
          class="cond-search"
          type="text"
          :aria-label="label"
          :placeholder="`${label}…`"
          @keydown.enter.prevent="enter"
        />
        <div class="cond-list">
          <button
            v-for="option in filtered"
            :key="option"
            type="button"
            class="cond-opt"
            :class="{ 'is-applied': applied(option) }"
            :disabled="applied(option)"
            @click="apply(option)"
          >
            <span>{{ option }}</span>
            <svg class="cond-check" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </button>
          <button
            v-if="custom"
            type="button"
            class="cond-opt cond-opt-custom"
            @click="apply(query.trim())"
          >
            <span
              >Add <b>“{{ query.trim() }}”</b></span
            >
          </button>
          <div v-if="query.trim() && !filtered.length && !custom" class="cond-empty">
            No new tags
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
