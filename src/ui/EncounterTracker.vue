<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import type { Combat } from '../combat/combat';
import CreatureRow from './CreatureRow.vue';

const { combat } = defineProps<{ combat: Combat }>();
// Presentation order is transient: edits save now, sorting waits for blur.
const rowIds = ref(combat.displayOrder.map(creature => creature.id));
const body = ref<HTMLTableSectionElement>();
const rows = computed(() => {
  const creatures = new Map(combat.state.creatures.map(creature => [creature.id, creature]));
  const ids = [...rowIds.value, ...combat.state.creatures
    .filter(creature => !rowIds.value.includes(creature.id)).map(creature => creature.id)];
  return ids.flatMap(id => {
    const creature = creatures.get(id);
    return creature ? [creature] : [];
  });
});

async function sortRows(event: FocusEvent) {
  rowIds.value = combat.displayOrder.map(creature => creature.id);
  // A keyed row move can blur the destination of Tab/click in Chromium.
  // Restore that destination only if the patch left focus on the document body.
  const destination = event.relatedTarget;
  await nextTick();
  if (destination instanceof HTMLElement && destination.isConnected &&
      document.activeElement === document.body) destination.focus();
}

async function addCreature() {
  const id = combat.addCreature();
  await nextTick();
  body.value?.querySelector<HTMLInputElement>(`tr[data-id="${id}"] .f-init`)?.focus();
}
</script>

<template>
  <div class="app-shell">
    <div class="app-card" :class="{ 'combat-started': combat.state.started }">
      <header class="topbar">
        <div class="tier1"><h1 class="app-title">D&amp;D Combat Tracker</h1></div>
        <div class="tier2">
          <div class="turn-group">
            <button id="start-next-btn" type="button" class="btn btn-primary"
              @click="combat.state.started ? combat.next() : combat.start()">
              {{ combat.state.started ? 'Next turn' : 'Start' }}
            </button>
            <div class="round" role="status" aria-live="polite">
              <span class="round-label">Round </span><span id="round-value">{{ combat.state.round }}</span>
            </div>
          </div>
          <span class="sep" aria-hidden="true"></span>
          <button id="add-btn" type="button" class="btn btn-add" @click="addCreature">
            <span>+ Add<span class="lbl-long"> creature</span></span>
          </button>
        </div>
      </header>
      <main class="page">
        <table class="combat-table">
          <thead><tr>
            <th class="col-init">Initiative</th><th class="col-name">Name</th>
            <th class="col-ac">AC</th><th class="col-hpnum">Max HP</th>
            <th class="col-hpnum">Temp HP</th><th class="col-current">Current HP</th>
          </tr></thead>
          <tbody id="creature-rows" ref="body">
            <CreatureRow v-for="creature in rows" :key="creature.id" :creature="creature"
              :combat="combat" @sort="sortRows" />
            <tr v-if="rows.length === 0" class="empty-row">
              <td colspan="6">No creatures yet — add one to begin.</td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
  </div>
</template>
