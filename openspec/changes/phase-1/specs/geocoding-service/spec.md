## ADDED Requirements

### Requirement: geocode() returns coordinates for a valid US address
`geocode(query)` SHALL call the Nominatim `/search` endpoint with `countrycodes=us&format=jsonv2&limit=1` and return `{ lat: number, lon: number, displayName: string }` on success.

#### Scenario: Valid address resolves
- **WHEN** `geocode("Arlington, VA")` is called
- **THEN** an object with numeric `lat`, `lon`, and a non-empty `displayName` string is returned

#### Scenario: Results are US-scoped
- **WHEN** `geocode()` is called with any query
- **THEN** the Nominatim request includes `countrycodes=us`

### Requirement: geocode() throws a descriptive error for unresolvable addresses
If Nominatim returns an empty result array, `geocode()` SHALL throw an error with the message "Address not found".

#### Scenario: Unknown address throws
- **WHEN** `geocode("zzznotaplace12345xyz")` is called and Nominatim returns `[]`
- **THEN** an error with message "Address not found" is thrown

### Requirement: geocode() throws on network failure
If the Nominatim request fails with a network error, `geocode()` SHALL throw an error with the message "Geocoding service unavailable".

#### Scenario: Network error throws
- **WHEN** the Nominatim request rejects with a network error
- **THEN** an error with message "Geocoding service unavailable" is thrown

### Requirement: geocode() enforces 1-second minimum between requests
The service SHALL not send a new Nominatim request sooner than 1 second after the previous one. Subsequent calls during the cooldown SHALL queue and wait for the cooldown to expire.

#### Scenario: Rapid calls are throttled
- **WHEN** `geocode()` is called twice in rapid succession (< 1 second apart)
- **THEN** the second request is not sent until at least 1 second after the first
