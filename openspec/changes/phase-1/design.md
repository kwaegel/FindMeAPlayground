## Context

Greenfield Svelte + Vite SPA. No existing source code — all decisions start from a clean slate. The full spec (SPEC.md) and requirements (REQUIREMENTS.md) are written and locked. The architecture is defined; this document records the key technical decisions that shape implementation order and approach.

External constraints:
- All APIs except ORS are keyless and CORS-enabled (call from client directly)
- ORS API key must never reach the client (Cloudflare Worker proxy required)
- Cloudflare free tier throughout; no server-side database
- Wrangler is not globally installed — must be a `devDependency`

## Goals / Non-Goals

**Goals:**
- Working end-to-end search loop: address → geocode → Overpass → map + list → detail modal
- Travel times load asynchronously and merge into results reactively
- Amenity filtering is client-side and driven by a single config file
- localStorage restores last search on reload
- Deployed to Cloudflare Pages with custom domain
- Full Vitest coverage for services, store, and utilities; Svelte Testing Library for components

**Non-Goals:**
- Phase 2 features: user accounts, favorites, visited status, notes
- Address autocomplete (not in requirements)
- PWA / offline support
- URL routing to individual parks (modal only in Phase 1)
- SSR of any kind

## Decisions

### D1: Build order follows critical path from SPEC.md §5.3

Work proceeds: `project-scaffold` → `geocoding-service` + `park-search-service` (parallel) → `search-store` → `search-ui` → `results-list` + `map-view` (parallel) → `responsive-layout` + `park-detail-modal` → `amenity-filters` + `local-storage-sync` + `search-from-here` → `deploy-cloudflare`. `travel-time-proxy` is built alongside the UI components since the store handles null travel times gracefully.

**Rationale**: The critical path gets a visible, working search experience as fast as possible. Each increment leaves the app in a working state.

### D2: TDD throughout — tests before implementation

For every capability: write failing Vitest tests encoding the acceptance criteria, then implement. Svelte Testing Library for component tests. External APIs (Nominatim, Overpass, ORS) are always mocked in tests.

**Rationale**: Required by the developer conventions. Also forces acceptance criteria to be concrete before writing code.

### D3: Overpass amenity strategy — start with option (c), prototype option (b)

SPEC.md §7 identifies three Overpass query strategies. Start with option (c): read amenity tags directly on the park element (e.g., `leisure=playground` on the park node itself, `amenity=toilets` tag on the park way). If tag coverage is too sparse in practice, prototype option (b): fetch parks first, then query amenity nodes within the bounding box and associate by proximity.

**Rationale**: Option (c) is the simplest query and handles the most common OSM tagging pattern. Option (b) adds complexity and a second network request. Decide during `park-search-service` implementation after testing against real Overpass data.

### D4: Travel times are fire-and-forget, UI always handles null

The store fires the ORS proxy call after Overpass results arrive. The `travelTimes` map starts empty. Components display a dash/blank for parks with no travel time yet. When the proxy responds, the store merges times in and components update reactively.

**Rationale**: Overpass results render immediately. Travel times are a UX enhancement, not a blocker. This avoids waterfall loading.

### D5: Pagination is purely client-side via `visibleCount`

All Overpass results are fetched in one query. `visibleCount` (default 20) controls how many `ResultsList` renders. "Show more" increments `visibleCount` by 20. Travel times are requested for each new visible batch.

**Rationale**: Overpass handles the radius-bounded query in one shot. Re-querying on "show more" would waste API calls and reset the map.

### D6: Wrangler as devDependency, not global

`wrangler` is listed in `devDependencies` so `npx wrangler pages dev` works without a global install.

**Alternative**: Require global wrangler. Rejected because it would create a hidden environment dependency not captured in `package.json`.

### D7: Mobile layout — stacked first, toggle if needed

Start with a stacked layout (map above list on mobile). If the map takes too much vertical space during `responsive-layout`, switch to a tab toggle. Decision deferred to that capability.

**Rationale**: Matches SPEC.md §7 open decision. Stacked is simpler and more conventional.

### D8: "Search from here" shows "Map location", no reverse geocode initially

When the user right-clicks / long-presses the map, the search bar shows "Map location" as the display name. Reverse geocoding via Nominatim is not called.

**Rationale**: Keeps the feature simple and avoids an extra Nominatim request. Can be added later if it feels incomplete.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Overpass amenity tag coverage is sparse** | Start with option (c) tags-on-element. If real-world testing shows too few tagged parks, prototype option (b) (bounding box amenity fetch). Document findings in `park-search-service` tests. |
| **Overpass rate limiting / slow response** | Use `[timeout:30]` in QL. Implement retry with backoff (max 2 retries). Show clear error state to user. |
| **ORS batching for >50 results** | Batch `travelTime.js` calls in groups of ≤50. UI already handles null times gracefully, so partial batches render correctly. |
| **Leaflet SSR / import issues in Vite** | Leaflet must be imported with `import 'leaflet/dist/leaflet.css'` and initialized only in `onMount`. Guard against SSR (not applicable here, but Vite may tree-shake incorrectly). Use dynamic import if needed. |
| **Cloudflare Worker V8 runtime** | The proxy uses only `fetch()` + JSON — no Node APIs. No risk. |
| **localStorage data from a future schema change** | Always wrap `JSON.parse` in try/catch and fall back to defaults. Version the stored schema if fields change. |
| **Nominatim 1 req/sec** | Debounce search input. Briefly disable search button after each geocode call. |

## Open Questions

| Question | Status |
|----------|--------|
| Exact Overpass QL for amenity association | Resolve during `park-search-service` — prototype against live Overpass |
| Mobile map/list: stacked vs. toggle | Decide during `responsive-layout` after seeing real viewport behavior |
| Reverse geocoding for "search from here" | Start with "Map location"; revisit after `search-from-here` ships |
