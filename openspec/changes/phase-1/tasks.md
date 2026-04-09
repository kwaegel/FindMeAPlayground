## 1. project-scaffold

- [x] 1.1 Initialize Svelte + Vite project with `npm create vite` (svelte template), configure `vite.config.js`
- [x] 1.2 Add and configure Vitest (`vitest.config.js` or inline in `vite.config.js`), add `npm test` script
- [x] 1.3 Add ESLint with `eslint-plugin-svelte` and Prettier with `prettier-plugin-svelte`, add `npm run lint` and `npm run format` scripts
- [x] 1.4 Install `lucide-svelte` and verify a Lucide icon imports and renders in `App.svelte`
- [x] 1.5 Add `wrangler` as a `devDependency`, create `functions/api/` directory with a placeholder `.gitkeep`
- [x] 1.6 Set up `src/` directory structure: `components/`, `stores/`, `services/`, `config/`, `utils/`
- [x] 1.7 Verify `npm run build` produces `dist/` with no errors or warnings

## 2. geocoding-service

- [x] 2.1 Write failing tests for `geocode()` in `tests/services/nominatim.test.js` (success, address not found, network error, rate limit enforcement)
- [x] 2.2 Implement `src/services/nominatim.js` — `geocode(query)` with Nominatim fetch, US-only, `countrycodes=us`
- [x] 2.3 Implement 1-second rate limiting in the nominatim module (request queue or cooldown timer)
- [x] 2.4 Make all geocoding-service tests pass

## 3. park-search-service

- [x] 3.1 Implement `src/utils/haversine.js` — `haversineDistance(lat1, lon1, lat2, lon2)` returning miles; write unit tests
- [x] 3.2 Write failing tests for `searchParks()` in `tests/services/overpass.test.js` (returns ParkResult[], centroids for ways, unnamed fallback, distance sort, amenity detection, error handling)
- [x] 3.3 Implement `src/services/overpass.js` — Overpass QL query construction for `leisure=park` + `leisure=playground`, response parsing into `ParkResult[]`
- [x] 3.4 Implement amenity detection from OSM tags (playground, restroom, hiking-trail) using `src/config/amenities.js`
- [x] 3.5 Make all park-search-service tests pass

## 4. search-store

- [x] 4.1 Write failing tests for the search store in `tests/stores/searchStore.test.js` (initial state, setOrigin triggers search, setRadius with/without origin, setFilters client-side, visibleCount increment, selectPark/clearSelectedPark, mergeTravelTimes)
- [x] 4.2 Implement `src/stores/searchStore.js` with all store actions and reactive state shape
- [x] 4.3 Wire `searchParks()` into `setOrigin()` and `setRadius()` with loading/error lifecycle
- [x] 4.4 Implement client-side amenity filtering in `setFilters()` (AND logic on `amenities[]`)
- [x] 4.5 Make all search-store tests pass

## 5. travel-time-proxy

- [x] 5.1 Write failing tests for the Cloudflare Worker in `tests/functions/travel-times.test.js` (POST accepted, GET returns 405, missing fields return 400, >50 destinations return 400, valid response, ORS error returns 502, CORS headers)
- [x] 5.2 Implement `functions/api/travel-times.js` — input validation, ORS proxy fetch, times array extraction, CORS headers
- [x] 5.3 Write failing tests for `getTravelTimes()` in `tests/services/travelTime.test.js` (POST to proxy, batching >50, mergeTravelTimes called)
- [x] 5.4 Implement `src/services/travelTime.js` — `getTravelTimes(origin, parks[])` with batching and store merge
- [x] 5.5 Make all travel-time-proxy and travelTime service tests pass

## 6. search-ui

- [x] 6.1 Write failing component tests for `SearchBar.svelte` (submit on Enter, GPS success, GPS denial, loading indicator, error display)
- [x] 6.2 Implement `src/components/SearchBar.svelte` — address input, Search button, GPS button, loading/error display
- [x] 6.3 Write failing component tests for `RadiusDropdown.svelte` (default 5mi, options rendered, change calls setRadius)
- [x] 6.4 Implement `src/components/RadiusDropdown.svelte` — select with 5/10/15 options, binds to store
- [x] 6.5 Make all search-ui component tests pass

## 7. results-list

- [x] 7.1 Write failing component tests for `ResultsList.svelte` (sorted order, name/distance/amenity icons shown, travel time when available/blank when not, Google Maps link, show-more button, click selects park)
- [x] 7.2 Implement `src/components/ResultsList.svelte` — renders filteredResults sliced to visibleCount, show-more button
- [x] 7.3 Wire Google Maps link format: `https://www.google.com/maps/dir/?api=1&destination={lat},{lon}`
- [x] 7.4 Make all results-list tests pass

## 8. map-view

- [x] 8.1 Write failing component tests for `MapView.svelte` (Leaflet initializes on mount, pins count matches visible results, re-centers on origin change, radius circle, pin click selects park)
- [x] 8.2 Implement `src/components/MapView.svelte` — Leaflet init in `onMount`, OSM tile layer, marker placement, radius circle, pin click handler
- [x] 8.3 Handle marker cleanup on result updates (remove stale markers before adding new ones)
- [x] 8.4 Make all map-view tests pass

## 9. park-detail-modal

- [x] 9.1 Write failing component tests for `ParkDetailModal.svelte` (hidden when no park selected, shows name/amenities/distance/travel time/link, close button, Escape key, outside click)
- [x] 9.2 Implement `src/components/ParkDetailModal.svelte` — conditional render, full park details, close actions
- [x] 9.3 Add keyboard event listener for Escape key on mount, remove on destroy
- [x] 9.4 Make all park-detail-modal tests pass

## 10. responsive-layout

- [x] 10.1 Implement App Shell layout in `App.svelte` — flexbox/grid with sidebar + map on desktop
- [x] 10.2 Add responsive CSS: media query at 768px for mobile stacked layout
- [x] 10.3 Compose all components in `App.svelte`: SearchBar, RadiusDropdown, AmenityFilters, ResultsList, MapView, ParkDetailModal
- [x] 10.4 Verify no horizontal scrolling at 320px viewport width
- [x] 10.5 Write component test for App.svelte verifying all components render

## 11. amenity-filters

- [x] 11.1 Add amenity config entries to `src/config/amenities.js` for playground, restroom, hiking-trail (key, label, icon, osmTags)
- [x] 11.2 Write failing component tests for `AmenityFilters.svelte` (toggles rendered per config, active state, toggling adds/removes from selectedAmenities, AND logic in store)
- [x] 11.3 Implement `src/components/AmenityFilters.svelte` — maps over amenity config, toggle buttons, active state styling
- [x] 11.4 Make all amenity-filters tests pass

## 12. local-storage-sync

- [x] 12.1 Write failing tests for `LocalStorageSync` in `tests/stores/localStorageSync.test.js` (write on change, debounce 500ms, restore on load, auto-search if origin present, corrupt JSON fallback)
- [x] 12.2 Implement `src/stores/localStorageSync.js` — store subscription with 500ms debounce write, read + hydrate on load
- [x] 12.3 Call `localStorageSync.init()` from `main.js` before mounting the app
- [x] 12.4 Make all local-storage-sync tests pass

## 13. search-from-here

- [x] 13.1 Write failing tests for "search from here" in `tests/components/MapView.test.js` (right-click context menu, long-press trigger, setOrigin called with "Map location", search bar updates)
- [x] 13.2 Add right-click (`contextmenu`) event handler to the Leaflet map in `MapView.svelte` — shows inline context menu at click position
- [x] 13.3 Add long-press detection (500ms threshold) for touch devices in `MapView.svelte`
- [x] 13.4 Call `setOrigin(lat, lon, "Map location")` when "Search from here" is confirmed
- [x] 13.5 Make all search-from-here tests pass

## 14. deploy-cloudflare

- [ ] 14.1 Connect the GitHub repository to a new Cloudflare Pages project; set build command to `npm run build`, output directory to `dist`  *(manual — Cloudflare dashboard)*
- [ ] 14.2 Verify automatic deployment triggers on push to `main`  *(manual — git push + observe)*
- [ ] 14.3 Add `ORS_API_KEY` as a Worker secret in the Cloudflare dashboard (Settings → Environment variables → Secrets)  *(manual — dashboard)*
- [ ] 14.4 Configure `findmeaplayground.com` as a custom domain in Cloudflare Pages and update DNS  *(manual — dashboard + registrar)*
- [ ] 14.5 Smoke-test production: geocode an address, verify parks load on map and list, confirm travel times arrive, test the Google Maps link, confirm no console errors  *(manual — browser)*
