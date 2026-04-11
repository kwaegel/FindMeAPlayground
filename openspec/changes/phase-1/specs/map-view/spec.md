## ADDED Requirements

### Requirement: Leaflet map renders with OSM tiles
The MapView component SHALL initialize a Leaflet map using `L.tileLayer` with OpenStreetMap tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) and the required OSM attribution. The map SHALL only initialize after the component mounts (`onMount`).

#### Scenario: Map initializes on mount
- **WHEN** the MapView component mounts
- **THEN** a Leaflet map is initialized with OSM tile layer and attribution

### Requirement: Pins are placed for all visible results
For each park in `filteredResults` (sliced to `visibleCount`), a Leaflet marker SHALL be placed at the park's `lat`/`lon`. A tooltip showing the park name SHALL be attached to each marker.

#### Scenario: Pins rendered for visible results
- **WHEN** the store has 5 visible filtered results
- **THEN** 5 markers are present on the map

### Requirement: Map centers on search origin with radius-appropriate zoom
When `$searchStore.origin` changes, the map SHALL pan/zoom to center on the new origin. The zoom level SHALL be appropriate for the selected radius (e.g., closer zoom for 5 miles, wider for 15).

#### Scenario: Map centers on new origin
- **WHEN** `$searchStore.origin` is updated
- **THEN** the map re-centers on the new coordinates

### Requirement: Radius circle overlay is shown
A `L.circle` centered on the search origin with radius equal to `radiusMiles` converted to meters SHALL be rendered on the map. The circle SHALL update when origin or radius changes.

#### Scenario: Circle matches radius
- **WHEN** origin is set and radius is 10 miles
- **THEN** a circle with radius 16093 meters (~10 miles) is drawn on the map

### Requirement: Clicking a pin opens the detail modal
Clicking a map marker SHALL call `selectPark(park)` on the store for the corresponding park.

#### Scenario: Pin click selects park
- **WHEN** a map pin is clicked
- **THEN** `selectPark()` is called with the associated `ParkResult`

### Requirement: Map fills available space responsively
The map container SHALL be styled to fill the full height of its parent container in both desktop and mobile layouts.

#### Scenario: Map fills container
- **WHEN** the MapView is rendered at various viewport sizes
- **THEN** no whitespace gap appears below the map within its container
