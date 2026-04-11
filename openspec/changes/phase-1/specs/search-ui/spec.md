## ADDED Requirements

### Requirement: Address input triggers geocoding and search on submit
The SearchBar component SHALL render a text input. When the user presses Enter or clicks the Search button with a non-empty value, it SHALL call `geocode()` and dispatch the result to the store via `setOrigin()`.

#### Scenario: Enter key submits
- **WHEN** text is typed in the address input and the Enter key is pressed
- **THEN** geocoding is initiated with the entered text

#### Scenario: Empty input does not submit
- **WHEN** the search button is clicked with an empty input
- **THEN** no geocoding call is made

### Requirement: GPS button requests browser geolocation
The SearchBar SHALL include a GPS button. Clicking it SHALL call `navigator.geolocation.getCurrentPosition()`. On success, it SHALL call `setOrigin()` with the GPS coordinates and a `displayName` of "Your location".

#### Scenario: GPS success sets origin
- **WHEN** the GPS button is clicked and geolocation resolves
- **THEN** `setOrigin(lat, lon, "Your location")` is called

#### Scenario: GPS denial shows error
- **WHEN** the GPS button is clicked and the user denies permission
- **THEN** an error message is displayed to the user

### Requirement: Loading indicator is shown during search
While `$searchStore.loading` is true, a visible loading indicator SHALL be displayed in the search area.

#### Scenario: Loading indicator appears during fetch
- **WHEN** the store's `loading` state is true
- **THEN** a loading indicator is visible in the SearchBar area

### Requirement: Search error is shown to the user
When `$searchStore.error` is non-null, the error message SHALL be displayed near the search bar.

#### Scenario: Error message displayed
- **WHEN** `$searchStore.error` is "Address not found"
- **THEN** that message is visible in the UI

### Requirement: RadiusDropdown offers 5, 10, 15 mile options
The RadiusDropdown component SHALL render a `<select>` or equivalent with options 5, 10, and 15 miles. The default SHALL be 5 miles. Changing the value SHALL call `setRadius()` on the store.

#### Scenario: Default is 5 miles
- **WHEN** the RadiusDropdown renders with no stored state
- **THEN** 5 miles is the selected value

#### Scenario: Changing radius updates store
- **WHEN** the user selects 10 miles from the dropdown
- **THEN** `setRadius(10)` is called on the store

### Requirement: Changing radius triggers a new search when origin is set
When the user changes the radius and an origin is set in the store, a new park search SHALL be triggered automatically.

#### Scenario: Radius change re-searches
- **WHEN** the user changes the radius dropdown and `$searchStore.origin` is non-null
- **THEN** a new Overpass search is triggered
