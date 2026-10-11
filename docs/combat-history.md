# Combat history

Undo and redo belong to the app-scoped combat instance in [combat.ts](../src/combat/combat.ts). History stores complete encounter snapshots in memory and retains up to 20 undoable actions. Each instance owns its history independently; creating an instance from a saved encounter starts with empty history.

## State and ownership

The combat module maintains four pieces of history state:

| State | Purpose |
| --- | --- |
| `past` | Snapshots available to undo; the newest is at the end. |
| `future` | Snapshots available to redo; the next to restore is at the end. |
| `previous` | A detached snapshot of the latest completed encounter state, used as the checkpoint for the next change. |
| `editing` | An optional creature/field group and a flag recording whether its checkpoint has already been added. |

Each snapshot contains all creatures, including their IDs, stored array order, editable values, damage, conditions, and notes, plus `round`, `activeId`, and `started`. Snapshots copy creature objects and tag arrays so later changes cannot mutate history. The copy is built from plain values because framework-observed objects cannot be passed directly to `structuredClone`.

Restoring a complete snapshot preserves an action's consequences together. Undoing damage restores both normal and temporary HP; undoing a Max HP change also restores any clamped damage. Undoing removal restores the creature with its original ID and position, together with the encounter's previous active creature and round. Start and turn advancement participate in the same history.

ID allocation remains outside snapshots. `nextId` and the set of allocated IDs are never rolled back, so undoing an addition does not make its ID available for a new creature. Redo restores the original creature ID from its snapshot.

## Recording a change

Named combat actions validate their inputs, apply their changes, and enforce encounter invariants before calling the internal `changed()` function. That function:

1. Pushes `previous` onto `past`, unless the current edit group already recorded its checkpoint.
2. Drops the oldest checkpoint if `past` exceeds 20 entries.
3. Clears `future`, discarding the abandoned redo branch.
4. Replaces `previous` with a snapshot of the completed state.
5. Updates history counts and calls `onChange(state, nextId)`.

Invalid or unchanged requests do not call `changed()`, consume history entries, clear redo, or notify persistence. An action can still end an edit group even if it produces no encounter change.

## Grouping field edits

Callers use `beginEdit(id, field)` and `endEdit()` to bracket repeated updates to one creature field. Beginning a group creates no history entry. Its first effective change records the state before that change; subsequent changes share that checkpoint while still updating `previous` and notifying persistence individually. Undo therefore restores the state before the entire group, and redo restores its final state.

Beginning a different creature/field group ends the previous group. Calling `beginEdit` again for the same active group leaves it intact. An edit targeting another creature or field ends the group, as do other mutating actions, undo, redo, and reset. Without an active group, each effective `editCreature` call records its own checkpoint.

## Undo and redo flow

Both operations use `restoreHistory(from, to)` with opposite stack directions:

| Operation | Source stack | Destination stack |
| --------- | ------------ | ----------------- |
| Undo      | `past`       | `future`          |
| Redo      | `future`     | `past`            |

The operation ends any edit group and pops the newest source snapshot. If the source is empty, it returns without changing encounter state or notifying persistence. Otherwise it pushes a snapshot of the current encounter onto the destination stack, clones the target, and assigns it into the existing state object. Keeping that root object preserves the observation established when the combat instance was created.

After restoration, the module refreshes `previous`, updates `undoCount` and `redoCount`, increments `history.revision`, and invokes `onChange`. The revision changes only after a successful undo or redo. Restorations bypass `changed()`, so they transfer checkpoints between stacks without recording a new action or clearing the remaining redo branch. Undo and redo redistribute the retained checkpoints; they do not increase their combined count.

For example, damage followed by turn advancement creates two checkpoints. One undo restores the turn before advancement while retaining the damage. A second undo restores the encounter before damage. Redo traverses those states in the opposite direction. Performing a new effective action after either undo clears all remaining redo checkpoints.

## Persistence and reset

[persistence.ts](../src/combat/persistence.ts) installs `onChange` to save the current encounter and ID allocator through injected storage. Undo and redo use that same callback, so their restored state survives reload. History stacks, grouping state, counts, and revision are excluded from the versioned storage format. Storage write failures leave the in-memory encounter and history usable.

`reset()` ends the current group and clears both stacks, even when the encounter is already empty. When encounter state changes, it establishes an empty pre-combat state, refreshes `previous`, and notifies persistence. It never records a reset checkpoint, so the old encounter cannot be recovered through undo or redo. Subsequent actions start a new history while retaining the instance's ID allocator.

The [Vue adapter](../src/combat/vueCombat.ts) supplies observation and read-only access to encounter state and history metadata. Snapshot management, grouping rules, and persistence notifications remain owned by the framework-independent combat module.

## Behavioral coverage

[History tests](../test/component/history.test.ts) cover complete restoration of combat actions, turn consequences, bounded history, edit grouping, ignored changes, redo branching, ID allocation, and reset. [Persistence tests](../test/component/persistence.test.ts) verify that restored encounter state is saved while newly loaded instances have fresh history.
