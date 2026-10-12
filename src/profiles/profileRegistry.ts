import { reactive, readonly } from 'vue';
import { profileName as displayName, profileIdentity as identity } from './names';
import type { EncounterStorage } from '../combat/persistence';

export const PROFILES_KEY = 'dnd-saved-profiles-v1';

export interface SavedProfile {
  readonly name: string;
  readonly ac: string;
  readonly maxHP: number;
}

export type BookmarkState = 'unsaved' | 'matching' | 'different';

export interface ProfileRegistry {
  readonly state: { readonly profiles: ReadonlyMap<string, SavedProfile> };
  bookmarkState(creature: SavedProfile): BookmarkState;
  find(name: string): SavedProfile | undefined;
  matching(query: string): readonly SavedProfile[];
  save(creature: SavedProfile): void;
  overwrite(creature: SavedProfile): void;
  delete(name: string): void;
}

export function createProfileRegistry(storage?: EncounterStorage): ProfileRegistry {
  function load(): Map<string, SavedProfile> {
    try {
      const saved = storage?.getItem(PROFILES_KEY);
      if (!saved) return new Map();
      const data = JSON.parse(saved);
      if (data.version !== 1 || !Array.isArray(data.profiles)) return new Map();
      const profiles = new Map<string, SavedProfile>();
      for (const profile of data.profiles) {
        if (
          !profile ||
          typeof profile.name !== 'string' ||
          !profile.name ||
          profile.name !== profile.name.trim() ||
          typeof profile.ac !== 'string' ||
          typeof profile.maxHP !== 'number' ||
          !Number.isFinite(profile.maxHP) ||
          profile.maxHP < 0
        )
          return new Map();
        const name = displayName(profile.name);
        const key = identity(name);
        if (!name || profiles.has(key)) return new Map();
        profiles.set(key, { name, ac: profile.ac, maxHP: profile.maxHP });
      }
      return profiles;
    } catch {
      return new Map();
    }
  }
  const state = reactive({ profiles: load() });
  function find(name: string): SavedProfile | undefined {
    return readonly(state).profiles.get(identity(name));
  }
  function bookmarkState(creature: SavedProfile): BookmarkState {
    const profile = find(creature.name);
    if (!profile) return 'unsaved';
    return profile.ac === creature.ac && profile.maxHP === creature.maxHP
      ? 'matching'
      : 'different';
  }
  function save(creature: SavedProfile) {
    const name = displayName(creature.name);
    if (!name || bookmarkState(creature) !== 'unsaved') return;
    state.profiles.set(identity(name), { name, ac: creature.ac, maxHP: creature.maxHP });
    persist();
  }
  function overwrite(creature: SavedProfile) {
    const profile = find(creature.name);
    if (!profile || bookmarkState(creature) !== 'different') return;
    state.profiles.set(identity(creature.name), {
      name: profile.name,
      ac: creature.ac,
      maxHP: creature.maxHP,
    });
    persist();
  }
  function persist() {
    try {
      storage?.setItem(
        PROFILES_KEY,
        JSON.stringify({ version: 1, profiles: [...state.profiles.values()] }),
      );
    } catch {
      /* Remain usable in memory. */
    }
  }
  function deleteProfile(name: string) {
    if (state.profiles.delete(identity(name))) persist();
  }
  function matching(query: string): readonly SavedProfile[] {
    const key = identity(query);
    return [...readonly(state).profiles.values()].filter((profile) =>
      identity(profile.name).includes(key),
    );
  }
  return {
    state: readonly(state),
    find,
    matching,
    bookmarkState,
    save,
    overwrite,
    delete: deleteProfile,
  };
}
