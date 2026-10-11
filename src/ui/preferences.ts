import { reactive, readonly } from 'vue';
import { THEMES } from './themes';
import type { EncounterStorage } from '../combat/persistence';

export interface Preferences {
  readonly state: {
    readonly helpDismissed: boolean;
    readonly theme: string;
  };
  selectTheme(id: string): void;
  setHelpDismissed(dismissed: boolean): void;
}

export function createPreferences(storage?: EncounterStorage): Preferences {
  function read(key: string) {
    try {
      return storage?.getItem(key);
    } catch {
      return null;
    }
  }
  const savedTheme = read('dnd-ct-theme');
  const state = reactive({
    helpDismissed: read('sct-usage-dismissed') === '1',
    theme: THEMES.find((theme) => theme.id === savedTheme)?.id ?? THEMES[0]!.id,
  });
  function selectTheme(id: string) {
    if (!THEMES.some((theme) => theme.id === id)) return;
    state.theme = id;
    try {
      storage?.setItem('dnd-ct-theme', id);
    } catch {
      /* Remain usable in memory. */
    }
  }
  function setHelpDismissed(dismissed: boolean) {
    state.helpDismissed = dismissed;
    try {
      storage?.setItem('sct-usage-dismissed', dismissed ? '1' : '0');
    } catch {
      /* Remain usable in memory. */
    }
  }
  return { state: readonly(state), selectTheme, setHelpDismissed };
}
