<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Combat, ReadonlyCreature } from '../combat/combat';
import { usePanelLifecycle } from './usePanelLifecycle';

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
const query = ref('');
const search = ref<HTMLInputElement>();
const { open, trigger, panel, position, show, close, reposition, runAfterClose } =
  usePanelLifecycle({
    alignment: 'left',
    focusOnShow: () => search.value?.focus(),
    onShow: () => {
      query.value = '';
    },
    onClose: () => {
      query.value = '';
    },
    restoreFocusOnDismiss: false,
    selectionFocus: 'after',
  });
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

// Query changes can grow the free-text option after an initially short panel opens.
watch(query, reposition, { flush: 'post' });
function apply(value: string) {
  return runAfterClose(() => combat.addTag(creature.id, field, value));
}
function enter() {
  if (!query.value.trim()) return;
  void apply(filtered.value[0] ?? query.value.trim());
}
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
      <div class="cond-backdrop" @click="close()"></div>
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
