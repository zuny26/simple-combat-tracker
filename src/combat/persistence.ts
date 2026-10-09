import { createCombat } from './combat';
import { initiative } from './rules';
import type {
  Combat,
  CombatInitialState,
  CombatState,
  Creature,
  ReadonlyCombatState,
} from './combat';

export interface EncounterStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

// Defer even access to localStorage: browsers may throw from its getter.
export function createBrowserStorage(): EncounterStorage {
  return {
    getItem: (key) => globalThis.localStorage.getItem(key),
    setItem: (key, value) => globalThis.localStorage.setItem(key, value),
  };
}

export const ENCOUNTER_KEY = 'dnd-combat-tracker-v1';

function snapshot(state: ReadonlyCombatState, nextId: number) {
  return {
    version: 1,
    nextId,
    round: state.round,
    activeId: state.activeId,
    started: state.started,
    creatures: state.creatures.map((creature) => ({
      id: creature.id,
      init: creature.init,
      name: creature.name,
      ac: creature.ac,
      maxHP: creature.maxHP,
      tempHP: creature.tempHP,
      damageTaken: creature.damageTaken,
      conditions: [...creature.conditions],
      other: [...creature.other],
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonnegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function tags(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  return value.every((tag) => {
    if (typeof tag !== 'string' || !tag || tag.trim() !== tag) return false;
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isCreature(value: unknown): value is Creature {
  return (
    isRecord(value) &&
    positiveInteger(value.id) &&
    typeof value.init === 'string' &&
    typeof value.name === 'string' &&
    typeof value.ac === 'string' &&
    nonnegativeNumber(value.maxHP) &&
    nonnegativeNumber(value.tempHP) &&
    nonnegativeNumber(value.damageTaken) &&
    value.damageTaken <= value.maxHP &&
    tags(value.conditions) &&
    tags(value.other)
  );
}

// Reject the entire snapshot rather than salvage an ambiguous encounter/turn.
function restore(value: unknown): CombatInitialState | undefined {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !positiveInteger(value.nextId) ||
    typeof value.started !== 'boolean' ||
    typeof value.round !== 'number' ||
    !Number.isSafeInteger(value.round) ||
    value.round < 0 ||
    !Array.isArray(value.creatures) ||
    !value.creatures.every(isCreature)
  )
    return;
  const nextId = value.nextId;
  const creatures = value.creatures;
  const ids = new Set(creatures.map((creature) => creature.id));
  if (ids.size !== creatures.length || ids.has(nextId)) return;
  const active = creatures.find((creature) => creature.id === value.activeId);
  if (value.started) {
    if (value.round < 1 || !active || initiative(active.init) === null) return;
  } else if (value.round !== 0 || value.activeId !== null) return;
  const clean = snapshot(
    { creatures, round: value.round, started: value.started, activeId: active?.id ?? null },
    value.nextId,
  );
  return {
    state: {
      creatures: clean.creatures,
      round: clean.round,
      started: clean.started,
      activeId: clean.activeId,
    },
    nextId: clean.nextId,
  };
}

export function createPersistedCombat(
  storage: EncounterStorage,
  observe: (state: CombatState) => CombatState = (state) => state,
): Combat {
  let initial: CombatInitialState | undefined;
  try {
    const saved = storage.getItem(ENCOUNTER_KEY);
    if (saved !== null) {
      initial = restore(JSON.parse(saved));
    }
  } catch {
    /* Storage failure leaves a fresh in-memory encounter. */
  }
  return createCombat(observe, {
    ...(initial ? { initial } : {}),
    onChange(state, nextId) {
      try {
        storage.setItem(ENCOUNTER_KEY, JSON.stringify(snapshot(state, nextId)));
      } catch {
        /* Combat actions remain usable when saving fails. */
      }
    },
  });
}
