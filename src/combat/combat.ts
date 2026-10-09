import { displayOrder, duplicateName, hp, initiative, turnOrder } from './rules';

export interface Creature {
  id: number;
  init: string;
  name: string;
  ac: string;
  maxHP: number;
  tempHP: number;
  damageTaken: number;
  conditions: string[];
  other: string[];
}

export interface CombatState {
  creatures: Creature[];
  round: number;
  activeId: number | null;
  started: boolean;
}

export type ReadonlyCreature = Readonly<Omit<Creature, 'conditions' | 'other'>> & {
  readonly conditions: readonly string[];
  readonly other: readonly string[];
};
export type ReadonlyCombatState = Readonly<Omit<CombatState, 'creatures'>> & {
  readonly creatures: readonly ReadonlyCreature[];
};
export type CreatureEdits = Partial<Pick<Creature, 'init' | 'name' | 'ac' | 'maxHP' | 'tempHP'>>;

export interface Combat {
  readonly state: ReadonlyCombatState;
  readonly displayOrder: readonly ReadonlyCreature[];
  addCreature(): number;
  editCreature(id: number, edits: CreatureEdits): void;
  duplicateCreature(id: number): number | null;
  removeCreature(id: number): void;
  addTag(id: number, field: 'conditions' | 'other', value: string): void;
  removeTag(id: number, field: 'conditions' | 'other', value: string): void;
  hp(id: number): { current: number; configured: boolean; downed: boolean } | null;
  damage(id: number, amount: number): void;
  heal(id: number, amount: number): void;
  start(): void;
  next(): void;
  reset(): void;
  isEmptyCreature(id: number): boolean;
  hasMeaningfulData(): boolean;
}

export interface CombatInitialState {
  state: CombatState;
  nextId: number;
}

export interface CombatOptions {
  initial?: CombatInitialState;
  onChange?: (state: ReadonlyCombatState, nextId: number) => void;
}

// The observer wraps fresh owned state; the default needs no framework or globals.
export function createCombat(
  observe: (value: CombatState) => CombatState = (value) => value,
  options: CombatOptions = {},
): Combat {
  const state = observe(
    options.initial
      ? structuredClone(options.initial.state)
      : { creatures: [], round: 0, activeId: null, started: false },
  );
  let nextId = options.initial?.nextId ?? 1;
  const allocatedIds = new Set(state.creatures.map((creature) => creature.id));
  const allocateId = () => {
    const id = nextId;
    allocatedIds.add(id);
    do {
      nextId = nextId === Number.MAX_SAFE_INTEGER ? 1 : nextId + 1;
    } while (allocatedIds.has(nextId));
    return id;
  };
  // Actions notify only after completing their state changes and invariants.
  const changed = () => options.onChange?.(state, nextId);
  const find = (id: number) => state.creatures.find((creature) => creature.id === id);
  const isEmptyCreature = (id: number) => {
    const creature = find(id);
    return (
      !!creature &&
      creature.init === '' &&
      creature.name === '' &&
      creature.ac === '' &&
      creature.maxHP === 0 &&
      creature.tempHP === 0 &&
      creature.damageTaken === 0 &&
      creature.conditions.length === 0 &&
      creature.other.length === 0
    );
  };

  const preCombat = () => {
    state.round = 0;
    state.activeId = null;
    state.started = false;
  };
  const reassign = (previousIndex: number) => {
    const order = turnOrder(state.creatures);
    const successor = order[previousIndex] ?? order[0];
    if (!successor) preCombat();
    else state.activeId = successor.id;
  };

  return {
    state: state as ReadonlyCombatState,
    get displayOrder() {
      return displayOrder(state.creatures);
    },
    addCreature() {
      const id = allocateId();
      state.creatures.push({
        id,
        init: '',
        name: '',
        ac: '',
        maxHP: 0,
        tempHP: 0,
        damageTaken: 0,
        conditions: [],
        other: [],
      });
      changed();
      return id;
    },
    editCreature(id: number, edits: CreatureEdits) {
      const creature = find(id);
      if (!creature) return;
      const previousIndex = turnOrder(state.creatures).findIndex((entry) => entry.id === id);
      let edited = false;
      for (const field of ['init', 'name', 'ac'] as const) {
        const value = edits[field];
        if (value !== undefined && value !== creature[field]) {
          creature[field] = value;
          edited = true;
        }
      }
      for (const field of ['maxHP', 'tempHP'] as const) {
        const value = edits[field];
        if (value !== undefined && Number.isFinite(value)) {
          const clamped = Math.max(0, value);
          if (clamped !== creature[field]) {
            creature[field] = clamped;
            edited = true;
          }
        }
      }
      if (!edited) return;
      creature.damageTaken = Math.min(creature.damageTaken, creature.maxHP);
      if (state.activeId === id && initiative(creature.init) === null) reassign(previousIndex);
      changed();
    },
    duplicateCreature(id: number) {
      const source = find(id);
      if (!source) return null;
      const copy: Creature = {
        ...source,
        id: allocateId(),
        name: duplicateName(source.name, state.creatures),
        damageTaken: 0,
        tempHP: 0,
        conditions: [],
        other: [],
      };
      state.creatures.splice(state.creatures.indexOf(source) + 1, 0, copy);
      changed();
      return copy.id;
    },
    addTag(id: number, field: 'conditions' | 'other', value: string) {
      const creature = find(id);
      const clean = value.trim();
      if (
        creature &&
        clean &&
        !creature[field].some((tag) => tag.toLowerCase() === clean.toLowerCase())
      ) {
        creature[field].push(clean);
        changed();
      }
    },
    removeTag(id: number, field: 'conditions' | 'other', value: string) {
      const creature = find(id);
      if (!creature) return;
      const key = value.trim().toLowerCase();
      const remaining = creature[field].filter((tag) => tag.toLowerCase() !== key);
      if (remaining.length === creature[field].length) return;
      creature[field] = remaining;
      changed();
    },
    reset() {
      if (state.creatures.length === 0 && !state.started) return;
      state.creatures = [];
      preCombat();
      changed();
    },
    hp(id: number) {
      const creature = find(id);
      return creature ? hp(creature) : null;
    },
    damage(id: number, amount: number) {
      const creature = find(id);
      if (!creature || !Number.isFinite(amount) || amount <= 0) return;
      const absorbed = Math.min(creature.tempHP, amount);
      const remaining = amount - absorbed;
      const damageTaken = Math.min(creature.maxHP, creature.damageTaken + remaining);
      const tempHP = creature.tempHP - absorbed;
      if (tempHP === creature.tempHP && damageTaken === creature.damageTaken) return;
      creature.tempHP = tempHP;
      creature.damageTaken = damageTaken;
      changed();
    },
    heal(id: number, amount: number) {
      const creature = find(id);
      if (!creature || !Number.isFinite(amount) || amount <= 0) return;
      const damageTaken = Math.max(0, creature.damageTaken - amount);
      if (damageTaken === creature.damageTaken) return;
      creature.damageTaken = damageTaken;
      changed();
    },
    removeCreature(id: number) {
      if (!find(id)) return;
      const previousIndex = turnOrder(state.creatures).findIndex((creature) => creature.id === id);
      state.creatures = state.creatures.filter((creature) => creature.id !== id);
      if (state.activeId === id) reassign(previousIndex);
      changed();
    },
    start() {
      const first = turnOrder(state.creatures)[0];
      if (!first || (state.started && state.round === 1 && state.activeId === first.id)) return;
      state.round = 1;
      state.activeId = first.id;
      state.started = true;
      changed();
    },
    next() {
      if (!state.started) return;
      const order = turnOrder(state.creatures);
      const index = order.findIndex((creature) => creature.id === state.activeId);
      const following = order[(index + 1) % order.length];
      if (!following) return;
      const round =
        index === order.length - 1
          ? Math.min(Number.MAX_SAFE_INTEGER, state.round + 1)
          : state.round;
      if (state.activeId === following.id && state.round === round) return;
      state.activeId = following.id;
      state.round = round;
      changed();
    },
    isEmptyCreature,
    hasMeaningfulData: () =>
      state.started || state.creatures.some((creature) => !isEmptyCreature(creature.id)),
  };
}
