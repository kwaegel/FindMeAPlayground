# Spec: FindMeAPlayground

## 1. Overview

FindMeAPlayground is a responsive web application that helps parents discover playgrounds and parks near a given US location. Users enter an address (geocoded via Nominatim) or use browser GPS, choose a search radius, and optionally filter by amenities. Results appear on an interactive Leaflet map alongside a distance-sorted list. Each result links out to Google Maps for driving directions.

The app is built as a **Svelte + Vite** single-page application hosted on **Cloudflare Pages**, with a single **Cloudflare Workers** serverless function that proxies requests to OpenRouteService (keeping the API key server-side). All other external APIs (Overpass, Nominatim) are called directly from the client since they require no authentication. There is no backend database in Phase 1 — state is persisted in browser local storage.

### Key Design Decisions

- **Svelte (not SvelteKit)**: Minimal framework overhead, simple reactive model, good learning path for a backend developer. SvelteKit's SSR/routing features are unnecessary for a single-view app with a modal detail panel.
- **Cloudflare Pages + Workers**: Zero-cost hosting with near-zero cold starts on the proxy function, unlimited bandwidth, and a built-in path to D1/KV if Phase 2 ever needs a database.
- **Client-direct API calls where possible**: Overpass and Nominatim have no API keys and support CORS. Only ORS is proxied to protect its key.
- **Modal detail panel, not routed pages**: Keeps the SPA simple. True URL routes are potential future work.
- **Icon library for amenities**: Lucide icons for cross-platform visual consistency over emoji.

## 2. Architecture

### 2.1 System Diagram

```
┌──────────────────────────────────────────────┐
│            Browser (Svelte SPA)              │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │            App Shell                   │  │
│  │  ┌──────────┐ ┌────────┐ ┌──────────┐ │  │
│  │  │SearchBar │ │Filters │ │ Radius   │ │  │
│  │  │+GPS btn  │ │(amenity)│ │Dropdown │ │  │
│  │  └──────────┘ └────────┘ └──────────┘ │  │
│  │  ┌──────────────┐ ┌──────────────────┐ │  │
│  │  │  ResultsList  │ │    MapView       │ │  │
│  │  │  (scrollable) │ │   (Leaflet)      │ │  │
│  │  └──────────────┘ └──────────────────┘ │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │       ParkDetailModal            │  │  │
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌──────────────┐    ┌───────────────────┐   │
│  │ SearchStore  │    │ LocalStorageSync  │   │
│  │ (app state)  │    │ (persist/restore) │   │
│  └──────────────┘    └───────────────────┘   │
└───────┬──────────────────────┬───────────────┘
        │ direct (no key)      │ proxied
        ▼                      ▼
┌───────────────┐    ┌─────────────────────┐
│  Nominatim    │    │  Cloudflare Worker  │
│  (geocoding)  │    │  /api/travel-times  │
│               │    │  (holds ORS key)    │
│  Overpass API │    └──────────┬──────────┘
│  (park data)  │               │
└───────────────┘               ▼
                     ┌─────────────────────┐
                     │  OpenRouteService   │
                     │  (distance matrix)  │
                     └─────────────────────┘
```

### 2.2 Component Breakdown

#### App Shell
- **Responsibility**: Top-level layout. On desktop: sidebar (search controls + results list) on the left, map on the right. On mobile: search controls on top, toggle or stacked map/list below.
- **Inputs**: None (root component).
- **Outputs**: Renders all child components, provides layout breakpoints.

#### SearchBar
- **Responsibility**: Accepts address text input and GPS button. On submit, geocodes the address via Nominatim and updates the search store with coordinates.
- **Inputs**: Current search origin from store (to display as text).
- **Outputs**: Dispatches `setOrigin(lat, lon, displayName)` to the search store.
- **Key behavior**: Calls Nominatim directly. GPS button uses `navigator.geolocation.getCurrentPosition()`. Displays loading/error states for both paths. Nominatim is rate-limited to 1 req/sec — the component should debounce or disable re-submission briefly.

#### RadiusDropdown
- **Responsibility**: Dropdown with options 5, 10, 15 miles. Changing the value triggers a new search.
- **Inputs**: Current radius from store.
- **Outputs**: Dispatches `setRadius(miles)` to the search store.

#### AmenityFilters
- **Responsibility**: Renders a set of toggle buttons/checkboxes for amenity categories. Selecting/deselecting a filter updates the store; results are filtered client-side using AND logic.
- **Inputs**: Available amenity types (from a config constant), currently selected filters from store.
- **Outputs**: Dispatches `setFilters(selectedAmenities)` to the search store.
- **Key behavior**: The amenity list is defined in a single config file so adding new amenities requires only adding an entry (name, icon, OSM tag mapping).

#### ResultsList
- **Responsibility**: Renders search results as a scrollable list sorted by distance (ascending). Shows ~20 results initially, with a "show more" button to append the next batch.
- **Inputs**: Filtered/sorted results from the search store, travel times (may arrive asynchronously after initial results).
- **Outputs**: Click on a result opens ParkDetailModal. Hover/click highlights the corresponding map pin.
- **Key behavior**: Each list item displays: park name, distance (miles), travel time (if loaded), amenity icons, and a Google Maps directions link. The "show more" button increments a `visibleCount` value in the store; it does not re-query Overpass (all results are fetched in one query and paginated client-side).

#### MapView
- **Responsibility**: Renders a Leaflet map with OSM tiles. Places pins for all visible results. Centers on the search origin with appropriate zoom for the selected radius.
- **Inputs**: Search origin, radius, visible results from store.
- **Outputs**: Pin click opens ParkDetailModal. Right-click (desktop) or long-press (mobile) triggers "search from here" — updates the search origin to the clicked coordinates.
- **Key behavior**: Uses Leaflet's `L.map`, `L.tileLayer` (OSM), and `L.marker`/`L.circleMarker` for pins. A circle overlay shows the search radius. Map re-centers when search origin changes. Pin popups show park name as a minimal tooltip; clicking goes to detail.

#### ParkDetailModal
- **Responsibility**: Overlay/modal panel showing full detail for a selected park.
- **Inputs**: Selected park object from store.
- **Outputs**: Close action. Google Maps navigation link.
- **Content**: Park name, all amenity icons/labels, straight-line distance, travel time (if available), Google Maps link (`https://www.google.com/maps/dir/?api=1&destination={lat},{lon}`).

#### SearchStore (Svelte writable store)
- **Responsibility**: Central reactive state for the application.
- **State shape**:
  ```
  {
    origin: { lat, lon, displayName } | null,
    radiusMiles: 5 | 10 | 15,
    selectedAmenities: string[],        // e.g., ["playground", "restroom"]
    allResults: ParkResult[],           // full result set from Overpass
    visibleCount: number,               // pagination cursor
    travelTimes: Map<parkId, seconds>,  // async, may be partial
    selectedPark: ParkResult | null,    // for detail modal
    loading: boolean,
    error: string | null
  }
  ```
- **Key behavior**: When `origin` or `radiusMiles` changes, triggers an Overpass query. When `selectedAmenities` changes, re-filters `allResults` client-side (no new API call). After Overpass results arrive, fires a travel-time request through the proxy for the first batch of visible results.

#### LocalStorageSync
- **Responsibility**: Subscribes to the search store and persists `origin`, `radiusMiles`, and `selectedAmenities` to `localStorage`. On app load, reads stored values and hydrates the store. If stored origin exists, automatically triggers a search on load.
- **Key behavior**: Uses `store.subscribe()` with a debounce (500ms) to avoid thrashing writes.

#### API Service Layer
- **Responsibility**: Thin modules that encapsulate external API calls. One module per API:
  - `nominatim.js` — `geocode(query) -> { lat, lon, displayName }`
  - `overpass.js` — `searchParks(lat, lon, radiusMeters) -> ParkResult[]`
  - `travelTime.js` — `getTravelTimes(origin, destinations[]) -> Map<id, seconds>` (calls `/api/travel-times` proxy)
- **Key behavior**: Each module handles request construction, response parsing, and error mapping. The Overpass module builds the QL query to fetch parks with amenity tags in a single request.

#### Serverless Proxy (`/api/travel-times`)
- **Responsibility**: Cloudflare Worker function. Receives origin + destination coordinates from the client, attaches the ORS API key from environment variables, calls the ORS matrix endpoint, and returns the travel time array.
- **Inputs**: JSON body `{ origin: [lon, lat], destinations: [[lon, lat], ...] }`.
- **Outputs**: JSON `{ times: [seconds, ...] }` matching the destination order. `null` entries for destinations where ORS returned no route.
- **Key behavior**: Validates input (max 50 destinations per ORS limit). Returns 400 for malformed requests. ORS key is stored as a Cloudflare Worker secret (not in code). Adds CORS headers for the app's origin.

### 2.3 Data Model

#### ParkResult (client-side, from Overpass)
| Field | Type | Source |
|-------|------|--------|
| `id` | string | OSM element ID (`node/12345` or `way/12345`) |
| `name` | string | `tags.name` from OSM (fallback: "Unnamed Park") |
| `lat` | number | Centroid latitude |
| `lon` | number | Centroid longitude |
| `amenities` | string[] | Derived from OSM tags (see amenity mapping below) |
| `distanceMiles` | number | Calculated client-side via Haversine formula |
| `travelTimeSeconds` | number \| null | From ORS proxy, joined asynchronously |
| `osmTags` | object | Raw OSM tags, preserved for future amenity expansion |

#### Amenity Mapping Config
| Amenity Key | Display Label | Icon (Lucide) | OSM Tag Query |
|-------------|--------------|---------------|---------------|
| `playground` | Playground | `baby` | `leisure=playground` OR contained within a `leisure=park` that has a `leisure=playground` child |
| `restroom` | Restroom | `bath` | `amenity=toilets` within/near the park |
| `hiking-trail` | Hiking Trail | `footprints` | `highway=path` + `sac_scale=*` within/near the park |

This table is the single source of truth for amenity definitions. Adding a new amenity means adding a row here and its corresponding Overpass query fragment. No component changes required (FR-021).

### 2.4 Data Flow

**Primary search flow:**

1. User enters address → SearchBar calls Nominatim → receives `{ lat, lon }` → writes to store.
2. Store change triggers Overpass query: "all `leisure=park` and `leisure=playground` elements within `{radius}` meters of `{lat},{lon}`, including child amenity nodes."
3. Overpass returns raw OSM elements → `overpass.js` parses into `ParkResult[]`, calculates Haversine distance for each, sorts by distance → writes to `allResults`.
4. Client applies amenity filters (AND logic on `amenities[]`) → derives visible results (first 20).
5. For visible results, `travelTime.js` calls `/api/travel-times` with their coordinates → proxy calls ORS matrix endpoint → travel times are merged into results asynchronously (UI updates reactively via store).
6. User clicks "show more" → `visibleCount` increases → next batch becomes visible → travel times fetched for new batch.

**GPS flow:** Same as above but step 1 uses `navigator.geolocation` instead of Nominatim.

**"Search from here" flow:** Right-click/long-press on map → captures coordinates → writes to store as new origin (displayName set to "Map location" or reverse-geocoded via Nominatim) → triggers step 2 onward.

## 3. Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend framework | Svelte + Vite | Simplest reactive framework. No virtual DOM overhead. Components are intuitive (HTML + JS + CSS in one file). Good learning path for a backend developer. Sufficient for all Phase 1 features. |
| Hosting | Cloudflare Pages | Zero-cost, unlimited bandwidth, near-zero cold starts on Workers. Built-in D1/KV for Phase 2 database needs without adding another vendor. |
| Serverless proxy | Cloudflare Workers (Pages Functions) | Single function to protect ORS API key. File-based routing (`functions/api/travel-times.js`). V8 isolate runtime is perfect for a fetch-forward proxy. |
| Map library | Leaflet | Mature, well-documented, lightweight. Natural pairing with OSM tiles. Large plugin ecosystem. |
| Map tiles | OpenStreetMap (`tile.openstreetmap.org`) | Free, no API key, required attribution only. Matches the OSM data stack. |
| Park data | Overpass API (OSM) | Free, no API key, spatial queries built in. Rich amenity tagging. |
| Geocoding | Nominatim (public instance) | Free, no API key. 1 req/sec rate limit is fine for interactive single-user geocoding. |
| Travel times | OpenRouteService (hosted) via proxy | Free tier (2,500 matrix requests/day). Matrix endpoint handles 1-to-50 in a single call. |
| Amenity icons | Lucide | Lightweight, tree-shakeable, framework-agnostic SVG icons. Consistent rendering across platforms. |
| State management | Svelte writable stores | Built into Svelte, no extra dependency. Reactive subscriptions drive UI updates. |
| Persistence | localStorage | No server-side state in Phase 1. Simple key-value persistence for last search state. |
| CSS approach | Plain CSS with Svelte scoped styles | No CSS framework needed for a minimal UI. Svelte's `<style>` blocks are scoped per component by default. Media queries handle responsive breakpoints. |
| Distance calculation | Haversine formula (client-side) | Standard great-circle distance. Trivial to implement. Accurate enough for display purposes at park-search scale. |
| Testing | Vitest + Svelte Testing Library | Vitest integrates natively with Vite (shared config, fast HMR-based runner). Svelte Testing Library for component tests. |
| Linting/formatting | ESLint + Prettier | Standard toolchain. Svelte plugins available for both. Catches issues early, enforces consistency. |
| Local dev proxy | Vite proxy or Wrangler Pages dev | `wrangler pages dev` can serve both the Vite output and the Worker functions locally, simulating the production Cloudflare environment. |

### Development Tooling Note

The specific configuration of these tools (ESLint rules, Prettier settings, test file conventions, CI pipeline) is left to the implementer. The decisions above establish **what categories of tooling** to use. The implementer should configure them during the `project-scaffold` capability and document the setup in a `CLAUDE.md` or project README for future reference.

## 4. Interface Definitions

### 4.1 Serverless Proxy: `/api/travel-times`

**Method**: `POST`

**Request body**:
```json
{
  "origin": [-77.0364, 38.8951],
  "destinations": [
    [-77.0503, 38.8893],
    [-77.0126, 38.9047]
  ]
}
```
- `origin`: `[longitude, latitude]` (GeoJSON order, matching ORS convention).
- `destinations`: Array of `[longitude, latitude]` pairs. Max 50 (ORS matrix limit).

**Success response** (`200`):
```json
{
  "times": [482, 713]
}
```
- `times`: Array of travel times in seconds, same order as `destinations`. `null` for unreachable destinations.

**Error responses**:
- `400`: Invalid input (missing fields, >50 destinations, non-numeric coordinates).
  ```json
  { "error": "destinations must contain 1-50 coordinate pairs" }
  ```
- `502`: ORS upstream error (timeout, rate limit, service down).
  ```json
  { "error": "Travel time service unavailable" }
  ```
- `405`: Non-POST method.

**CORS**: Allows requests from the app's deployed origin only.

### 4.2 External API Calls (Client-Side)

#### Nominatim Geocoding
- **Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Params**: `q={address}&format=jsonv2&countrycodes=us&limit=1`
- **Response used**: `[0].lat`, `[0].lon`, `[0].display_name`
- **Error handling**: Empty array = "Address not found" displayed to user. Network error = generic error message.
- **Rate limit**: Enforce minimum 1 second between requests client-side.

#### Overpass API
- **Endpoint**: `https://overpass-api.de/api/interpreter`
- **Method**: POST with `data=` body containing Overpass QL.
- **Query structure** (conceptual):
  ```
  [out:json][timeout:30];
  (
    node["leisure"="park"](around:{radiusMeters},{lat},{lon});
    way["leisure"="park"](around:{radiusMeters},{lat},{lon});
    relation["leisure"="park"](around:{radiusMeters},{lat},{lon});
    node["leisure"="playground"](around:{radiusMeters},{lat},{lon});
    way["leisure"="playground"](around:{radiusMeters},{lat},{lon});
  );
  out center tags;
  ```
  Amenity sub-queries (toilets, trails) are fetched in the same request using `around` relative to each park, or as a second pass query scoped to the bounding box. The exact query strategy should be prototyped during implementation (see Risk Register).
- **Response used**: `elements[]` — each element's `id`, `type`, `tags`, `lat`/`lon` (or `center.lat`/`center.lon` for ways).
- **Error handling**: Timeout or 429 → "Search failed, please try again." Network error → generic message.

### 4.3 Google Maps Navigation Link

**Format**: `https://www.google.com/maps/dir/?api=1&destination={lat},{lon}`

Opens Google Maps with driving directions to the park. Works on mobile (opens Maps app if installed) and desktop (opens in browser). No API key required.

### 4.4 Local Storage Schema

**Key**: `findmeaplayground_state`

**Value** (JSON):
```json
{
  "origin": { "lat": 38.8951, "lon": -77.0364, "displayName": "Arlington, VA" },
  "radiusMiles": 10,
  "selectedAmenities": ["playground", "restroom"]
}
```

On app load: read and hydrate store. If `origin` is present, auto-trigger a search.
On store change: debounce-write (500ms) the above fields.

## 5. Implementation Plan

### 5.1 Phases

**Phase 1A: Core Search (MVP)**
Get the search-and-display loop working end to end. User can enter an address, see parks on a map and list, and click through to Google Maps. This is the minimum useful version.

**Phase 1B: Polish and Enhancement**
Add travel times (via proxy), amenity filtering, GPS location, local storage persistence, and "search from here." These make the app genuinely pleasant to use.

**Phase 1C: Deploy and Domain**
Ship to Cloudflare Pages, configure custom domain, verify everything works in production.

### 5.2 Capabilities

#### 5.2.1 project-scaffold
**Summary**: Initialize the Svelte + Vite project with Cloudflare Pages structure and development tooling.
**Requirements addressed**: C-003 (learning-friendly tech), NFR-001 (responsive web app).
**Components involved**: Project root, build config, Cloudflare Pages Functions directory.
**Acceptance criteria**:
- `npm run dev` starts a local Vite dev server with hot reload.
- `npm run build` produces a `dist/` directory suitable for Cloudflare Pages.
- `functions/` directory exists for Cloudflare Pages Functions.
- Lucide icons are importable in Svelte components.
- Vitest is configured and `npm test` runs (even with zero tests initially).
- ESLint and Prettier are configured with Svelte plugins.
- `wrangler pages dev` can serve the app + functions locally.
- Project builds with zero warnings.
- A `CLAUDE.md` or equivalent documents the dev setup (commands, project structure, conventions).
**Dependencies**: None (first capability).

#### 5.2.2 geocoding-service
**Summary**: Implement the Nominatim geocoding client that converts an address string to coordinates.
**Requirements addressed**: FR-001 (address input).
**Components involved**: API service layer (`nominatim.js`).
**Acceptance criteria**:
- `geocode("Arlington, VA")` returns `{ lat, lon, displayName }`.
- Returns a meaningful error for empty/invalid input.
- Enforces 1-second minimum between requests.
- Limits results to US addresses (`countrycodes=us`).
**Dependencies**: project-scaffold.

#### 5.2.3 park-search-service
**Summary**: Implement the Overpass API client that queries for parks and playgrounds within a radius and parses results into `ParkResult` objects.
**Requirements addressed**: FR-030 (search results), FR-020 (amenity data).
**Components involved**: API service layer (`overpass.js`), data model (`ParkResult`).
**Acceptance criteria**:
- `searchParks(lat, lon, radiusMeters)` returns an array of `ParkResult` objects.
- Results include `id`, `name`, `lat`, `lon`, `amenities[]`, and `osmTags`.
- Handles OSM ways/relations by using centroid coordinates.
- Unnamed parks get a fallback name ("Unnamed Park").
- Haversine distance is calculated for each result.
- Results are sorted by ascending distance.
- Handles Overpass errors/timeouts gracefully.
**Dependencies**: project-scaffold.

#### 5.2.4 search-store
**Summary**: Implement the central Svelte store that holds search state and orchestrates data fetching when inputs change.
**Requirements addressed**: FR-010/FR-011 (radius), FR-030 (sorted results), FR-032 (pagination).
**Components involved**: SearchStore, API service layer.
**Acceptance criteria**:
- Store exposes reactive state: `origin`, `radiusMiles`, `selectedAmenities`, `allResults`, `visibleCount`, `selectedPark`, `loading`, `error`.
- Changing `origin` or `radiusMiles` triggers an Overpass query.
- Changing `selectedAmenities` filters `allResults` client-side without re-querying.
- `visibleCount` defaults to 20; incrementing it exposes more results.
- `loading` and `error` states are managed correctly through the fetch lifecycle.
**Dependencies**: geocoding-service, park-search-service.

#### 5.2.5 search-ui
**Summary**: Build the SearchBar, RadiusDropdown, and GPS button components.
**Requirements addressed**: FR-001 (address input), FR-002 (GPS), FR-010/FR-011 (radius).
**Components involved**: SearchBar, RadiusDropdown, App Shell.
**Acceptance criteria**:
- Text input accepts an address; pressing Enter or clicking Search triggers geocoding and search.
- GPS button requests browser geolocation and sets origin on approval.
- GPS button shows an error message if permission is denied or geolocation fails.
- Radius dropdown shows 5, 10, 15 mile options with 5 selected by default.
- Changing radius triggers a new search if an origin is set.
- Loading indicator is visible while search is in progress.
**Dependencies**: search-store.

#### 5.2.6 results-list
**Summary**: Build the scrollable results list component with "show more" pagination.
**Requirements addressed**: FR-030 (list view), FR-031 (list item content), FR-032 (pagination).
**Components involved**: ResultsList, ParkDetailModal (click target).
**Acceptance criteria**:
- Displays results sorted by distance, closest first.
- Each item shows: park name, distance in miles (1 decimal), amenity icons (Lucide), and a Google Maps directions link.
- Travel time is shown when available, with a placeholder/blank when pending.
- First ~20 results are shown; "show more" button appends the next batch.
- "Show more" button is hidden when all results are displayed.
- Clicking a result opens the ParkDetailModal.
**Dependencies**: search-store, search-ui.

#### 5.2.7 map-view
**Summary**: Build the interactive Leaflet map component with park pins and search radius overlay.
**Requirements addressed**: FR-040 (interactive map), FR-041 (pin click).
**Components involved**: MapView.
**Acceptance criteria**:
- Leaflet map renders with OSM tiles and attribution.
- Pins are placed for all visible results.
- Map centers on search origin and zooms to fit the search radius.
- A circle overlay indicates the search radius.
- Clicking a pin opens the ParkDetailModal for that park.
- Map re-centers when the search origin changes.
- Map is responsive — fills available space in both desktop and mobile layouts.
**Dependencies**: search-store, search-ui.

#### 5.2.8 park-detail-modal
**Summary**: Build the modal/panel that shows full park details.
**Requirements addressed**: FR-050 (detail page).
**Components involved**: ParkDetailModal.
**Acceptance criteria**:
- Modal opens when a result is clicked (from list or map pin).
- Displays: park name, all amenity icons with labels, distance in miles, travel time (if available), and a Google Maps directions link.
- Modal can be closed via a close button, clicking outside, or pressing Escape.
- Google Maps link opens in a new tab.
**Dependencies**: results-list or map-view (either can trigger it).

#### 5.2.9 responsive-layout
**Summary**: Implement the responsive App Shell layout — side-by-side on desktop, stacked on mobile.
**Requirements addressed**: NFR-001 (responsive), NFR-003 (clean design).
**Components involved**: App Shell, all child components.
**Acceptance criteria**:
- Desktop (>768px): search controls + results list in a left sidebar, map fills the right side.
- Mobile (<=768px): search controls on top, map and list stacked below (or toggled).
- Layout transitions smoothly at the breakpoint.
- No horizontal scrolling at any viewport width.
- Clean, minimalist visual design — not playful or childish (NFR-003).
**Dependencies**: search-ui, results-list, map-view.

#### 5.2.10 amenity-filters
**Summary**: Build the amenity filter UI and client-side filtering logic.
**Requirements addressed**: FR-020 (filter by amenity), FR-021 (extensible).
**Components involved**: AmenityFilters, SearchStore, amenity config.
**Acceptance criteria**:
- Filter buttons/toggles for playground, restroom, hiking trail.
- Selecting filters updates results immediately (client-side AND logic).
- Deselecting all filters shows all results (no filter applied).
- Amenity definitions live in a single config file; adding a new amenity requires only adding one config entry and its Overpass query fragment.
**Dependencies**: search-store, results-list.

#### 5.2.11 travel-time-proxy
**Summary**: Implement the Cloudflare Worker function that proxies travel time requests to OpenRouteService.
**Requirements addressed**: FR-061 (travel time), NFR-004 (no exposed API keys).
**Components involved**: Serverless proxy, `travelTime.js` client module.
**Acceptance criteria**:
- `POST /api/travel-times` accepts origin + destinations, returns travel times in seconds.
- ORS API key is stored as a Cloudflare Worker secret, never in client code.
- Validates input: rejects >50 destinations, non-numeric coordinates, missing fields.
- Returns `null` for unreachable destinations.
- Returns `502` if ORS is unavailable.
- CORS headers restrict access to the app's origin.
- Client module calls the proxy and merges times into the store reactively.
**Dependencies**: project-scaffold (for the functions directory structure).

#### 5.2.12 local-storage-sync
**Summary**: Persist and restore search state (origin, radius, filters) via localStorage.
**Requirements addressed**: FR-070 (state persistence).
**Components involved**: LocalStorageSync, SearchStore.
**Acceptance criteria**:
- On app load, stored state is read and applied to the store.
- If a stored origin exists, a search is automatically triggered.
- Store changes are written to localStorage with a 500ms debounce.
- Gracefully handles missing, corrupt, or outdated stored data (falls back to defaults).
**Dependencies**: search-store.

#### 5.2.13 search-from-here
**Summary**: Implement the "search from here" map interaction.
**Requirements addressed**: FR-042 (search from map point).
**Components involved**: MapView, SearchStore.
**Acceptance criteria**:
- Right-click (desktop) or long-press (mobile) on the map shows a context menu or action.
- Selecting "Search from here" sets the clicked point as the new search origin.
- The search bar updates to show "Map location" (or a reverse-geocoded name if Nominatim is called).
- A new search is triggered from the clicked point.
**Dependencies**: map-view.

#### 5.2.14 deploy-cloudflare
**Summary**: Configure Cloudflare Pages deployment with custom domain.
**Requirements addressed**: NFR-006 (free-tier hosting), C-002 (zero cost).
**Components involved**: Cloudflare Pages config, DNS, Worker secrets.
**Acceptance criteria**:
- `git push` to main triggers automatic deployment to Cloudflare Pages.
- The app is accessible at the Cloudflare Pages URL.
- Custom domain (findmeaplayground.com) is configured and serves the app.
- ORS API key is configured as a Worker secret in the Cloudflare dashboard.
- Production build works correctly (all API calls function, map loads, proxy responds).
**Dependencies**: All other capabilities (this is the final deployment step).

### 5.3 Critical Path

```
project-scaffold
  ├── geocoding-service ──┐
  ├── park-search-service ─┼── search-store ── search-ui ──┬── results-list ──┐
  └── travel-time-proxy    │                               ├── map-view ──────┤
                           │                               └── amenity-filters│
                           │                                                  │
                           └───────────────────── responsive-layout ──────────┤
                                                                              │
                                          park-detail-modal ──────────────────┤
                                          local-storage-sync ─────────────────┤
                                          search-from-here ───────────────────┤
                                                                              │
                                                              deploy-cloudflare
```

The **critical path** runs through: `project-scaffold` → `park-search-service` → `search-store` → `search-ui` → `results-list` / `map-view` → `responsive-layout`. This is the shortest path to a visible, working search experience.

`travel-time-proxy` can be built in parallel with the UI components since travel times merge into results asynchronously and the UI handles their absence gracefully.

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Overpass query complexity**: Associating child amenities (toilets, trails) with their parent park may require complex QL or multiple queries. | Medium | Medium | Prototype the Overpass query early in `park-search-service`. Start with a simple query (parks + playgrounds as separate results) and iterate. Worst case: amenity detection is limited to what's directly tagged on the park element. |
| **Overpass rate limiting**: The public Overpass instance may throttle or block requests during high-load periods. | Low | High | Implement retry with backoff. Keep queries efficient (bounded radius, `out center` instead of `out geom`). Consider caching results client-side for short periods. |
| **Nominatim rate limit (1 req/sec)**: Fast sequential searches could hit the rate limit. | Low | Low | Client-side debounce on the search input. Disable the search button briefly after a geocoding call. |
| **ORS matrix limit (50 destinations)**: If a search returns >50 results and the user clicks "show more" repeatedly, batching travel time requests is needed. | Low | Low | Batch travel time requests in groups of 50. The UI already handles `null` travel times gracefully. |
| **OSM data gaps**: Some parks may lack amenity tags, especially in rural areas. | Medium | Low | Show all parks in results regardless of tags. Amenity filters only hide parks that lack the selected tags — they don't prevent discovery. Show an "amenity info may be incomplete" note. |
| **Cloudflare Workers V8 runtime**: Some Node.js APIs may not be available. | Low | Low | The proxy function uses only `fetch()` and JSON parsing, which are native to V8/Workers. No Node-specific APIs needed. |

## 7. Open Decisions

| Decision | Context | Recommendation |
|----------|---------|----------------|
| **Exact Overpass query strategy** | Associating amenity nodes (toilets, trails) with parent parks is non-trivial in Overpass QL. Options: (a) single complex query with `is_in` or area membership, (b) two-pass query (fetch parks, then fetch amenities in the bounding box and associate by proximity), (c) fetch parks only and rely on tags directly on the park element. | Prototype during `park-search-service`. Start with option (c) as baseline, try option (b) if tag coverage is too sparse. Document findings. |
| **Mobile map/list interaction** | Stacked layout has the map and list both visible but requires scrolling. A toggle (map/list tabs) saves space but hides one view. | Try stacked first. If the map takes too much vertical space on mobile, switch to a toggle. Decide during `responsive-layout`. |
| **Reverse geocoding for "search from here"** | When the user searches from a map point, the search bar could show "Map location" (simple) or a reverse-geocoded address from Nominatim (polished but adds a request). | Start with "Map location." Add reverse geocoding later if it feels incomplete. |

## 8. Constraints and Boundaries

**From requirements:**
- US geographic scope only (Nominatim `countrycodes=us`, ORS within US).
- Zero hosting/API cost (Cloudflare free tier, OSM/ORS free tiers).
- No native apps, no PWA/offline, no address autocomplete.
- No photos (link to Google Maps instead).
- No user accounts or server-side persistence in Phase 1.

**From design decisions:**
- No SvelteKit — plain Svelte + Vite only. This means no file-based routing, no SSR, no server-side form actions. If these are needed later, migrating to SvelteKit is straightforward.
- No CSS framework — scoped component styles + media queries. If the design grows complex, Tailwind CSS can be added without architectural changes.
- The detail view is a modal, not a URL route. Parks are not individually linkable/shareable in Phase 1.
- All Overpass results are fetched in a single query and paginated client-side. This is fine for radii up to 15 miles but could become slow if the radius were ever increased significantly (not planned).
- Travel times are displayed as-is from ORS (no real-time traffic). Accuracy is approximate.
