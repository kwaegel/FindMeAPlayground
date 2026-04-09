## ADDED Requirements

### Requirement: searchParks() returns ParkResult array
`searchParks(lat, lon, radiusMeters)` SHALL query the Overpass API and return an array of `ParkResult` objects. Each result SHALL include: `id` (string, e.g. "way/12345"), `name` (string), `lat` (number), `lon` (number), `amenities` (string[]), `distanceMiles` (number), `travelTimeSeconds` (null initially), and `osmTags` (object with raw OSM tags).

#### Scenario: Returns typed results
- **WHEN** `searchParks(38.8951, -77.0364, 8047)` is called with a mocked Overpass response
- **THEN** an array of `ParkResult` objects is returned with all required fields present

### Requirement: Overpass query fetches parks and playgrounds
The Overpass QL query SHALL request `leisure=park` and `leisure=playground` elements (nodes, ways, relations) within the given radius. It SHALL use `out center tags` to include centroid coordinates for ways and relations.

#### Scenario: Query targets correct leisure types
- **WHEN** `searchParks()` constructs a query
- **THEN** the query body includes `"leisure"="park"` and `"leisure"="playground"` with `around:{radiusMeters},{lat},{lon}` filters

### Requirement: Way and relation elements use centroid coordinates
For OSM elements of type `way` or `relation`, the `lat` and `lon` of the `ParkResult` SHALL be taken from `center.lat` / `center.lon` in the Overpass response.

#### Scenario: Way centroid used
- **WHEN** the Overpass response contains a `way` element with a `center` object
- **THEN** the resulting `ParkResult` uses `center.lat` and `center.lon`

### Requirement: Unnamed parks get a fallback name
If an OSM element has no `name` tag, the `ParkResult.name` SHALL be set to `"Unnamed Park"`.

#### Scenario: Missing name falls back
- **WHEN** an Overpass element has no `tags.name`
- **THEN** the resulting `ParkResult.name` is `"Unnamed Park"`

### Requirement: Haversine distance is calculated for each result
Each `ParkResult.distanceMiles` SHALL be the great-circle distance in miles from the search origin `(lat, lon)` to the park's centroid, calculated using the Haversine formula.

#### Scenario: Distance calculated correctly
- **WHEN** `searchParks()` is called and results are parsed
- **THEN** each result's `distanceMiles` is a positive number representing the distance from the search origin

### Requirement: Results are sorted by ascending distance
The returned array SHALL be sorted with the closest park first.

#### Scenario: Sorted ascending
- **WHEN** Overpass returns multiple parks at different distances
- **THEN** the returned array is ordered from smallest `distanceMiles` to largest

### Requirement: Amenities are derived from OSM tags on the element
The `amenities` array SHALL be populated by inspecting the element's own OSM tags. At minimum: elements tagged `leisure=playground` include `"playground"` in amenities; elements with `amenity=toilets` include `"restroom"`; elements with `highway=path` and a `sac_scale` tag include `"hiking-trail"`.

#### Scenario: Playground tag detected
- **WHEN** an element has tag `leisure=playground`
- **THEN** `"playground"` appears in the result's `amenities` array

#### Scenario: Restroom tag detected
- **WHEN** an element has tag `amenity=toilets`
- **THEN** `"restroom"` appears in the result's `amenities` array

### Requirement: Overpass errors are thrown descriptively
On an Overpass timeout or HTTP error, `searchParks()` SHALL throw an error with the message "Search failed, please try again." On a network failure, it SHALL throw "Park search service unavailable."

#### Scenario: Timeout throws
- **WHEN** the Overpass request returns a non-2xx HTTP status
- **THEN** an error with message "Search failed, please try again." is thrown

#### Scenario: Network error throws
- **WHEN** the Overpass fetch rejects with a network error
- **THEN** an error with message "Park search service unavailable." is thrown
