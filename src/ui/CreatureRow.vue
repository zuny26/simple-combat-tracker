<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import type { Combat, ReadonlyCreature } from '../combat/combat';
import CreatureTags from './CreatureTags.vue';
import ActionMenu from './ActionMenu.vue';
import BookmarkIcon from './BookmarkIcon.vue';
import DuplicateIcon from './DuplicateIcon.vue';
import type { ProfileRegistry } from '../profiles/profileRegistry';

const { combat, creature, profiles } = defineProps<{
  combat: Combat;
  creature: ReadonlyCreature;
  profiles: ProfileRegistry;
}>();
const bookmarkState = computed(() => profiles.bookmarkState(creature));
const bookmarkLabel = computed(
  () =>
    ({
      unsaved: 'Save profile',
      matching: 'Profile saved',
      different: 'Update profile',
    })[bookmarkState.value],
);
const emit = defineEmits<{
  'edit-finished': [event: FocusEvent];
  remove: [id: number, trigger: HTMLElement];
  bookmark: [id: number, trigger: HTMLElement];
}>();
function rowAction(action: string, trigger: HTMLElement) {
  if (action === 'bookmark') emit('bookmark', creature.id, trigger);
  else if (action === 'duplicate') combat.duplicateCreature(creature.id);
  else emit('remove', creature.id, trigger);
}
const health = computed(() => combat.hp(creature.id)!);
type HPField = 'maxHP' | 'tempHP';
const hpText = (value: number) => (value === 0 ? '' : String(value));
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
  watch(
    () => creature[field],
    (value) => {
      if (editingHP.value !== field) drafts[field] = hpText(value);
    },
  );
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
watch(
  () => combat.history.revision,
  () => {
    editingHP.value = null;
    drafts.maxHP = hpText(creature.maxHP);
    drafts.tempHP = hpText(creature.tempHP);
  },
);
function beginHP(field: HPField) {
  editingHP.value = field;
}
</script>

<template>
  <tr
    :data-id="creature.id"
    :class="{ active: combat.state.activeId === creature.id, downed: health.downed }"
  >
    <td class="cell-init" data-label="Init">
      <div class="init-wrap">
        <input
          class="f-init"
          data-combat-field="init"
          type="text"
          inputmode="decimal"
          aria-label="Initiative"
          placeholder="—"
          :value="creature.init"
          @input="editText('init', $event)"
          @blur="$emit('edit-finished', $event)"
        />
        <span class="turn-flag">TURN</span>
      </div>
    </td>
    <td class="cell-name" data-label="Name">
      <input
        class="f-name"
        data-combat-field="name"
        type="text"
        aria-label="Name"
        placeholder="—"
        :value="creature.name"
        @input="editText('name', $event)"
        @blur="$emit('edit-finished', $event)"
      />
    </td>
    <td class="cell-ac" data-label="AC">
      <div class="ac-wrap">
        <input
          class="f-ac"
          data-combat-field="ac"
          type="text"
          inputmode="numeric"
          aria-label="AC"
          placeholder="—"
          :value="creature.ac"
          @input="editText('ac', $event)"
        />
      </div>
    </td>
    <td class="cell-maxhp" data-label="Max HP">
      <input
        v-model="drafts.maxHP"
        class="f-maxhp"
        data-combat-field="maxHP"
        type="text"
        inputmode="decimal"
        aria-label="Max HP"
        placeholder="—"
        @focus="beginHP('maxHP')"
        @input="editHP('maxHP')"
        @blur="finishHP('maxHP')"
      />
    </td>
    <td class="cell-temphp" data-label="Temp HP">
      <input
        v-model="drafts.tempHP"
        class="f-temphp"
        data-combat-field="tempHP"
        type="text"
        inputmode="decimal"
        aria-label="Temp HP"
        placeholder="—"
        @focus="beginHP('tempHP')"
        @input="editHP('tempHP')"
        @blur="finishHP('tempHP')"
      />
    </td>
    <td class="cell-current" data-label="Current HP">
      <div
        class="hp-cell"
        :class="{ 'hp-unconfigured': !health.configured, 'hp-downed': health.downed }"
      >
        <template v-if="!health.configured">
          <div class="hp-track"></div>
        </template>
        <template v-else-if="health.downed">
          <div class="hp-track hp-track-downed"></div>
          <span class="hp-downed-tag">DOWNED</span>
        </template>
        <template v-else>
          <div class="hp-track hp-track-alive">
            <div
              class="hp-fill"
              :class="{ 'hp-fill-bloodied': health.bloodied }"
              :style="{ width: `${health.proportions.normal * 100}%` }"
            ></div>
            <div
              v-if="health.temporary > 0"
              class="hp-temp-seg"
              :style="{ width: `${health.proportions.temporary * 100}%` }"
            ></div>
          </div>
          <span class="hp-number"
            ><span :class="{ 'hp-cur-bloodied': health.bloodied }">{{ health.current }}</span
            ><span class="hp-max-of"> / {{ health.total }}</span></span
          >
        </template>
      </div>
    </td>
    <td class="cell-adjust" data-label="Damage / Heal">
      <div class="r-ctl">
        <input
          v-model="pendingAdjustment"
          class="r-amt f-adjust"
          type="text"
          inputmode="decimal"
          aria-label="Damage or healing amount"
          placeholder="—"
        />
        <button
          type="button"
          class="r-side r-dmg"
          aria-label="Damage"
          @click="applyAdjustment('damage')"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
          </svg>
          Dmg
        </button>
        <button type="button" class="r-side r-heal" @click="applyAdjustment('heal')">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
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
        <button
          type="button"
          class="row-action btn-bookmark"
          :data-bookmark-state="bookmarkState"
          :aria-label="bookmarkLabel"
          :title="bookmarkLabel"
          :disabled="!creature.name.trim()"
          @click="$emit('bookmark', creature.id, $event.currentTarget as HTMLElement)"
        >
          <BookmarkIcon :state="bookmarkState" />
        </button>
        <button
          type="button"
          class="row-action btn-dupe"
          aria-label="Duplicate creature"
          title="Duplicate creature"
          @click="combat.duplicateCreature(creature.id)"
        >
          <DuplicateIcon />
        </button>
        <button
          type="button"
          class="row-action btn-remove"
          aria-label="Remove creature"
          title="Remove creature"
          @click="$emit('remove', creature.id, $event.currentTarget as HTMLElement)"
        >
          <span class="remove-icon" aria-hidden="true">×</span>
        </button>
        <ActionMenu
          trigger-class="row-action btn-menu"
          panel-class="row-menu"
          label="Creature actions"
          :items="[
            { id: 'bookmark', label: bookmarkLabel, disabled: !creature.name.trim() },
            { id: 'duplicate', label: 'Duplicate creature' },
            { id: 'remove', label: 'Remove creature', danger: true },
          ]"
          @select="rowAction"
        >
          ⋮
          <template #item-icon="{ item }">
            <BookmarkIcon v-if="item.id === 'bookmark'" :state="bookmarkState" />
            <DuplicateIcon v-else-if="item.id === 'duplicate'" />
            <span v-else-if="item.id === 'remove'" class="remove-icon" aria-hidden="true">×</span>
          </template>
        </ActionMenu>
      </div>
    </td>
  </tr>
</template>
