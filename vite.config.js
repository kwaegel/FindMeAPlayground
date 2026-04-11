// Vite configuration for FindMeAPlayground.
// Plain Svelte + Vite SPA (no SvelteKit). Vitest is configured inline here
// so the test runner shares the same transform pipeline as the dev server.
//
// Svelte 5 ships separate browser and server builds. In a Vitest/jsdom
// environment (Node.js process), Node resolves 'svelte' to the server build
// by default. We must explicitly alias 'svelte' to the browser entry so that
// `mount()` is available. The resolve.conditions approach does not reliably
// override the package.json "exports" in all Vitest versions.
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [svelte()],

  test: {
    // jsdom gives tests a browser-like environment for DOM APIs and localStorage.
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    setupFiles: ['./tests/setup.js'],
    // svelteTesting plugin handles Svelte-specific test setup.
    plugins: [svelteTesting()],
    // Force browser builds of Svelte subpackages so mount() works in jsdom.
    // Svelte 5 ships separate browser (index-client.js) and server
    // (index-server.js) builds; Node.js picks up the server default.
    alias: [
      {
        find: /^svelte\/store$/,
        replacement: path.resolve(__dirname, 'node_modules/svelte/src/store/index-client.js'),
      },
      {
        find: /^svelte$/,
        replacement: path.resolve(__dirname, 'node_modules/svelte/src/index-client.js'),
      },
    ],
  },
});
