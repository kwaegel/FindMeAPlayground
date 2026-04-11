// Application entry point.
// Hydrates the store from localStorage BEFORE mounting so the first render
// already sees the restored origin/radius/filters — no flash of default state.
import { mount } from 'svelte';
import App from './App.svelte';
import { init as initLocalStorage } from './stores/localStorageSync.js';

// Async IIFE so we can await initLocalStorage() before mount().
// init() awaits only setRadius() internally (no Overpass call at this point
// because origin is still null), so the delay before mount is imperceptible.
(async () => {
  await initLocalStorage();
  mount(App, { target: document.getElementById('app') });
})();
