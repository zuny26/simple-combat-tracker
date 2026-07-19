// turns.js — turn/round flow. The highlight follows the CREATURE via state.activeId,
// not a table position, so re-sorting never loses whose turn it is.

import { state } from './state.js';
import { initiativedRows } from './order.js';

// Index of the active creature within the current initiatived list (-1 if none/not found).
export function activeInitiativedIndex() {
  return initiativedRows(state.creatures).findIndex((c) => c.id === state.activeId);
}

// Start combat: Round -> 1, highlight the top initiatived row. No-op if none exist.
export function start() {
  const rows = initiativedRows(state.creatures);
  if (rows.length === 0) return; // stays pre-combat (Start / Round 0)
  state.round = 1;
  state.activeId = rows[0].id;
  state.started = true;
}

// Advance: move to the next initiatived creature down; wrapping past the last
// increments the Round. Skips blank-# rows (they aren't in the list); does NOT
// skip greyed (0-HP) rows. Reverts to pre-combat if the list is empty.
export function next() {
  const rows = initiativedRows(state.creatures);
  if (rows.length === 0) {
    revertToPreCombat();
    return;
  }
  const idx = rows.findIndex((c) => c.id === state.activeId);
  if (idx === -1) {
    // Active creature is no longer initiatived — resume from the top.
    state.activeId = rows[0].id;
    return;
  }
  if (idx === rows.length - 1) {
    state.activeId = rows[0].id;
    state.round += 1;
  } else {
    state.activeId = rows[idx + 1].id;
  }
}

// Revert to the pre-combat state (button "Start", Round 0, no highlight).
export function revertToPreCombat() {
  state.started = false;
  state.round = 0;
  state.activeId = null;
}

// Move the highlight after the active creature has LEFT the initiatived list
// (removed, or its # cleared). `oldIdx` is that creature's index in the list
// captured BEFORE it left. Picks the next row down, wraps to top if it was last,
// or reverts to pre-combat if nothing initiatived remains.
export function reassignActiveAfterLeaving(oldIdx) {
  if (!state.started) return;
  const remaining = initiativedRows(state.creatures); // active creature already gone
  if (remaining.length === 0) {
    revertToPreCombat();
    return;
  }
  if (oldIdx == null || oldIdx < 0) {
    state.activeId = remaining[0].id;
    return;
  }
  // The creature now sitting at oldIdx is the "next row down"; past the end wraps to top.
  state.activeId = (oldIdx >= remaining.length ? remaining[0] : remaining[oldIdx]).id;
}

// Safety net: if combat is running but no initiatived rows remain, revert.
export function maybeRevertToPreCombat() {
  if (state.started && initiativedRows(state.creatures).length === 0) {
    revertToPreCombat();
  }
}
