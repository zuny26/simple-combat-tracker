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
    conditions: [], // status conditions — a string[] of tags (see tags.js / the helpers below)
    other: [],      // freeform notes — same string[] tag model, no predefined list
  };
}

// True when a creature is still at its just-made defaults — every editable field
// blank/zero (id is ignored). Used to skip the "Remove?" confirm for throwaway rows.
export function isEmptyCreature(c) {
  if (!c) return false;
  return (
    c.init === '' &&
    c.name === '' &&
    c.ac === '' &&
    toNum(c.maxHP) === 0 &&
    toNum(c.tempHP) === 0 &&
    toNum(c.damageTaken) === 0 &&
    (c.conditions == null || c.conditions.length === 0) && // [] (or a legacy '') = no status
    (c.other == null || c.other.length === 0)              // ...same for freeform notes
  );
}

// ---- Tags: the array fields (`conditions`, `other`) edited as pills ----
// Both share one model — a string[] of trimmed, case-insensitively unique tags — so
// the helpers take the field name. Each mutation calls save() like every other field.

// Case-insensitive membership test on a creature's tag field.
export function hasTag(c, field, name) {
  const key = String(name).toLowerCase();
  return Array.isArray(c[field]) && c[field].some((x) => x.toLowerCase() === key);
}

// Add a trimmed tag, ignoring blanks and case-insensitive duplicates.
export function addTag(id, field, name) {
  const c = state.creatures.find((x) => x.id === id);
  if (!c) return;
  const clean = String(name).trim();
  if (clean && !hasTag(c, field, clean)) c[field].push(clean);
  save();
}

// Remove a tag by name (case-insensitive).
export function removeTag(id, field, name) {
  const c = state.creatures.find((x) => x.id === id);
  if (!c) return;
  const key = String(name).toLowerCase();
  c[field] = c[field].filter((x) => x.toLowerCase() !== key);
  save();
}

// Remove if present, add if absent.
export function toggleTag(id, field, name) {
  const c = state.creatures.find((x) => x.id === id);
  if (!c) return;
  if (hasTag(c, field, name)) removeTag(id, field, name);
  else addTag(id, field, name);
}

export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable/full — keep running in-memory rather than crashing.
  }
}

// Restore persisted state into `state`. Corrupt/partial data falls back to
// sensible defaults so the app can never be bricked by a bad blob.
export function load() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return;

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
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
    conditions: [],   // cleared — a fresh copy carries no status
    other: [],        // cleared
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
    // Both tag fields normalize to a string[]. Conditions came from a comma-separated
    // string, so a legacy string is split; Other was one freeform note, so it stays
    // whole (splitting would mangle a note that contains commas).
    conditions: normalizeTags(c.conditions, true),
    other: normalizeTags(c.other, false),
  };
}

// Coerce a tag field to a string[] of trimmed, non-empty values. Arrays pass through;
// a legacy string is split on commas when `split`, otherwise kept as a single tag;
// anything else becomes an empty list.
function normalizeTags(v, split) {
  const parts = Array.isArray(v)
    ? v.map((x) => String(x))
    : typeof v === 'string'
      ? (split ? v.split(',') : [v])
      : [];
  return parts.map((x) => x.trim()).filter((x) => x !== '');
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
