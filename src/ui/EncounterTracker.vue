<script setup lang="ts">
import { computed, nextTick, ref, watchEffect } from 'vue';
import type { Combat } from '../combat/combat';
import CreatureRow from './CreatureRow.vue';
import ActionMenu from './ActionMenu.vue';
import { createPreferences } from './preferences';
import { THEMES } from '../../js/themes.js';
import type { EncounterStorage } from '../combat/persistence';

const { combat, preferenceStorage } = defineProps<{ combat: Combat; preferenceStorage?: EncounterStorage }>();
const preferences = createPreferences(preferenceStorage);
const themeItems = computed(() => THEMES.map(theme => ({ id: theme.id, label: theme.label,
  theme, checked: preferences.state.theme === theme.id })));
const appItems = computed(() => [...themeItems.value,
  { id: 'help', label: 'How to run a fight' }, { id: 'reset', label: 'New Combat', danger: true }]);
watchEffect(() => {
  document.documentElement.dataset.theme = preferences.state.theme;
  document.documentElement.classList.toggle('usage-dismissed', preferences.state.helpDismissed);
});
function appAction(id: string, trigger: HTMLElement) {
  if (id === 'help') preferences.setHelpDismissed(false);
  else if (id === 'reset') void newCombat(trigger);
  else preferences.selectTheme(id);
}
// Presentation order is transient: edits save now, sorting waits for blur.
const rowIds = ref(combat.displayOrder.map(creature => creature.id));
const body = ref<HTMLTableSectionElement>();
const confirmation = ref<{ kind: 'remove'; id: number; name: string } | { kind: 'reset' } | null>(null);
const cancelButton = ref<HTMLButtonElement>();
const acceptButton = ref<HTMLButtonElement>();
let confirmationTrigger: HTMLElement | null = null;

async function removeCreature(id: number, trigger: HTMLElement) {
  if (combat.isEmptyCreature(id)) {
    combat.removeCreature(id);
    return;
  }
  const creature = combat.state.creatures.find(creature => creature.id === id);
  if (!creature) return;
  confirmationTrigger = trigger;
  confirmation.value = { kind: 'remove', id, name: creature.name };
  await nextTick();
  cancelButton.value?.focus();
}

async function newCombat(trigger: HTMLElement) {
  if (!combat.hasMeaningfulData()) {
    combat.reset();
    rowIds.value = [];
    return;
  }
  confirmationTrigger = trigger;
  confirmation.value = { kind: 'reset' };
  await nextTick();
  cancelButton.value?.focus();
}

async function closeConfirmation(accepted = false) {
  const pending = confirmation.value;
  confirmation.value = null;
  if (accepted && pending) {
    if (pending.kind === 'remove') combat.removeCreature(pending.id);
    else {
      combat.reset();
      rowIds.value = [];
    }
  }
  await nextTick();
  if (confirmationTrigger?.isConnected) confirmationTrigger.focus();
  else body.value?.closest('.app-card')?.querySelector<HTMLButtonElement>('#add-btn')?.focus();
  confirmationTrigger = null;
}

function confirmationKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    void closeConfirmation();
  } else if (event.key === 'Tab') {
    event.preventDefault();
    if (document.activeElement === cancelButton.value) acceptButton.value?.focus();
    else cancelButton.value?.focus();
  }
}
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
    <div class="app-card" :inert="confirmation ? true : undefined" :class="{ 'combat-started': combat.state.started }">
      <header class="topbar">
        <div class="tier1">
          <h1 class="app-title">D&amp;D Combat Tracker</h1><span class="spacer"></span>
          <div class="theme-picker">
            <ActionMenu trigger-id="theme-trigger" trigger-class="theme-trigger" panel-class="app-menu"
              label="Theme" :items="themeItems" @select="preferences.selectTheme">
              <span>{{ THEMES.find(theme => theme.id === preferences.state.theme)?.label }}</span>
              <svg class="theme-caret" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </ActionMenu>
          </div>
          <button id="usage-help-btn" type="button" class="btn btn-icon" aria-label="Show how to run a fight"
            @click="preferences.setHelpDismissed(false)">?</button>
          <ActionMenu trigger-id="app-menu-btn" trigger-class="app-menu-trigger" panel-class="app-menu"
            label="Menu" :items="appItems" @select="appAction">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </ActionMenu>
        </div>
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
          <span class="spacer"></span>
          <button id="reset-btn" type="button" class="btn btn-secondary" @click="newCombat($event.currentTarget as HTMLElement)">
            <svg class="icon-reset" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" /></svg>
            <span class="lbl-long">New Combat</span>
          </button>
        </div>
      </header>
      <main class="page">
        <div v-if="!preferences.state.helpDismissed" class="usage-callout">
          <button id="usage-dismiss-btn" type="button" class="usage-dismiss" aria-label="Dismiss"
            @click="preferences.setHelpDismissed(true)">✕</button>
          <h2>How to run a fight</h2>
          <p class="lead">Add everyone in the encounter, then run it round by round — the table keeps initiative order, hit points and conditions all in one place.</p>
          <ol class="usage-list usage-list-num">
            <li><span class="num">1</span><span><b>Add creatures</b> and type each one's initiative — rows sort highest-first when you leave the field.</span></li>
            <li><span class="num">2</span><span>Hit <b>Start</b> to begin; <b>Next turn</b> advances the marker and counts rounds.</span></li>
            <li><span class="num">3</span><span>Type an amount under <b>Damage / Heal</b>, then hit <b>Dmg</b> or <b>Heal</b> — the HP bar updates live.</span></li>
          </ol>
        </div>
        <table class="combat-table">
          <thead><tr>
            <th class="col-init">Initiative</th><th class="col-name">Name</th>
            <th class="col-ac">AC</th><th class="col-hpnum">Max HP</th>
            <th class="col-hpnum">Temp HP</th><th class="col-current">Current HP</th>
            <th class="col-adjust">Damage / Heal</th><th>Conditions</th><th>Other</th><th class="col-actions">Actions</th>
          </tr></thead>
          <tbody id="creature-rows" ref="body">
            <CreatureRow v-for="creature in rows" :key="creature.id" :creature="creature"
              :combat="combat" @sort="sortRows" @remove="removeCreature" />
            <tr v-if="rows.length === 0" class="empty-row">
              <td colspan="10">No creatures yet — add one to begin.</td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
    <div v-if="confirmation" class="confirm-backdrop" @click.self="closeConfirmation()"
      @keydown="confirmationKeydown">
      <section class="confirm-dialog" role="dialog" aria-modal="true"
        aria-labelledby="confirm-title" aria-describedby="confirm-body">
        <h2 id="confirm-title" class="confirm-title">{{ confirmation.kind === 'remove' ? 'Remove creature?' : 'New Combat?' }}</h2>
        <p id="confirm-body" class="confirm-body">
          <template v-if="confirmation.kind === 'remove'">Remove {{ confirmation.name || 'this creature' }} from the encounter? This cannot be undone.</template>
          <template v-else>Clear all creatures and begin a new combat? This cannot be undone.</template>
        </p>
        <div class="confirm-actions">
          <button id="confirm-cancel-btn" ref="cancelButton" type="button" class="btn" @click="closeConfirmation()">Cancel</button>
          <button id="confirm-ok-btn" ref="acceptButton" type="button" class="btn btn-danger" @click="closeConfirmation(true)">{{ confirmation.kind === 'remove' ? 'Remove' : 'New Combat' }}</button>
        </div>
      </section>
    </div>
  </div>
</template>
