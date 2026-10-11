import { onBeforeUnmount } from 'vue';
import type { Combat, CreatureEdits } from '../combat/combat';

function editableField(event: FocusEvent): { id: number; field: keyof CreatureEdits } | undefined {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const field = input.dataset.combatField;
  if (
    field !== 'init' &&
    field !== 'name' &&
    field !== 'ac' &&
    field !== 'maxHP' &&
    field !== 'tempHP'
  )
    return;
  const rowId = input.closest('tr[data-id]')?.getAttribute('data-id');
  if (!rowId) return;
  const id = Number(rowId);
  if (!Number.isFinite(id)) return;
  return { id, field };
}

export function useCombatEditGrouping(combat: Combat) {
  // Capture focus/blur on the table so grouping finishes before row blur handlers sort.
  function focus(event: FocusEvent) {
    const edit = editableField(event);
    if (edit) combat.beginEdit(edit.id, edit.field);
  }

  function blur(event: FocusEvent) {
    if (editableField(event)) combat.endEdit();
  }

  onBeforeUnmount(() => combat.endEdit());

  return { focus, blur };
}
