## ADDED Requirements

### Requirement: Results are displayed sorted by distance ascending
The ResultsList component SHALL render each park from `$searchStore.filteredResults` (sliced to `visibleCount`) in distance order, closest first.

#### Scenario: List order matches distance order
- **WHEN** the store has results with varying distances
- **THEN** the list items appear with the smallest `distanceMiles` first

### Requirement: Each list item shows required fields
Each result item SHALL display: park name, distance in miles (1 decimal place), amenity icons (Lucide), and a Google Maps directions link. Travel time SHALL be shown when available; the field SHALL be blank/placeholder when `travelTimeSeconds` is null.

#### Scenario: Name and distance shown
- **WHEN** a park result is rendered
- **THEN** the park's name and formatted distance (e.g., "1.3 mi") are visible

#### Scenario: Travel time shown when available
- **WHEN** `$searchStore.travelTimes` has an entry for the park
- **THEN** the formatted travel time is displayed (e.g., "8 min")

#### Scenario: Travel time blank when pending
- **WHEN** no travel time entry exists for the park
- **THEN** no travel time text is displayed (not an error state)

#### Scenario: Google Maps link present
- **WHEN** a result is rendered
- **THEN** a link to `https://www.google.com/maps/dir/?api=1&destination={lat},{lon}` is present

### Requirement: Amenity icons render for each park's amenities
For each amenity key in `park.amenities`, the corresponding Lucide icon SHALL be rendered in the list item.

#### Scenario: Playground icon shown
- **WHEN** a park has `"playground"` in its `amenities` array
- **THEN** the playground icon is rendered in its list item

### Requirement: Show more button appends results
A "Show more" button SHALL be visible when `filteredResults.length > visibleCount`. Clicking it SHALL call `incrementVisibleCount()` on the store. The button SHALL be hidden when all results are shown.

#### Scenario: Show more increments visible count
- **WHEN** the "Show more" button is clicked
- **THEN** `incrementVisibleCount()` is called and more results appear

#### Scenario: Button hidden when all shown
- **WHEN** `visibleCount >= filteredResults.length`
- **THEN** the "Show more" button is not rendered

### Requirement: Clicking a result opens the detail modal
Clicking anywhere on a result list item (except the Google Maps link) SHALL call `selectPark(park)` on the store, which causes the ParkDetailModal to open.

#### Scenario: Click selects park
- **WHEN** a result list item is clicked
- **THEN** `selectPark()` is called with the corresponding `ParkResult`
