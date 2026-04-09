## ADDED Requirements

### Requirement: Store state is persisted to localStorage on change
Whenever `origin`, `radiusMiles`, or `selectedAmenities` changes in the store, those three fields SHALL be serialized to JSON and written to localStorage under the key `findmeaplayground_state`. Writes SHALL be debounced at 500ms to avoid thrashing.

#### Scenario: State written on origin change
- **WHEN** `setOrigin()` is called and resolves
- **THEN** within 500ms, `localStorage.getItem("findmeaplayground_state")` returns a JSON string containing the new origin

#### Scenario: Writes are debounced
- **WHEN** `setRadius()` is called multiple times within 500ms
- **THEN** localStorage is written only once after the 500ms window closes

### Requirement: Stored state is restored on app load
On application startup, `LocalStorageSync` SHALL read `findmeaplayground_state` from localStorage. If present and valid, it SHALL hydrate the store with the stored `origin`, `radiusMiles`, and `selectedAmenities`.

#### Scenario: Origin restored on load
- **WHEN** `findmeaplayground_state` contains a valid `origin`
- **THEN** the store's `origin` is set to the stored value on app init

#### Scenario: Radius restored on load
- **WHEN** `findmeaplayground_state` contains `radiusMiles: 10`
- **THEN** the store's `radiusMiles` is 10 after init

### Requirement: Stored origin triggers an automatic search on load
If `origin` is present in the restored state, `LocalStorageSync` SHALL call `setOrigin()` to trigger a fresh Overpass search after hydrating the store.

#### Scenario: Auto-search triggered on load
- **WHEN** localStorage contains a stored origin
- **THEN** `setOrigin()` is called during app initialization, triggering a park search

### Requirement: Corrupt or missing localStorage data falls back to defaults
If `findmeaplayground_state` is missing, contains invalid JSON, or has unexpected field types, the store SHALL initialize with default values (no error thrown to the user).

#### Scenario: Missing key uses defaults
- **WHEN** `findmeaplayground_state` is not in localStorage
- **THEN** the store initializes with default values (origin: null, radiusMiles: 5, selectedAmenities: [])

#### Scenario: Corrupt JSON uses defaults
- **WHEN** `findmeaplayground_state` contains invalid JSON
- **THEN** no error is thrown and the store uses defaults
