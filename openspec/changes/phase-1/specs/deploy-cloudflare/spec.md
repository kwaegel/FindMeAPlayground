## ADDED Requirements

### Requirement: Git push to main triggers automatic Cloudflare Pages deployment
The repository SHALL be connected to a Cloudflare Pages project. Pushing to the `main` branch SHALL automatically trigger a build and deployment. The build command SHALL be `npm run build` and the output directory SHALL be `dist`.

#### Scenario: Push triggers deploy
- **WHEN** a commit is pushed to the `main` branch
- **THEN** Cloudflare Pages automatically builds and deploys the updated app

### Requirement: App is accessible at the Cloudflare Pages URL
After deployment, the app SHALL be reachable at the `.pages.dev` subdomain assigned by Cloudflare, with no authentication required.

#### Scenario: Pages URL serves the app
- **WHEN** the Pages URL is opened in a browser
- **THEN** the FindMeAPlayground app loads with no errors

### Requirement: Custom domain findmeaplayground.com is configured
The Cloudflare Pages project SHALL have `findmeaplayground.com` configured as a custom domain. DNS SHALL route the domain to Cloudflare Pages.

#### Scenario: Custom domain serves the app
- **WHEN** `https://findmeaplayground.com` is opened in a browser
- **THEN** the app loads correctly with a valid TLS certificate

### Requirement: ORS API key is stored as a Worker secret
The ORS API key SHALL be stored in the Cloudflare dashboard as a Worker secret named `ORS_API_KEY`. It SHALL NOT appear in any committed file or build output.

#### Scenario: Secret not in source
- **WHEN** the repository is searched for the ORS API key string
- **THEN** no match is found in any committed file

### Requirement: Production build is fully functional
All features SHALL work in the production Cloudflare environment: address geocoding, park search, map display, travel time proxy, amenity filters, local storage persistence, and the Google Maps link.

#### Scenario: Travel time proxy responds in production
- **WHEN** a search is performed on the deployed app
- **THEN** travel times load for the visible results via `/api/travel-times`
