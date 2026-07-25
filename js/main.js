// main.js — bootstrap + event wiring. Uses event delegation on the table body so
// dynamically-added rows need no per-row listeners.

import { state, load, save, makeCreature, duplicateCreature, resetState } from './state.js';
import { clampDamage, applyDamage, applyHealing } from './hp.js';
import { parseInit, sortedRows } from './order.js';
import {
  start, next, maybeRevertToPreCombat,
  reassignActiveAfterLeaving, activeInitiativedIndex,
} from './turns.js';
import {
  renderTable, renderHighlight, updateHpCell, currentRowOrder, reorderRows,
} from './render.js';
import { loadTheme } from './theme.js';
import { initThemePicker } from './themePicker.js';
import { initUsageCallout } from './usage.js';

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
  } else if (hasClass(t, 'f-conditions')) {
    c.conditions = t.value;
  } else if (hasClass(t, 'f-other')) {
    c.other = t.value;
  } else {
    return; // f-damage / f-heal are action inputs — no model change on input
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

// ---- Enter applies Damage / Healing, then clears the action cell ----
function onKeyDown(e) {
  if (e.key !== 'Enter') return;
  const t = e.target;
  const id = rowIdFromEvent(e);
  if (id == null) return;
  const c = creatureById(id);
  if (!c) return;

  if (hasClass(t, 'f-damage')) {
    e.preventDefault();
    const n = toNum(t.value);
    if (n > 0) applyDamage(c, n);
    t.value = '';
    save();
    // In-place refresh (Current HP + the Temp HP damage just consumed). Deliberately
    // NOT a rebuild: that would destroy this field and break Tab out of it.
    updateHpCell(id);
  } else if (hasClass(t, 'f-heal')) {
    e.preventDefault();
    const n = toNum(t.value);
    if (n > 0) applyHealing(c, n);
    t.value = '';
    save();
    updateHpCell(id);
  }
}

// ---- Duplicate / remove a creature (delegated on the table body) ----
function onBodyClick(e) {
  const dupeBtn = e.target.closest && e.target.closest('.btn-dupe');
  if (dupeBtn) {
    const id = rowIdFromEvent(e);
    if (id == null) return;
    // Adds a copy right after the source; leaves round/turn state untouched (like Add).
    duplicateCreature(id);
    save();
    renderTable();
    return;
  }

  const btn = e.target.closest && e.target.closest('.btn-remove');
  if (!btn) return;
  const id = rowIdFromEvent(e);
  if (id == null) return;
  const c = creatureById(id);
  if (!c) return;

  const label = c.name ? `"${c.name}"` : 'this creature';
  if (!window.confirm(`Remove ${label}?`)) return;

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
  if (!window.confirm('Start a new combat? This clears all creatures and resets the round.')) return;
  resetState();
  renderTable();
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
  load();
  renderTable();
  wireEvents();
  initUsageCallout();
}

// Modules are deferred, so the DOM is ready — but guard just in case.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
