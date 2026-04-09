## ADDED Requirements

### Requirement: Amenity config is the single source of truth
All amenity definitions SHALL live in `src/config/amenities.js`. Each entry SHALL define: `key` (string, e.g. "playground"), `label` (string, e.g. "Playground"), `icon` (Lucide icon component), and `osmTags` (object describing the OSM tag mapping). Adding a new amenity SHALL require only adding one entry to this file — no component changes.

#### Scenario: Config drives filter rendering
- **WHEN** a new entry is added to `src/config/amenities.js`
- **THEN** a corresponding filter toggle appears in the AmenityFilters component without any component code changes

### Requirement: AmenityFilters renders toggle buttons for each amenity
The AmenityFilters component SHALL render one toggle button per entry in the amenity config. Each button SHALL show the amenity's Lucide icon and label. Active filters SHALL be visually distinguished (e.g., highlighted border or background).

#### Scenario: Three default toggles rendered
- **WHEN** the config has playground, restroom, and hiking-trail entries
- **THEN** three toggle buttons are rendered with their icons and labels

#### Scenario: Active filter is visually indicated
- **WHEN** "playground" is in `$searchStore.selectedAmenities`
- **THEN** the playground toggle button has an active/selected visual state

### Requirement: Toggling a filter updates the store and re-filters results
Clicking an inactive filter button SHALL add its key to `selectedAmenities`. Clicking an active filter SHALL remove it. Both actions SHALL call `setFilters()` on the store and immediately update the visible results (client-side, no new API call).

#### Scenario: Activating a filter reduces results
- **WHEN** the user clicks "Playground" with `allResults` containing parks with and without the "playground" amenity
- **THEN** only parks with `"playground"` in their `amenities` array are shown

#### Scenario: Deactivating a filter restores results
- **WHEN** the user clicks an active filter to deactivate it
- **THEN** parks previously hidden by that filter reappear

### Requirement: AND logic applied when multiple filters active
When multiple amenity filters are active, only parks possessing ALL selected amenity keys in their `amenities` array SHALL be shown.

#### Scenario: Multiple filters use AND logic
- **WHEN** both "playground" and "restroom" filters are active
- **THEN** only parks with both `"playground"` AND `"restroom"` in their `amenities` array are shown

### Requirement: No filters means no filtering
When `selectedAmenities` is empty, all results from `allResults` SHALL be shown (subject to `visibleCount` only).

#### Scenario: Empty filters shows all
- **WHEN** `selectedAmenities` is []
- **THEN** all parks in `allResults` appear in filtered results
