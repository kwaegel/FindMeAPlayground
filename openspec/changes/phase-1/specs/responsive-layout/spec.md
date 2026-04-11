## ADDED Requirements

### Requirement: Desktop layout uses sidebar + map split
At viewport widths greater than 768px, the App Shell SHALL display search controls and the results list in a left sidebar, with the map filling the remaining horizontal space on the right. Both panels SHALL be full viewport height.

#### Scenario: Desktop shows side-by-side layout
- **WHEN** the viewport width is 900px
- **THEN** the sidebar and map are displayed side-by-side with the map on the right

### Requirement: Mobile layout stacks controls above map and list
At viewport widths 768px and below, the App Shell SHALL display search controls at the top, with the map and results list stacked below (map first, then list). No horizontal scrolling SHALL occur.

#### Scenario: Mobile shows stacked layout
- **WHEN** the viewport width is 375px
- **THEN** search controls appear above the map, and the list appears below the map

#### Scenario: No horizontal scroll on mobile
- **WHEN** the viewport width is 375px
- **THEN** the page does not scroll horizontally

### Requirement: Layout is clean and minimalist
The visual design SHALL be clean and functional — not playful or childish. Typography SHALL be legible. Color palette SHALL be neutral with one accent color. No decorative borders, gradients, or animations beyond simple transitions.

#### Scenario: No horizontal overflow at any breakpoint
- **WHEN** the viewport is set to 320px width (smallest common mobile)
- **THEN** all content is contained within the viewport width

### Requirement: App Shell renders all child components
The App Shell (App.svelte or a Layout component) SHALL render: SearchBar, RadiusDropdown, AmenityFilters, ResultsList, MapView, and ParkDetailModal. It SHALL pass no props directly — all children subscribe to the store.

#### Scenario: All components present in rendered output
- **WHEN** the App Shell renders with no store state
- **THEN** the SearchBar, RadiusDropdown, and MapView DOM elements are present
