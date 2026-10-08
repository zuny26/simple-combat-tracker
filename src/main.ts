import { createApp } from 'vue';
import { createVueCombat } from './combat/vueCombat';
import { createBrowserStorage } from './combat/persistence';
import EncounterTracker from './ui/EncounterTracker.vue';

const storage = createBrowserStorage();
const combat = createVueCombat(storage);
createApp(EncounterTracker, { combat, preferenceStorage: storage }).mount('#app');
