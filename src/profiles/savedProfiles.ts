import { reactive, readonly } from 'vue';
import type { EncounterStorage } from '../combat/persistence';

export const PROFILES_KEY = 'dnd-saved-profiles-v1';

export interface SavedProfile {
  readonly name: string;
  readonly ac: string;
  readonly maxHP: number;
}

export type BookmarkState = 'unsaved' | 'matching' | 'different';

export interface SavedProfiles {
  readonly state: { readonly profiles: readonly SavedProfile[] };
  bookmarkState(creature: SavedProfile): BookmarkState;
  save(creature: SavedProfile): void;
}

function displayName(name: string): string {
  return name
    .trim()
    .replace(/\s+\d+$/, '')
    .trim();
}

function identity(name: string): string {
  return displayName(name).toLowerCase();
}

// Stored names are already bases: normalizing them again could remove a second
// suffix (saving "Goblin 2 3" produces the valid base "Goblin 2").

export function createSavedProfiles(storage?: EncounterStorage): SavedProfiles {
  function load(): SavedProfile[] {
    try {
      const saved = storage?.getItem(PROFILES_KEY);
      if (!saved) return [];
      const data = JSON.parse(saved);
      if (data.version !== 1 || !Array.isArray(data.profiles)) return [];
      const identities = new Set<string>();
      for (const profile of data.profiles) {
        if (
          !profile ||
          typeof profile.name !== 'string' ||
          !profile.name ||
          profile.name !== profile.name.trim() ||
          typeof profile.ac !== 'string' ||
          typeof profile.maxHP !== 'number' ||
          !Number.isFinite(profile.maxHP) ||
          profile.maxHP < 0 ||
          identities.has(profile.name.toLowerCase())
        )
          return [];
        identities.add(profile.name.toLowerCase());
      }
      return data.profiles.map((profile: SavedProfile) => ({
        name: profile.name,
        ac: profile.ac,
        maxHP: profile.maxHP,
      }));
    } catch {
      return [];
    }
  }
  const state = reactive({ profiles: load() });
  function bookmarkState(creature: SavedProfile): BookmarkState {
    const profile = state.profiles.find(
      (profile) => profile.name.toLowerCase() === identity(creature.name),
    );
    if (!profile) return 'unsaved';
    return profile.ac === creature.ac && profile.maxHP === creature.maxHP
      ? 'matching'
      : 'different';
  }
  function save(creature: SavedProfile) {
    const name = displayName(creature.name);
    if (!name || bookmarkState(creature) !== 'unsaved') return;
    state.profiles.push({ name, ac: creature.ac, maxHP: creature.maxHP });
    try {
      storage?.setItem(PROFILES_KEY, JSON.stringify({ version: 1, profiles: state.profiles }));
    } catch {
      /* Remain usable in memory. */
    }
  }
  return { state: readonly(state), bookmarkState, save };
}
