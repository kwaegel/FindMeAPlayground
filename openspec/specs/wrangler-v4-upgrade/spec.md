## ADDED Requirements

### Requirement: Wrangler devDependency is on v4 with a clean audit
The project SHALL use wrangler v4 (`^4.0.0`) as the devDependency, and `npm audit` SHALL report zero vulnerabilities after installation.

#### Scenario: npm audit reports no vulnerabilities
- **WHEN** a developer runs `npm audit` after `npm install` on the upgraded lockfile
- **THEN** `npm audit` exits with code 0 and reports zero vulnerabilities

### Requirement: wrangler pages dev works correctly with the ORS proxy function
The local development server SHALL still route requests to `functions/api/travel-times.js` correctly after the upgrade.

#### Scenario: Travel-times function loads without error
- **WHEN** `wrangler pages dev` is started against the built `dist/` directory
- **THEN** the dev server starts without errors and the `/api/travel-times` route is served by the Pages Function

### Requirement: Build and tests pass after upgrade
The test suite and production build SHALL succeed with no regressions after the wrangler upgrade.

#### Scenario: Test suite passes
- **WHEN** `npm test` is run after the upgrade
- **THEN** all tests pass with no failures

#### Scenario: Production build succeeds
- **WHEN** `npm run build` is run after the upgrade
- **THEN** the build completes successfully and outputs to `dist/`
