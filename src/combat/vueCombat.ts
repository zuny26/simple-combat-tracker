import { reactive, readonly } from 'vue';
import { createCombat } from './combat';

// Create once per app (or test), then share this instance with its UI.
export function createVueCombat() {
  const combat = createCombat(state => reactive(state));
  combat.state = readonly(combat.state);
  return combat;
}
