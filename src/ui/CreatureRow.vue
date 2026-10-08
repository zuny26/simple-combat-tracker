<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { Combat, ReadonlyCreature } from '../combat/combat';
import CreatureTags from './CreatureTags.vue';
import ActionMenu from './ActionMenu.vue';

const { combat, creature } = defineProps<{ combat: Combat; creature: ReadonlyCreature }>();
const emit = defineEmits<{ sort: [event: FocusEvent]; remove: [id: number, trigger: HTMLElement] }>();
function rowAction(action: string, trigger: HTMLElement) {
  if (action === 'duplicate') combat.duplicateCreature(creature.id);
  else emit('remove', creature.id, trigger);
}
const health = computed(() => combat.hp(creature.id)!);
const baseHP = computed(() => creature.maxHP - creature.damageTaken);
const bloodied = computed(() => baseHP.value / creature.maxHP <= 0.5);
const fillPercent = computed(() => Math.min(100, Math.max(0, baseHP.value / creature.maxHP * 100)));
type HPField = 'maxHP' | 'tempHP';
const hpText = (value: number) => value === 0 ? '' : String(value);
const drafts = reactive({ maxHP: hpText(creature.maxHP), tempHP: hpText(creature.tempHP) });
const editingHP = ref<HPField | null>(null);
const pendingAdjustment = ref('');
function applyAdjustment(action: 'damage' | 'heal') {
  const amount = Number(pendingAdjustment.value);
  if (!Number.isFinite(amount) || amount <= 0) return;
  combat[action](creature.id, amount);
  pendingAdjustment.value = '';
}
for (const field of ['maxHP', 'tempHP'] as const) {
  watch(() => creature[field], value => {
    if (editingHP.value !== field) drafts[field] = hpText(value);
  });
}
function editText(field: 'init' | 'name' | 'ac', event: Event) {
  combat.editCreature(creature.id, { [field]: (event.target as HTMLInputElement).value });
}
function editHP(field: HPField) {
  combat.editCreature(creature.id, { [field]: Number(drafts[field]) });
}
function finishHP(field: HPField) {
  editingHP.value = null;
  drafts[field] = hpText(creature[field]);
}
</script>

<template>
  <tr :data-id="creature.id" :class="{ active: combat.state.activeId === creature.id, downed: health.downed }">
    <td class="cell-init" data-label="Init">
      <div class="init-wrap">
        <svg class="init-shoe" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m15 10.42 4.8-5.07M19 18h3" />
          <path d="M9.5 22 21.414 9.415A2 2 0 0 0 21.2 6.4l-5.61-4.208A1 1 0 0 0 14 3v2a2 2 0 0 1-1.394 1.906L8.677 8.053A1 1 0 0 0 8 9c-.155 6.393-2.082 9-4 9a2 2 0 0 0 0 4h14" />
        </svg>
        <input class="f-init" type="text" inputmode="decimal" aria-label="Initiative" placeholder="—"
          :value="creature.init" @input="editText('init', $event)" @blur="$emit('sort', $event)">
        <span class="turn-flag">TURN</span>
      </div>
    </td>
    <td class="cell-name">
      <input class="f-name" type="text" aria-label="Name" placeholder="Name" :value="creature.name"
        @input="editText('name', $event)" @blur="$emit('sort', $event)">
    </td>
    <td class="cell-ac" data-label="AC">
      <div class="ac-wrap">
        <svg class="ac-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
        <input class="f-ac" type="text" inputmode="numeric" aria-label="AC" placeholder="—"
          :value="creature.ac" @input="editText('ac', $event)">
      </div>
    </td>
    <td class="cell-maxhp" data-label="Max HP">
      <input v-model="drafts.maxHP" class="f-maxhp" type="text" inputmode="decimal" aria-label="Max HP" placeholder="—"
        @focus="editingHP = 'maxHP'" @input="editHP('maxHP')" @blur="finishHP('maxHP')">
    </td>
    <td class="cell-temphp" data-label="Temp HP">
      <input v-model="drafts.tempHP" class="f-temphp" type="text" inputmode="decimal" aria-label="Temp HP" placeholder="—"
        @focus="editingHP = 'tempHP'" @input="editHP('tempHP')" @blur="finishHP('tempHP')">
    </td>
    <td class="cell-current" data-label="Current HP">
      <div class="hp-cell" :class="{ 'hp-unconfigured': !health.configured, 'hp-downed': health.downed }">
        <template v-if="!health.configured">
          <div class="hp-track"></div><span class="hp-label-muted">set HP</span>
        </template>
        <template v-else-if="health.downed">
          <div class="hp-track hp-track-downed"></div><span class="hp-downed-tag">DOWNED</span>
        </template>
        <template v-else>
          <div class="hp-track hp-track-alive">
            <div class="hp-fill" :class="{ 'hp-fill-bloodied': bloodied }" :style="{ width: `${fillPercent}%` }"></div>
            <div v-if="creature.tempHP > 0" class="hp-temp-seg"
              :style="{ width: `${Math.min(30, creature.tempHP / creature.maxHP * 100)}%` }"></div>
          </div>
          <span class="hp-number"><span :class="{ 'hp-cur-bloodied': bloodied }">{{ health.current }}</span><span class="hp-max-of"> / {{ creature.maxHP }}</span></span>
        </template>
      </div>
    </td>
    <td class="cell-adjust" data-label="Damage / Heal">
      <div class="r-ctl">
        <input v-model="pendingAdjustment" class="r-amt f-adjust" type="text" inputmode="decimal"
          aria-label="Damage or healing amount" placeholder="—">
        <button type="button" class="r-side r-dmg" aria-label="Damage" @click="applyAdjustment('damage')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
          Dmg
        </button>
        <button type="button" class="r-side r-heal" @click="applyAdjustment('heal')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Heal
        </button>
      </div>
    </td>
    <td class="cell-conditions" data-label="Conditions">
      <CreatureTags :combat="combat" :creature="creature" field="conditions" />
    </td>
    <td class="cell-other" data-label="Other">
      <CreatureTags :combat="combat" :creature="creature" field="other" />
    </td>
    <td class="cell-actions" data-label="Actions">
      <div class="row-actions">
        <button type="button" class="btn-dupe" aria-label="Duplicate creature" title="Duplicate creature"
          @click="combat.duplicateCreature(creature.id)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" />
          </svg>
        </button>
        <button type="button" class="btn-remove" aria-label="Remove creature" title="Remove creature"
          @click="$emit('remove', creature.id, $event.currentTarget as HTMLElement)">×</button>
        <ActionMenu trigger-class="btn-menu" panel-class="row-menu" label="Creature actions"
          :items="[{ id: 'duplicate', label: 'Duplicate creature' }, { id: 'remove', label: 'Remove creature', danger: true }]"
          @select="rowAction">⋮</ActionMenu>
      </div>
    </td>
  </tr>
</template>
