## ADDED Requirements

### Requirement: Right-click on map triggers "search from here" on desktop
On desktop (non-touch) devices, right-clicking on the Leaflet map SHALL show a context menu with a "Search from here" option.

#### Scenario: Right-click shows context menu
- **WHEN** the user right-clicks on the map
- **THEN** a context menu with "Search from here" is displayed at the click location

### Requirement: Long-press on map triggers "search from here" on mobile
On touch devices, holding a press on the map for at least 500ms SHALL show a "Search from here" action (context menu or bottom sheet).

#### Scenario: Long-press triggers action
- **WHEN** the user holds a press on the map for 500ms+ on a touch device
- **THEN** a "Search from here" option is presented

### Requirement: Confirming "search from here" sets the clicked point as origin
When the user selects "Search from here", `setOrigin()` SHALL be called with the clicked latitude/longitude and `displayName` of "Map location". This SHALL trigger a new Overpass search from the clicked point.

#### Scenario: New origin set to clicked coordinates
- **WHEN** "Search from here" is selected from the context menu
- **THEN** `setOrigin(lat, lon, "Map location")` is called with the map coordinates

#### Scenario: New search triggered
- **WHEN** "Search from here" is confirmed
- **THEN** a new Overpass park search is initiated from the clicked coordinates

### Requirement: Search bar reflects the new "Map location" origin
After "search from here" sets the origin, the SearchBar input SHALL display "Map location" as the current search location text.

#### Scenario: Search bar updates
- **WHEN** "Search from here" sets a new origin with displayName "Map location"
- **THEN** the SearchBar input shows "Map location"
