// main.js — bootstrap + event wiring. Uses event delegation on the table body so
// dynamically-added rows need no per-row listeners.

import {
  state, load, save, makeCreature, duplicateCreature, resetState, isEmptyCreature,
  removeTag,
} from './state.js';
import { clampDamage, applyDamage, applyHealing } from './hp.js';
import { parseInit, sortedRows } from './order.js';
import {
  start, next, maybeRevertToPreCombat,
  reassignActiveAfterLeaving, activeInitiativedIndex,
} from './turns.js';
import {
  renderTable, renderHighlight, updateHpCell, updateTagsCell,
  currentRowOrder, reorderRows, DUPE_ICON, TRASH_ICON,
} from './render.js';
import { openPicker } from './tags.js';
import { openRowMenu } from './rowMenu.js';
import { loadTheme } from './theme.js';
import { initThemePicker } from './themePicker.js';
import { initAppMenu } from './appMenu.js';
import { initUsageCallout } from './usage.js';
import { initConfirmDialog, askConfirm } from './confirmDialog.js';

// Index of the active creature's # captured when its # field gains focus, so that
// clearing that field mid-combat can move the highlight to the correct "next down".
let activeInitEditIdx = null;

// Guards against re-entrancy while rows are being moved (re-inserting a focused
// element fires focusout, which would otherwise re-enter this handler).
let rendering = false;

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function creatureById(id) {
  return state.creatures.find((c) => c.id === id);
}

function rowIdFromEvent(e) {
  const tr = e.target.closest && e.target.closest('tr[data-id]');
  return tr ? Number(tr.dataset.id) : null;
}

function hasClass(t, cls) {
  return t.classList && t.classList.contains(cls);
}

// ---- Live edits (input event: update model, persist; recompute HP where relevant) ----
function onInput(e) {
  const t = e.target;
  const id = rowIdFromEvent(e);
  if (id == null) return;
  const c = creatureById(id);
  if (!c) return;

  if (hasClass(t, 'f-init')) {
    c.init = t.value; // reorder deferred to blur (don't steal focus mid-typing)
  } else if (hasClass(t, 'f-name')) {
    c.name = t.value; // affects tie-break; reorder deferred to blur
  } else if (hasClass(t, 'f-ac')) {
    c.ac = t.value;
  } else if (hasClass(t, 'f-maxhp')) {
    c.maxHP = toNum(t.value);
    clampDamage(c);      // lowering Max re-clamps the accumulator
    updateHpCell(id);    // raising Max lifts Current HP immediately
  } else if (hasClass(t, 'f-temphp')) {
    c.tempHP = toNum(t.value);
    updateHpCell(id);
  } else {
    return; // f-adjust is an action input — no model change on input
  }
  save();
}

// ---- Capture the active creature's list index when its # field is focused ----
function onFocusIn(e) {
  if (!hasClass(e.target, 'f-init')) return;
  const id = rowIdFromEvent(e);
  activeInitEditIdx = (state.started && id === state.activeId)
    ? activeInitiativedIndex()
    : null;
}

// Re-sort only if the order actually changed, and keep Tab/click focus intact when it does.
function resortPreservingFocus(e) {
  const before = currentRowOrder();
  const after = sortedRows(state.creatures).map((c) => c.id);
  const unchanged = before.length === after.length && before.every((id, i) => id === after[i]);

  if (unchanged) {
    renderHighlight(); // nothing moves => focus is untouched
    return;
  }

  // The field Tab/click is moving to. reorderRows() only MOVES nodes, so this stays a
  // live element — and it is the same element the browser is about to focus, so
  // re-focusing it here can't fight the browser's own focus transition.
  const next = e.relatedTarget;

  rendering = true;
  reorderRows();
  renderHighlight();
  rendering = false;

  // Re-inserting a node blurs anything focused inside it; hand focus back.
  if (next && typeof next.focus === 'function' && document.activeElement !== next) {
    next.focus();
  }
}

// ---- Commit reorder on blur of # / Name ----
function onFocusOut(e) {
  if (rendering) return;
  const t = e.target;
  const id = rowIdFromEvent(e);
  if (id == null) return;
  const c = creatureById(id);
  if (!c) return;

  const isInit = hasClass(t, 'f-init');
  const isName = hasClass(t, 'f-name');
  if (!isInit && !isName) return; // other fields never reorder

  if (isInit) {
    const nowParked = parseInit(c.init) === null;
    const wasActive = state.started && state.activeId === c.id;
    if (wasActive && nowParked) {
      // Active creature left the turn order — move the highlight (next down / wrap / revert).
      reassignActiveAfterLeaving(activeInitEditIdx);
    } else {
      maybeRevertToPreCombat();
    }
    activeInitEditIdx = null;
    save();
  }
  resortPreservingFocus(e); // name is the tie-break, so it can reorder too
}

// ---- Damage / Heal: apply the row's pending amount, then clear the field ----
// Only the Dmg / Heal buttons apply the amount — typing it (including pressing Enter)
// never does. The refresh is in-place (updateHpCell) and deliberately NOT a rebuild:
// that would destroy the field the DM is typing in (or the button they just clicked)
// and break Tab out of the control.
function applyAdjust(c, input, kind) {
  const n = toNum(input.value);
  if (n > 0) {
    if (kind === 'heal') applyHealing(c, n);
    else applyDamage(c, n);
  }
  input.value = '';
  save();
  updateHpCell(c.id); // Current HP + any Temp HP the damage just consumed
}

// ---- Enter in the amount field does nothing ----
// Applying damage/healing is an explicit button click only, so a stray Enter while
// typing an amount can never take HP off the wrong creature.
function onKeyDown(e) {
  if (e.key !== 'Enter') return;
  if (!hasClass(e.target, 'f-adjust')) return;
  e.preventDefault();
}

// ---- Duplicate / remove a creature (delegated on the table body) ----
function onBodyClick(e) {
  // Dmg / Heal — both buttons read the one amount field sharing their pill.
  // This is the ONLY path into applyAdjust; Enter in the field is inert on purpose.
  const adjustBtn = e.target.closest && e.target.closest('.r-dmg, .r-heal');
  if (adjustBtn) {
    const id = rowIdFromEvent(e);
    if (id == null) return;
    const c = creatureById(id);
    if (!c) return;
    const input = adjustBtn.closest('.r-ctl').querySelector('.f-adjust');
    if (input) applyAdjust(c, input, adjustBtn.classList.contains('r-heal') ? 'heal' : 'damage');
    return;
  }

  // Remove one tag pill (the ✕ carries its field + value in data-field / data-tag).
  const tagX = e.target.closest && e.target.closest('.cond-x');
  if (tagX) {
    const id = rowIdFromEvent(e);
    if (id == null) return;
    removeTag(id, tagX.dataset.field, tagX.dataset.tag); // helper persists
    updateTagsCell(id, tagX.dataset.field);
    return;
  }

  // Open the tag picker (Conditions or Other) anchored under the + Add button.
  const tagAdd = e.target.closest && e.target.closest('.cond-add');
  if (tagAdd) {
    const id = rowIdFromEvent(e);
    if (id == null) return;
    openPicker(tagAdd.dataset.field, id, tagAdd);
    return;
  }

  const dupeBtn = e.target.closest && e.target.closest('.btn-dupe');
  if (dupeBtn) {
    const id = rowIdFromEvent(e);
    if (id == null) return;
    duplicateRow(id);
    return;
  }

  // The card layout's ⋮ — the same two actions as the buttons above, behind one tap.
  const menuBtn = e.target.closest && e.target.closest('.btn-menu');
  if (menuBtn) {
    const id = rowIdFromEvent(e);
    if (id == null) return;
    openRowMenu(menuBtn, [
      { label: 'Duplicate', icon: DUPE_ICON, run: () => duplicateRow(id) },
      { label: 'Remove', icon: TRASH_ICON, danger: true, run: () => removeRow(id) },
    ]);
    return;
  }

  const btn = e.target.closest && e.target.closest('.btn-remove');
  if (!btn) return;
  const id = rowIdFromEvent(e);
  if (id == null) return;
  removeRow(id);
}

// Adds a copy right after the source; leaves round/turn state untouched (like Add).
function duplicateRow(id) {
  duplicateCreature(id);
  save();
  renderTable();
}

function removeRow(id) {
  const c = creatureById(id);
  if (!c) return;

  const performRemove = () => {
    const wasActive = state.started && state.activeId === id;
    const oldIdx = wasActive ? activeInitiativedIndex() : null; // capture BEFORE removal

    const i = state.creatures.findIndex((x) => x.id === id);
    if (i !== -1) state.creatures.splice(i, 1);

    if (wasActive) {
      reassignActiveAfterLeaving(oldIdx);
    } else {
      maybeRevertToPreCombat();
    }
    save();
    renderTable();
  };

  // An untouched, all-default row is throwaway — remove it without a prompt.
  if (isEmptyCreature(c)) {
    performRemove();
    return;
  }
  const label = c.name ? `"${c.name}"` : 'this creature';
  askConfirm(`Remove ${label}?`, "This can't be undone.", 'Remove', performRemove);
}

// ---- Header / footer controls ----
function onStartNext() {
  if (!state.started) start();
  else next();
  save();
  renderHighlight();
}

function onAdd() {
  const c = makeCreature();
  state.creatures.push(c); // parks at the bottom until a # is entered
  save();
  renderTable();
  const input = document.querySelector(`tr[data-id="${c.id}"] .f-init`);
  if (input) input.focus();
}

function onReset() {
  // Nothing meaningful to lose — no dialog, no-op.
  if (state.creatures.length === 0 && !state.started) return;
  askConfirm(
    'Start a new combat?',
    "This clears every creature and resets the round counter. This can't be undone.",
    'Start new combat',
    () => {
      resetState();
      renderTable();
    },
  );
}

// ---- Wiring ----
function wireEvents() {
  const body = document.getElementById('creature-rows');
  body.addEventListener('input', onInput);
  body.addEventListener('focusin', onFocusIn);
  body.addEventListener('focusout', onFocusOut);
  body.addEventListener('keydown', onKeyDown);
  body.addEventListener('click', onBodyClick);

  document.getElementById('start-next-btn').addEventListener('click', onStartNext);
  document.getElementById('add-btn').addEventListener('click', onAdd);
  document.getElementById('reset-btn').addEventListener('click', onReset);
}

function init() {
  initThemePicker(loadTheme());
  initAppMenu();
  load();
  renderTable();
  wireEvents();
  initUsageCallout();
  initConfirmDialog();
}

// Modules are deferred, so the DOM is ready — but guard just in case.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
