<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';
import type { Combat } from '../combat/combat';
import CreatureRow from './CreatureRow.vue';
import ActionMenu from './ActionMenu.vue';
import EncounterConfirmation from './EncounterConfirmation.vue';
import { createPreferences } from './preferences';
import { THEMES } from './themes';
import { useDisplayedCreatureOrder } from './useDisplayedCreatureOrder';
import { useCombatEditGrouping } from './useCombatEditGrouping';
import type { EncounterStorage } from '../combat/persistence';
import { createProfileRegistry } from '../profiles/profileRegistry';
import type { ProfileRegistry } from '../profiles/profileRegistry';

const {
  combat,
  preferenceStorage,
  profiles: providedProfiles,
} = defineProps<{
  combat: Combat;
  preferenceStorage?: EncounterStorage;
  profiles?: ProfileRegistry;
}>();
const profiles = providedProfiles ?? createProfileRegistry();
const preferences = createPreferences(preferenceStorage);
const themeItems = computed(() =>
  THEMES.map((theme) => ({
    id: theme.id,
    label: theme.label,
    theme,
    checked: preferences.state.theme === theme.id,
  })),
);
const appItems = computed(() => [...themeItems.value, { id: 'help', label: 'How to run a fight' }]);
watchEffect(() => {
  document.documentElement.dataset.theme = preferences.state.theme;
  document.documentElement.classList.toggle('usage-dismissed', preferences.state.helpDismissed);
});
function appAction(id: string) {
  if (id === 'help') preferences.setHelpDismissed(false);
  else preferences.selectTheme(id);
}
const { rows, body, finishEdit, addCreature } = useDisplayedCreatureOrder(combat);
const editGrouping = useCombatEditGrouping(combat);
const confirmation = ref<InstanceType<typeof EncounterConfirmation>>();
const addButton = ref<HTMLButtonElement>();
function removeCreature(id: number, trigger: HTMLElement) {
  const creature = combat.state.creatures.find((creature) => creature.id === id);
  if (!creature) return;
  return confirmation.value?.confirm(
    {
      title: 'Remove creature?',
      message: `Remove ${creature.name || 'this creature'} from the encounter?`,
      acceptLabel: 'Remove',
      required: !combat.isEmptyCreature(id),
      onAccept: () => combat.removeCreature(id),
    },
    trigger,
  );
}

function bookmarkCreature(id: number, trigger: HTMLElement) {
  const creature = combat.state.creatures.find((creature) => creature.id === id);
  if (!creature) return;
  const saved = profiles.find(creature.name);
  if (!saved || profiles.bookmarkState(creature) === 'matching') {
    profiles.save(creature);
    return;
  }
  const proposed = { name: creature.name, ac: creature.ac, maxHP: creature.maxHP };
  const changes: string[] = [];
  if (saved.ac !== proposed.ac) changes.push(`AC: ${saved.ac || '—'} → ${proposed.ac || '—'}`);
  if (saved.maxHP !== proposed.maxHP) changes.push(`Max HP: ${saved.maxHP} → ${proposed.maxHP}`);
  return confirmation.value?.confirm(
    {
      title: `Update ${saved.name}?`,
      changes,
      acceptLabel: 'Update profile',
      destructive: false,
      required: true,
      onAccept: () => profiles.overwrite(proposed),
    },
    trigger,
  );
}

function newCombat(trigger: HTMLElement) {
  return confirmation.value?.confirm(
    {
      title: 'New Combat?',
      message: 'Clear all creatures and begin a new combat? This cannot be undone.',
      acceptLabel: 'New Combat',
      required: combat.hasMeaningfulData(),
      onAccept: () => combat.reset(),
    },
    trigger,
  );
}
</script>

<template>
  <div class="app-shell">
    <div class="app-card" :inert="confirmation?.open ? true : undefined"
      :class="{ 'combat-started': combat.state.started }">
      <header class="topbar">
        <div class="tier1">
          <h1 class="app-title">D&amp;D Combat Tracker</h1>
          <span class="spacer"></span>
          <div class="theme-picker">
            <ActionMenu trigger-id="theme-trigger" trigger-class="theme-trigger" panel-class="app-menu" label="Theme"
              :items="themeItems" @select="preferences.selectTheme">
              <span>{{THEMES.find((theme) => theme.id === preferences.state.theme)?.label}}</span>
              <svg class="theme-caret" viewBox="0 0 24 24" aria-hidden="true">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </ActionMenu>
          </div>
          <button id="usage-help-btn" type="button" class="btn btn-icon" aria-label="Show how to run a fight"
            @click="preferences.setHelpDismissed(false)">
            ?
          </button>
          <ActionMenu trigger-id="app-menu-btn" trigger-class="app-menu-trigger" panel-class="app-menu" label="Menu"
            :items="appItems" @select="appAction">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
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
          <button id="add-btn" ref="addButton" type="button" class="btn btn-add" @click="addCreature">
            <span>+ Add<span class="lbl-long"> creature</span></span>
          </button>
          <span class="spacer"></span>
          <div class="history-controls">
            <button id="undo-btn" type="button" class="btn btn-secondary" :disabled="combat.history.undoCount === 0"
              @click="combat.undo()">
              <!-- Lucide undo-2; ISC license in public/lucide-license.txt. -->
              <svg class="history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 14 4 9l5-5" />
                <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11" />
              </svg>
              <span class="lbl-long">Undo</span>
            </button>
            <button id="redo-btn" type="button" class="btn btn-secondary" :disabled="combat.history.redoCount === 0"
              @click="combat.redo()">
              <!-- Lucide redo-2; ISC license in public/lucide-license.txt. -->
              <svg class="history-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m15 14 5-5-5-5" />
                <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13" />
              </svg>
              <span class="lbl-long">Redo</span>
            </button>
          </div>
          <span class="sep history-separator" aria-hidden="true"></span>
          <button id="reset-btn" type="button" class="btn btn-secondary"
            @click="newCombat($event.currentTarget as HTMLElement)">
            <svg class="icon-reset" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
            </svg>
            <span class="lbl-long">New Combat</span>
          </button>
        </div>
      </header>
      <main class="page">
        <div v-if="!preferences.state.helpDismissed" class="usage-callout">
          <button id="usage-dismiss-btn" type="button" class="usage-dismiss" aria-label="Dismiss"
            @click="preferences.setHelpDismissed(true)">
            ✕
          </button>
          <h2>How to run a fight</h2>
          <p class="lead">
            Add everyone in the encounter, then run it round by round — the table keeps initiative
            order, hit points and conditions all in one place.
          </p>
          <ol class="usage-list usage-list-num">
            <li>
              <span class="num">1</span><span><b>Add creatures</b> and type each one's initiative — rows sort
                highest-first when
                you leave the field.</span>
            </li>
            <li>
              <span class="num">2</span><span>Hit <b>Start</b> to begin; <b>Next turn</b> advances the marker and counts
                rounds.</span>
            </li>
            <li>
              <span class="num">3</span><span>Type an amount under <b>Damage / Heal</b>, then hit <b>Dmg</b> or
                <b>Heal</b> — the
                HP bar updates live.</span>
            </li>
          </ol>
        </div>
        <table class="combat-table" @focus.capture="editGrouping.focus" @blur.capture="editGrouping.blur">
          <thead>
            <tr>
              <th class="col-init">Initiative</th>
              <th class="col-name">Name</th>
              <th class="col-ac">AC</th>
              <th class="col-hpnum">Max HP</th>
              <th class="col-hpnum">Temp HP</th>
              <th class="col-current">Current HP</th>
              <th class="col-adjust">Damage / Heal</th>
              <th class="col-conditions">Conditions</th>
              <th class="col-other">Other</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody id="creature-rows" ref="body">
            <CreatureRow v-for="creature in rows" :key="creature.id" :creature="creature" :combat="combat"
              :profiles="profiles" @bookmark="bookmarkCreature" @edit-finished="finishEdit" @remove="removeCreature" />
            <tr v-if="rows.length === 0" class="empty-row">
              <td colspan="10">No creatures yet — add one to begin.</td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
    <EncounterConfirmation ref="confirmation" :focus-fallback="() => addButton?.focus()" />
  </div>
</template>
