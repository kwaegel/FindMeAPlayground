// Application entry point.
// Hydrates the store from localStorage BEFORE mounting so the first render
// already sees the restored origin/radius/filters — no flash of default state.
import { mount } from 'svelte';
import App from './App.svelte';
import { init as initLocalStorage } from './stores/localStorageSync.js';

// Async IIFE so we can await initLocalStorage() before mount().
// init() awaits only setRadius() internally (no Overpass call at this point
// because origin is still null), so the delay before mount is imperceptible.
//
// The try/catch ensures mount() always runs even if initLocalStorage() throws
// unexpectedly — the user sees the app (without restored state) rather than a
// silent blank page from an unhandled rejection.
(async () => {
  try {
    await initLocalStorage();
  } catch (err) {
    // localStorage hydration failed. The app still works — user just starts
    // from a clean state rather than having their previous search restored.
    console.error('[main] localStorage init failed, starting fresh:', err);
  }
  mount(App, { target: document.getElementById('app') });
})();
