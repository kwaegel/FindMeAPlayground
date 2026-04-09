## ADDED Requirements

### Requirement: Worker accepts POST with origin and destinations
The Cloudflare Worker at `functions/api/travel-times.js` SHALL accept `POST` requests with a JSON body containing `origin: [lon, lat]` and `destinations: [[lon, lat], ...]`. All other HTTP methods SHALL return 405.

#### Scenario: POST accepted
- **WHEN** a valid POST request is sent to `/api/travel-times`
- **THEN** a 200 response is returned

#### Scenario: GET returns 405
- **WHEN** a GET request is sent to `/api/travel-times`
- **THEN** a 405 response is returned

### Requirement: Worker validates input and rejects invalid requests
The Worker SHALL return 400 with a descriptive error JSON for: missing `origin` or `destinations` fields, `destinations` array length of 0 or >50, and non-numeric coordinate values.

#### Scenario: Missing origin returns 400
- **WHEN** the request body has no `origin` field
- **THEN** a 400 response with `{ "error": "..." }` is returned

#### Scenario: Too many destinations returns 400
- **WHEN** `destinations` contains 51 entries
- **THEN** a 400 response with `{ "error": "destinations must contain 1-50 coordinate pairs" }` is returned

### Requirement: Worker proxies to ORS matrix endpoint
The Worker SHALL call the ORS matrix endpoint (`https://api.openrouteservice.org/v2/matrix/driving-car`) with the ORS API key from the `ORS_API_KEY` environment variable (Worker secret), passing origin and destinations in GeoJSON format.

#### Scenario: ORS key not exposed to client
- **WHEN** the client calls `/api/travel-times`
- **THEN** the ORS API key is never present in the response or client-accessible headers

### Requirement: Worker returns times array with null for unreachable destinations
The 200 response body SHALL be `{ "times": [number | null, ...] }` in the same order as `destinations`. Destinations ORS cannot route to SHALL have `null` in their position.

#### Scenario: Valid response returns times
- **WHEN** ORS returns a successful matrix response
- **THEN** the Worker returns `{ "times": [seconds, ...] }` matching destination order

#### Scenario: Unreachable destination returns null
- **WHEN** ORS returns null for a destination
- **THEN** the corresponding position in `times` is `null`

### Requirement: Worker returns 502 on ORS failure
If the ORS request fails (network error, non-2xx response, timeout), the Worker SHALL return 502 with `{ "error": "Travel time service unavailable" }`.

#### Scenario: ORS error returns 502
- **WHEN** the ORS API returns a non-2xx response
- **THEN** the Worker returns 502 with the error message

### Requirement: Worker adds CORS headers
The Worker SHALL include `Access-Control-Allow-Origin` restricted to the deployed app origin. Preflight OPTIONS requests SHALL be handled with a 204 response and appropriate CORS headers.

#### Scenario: CORS header present
- **WHEN** a valid POST is made
- **THEN** the response includes `Access-Control-Allow-Origin`

### Requirement: Client travelTime.js calls the proxy and merges times into the store
The `src/services/travelTime.js` module SHALL export `getTravelTimes(origin, parks[])`. It SHALL POST to `/api/travel-times`, batch requests if `parks.length > 50`, and call `mergeTravelTimes()` on the store with the resulting `Map<parkId, seconds>`.

#### Scenario: getTravelTimes calls proxy
- **WHEN** `getTravelTimes(origin, parks)` is called with mocked fetch
- **THEN** a POST to `/api/travel-times` is made with correct body

#### Scenario: Batching for >50 parks
- **WHEN** `getTravelTimes()` is called with 51 parks
- **THEN** two separate requests are made (50 + 1)
