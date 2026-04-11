# FindMeAPlayground

A responsive web app that helps parents find playgrounds and parks near any US address. Enter an address (or use GPS), pick a search radius, and get a distance-sorted list with a live map — plus driving-time estimates for each result.

Built with Svelte + Vite, hosted on Cloudflare Pages, and powered entirely by the OpenStreetMap ecosystem (no paid map tiles).

---

## Running locally for browser testing

There are two ways to run the app locally. Use **Option A** for front-end-only work (no travel times). Use **Option B** when you need travel times to work end-to-end.

### Option A — Vite dev server (no travel times)

This starts the frontend only. Geocoding and park search work normally. Travel times will silently fail because the `/api/travel-times` proxy is not running.

```bash
npm install          # first time only
npm run dev
```

Open <http://localhost:5173> in your browser.

Hot-reload is active — edits to `.svelte` files and JavaScript modules reflect instantly without a page refresh.

### Option B — Wrangler Pages dev (full stack, travel times included)

This simulates the full Cloudflare Pages + Workers environment locally, so the `/api/travel-times` proxy runs and driving times appear in results.

**Prerequisites:**

- Node.js 18 or later
- An [OpenRouteService API key](https://openrouteservice.org/dev/#/signup) (free tier — 2,500 requests/day)

**Steps:**

1. Install dependencies:
   
   ```bash
   npm install
   ```

2. Build the frontend:
   
   ```bash
   npm run build
   ```

3. Create a `.dev.vars` file in the project root with your ORS key:
   
   ```
   ORS_API_KEY=your_ors_api_key_here
   ```
   
   This file is gitignored. Never commit it.

4. Start the Wrangler dev server:
   
   ```bash
   npx wrangler pages dev dist --compatibility-date=2024-01-01
   ```

5. Open the URL printed by Wrangler (typically <http://localhost:8788>).

> **Tip:** Wrangler reads `.dev.vars` automatically as environment secrets. The `ORS_API_KEY` value is injected into the Worker function the same way it would be in production.

> **Note:** Option B requires rebuilding (`npm run build`) after each code change. For rapid UI iteration, use Option A and test travel times separately.

---

## Running tests

```bash
npm test
```

Runs the full Vitest suite (unit + component tests). All tests mock external APIs — no network calls are made.

```bash
npm run test:watch
```

Runs Vitest in watch mode, re-running affected tests on file save.

---

## Other commands

| Command           | What it does                                          |
| ----------------- | ----------------------------------------------------- |
| `npm run build`   | Production build → `dist/`                            |
| `npm run preview` | Serve the `dist/` build locally (no Worker functions) |
| `npm run lint`    | ESLint check                                          |
| `npm run format`  | Prettier format in place                              |

---

## Project structure

```
src/
  components/    Svelte components (SearchBar, MapView, ResultsList, …)
  stores/        Svelte writable stores + localStorage sync
  services/      API clients: nominatim.js, overpass.js, travelTime.js
  config/        Amenity config and icon mapping
  utils/         Pure utilities: haversine.js, formatters.js
  App.svelte     Root layout component
  main.js        Entry point
functions/
  api/
    travel-times.js   Cloudflare Pages Function — ORS proxy
tests/           Mirrors src/ structure
```

---

## APIs used

| Service                                               | Purpose                                 | Key required?           |
| ----------------------------------------------------- | --------------------------------------- | ----------------------- |
| [Nominatim](https://nominatim.openstreetmap.org/)     | Geocoding (address → coordinates)       | No                      |
| [Overpass API](https://overpass-api.de/)              | Park/playground data from OpenStreetMap | No                      |
| [OpenRouteService](https://openrouteservice.org/)     | Driving-time matrix                     | Yes (via Worker secret) |
| [OpenStreetMap tiles](https://www.openstreetmap.org/) | Map background                          | No                      |

The ORS key is kept server-side (Cloudflare Worker secret `ORS_API_KEY`). It is never exposed to the browser.
