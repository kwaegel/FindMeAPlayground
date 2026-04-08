# Requirements: FindMeAPlayground

## 1. Overview

FindMeAPlayground is a web application that helps parents discover playgrounds and parks near a given location in the United States. Users enter an address or use their device's GPS, select a search radius, and browse results on an interactive map and sorted list. Each result links out to Google Maps for navigation, making it easy to use on the go with Android Auto or similar driving direction apps.

The primary user is the developer (an experienced backend programmer exploring frontend/web tooling) who wants to find new playgrounds for their child. The app should be publicly accessible via a shareable link (potentially at a custom domain like FindMeAPlayground.com) so that family and friends can use it too, though traffic is expected to remain in the low single digits.

The core lookup experience is stateless — no account is needed to search. A planned Phase 2 adds user accounts so that users can mark parks as visited, leave personal notes, and favorite parks, with data synced across devices.

## 2. Goals and Success Criteria

- A user can search for parks/playgrounds near any US address and see useful results within a few seconds.
- Results are displayed on an interactive map and as a scrollable list, sorted by distance (closest first).
- The app works well in a mobile browser without requiring installation or offline support.
- The app is cheap to operate at personal scale (single-digit users, free-tier APIs where possible).
- The developer learns frontend/web development skills in the process of building it.

## 3. Users and Personas

### Primary: Parent (the developer)
- Experienced backend programmer, new to frontend/web development.
- Wants to find new playgrounds for their child.
- Uses the app on both desktop (for planning) and mobile (on the go).
- Cares about seeing amenities, distance, and getting driving directions quickly.

### Secondary: Family/friends
- Non-technical users who receive a shared link.
- Expect a clean, intuitive interface that works on their phone's browser.
- May or may not create an account (Phase 2).

## 4. Functional Requirements

### 4.1 Location Input

- **FR-001**: The app shall display a text input box where the user can type a US address or place name and submit it as their search origin.
  - Acceptance criteria: User types an address, presses enter or a search button, and results update based on that location.
  - Priority: must-have

- **FR-002**: The app shall display a "use current location" icon/button adjacent to the address input that uses the browser's geolocation API to set the search origin.
  - Acceptance criteria: Tapping the icon prompts for location permission, and on approval, sets the search origin to the device's GPS coordinates.
  - Priority: must-have

- **FR-003**: No address autocomplete is required for the initial release.
  - Priority: out of scope (may revisit later)

### 4.2 Search Radius

- **FR-010**: The app shall provide a dropdown to select a search radius of 5, 10, or 15 miles.
  - Acceptance criteria: Dropdown displays three options; changing the selection updates results.
  - Priority: must-have

- **FR-011**: The default search radius shall be 5 miles.
  - Acceptance criteria: On first load (or cleared local storage), the dropdown is set to 5 miles.
  - Priority: must-have

### 4.3 Amenity Filtering

- **FR-020**: The app shall allow the user to filter results by amenities. The initial amenity categories are: playground, restroom, hiking trail.
  - Acceptance criteria: User can select one or more amenity filters; results update to show only parks matching ALL selected amenities (AND logic).
  - Priority: must-have

- **FR-021**: The amenity list should be expanded over time based on useful tags available from the data provider(s). The system should be designed to accommodate additional amenity types without significant rework.
  - Acceptance criteria: Adding a new amenity filter requires minimal code changes.
  - Priority: should-have

### 4.4 Results — List View

- **FR-030**: The app shall display search results in a list, sorted by distance from the search origin (closest first).
  - Acceptance criteria: Results are ordered by ascending distance.
  - Priority: must-have

- **FR-031**: Each list item shall display: park name, distance (straight-line), travel time (if available), amenity tags/icons, and a link to Google Maps for navigation directions.
  - Acceptance criteria: All listed fields are visible for each result; Google Maps link opens in a new tab or the device's maps app.
  - Priority: must-have

- **FR-032**: The initial results set shall show approximately 20 results. Additional results shall be loaded via a "show more" button (infinite scroll pattern).
  - Acceptance criteria: First load shows ~20 results; pressing "show more" appends the next batch.
  - Priority: must-have

### 4.5 Results — Map View

- **FR-040**: The app shall display search results on a fully interactive map (pan, zoom, clickable pins).
  - Acceptance criteria: Map renders with pins for each result; user can pan and zoom; map and list are visible together or easily toggled.
  - Priority: must-have

- **FR-041**: Clicking a pin on the map shall navigate to or reveal that park's detail page.
  - Acceptance criteria: Pin click opens the detail view for the corresponding park.
  - Priority: must-have

- **FR-042**: The map shall support a "search from here" action triggered by right-click (desktop) or long-press (mobile) on any point on the map.
  - Acceptance criteria: Right-click/long-press shows a context option; selecting it re-runs the search centered on the clicked/pressed location.
  - Priority: should-have

### 4.6 Park Detail Page

- **FR-050**: Each park shall have a detail page displaying: name, amenities, distance, travel time (if available), and a link to Google Maps for navigation.
  - Acceptance criteria: Detail page loads with all listed information.
  - Priority: must-have

- **FR-051**: The detail page shall display photos from the data provider, if licensing terms permit.
  - Acceptance criteria: Photos are displayed with any required attribution. If licensing does not permit photo use, photos are omitted entirely and the user relies on the Google Maps outbound link.
  - Priority: should-have (contingent on licensing research)

### 4.7 Distance and Travel Time

- **FR-060**: The app shall display straight-line distance from the search origin for each result.
  - Acceptance criteria: Distance is shown in miles for each park in both the list and detail views.
  - Priority: must-have

- **FR-061**: The app shall display estimated travel time (driving) from the search origin for each result, if a suitable routing API is available within budget.
  - Acceptance criteria: Travel time is shown alongside distance. If no routing API is feasible, this field is omitted gracefully.
  - Priority: should-have (contingent on routing API research)

### 4.8 Local Storage / State Persistence

- **FR-070**: The app shall persist the user's last search state (location, radius, selected filters) in the browser's local storage.
  - Acceptance criteria: Closing and reopening the app restores the previous search location, radius, and filter selections.
  - Priority: should-have

### 4.9 Phase 2 — User Accounts and Personal Data

- **FR-080**: Users shall be able to create an account and log in.
  - Acceptance criteria: User can sign up, log in, and log out. Authentication method TBD (OAuth and/or email/password).
  - Priority: nice-to-have (Phase 2)

- **FR-081**: Logged-in users shall be able to mark a park as "visited."
  - Acceptance criteria: A toggle or button on the detail page marks/unmarks a park as visited; status persists across sessions and devices.
  - Priority: nice-to-have (Phase 2)

- **FR-082**: Logged-in users shall be able to add personal notes to a park.
  - Acceptance criteria: A text field on the detail page allows saving/editing free-text notes; notes persist across sessions and devices.
  - Priority: nice-to-have (Phase 2)

- **FR-083**: Logged-in users shall be able to favorite a park.
  - Acceptance criteria: A favorite toggle on the detail or list view marks/unmarks a park; favorited parks persist across sessions and devices.
  - Priority: nice-to-have (Phase 2)

## 5. Non-Functional Requirements

- **NFR-001**: The app shall be a responsive website that works in modern mobile and desktop browsers. No native app or PWA/offline support is required.
- **NFR-002**: Search results should load within a few seconds under normal conditions.
- **NFR-003**: The app shall use a clean, minimalist visual design consistent with modern mapping applications. It is designed for parents, not children.
- **NFR-004**: The app shall not introduce obvious security vulnerabilities (e.g., XSS, exposed API keys in client code, open admin endpoints).
- **NFR-005**: The app shall function correctly for the expected user base (low single-digit concurrent users). High-scale performance is not a requirement.
- **NFR-006**: API and hosting costs shall remain within free-tier limits at personal-scale usage. Cost should be revisited if usage grows.
- **NFR-007**: Basic accessibility — the app should be usable and not cause errors, but formal WCAG compliance is not required.

## 6. Constraints

- **C-001**: Geographic scope is the United States.
- **C-002**: Budget for hosting and third-party APIs is effectively zero for the initial release (free tiers only). A custom domain (~$23/year) is acceptable.
- **C-003**: The developer is experienced in backend programming but new to frontend/web development. Technology choices should account for learning curve.
- **C-004**: Photo display is contingent on data provider licensing. If licensing is not permissive, photos must be omitted (users click through to Google Maps instead).
- **C-005**: Travel time display is contingent on routing API availability within budget. Straight-line distance is the fallback.

## 7. Assumptions

- A suitable free or low-cost data source (OpenStreetMap, Google Places, or similar) exists that covers US parks and playgrounds with amenity tags.
- Browser geolocation is sufficiently accurate on mobile devices for the "use current location" feature.
- Google Maps outbound links (for navigation) do not require an API key or incur costs.
- The developer will be the primary person building, deploying, and maintaining the app.

## 8. Open Questions

- **OQ-001**: Which data source(s) should be used (OpenStreetMap, Google Places, other)? What are the licensing terms, data quality, and amenity tag coverage for each? *(Recommended: sub-agent research)*
- **OQ-002**: Which routing API (OSRM, Mapbox, Google Directions, other) is best suited for travel time estimates within the free/cheap budget constraint? *(Recommended: sub-agent research)*
- **OQ-003**: Do the candidate data providers allow displaying photos in a third-party app? What attribution is required? *(Research alongside OQ-001)*
- **OQ-004**: What map tile provider and mapping library should be used for the interactive map? *(To be determined during solution design)*
- **OQ-005**: What authentication method(s) should Phase 2 use (OAuth providers, email/password, magic links)? *(To be determined during Phase 2 planning)*
- **OQ-006**: What does the full set of useful amenity tags look like once sample data from the chosen provider(s) is available? *(To be explored after data source is selected)*

## 9. Out of Scope

- Native mobile apps (iOS/Android).
- Offline or PWA functionality.
- Address autocomplete (may revisit later).
- User-uploaded photos or user-generated content beyond personal notes.
- Contributing edits back to upstream data providers (e.g., editing OpenStreetMap).
- Ratings or reviews of parks.
- Sharing lists of visited/favorited parks between users.
- High-scale performance optimization (beyond single-digit concurrent users).
- Formal WCAG accessibility compliance.

## 10. Glossary

- **Park**: A general term for any public outdoor space that may appear in search results, including playgrounds, nature preserves, recreation areas, etc.
- **Playground**: A specific type of park amenity — an area with play equipment designed for children.
- **Search origin**: The geographic point from which distances and travel times are calculated, set by the user via address input or GPS.
- **Amenity**: A feature or facility at a park (e.g., playground equipment, restrooms, hiking trails).
- **Phase 2**: A planned future development phase that adds user accounts and personal data features (visited status, notes, favorites). Not required for initial launch.
- **Straight-line distance**: The geographic distance "as the crow flies" between two points, as opposed to driving distance along roads.
- **Travel time**: Estimated driving time from the search origin to a park, calculated via a routing API.
