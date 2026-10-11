import { reactive, readonly } from 'vue';
import { createCombat } from './combat';
import { createPersistedCombat } from './persistence';
import type { EncounterStorage } from './persistence';
import type { Combat, CombatObserver } from './combat';

// Create once per app (or test), then share this instance with its UI.
export function createVueCombat(storage?: EncounterStorage): Combat {
  const observe: CombatObserver = (value) => reactive(value) as typeof value;
  const combat = storage ? createPersistedCombat(storage, observe) : createCombat(observe);
  return {
    ...combat,
    state: readonly(combat.state),
    history: readonly(combat.history),
    get displayOrder() {
      return combat.displayOrder;
    },
  };
}
