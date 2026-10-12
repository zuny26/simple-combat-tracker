// @vitest-environment node
import { expect, it } from 'vitest';
import { createSavedProfiles, PROFILES_KEY } from '../../src/profiles/savedProfiles';
import { createBrowserStorage, createPersistedCombat } from '../../src/combat/persistence';

it('saves only reusable characteristics with a normalized display name without changing the creature', () => {
  const profiles = createSavedProfiles();
  const creature = {
    name: ' Goblin 2 ',
    ac: '13',
    maxHP: 7,
    init: '20',
    damageTaken: 3,
    tempHP: 2,
    conditions: ['Poisoned'],
    other: ['watch'],
  };
  const before = structuredClone(creature);
  expect(profiles.bookmarkState(creature)).toBe('unsaved');
  profiles.save(creature);
  expect(profiles.state.profiles).toEqual([{ name: 'Goblin', ac: '13', maxHP: 7 }]);
  expect(profiles.bookmarkState(creature)).toBe('matching');
  expect(creature).toEqual(before);
});

const validProfile = { name: 'Goblin', ac: '13', maxHP: 7 };
it.each([
  '{',
  'null',
  '{}',
  JSON.stringify({ version: 2, profiles: [validProfile] }),
  JSON.stringify({ version: 1, profiles: {} }),
  ...[
    null,
    {},
    { ...validProfile, name: '' },
    { ...validProfile, name: ' Goblin ' },
    { ...validProfile, name: 5 },
    { ...validProfile, ac: 13 },
    { ...validProfile, maxHP: -1 },
    { ...validProfile, maxHP: '7' },
    { ...validProfile, maxHP: null },
  ].map((profile) => JSON.stringify({ version: 1, profiles: [profile] })),
  '{"version":1,"profiles":[{"name":"Goblin","ac":"13","maxHP":1e400}]}',
  JSON.stringify({ version: 1, profiles: [validProfile, { ...validProfile, name: 'goblin' }] }),
])('recovers malformed profile storage %s and can save again', (saved) => {
  const storage = memoryStorage();
  storage.setItem(PROFILES_KEY, saved);
  const profiles = createSavedProfiles(storage);
  expect(profiles.state.profiles).toEqual([]);
  profiles.save(validProfile);
  expect(createSavedProfiles(storage).state.profiles).toEqual([validProfile]);
});

it.each(['read', 'write', 'both'])(
  'keeps profiles and combat usable when storage fails on %s',
  (failure) => {
    const memory = memoryStorage();
    let failing = true;
    const storage = {
      getItem(key: string) {
        if (failing && failure !== 'write') throw new Error('blocked read');
        return memory.getItem(key);
      },
      setItem(key: string, value: string) {
        if (failing && failure !== 'read') throw new Error('quota exceeded');
        memory.setItem(key, value);
      },
    };
    const profiles = createSavedProfiles(storage);
    const combat = createPersistedCombat(storage);
    const id = combat.addCreature();
    combat.editCreature(id, { name: 'Goblin', maxHP: 7 });
    combat.damage(id, 2);
    profiles.save(validProfile);
    expect(profiles.bookmarkState(validProfile)).toBe('matching');
    expect(combat.hp(id)?.current).toBe(5);
    failing = false;
    profiles.save({ name: 'Orc', ac: '', maxHP: 0 });
    expect(createSavedProfiles(storage).state.profiles).toEqual([
      validProfile,
      { name: 'Orc', ac: '', maxHP: 0 },
    ]);
  },
);

it('defers browser storage access and remains usable when its getter is unavailable', () => {
  const profiles = createSavedProfiles(createBrowserStorage());
  profiles.save(validProfile);
  expect(profiles.bookmarkState(validProfile)).toBe('matching');
});

it('strips unknown stored characteristics before saving profiles again', () => {
  const storage = memoryStorage();
  storage.setItem(
    PROFILES_KEY,
    JSON.stringify({ version: 1, profiles: [{ ...validProfile, init: '20', tempHP: 4 }] }),
  );
  const profiles = createSavedProfiles(storage);
  expect(profiles.state.profiles).toEqual([validProfile]);
  profiles.save({ name: 'Orc', ac: '', maxHP: 0 });
  expect(JSON.parse(storage.getItem(PROFILES_KEY)!).profiles[0]).toEqual(validProfile);
});

it('shares identity across manual names and ignores encounter-only changes', () => {
  const profiles = createSavedProfiles();
  profiles.save({ name: 'Goblin', ac: '13', maxHP: 7 });
  for (const name of ['Goblin', 'goblin', ' Goblin ', 'Goblin 2', ' gObLiN\t003 ']) {
    const creature = { name, ac: '13', maxHP: 7, init: '4', damageTaken: 7, tempHP: 8 };
    expect(profiles.bookmarkState(creature)).toBe('matching');
    profiles.save(creature);
  }
  expect(profiles.state.profiles).toEqual([{ name: 'Goblin', ac: '13', maxHP: 7 }]);
  profiles.save({ name: ' R2D2 ', ac: '', maxHP: 0 });
  expect(profiles.state.profiles[1]?.name).toBe('R2D2');
  expect(profiles.bookmarkState({ name: 'R2D', ac: '', maxHP: 0 })).toBe('unsaved');
  profiles.save({ name: '   ', ac: '10', maxHP: 5 });
  expect(profiles.state.profiles).toHaveLength(2);
});

it('tracks changed names, AC and Total HP while preserving existing profiles on conflicting saves', () => {
  const profiles = createSavedProfiles();
  const creature = { name: 'Goblin', ac: '13', maxHP: 7 };
  profiles.save(creature);
  for (const change of [{ ac: '15' }, { maxHP: 12 }]) {
    const edited = { ...creature, ...change };
    expect(profiles.bookmarkState(edited)).toBe('different');
    profiles.save(edited);
    expect(profiles.state.profiles).toEqual([creature]);
  }
  expect(profiles.bookmarkState({ ...creature, name: 'Orc' })).toBe('unsaved');
  expect(profiles.bookmarkState(creature)).toBe('matching');
});

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

it('removes only one trailing number and retains that base identity after reload', () => {
  const storage = memoryStorage();
  const profiles = createSavedProfiles(storage);
  const creature = { name: ' Goblin 2 3 ', ac: '13', maxHP: 7 };
  profiles.save(creature);
  expect(profiles.state.profiles).toEqual([{ name: 'Goblin 2', ac: '13', maxHP: 7 }]);
  const restored = createSavedProfiles(storage);
  expect(restored.bookmarkState(creature)).toBe('matching');
  restored.save({ ...creature, name: ' goblin 2 4 ' });
  expect(restored.state.profiles).toHaveLength(1);
});

it('round trips profiles independently and does not write equivalent or conflicting saves', () => {
  const storage = memoryStorage();
  storage.setItem('dnd-combat-tracker-v1', 'encounter');
  storage.setItem('dnd-ct-theme', 'dark');
  const profiles = createSavedProfiles(storage);
  profiles.save({ name: ' Goblin 2 ', ac: '13', maxHP: 7 });
  const saved = storage.getItem(PROFILES_KEY)!;
  expect(JSON.parse(saved)).toEqual({
    version: 1,
    profiles: [{ name: 'Goblin', ac: '13', maxHP: 7 }],
  });
  const formatted = JSON.stringify(JSON.parse(saved), null, 2);
  storage.setItem(PROFILES_KEY, formatted);
  const restored = createSavedProfiles(storage);
  expect(restored.state.profiles).toEqual(profiles.state.profiles);
  restored.save({ name: ' goblin 3 ', ac: '13', maxHP: 7 });
  restored.save({ name: 'Goblin', ac: '15', maxHP: 12 });
  expect(storage.getItem(PROFILES_KEY)).toBe(formatted);
  expect(storage.getItem('dnd-combat-tracker-v1')).toBe('encounter');
  expect(storage.getItem('dnd-ct-theme')).toBe('dark');
});
