import { createApp } from 'vue';
import { createVueCombat } from './combat/vueCombat';
import { createBrowserStorage } from './combat/persistence';
import EncounterTracker from './ui/EncounterTracker.vue';

const combat = createVueCombat(createBrowserStorage());
createApp(EncounterTracker, { combat }).mount('#app');
