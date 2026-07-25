// state.js — single source of truth + localStorage persistence.
// Exports one mutable `state` object; every mutation elsewhere calls save().

const STORAGE_KEY = 'dnd-combat-tracker';

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

// Duplicate an existing creature. The copy keeps the source's Initiative, AC and
// Max HP, but enters fresh: full HP (damageTaken 0), no Temp HP, and cleared
// Conditions/Other. Its name is the source's base name with the next increasing
// number appended (Goblin -> Goblin 2 -> Goblin 3). The copy is spliced in right
// after the source so ties keep a stable, adjacent order once sorted. Returns the
// new creature, or null if the id is unknown.
export function duplicateCreature(id) {
  const i = state.creatures.findIndex((c) => c.id === id);
  if (i === -1) return null;
  const src = state.creatures[i];
  const copy = {
    id: state.nextId++,
    init: src.init,
    name: nextDuplicateName(src.name),
    ac: src.ac,
    maxHP: src.maxHP,
    tempHP: 0,        // duplicate enters without temporary HP
    damageTaken: 0,   // ...and at full Current HP
    conditions: '',   // cleared — a fresh copy carries no status
    other: '',        // cleared
  };
  state.creatures.splice(i + 1, 0, copy);
  return copy;
}

// Build the next name for a duplicate of `sourceName`. Strips any trailing number
// to find the base name, then appends one higher than the largest number already
// in use for that base (the un-numbered original counts as 1). A blank name stays
// blank — there's nothing to number.
function nextDuplicateName(sourceName) {
  const base = baseName(sourceName);
  if (base === '') return '';
  const key = base.toLowerCase();
  let max = 1; // the original itself occupies "1"
  for (const c of state.creatures) {
    if (baseName(c.name).toLowerCase() !== key) continue;
    max = Math.max(max, suffixNumber(c.name));
  }
  return `${base} ${max + 1}`;
}

// The name with any trailing " <number>" removed (trimmed). "Goblin 2" -> "Goblin".
function baseName(name) {
  const m = String(name == null ? '' : name).match(/^(.*?)\s+\d+\s*$/);
  return (m ? m[1] : String(name == null ? '' : name)).trim();
}

// The trailing number on a name, or 1 when there isn't one. "Goblin 2" -> 2.
function suffixNumber(name) {
  const m = String(name == null ? '' : name).match(/\s+(\d+)\s*$/);
  return m ? Number(m[1]) : 1;
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
