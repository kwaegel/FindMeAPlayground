// Application entry point.
// Initializes localStorage sync (hydrates store from stored state) before
// mounting so the first render already has the restored origin/radius/filters.
import { mount } from 'svelte';
import App from './App.svelte';
import { init as initLocalStorage } from './stores/localStorageSync.js';

// Hydrate store from localStorage before the app mounts.
initLocalStorage();

const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
