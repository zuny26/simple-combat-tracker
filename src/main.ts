import { createApp } from 'vue';
import { createVueCombat } from './combat/vueCombat';
import { createBrowserStorage } from './combat/persistence';
import EncounterTracker from './ui/EncounterTracker.vue';
import './ui/styles.css';
import { createProfileRegistry } from './profiles/profileRegistry';

const storage = createBrowserStorage();
const combat = createVueCombat(storage);
const profiles = createProfileRegistry(storage);
createApp(EncounterTracker, { combat, profiles, preferenceStorage: storage }).mount('#app');
