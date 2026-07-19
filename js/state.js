// state.js — single source of truth + localStorage persistence.
// Exports one mutable `state` object; every mutation elsewhere calls save().

const STORAGE_KEY = 'dnd-initiative-tracker';

export const state = {
  creatures: [], // array of creature objects (see makeCreature)
  round: 0,      // 0 = pre-combat
  activeId: null, // id of the creature whose turn it is, or null
  started: false, // false => button "Start", true => "Next"
  nextId: 1,      // monotonic id source
};

// A fresh, empty creature. `init` blank = parked at the bottom until entered.
export function makeCreature() {
  return {
    id: state.nextId++,
    init: '',
    name: '',
    ac: '',
    maxHP: 0,
    tempHP: 0,
    damageTaken: 0, // running accumulator, kept in [0, maxHP] by hp.js
    conditions: '',
    other: '',
  };
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // Storage unavailable/full — keep running in-memory rather than crashing.
  }
}

// Restore persisted state into `state`. Corrupt/partial data falls back to
// sensible defaults so the app can never be bricked by a bad blob.
export function load() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    raw = null;
  }
  if (!raw) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return; // keep default empty pre-combat state
  }
  if (!data || typeof data !== 'object') return;

  state.creatures = Array.isArray(data.creatures)
    ? data.creatures.map(normalizeCreature)
    : [];

  // Backfill any missing ids and derive a safe nextId.
  let maxId = 0;
  for (const c of state.creatures) {
    if (Number.isFinite(c.id)) maxId = Math.max(maxId, c.id);
  }
  for (const c of state.creatures) {
    if (!Number.isFinite(c.id)) c.id = ++maxId;
  }
  state.nextId = Number.isFinite(data.nextId) && data.nextId > maxId
    ? data.nextId
    : maxId + 1;

  state.round = Number.isFinite(data.round) ? data.round : 0;
  state.started = !!data.started;

  // Keep activeId only if it still points at an existing creature.
  const activeExists = state.creatures.some((c) => c.id === data.activeId);
  state.activeId = activeExists ? data.activeId : null;
  if (state.started && state.activeId == null) {
    // "started" with no valid highlight is inconsistent => revert to pre-combat.
    state.started = false;
    state.round = 0;
  }
}

// Clear everything back to the pre-combat state and persist.
export function resetState() {
  state.creatures = [];
  state.round = 0;
  state.activeId = null;
  state.started = false;
  state.nextId = 1;
  save();
}

function normalizeCreature(c) {
  c = c || {};
  return {
    id: c.id,
    init: c.init == null ? '' : String(c.init),
    name: c.name == null ? '' : String(c.name),
    ac: c.ac == null ? '' : String(c.ac),
    maxHP: toNum(c.maxHP),
    tempHP: toNum(c.tempHP),
    damageTaken: toNum(c.damageTaken),
    conditions: c.conditions == null ? '' : String(c.conditions),
    other: c.other == null ? '' : String(c.other),
  };
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
