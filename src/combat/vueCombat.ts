import { reactive, readonly } from 'vue';
import { createCombat } from './combat';
import type { Combat } from './combat';

// Create once per app (or test), then share this instance with its UI.
export function createVueCombat(): Combat {
  const combat = createCombat(state => reactive(state));
  return {
    ...combat,
    state: readonly(combat.state),
    get displayOrder() { return combat.displayOrder; },
  };
}
