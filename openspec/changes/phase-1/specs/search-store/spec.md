## ADDED Requirements

### Requirement: Store exposes required reactive state shape
The search store SHALL expose a reactive Svelte writable store with the following fields: `origin` ({ lat, lon, displayName } | null), `radiusMiles` (5 | 10 | 15, default 5), `selectedAmenities` (string[], default []), `allResults` (ParkResult[]), `visibleCount` (number, default 20), `travelTimes` (Map<string, number>), `selectedPark` (ParkResult | null), `loading` (boolean), `error` (string | null).

#### Scenario: Initial state has correct defaults
- **WHEN** the store is first created
- **THEN** `origin` is null, `radiusMiles` is 5, `selectedAmenities` is [], `allResults` is [], `visibleCount` is 20, `loading` is false, `error` is null

### Requirement: Changing origin triggers Overpass search
When `origin` is updated via `setOrigin(lat, lon, displayName)`, the store SHALL call `searchParks()` with the current radius converted to meters, set `loading` to true during the fetch, populate `allResults` on success, and set `error` on failure.

#### Scenario: setOrigin triggers search
- **WHEN** `setOrigin(38.89, -77.03, "Arlington, VA")` is called
- **THEN** `loading` becomes true, `searchParks` is called, and on resolution `allResults` is populated and `loading` returns to false

#### Scenario: Search error sets error state
- **WHEN** `setOrigin()` is called and `searchParks()` throws
- **THEN** `error` is set to the error message and `loading` returns to false

### Requirement: Changing radiusMiles triggers a new search if origin is set
When `setRadius(miles)` is called and `origin` is non-null, the store SHALL trigger a new `searchParks()` call. If `origin` is null, no search is triggered.

#### Scenario: Radius change with origin triggers search
- **WHEN** `setRadius(10)` is called and `origin` is set
- **THEN** `searchParks` is called with the new radius in meters

#### Scenario: Radius change without origin skips search
- **WHEN** `setRadius(10)` is called and `origin` is null
- **THEN** `searchParks` is NOT called

### Requirement: Changing selectedAmenities filters client-side without re-querying
`setFilters(amenities)` SHALL update `selectedAmenities` and re-filter `allResults` in memory. No new Overpass request SHALL be made.

#### Scenario: Filter applied client-side
- **WHEN** `setFilters(["playground"])` is called with `allResults` already populated
- **THEN** the derived visible results exclude parks whose `amenities` array does not include `"playground"`, and no new network call is made

#### Scenario: Empty filters show all results
- **WHEN** `setFilters([])` is called
- **THEN** no amenity filtering is applied and all results are visible

### Requirement: visibleCount controls pagination
`incrementVisibleCount()` SHALL increase `visibleCount` by 20. The store SHALL expose `filteredResults` derived from `allResults` filtered by `selectedAmenities` and sliced to `visibleCount`.

#### Scenario: Show more increases visible count
- **WHEN** `incrementVisibleCount()` is called
- **THEN** `visibleCount` increases by 20

### Requirement: selectedPark is set and cleared
`selectPark(park)` SHALL set `selectedPark` to the given `ParkResult`. `clearSelectedPark()` SHALL set it to null.

#### Scenario: Select and clear park
- **WHEN** `selectPark(parkResult)` is called then `clearSelectedPark()` is called
- **THEN** `selectedPark` is first the park object, then null

### Requirement: Travel times merge into store reactively
`mergeTravelTimes(timesMap)` SHALL merge a `Map<parkId, seconds>` into the store's `travelTimes` map. Components that display travel times SHALL update reactively.

#### Scenario: Travel times merged
- **WHEN** `mergeTravelTimes(new Map([["way/1", 300]]))` is called
- **THEN** `travelTimes.get("way/1")` returns 300
