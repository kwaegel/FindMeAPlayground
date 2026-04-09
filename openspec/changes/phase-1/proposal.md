## Why

FindMeAPlayground has a complete spec and requirements but no code. Phase 1 builds the full working application — from project scaffolding through Cloudflare deployment — so parents can discover playgrounds and parks near any US address.

## What Changes

- New Svelte + Vite project scaffolded with Cloudflare Pages structure, Vitest, ESLint, and Prettier
- Nominatim geocoding service (address → coordinates, 1 req/sec rate limit)
- Overpass API park search service (parks + playgrounds within radius → `ParkResult[]`)
- Central Svelte search store orchestrating all app state and data fetching
- Search UI: address input, GPS button, radius dropdown
- Results list with distance sorting, amenity icons, travel times, and "show more" pagination
- Interactive Leaflet map with OSM tiles, park pins, radius overlay
- Park detail modal with full info and Google Maps directions link
- Responsive App Shell layout (sidebar on desktop, stacked on mobile)
- Amenity filter UI with client-side AND logic; data-driven config for extensibility
- Cloudflare Worker proxy for OpenRouteService travel times (API key stays server-side)
- localStorage persistence of origin, radius, and filters with auto-restore on load
- "Search from here" via right-click / long-press on map
- Cloudflare Pages deployment with custom domain (findmeaplayground.com)

## Capabilities

### New Capabilities

- `project-scaffold`: Initialize Svelte + Vite project with Cloudflare Pages structure and full dev tooling (Vitest, ESLint, Prettier, wrangler as dev dep)
- `geocoding-service`: Nominatim client — `geocode(query)` → `{ lat, lon, displayName }`, US-only, 1 req/sec enforced
- `park-search-service`: Overpass API client — `searchParks(lat, lon, radiusMeters)` → `ParkResult[]` with Haversine distance, sorted ascending
- `search-store`: Central Svelte writable store; triggers Overpass on origin/radius change, filters client-side on amenity change, manages loading/error state
- `search-ui`: SearchBar (address input + submit), GPS button, RadiusDropdown (5/10/15 mi)
- `results-list`: Scrollable distance-sorted list; shows name, distance, travel time, amenity icons, Google Maps link; "show more" pagination via `visibleCount`
- `map-view`: Leaflet map with OSM tiles, park pins, radius circle, re-centers on origin change, pin click opens detail modal
- `park-detail-modal`: Overlay showing full park info; closes on button, outside click, or Escape; Google Maps link opens in new tab
- `responsive-layout`: App Shell — left sidebar + right map on desktop (>768px), stacked on mobile
- `amenity-filters`: Toggle buttons for playground/restroom/hiking-trail; AND logic; single config file as source of truth
- `travel-time-proxy`: Cloudflare Worker `POST /api/travel-times`; validates input (max 50 destinations); ORS key as Worker secret; CORS restricted; client `travelTime.js` merges times into store reactively
- `local-storage-sync`: Persist/restore `origin`, `radiusMiles`, `selectedAmenities` under key `findmeaplayground_state`; 500ms debounce writes; auto-search on load if origin stored
- `search-from-here`: Right-click (desktop) / long-press (mobile) on map → sets new origin → triggers search; displays "Map location" in search bar
- `deploy-cloudflare`: Cloudflare Pages deployment; git-push triggers deploy; custom domain; ORS key configured as Worker secret

### Modified Capabilities

None — this is the initial implementation.

## Impact

- **New dependencies**: svelte, vite, @sveltejs/vite-plugin-svelte, leaflet, lucide-svelte, vitest, @testing-library/svelte, eslint, prettier, wrangler (dev), eslint-plugin-svelte, prettier-plugin-svelte
- **New files**: All of `src/`, `functions/`, `tests/`, `vite.config.js`, `vitest.config.js`, `.eslintrc`, `.prettierrc`
- **External APIs touched**: Nominatim (geocoding), Overpass (park data), OpenRouteService (travel times via proxy)
- **Cloudflare resources**: 1 Pages project, 1 Worker function, 1 Worker secret (ORS key), 1 custom domain
- **No breaking changes** — greenfield project
