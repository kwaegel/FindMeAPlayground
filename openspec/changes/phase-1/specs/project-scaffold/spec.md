## ADDED Requirements

### Requirement: Project initializes with Svelte + Vite
The project SHALL be a plain Svelte + Vite SPA (not SvelteKit). `npm run dev` SHALL start the Vite dev server with hot reload. `npm run build` SHALL produce a `dist/` directory suitable for Cloudflare Pages static hosting.

#### Scenario: Dev server starts
- **WHEN** `npm run dev` is run in the project root
- **THEN** a local dev server starts with hot module replacement enabled

#### Scenario: Production build succeeds
- **WHEN** `npm run build` is run
- **THEN** a `dist/` directory is created with no build errors and no warnings

### Requirement: Cloudflare Pages Functions directory exists
The project SHALL include a `functions/api/` directory for Cloudflare Pages Functions. This directory structure is required for Pages to recognize and deploy Worker functions.

#### Scenario: Functions directory present
- **WHEN** the project is built
- **THEN** a `functions/api/` directory exists at the project root

### Requirement: Test runner is configured
Vitest SHALL be configured and `npm test` SHALL run the test suite. The initial scaffold MAY have zero tests; the runner SHALL exit cleanly in that case.

#### Scenario: Test command runs cleanly
- **WHEN** `npm test` is run with no test files present
- **THEN** the process exits with code 0

### Requirement: ESLint and Prettier are configured
ESLint SHALL be configured with the Svelte plugin. Prettier SHALL be configured with the Svelte plugin. `npm run lint` and `npm run format` SHALL be available scripts.

#### Scenario: Lint passes on scaffold
- **WHEN** `npm run lint` is run on the freshly scaffolded project
- **THEN** no lint errors are reported

### Requirement: Lucide icons are importable
Lucide icon components SHALL be importable in Svelte files without build errors.

#### Scenario: Lucide import works
- **WHEN** a Svelte component imports a Lucide icon (e.g., `import { Baby } from 'lucide-svelte'`)
- **THEN** the build succeeds and the icon renders

### Requirement: Wrangler is a dev dependency
Wrangler SHALL be listed in `devDependencies` so that `npx wrangler pages dev` works for local simulation of the Cloudflare Pages + Functions environment. It SHALL NOT be required as a global install.

#### Scenario: Wrangler available via npx
- **WHEN** `npx wrangler --version` is run in the project root after `npm install`
- **THEN** a wrangler version string is printed without a global install
