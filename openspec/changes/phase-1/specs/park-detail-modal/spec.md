## ADDED Requirements

### Requirement: Modal opens when a park is selected
The ParkDetailModal SHALL render when `$searchStore.selectedPark` is non-null. It SHALL be hidden (not rendered or visibility-hidden) when `selectedPark` is null.

#### Scenario: Modal visible when park selected
- **WHEN** `$searchStore.selectedPark` is a ParkResult
- **THEN** the modal overlay is visible

#### Scenario: Modal hidden when no park selected
- **WHEN** `$searchStore.selectedPark` is null
- **THEN** the modal is not rendered

### Requirement: Modal displays full park details
The modal SHALL display: park name, all amenity icons with text labels, distance in miles (1 decimal), travel time in minutes (if available), and a Google Maps directions link.

#### Scenario: Park name shown
- **WHEN** the modal is open for a park with name "Oak Hill Park"
- **THEN** "Oak Hill Park" is visible in the modal

#### Scenario: Amenity icons and labels shown
- **WHEN** the park has `amenities: ["playground", "restroom"]`
- **THEN** both the playground and restroom icons with their labels are visible

#### Scenario: Travel time shown when available
- **WHEN** `travelTimes` has an entry for the selected park
- **THEN** the travel time (e.g., "12 min") is shown in the modal

#### Scenario: Travel time omitted when pending
- **WHEN** no travel time entry exists for the selected park
- **THEN** no travel time text is shown (not an error)

#### Scenario: Google Maps link present
- **WHEN** the modal is open
- **THEN** a link formatted as `https://www.google.com/maps/dir/?api=1&destination={lat},{lon}` is present

### Requirement: Google Maps link opens in a new tab
The Google Maps directions link SHALL have `target="_blank"` and `rel="noopener noreferrer"`.

#### Scenario: Link opens in new tab
- **WHEN** the Google Maps link is rendered
- **THEN** it has `target="_blank"` attribute

### Requirement: Modal closes via button, outside click, or Escape key
The modal SHALL have a close button. Clicking the overlay background (outside the modal content) SHALL also close it. Pressing the Escape key SHALL close it. All close actions SHALL call `clearSelectedPark()`.

#### Scenario: Close button works
- **WHEN** the close button in the modal is clicked
- **THEN** `clearSelectedPark()` is called and the modal closes

#### Scenario: Escape key closes modal
- **WHEN** the Escape key is pressed while the modal is open
- **THEN** `clearSelectedPark()` is called and the modal closes

#### Scenario: Outside click closes modal
- **WHEN** the user clicks the modal overlay background
- **THEN** `clearSelectedPark()` is called and the modal closes
