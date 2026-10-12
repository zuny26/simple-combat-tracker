import { createApp } from 'vue';
import { createVueCombat } from './combat/vueCombat';
import { createBrowserStorage } from './combat/persistence';
import EncounterTracker from './ui/EncounterTracker.vue';
import './ui/styles.css';
import { createSavedProfiles } from './profiles/savedProfiles';

const storage = createBrowserStorage();
const combat = createVueCombat(storage);
const profiles = createSavedProfiles(storage);
createApp(EncounterTracker, { combat, profiles, preferenceStorage: storage }).mount('#app');
