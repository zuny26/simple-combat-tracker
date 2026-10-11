import { computed, nextTick, ref } from 'vue';
import type { Combat } from '../combat/combat';

// Presentation order is transient: combat saves edits now, rows move on blur.
export function useDisplayedCreatureOrder(combat: Combat) {
  const rowIds = ref(combat.displayOrder.map((creature) => creature.id));
  const body = ref<HTMLTableSectionElement>();
  const rows = computed(() => {
    const creatures = new Map(combat.state.creatures.map((creature) => [creature.id, creature]));
    const remembered = new Set(rowIds.value);
    const ids = [
      ...rowIds.value,
      ...combat.state.creatures
        .filter((creature) => !remembered.has(creature.id))
        .map((creature) => creature.id),
    ];
    // Removed creatures (including a reset encounter) have no displayed row.
    return ids.flatMap((id) => {
      const creature = creatures.get(id);
      return creature ? [creature] : [];
    });
  });

  async function finishEdit(event: FocusEvent) {
    rowIds.value = combat.displayOrder.map((creature) => creature.id);
    // A keyed row move can blur the destination of Tab/click in Chromium.
    // Restore that destination only if the patch left focus on the document body.
    const destination = event.relatedTarget;
    await nextTick();
    if (
      destination instanceof HTMLElement &&
      destination.isConnected &&
      document.activeElement === document.body
    )
      destination.focus();
  }

  async function addCreature() {
    const id = combat.addCreature();
    await nextTick();
    body.value?.querySelector<HTMLInputElement>(`tr[data-id="${id}"] .f-init`)?.focus();
  }

  return { rows, body, finishEdit, addCreature };
}
