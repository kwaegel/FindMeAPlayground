# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FindMeAPlayground is a Svelte + Vite single-page application that helps parents find playgrounds and parks near a US location. It uses the OpenStreetMap ecosystem (Overpass API for park data, Nominatim for geocoding, OpenRouteService for travel times) and displays results on a Leaflet map alongside a distance-sorted list. Hosted on Cloudflare Pages with a single Workers function to proxy ORS requests.

There is no source code yet — the project is in the design phase. `REQUIREMENTS.md` and `SPEC.md` define what to build. `AGENT-DEV-WEB.md` is the developer agent prompt.

## Tech Stack

- **Frontend**: Svelte (not SvelteKit) + Vite
- **Hosting**: Cloudflare Pages + Pages Functions (Workers)
- **Map**: Leaflet + OpenStreetMap tiles
- **APIs**: Overpass (park data, no key), Nominatim (geocoding, no key), OpenRouteService (travel times, key via Worker secret)
- **Icons**: Lucide
- **State**: Svelte writable stores + localStorage
- **Testing**: Vitest + Svelte Testing Library
- **Linting**: ESLint + Prettier with Svelte plugins
- **CSS**: Scoped Svelte styles, no CSS framework

## Planned Project Structure

```
src/
  components/      # Svelte components (PascalCase.svelte)
  stores/          # Svelte writable stores (camelCase.js)
  services/        # API clients: nominatim.js, overpass.js, travelTime.js
  config/          # Constants: amenities.js, etc.
  utils/           # Pure functions: haversine.js, etc.
  App.svelte       # Root component
  main.js          # Entry point
functions/
  api/
    travel-times.js  # Cloudflare Pages Function (ORS proxy)
tests/               # Mirrors src/ structure
```

## Commands (once scaffolded)

- `npm run dev` — Start Vite dev server with hot reload
- `npm run build` — Production build to `dist/`
- `npm test` — Run Vitest
- `wrangler dev` — Local dev with Worker + assets (simulates Cloudflare)

## Browser Testing with playwright-cli

For GUI changes that can't be verified by unit tests (layout, map interactions, modal behavior, responsive design), use `playwright-cli` to test against the running dev server.

**Dev server:** Start with `npx vite --port 5173` — no sandbox bypass needed; Vite binds to localhost within the sandbox and is reachable from outside it. All `playwright-cli` commands require `dangerouslyDisableSandbox: true` because playwright-cli writes to `/home/ky/.cache/ms-playwright/daemon/`, which is outside the sandbox's allowed write paths. Alternatively, add `~/.cache/ms-playwright/daemon/` to the `additionalDirectories` write allowlist in local or user-level settings (via `/update-config`), which lets playwright-cli run without disabling the sandbox at all.

**Default test address:** 500 Castro St, Mountain View, CA 94041

**Standard resolutions:**
- Desktop: `playwright-cli resize 1920 1080`
- Mobile (Pixel 9 Pro): `playwright-cli resize 1080 2424`

**Typical flow** (element refs are assigned at runtime — get them from `playwright-cli snapshot`):
```bash
playwright-cli open http://localhost:5173/
playwright-cli snapshot           # inspect page structure and get element refs
playwright-cli fill <address-ref> "500 Castro St, Mountain View, CA 94041"
playwright-cli click "getByRole('button', { name: 'Search' })"
playwright-cli snapshot           # verify results loaded
playwright-cli click <park-ref>   # open detail modal
playwright-cli snapshot           # verify modal content
playwright-cli console            # check for JS errors before closing
playwright-cli close
```

**Notes:**
- The travel-times 404 error in console is expected when running `npm run dev` (no Worker). Use `wrangler dev` to test travel times end-to-end.
- Use `playwright-cli screenshot` to capture the visual state when diagnosing layout issues.
- **Vite HMR does not reliably detect file changes in WSL2** (inotify limitation). If `playwright-cli` shows stale output after editing a source file, restart the Vite server (`pkill -f vite`, then `nohup npx vite --port 5173 > /tmp/claude/vite.log 2>&1 &` with `dangerouslyDisableSandbox: true`) and reload the browser.

## Architecture Decisions

- **No SvelteKit** — plain Svelte + Vite. No SSR, no file-based routing. Park detail is a modal, not a URL route.
- **Client-direct API calls** for Overpass and Nominatim (no keys needed). Only ORS is proxied to protect its API key.
- **All Overpass results fetched in one query**, paginated client-side via `visibleCount`. "Show more" does not re-query.
- **Travel times are async** — results render immediately with distance; travel times merge in when the proxy responds. UI must handle `null` travel times.
- **Amenity config is data-driven** — adding a new amenity means adding one entry to the config file and its Overpass query fragment.

## Key Technical Details

- **Haversine formula**: client-side straight-line distance calculation
- **Nominatim rate limit**: 1 req/sec, enforce with client-side debounce
- **ORS matrix limit**: 50 destinations per request, batch if needed
- **localStorage key**: `findmeaplayground_state`, debounce writes at 500ms
- **Google Maps link**: `https://www.google.com/maps/dir/?api=1&destination={lat},{lon}`
- **Overpass query**: fetches `leisure=park` and `leisure=playground` within radius; amenity association strategy needs prototyping

## Workflow

This project uses OpenSpec for change management. Key files:

- `REQUIREMENTS.md` — What to build (gathered requirements)
- `SPEC.md` — How to build it (architecture, components, implementation plan)
- `AGENT-DEV-WEB.md` — Developer agent system prompt
- `openspec/` — Change tracking artifacts

Use `/opsx:apply` to load and work through implementation tasks. Use `/opsx:propose` to create a new change. The developer agent follows test-driven development: write failing tests first, then implement.

## Conventions

- Files: `camelCase.js` for modules, `PascalCase.svelte` for components
- Variables/functions: `camelCase`; true constants: `UPPER_SNAKE_CASE`
- CSS classes: `kebab-case`
- Use `const` by default, `let` only when reassignment is needed
- Prefer early returns over nested conditionals
- Use async/await, not `.then()` chains
- Comment the "why", not the "what" — JSDoc on exports, inline comments on non-obvious logic
- Never commit API keys; ORS key is a Cloudflare Worker secret

## Agent Memory Conventions

All agents with persistent memory follow these conventions. Each agent's memory lives in `.claude/agent-memory/<agent-name>/`.

### Memory types

- **user** — Who the user is, their role, preferences, and working style. Tailor collaboration based on this.
- **feedback** — Explicit corrections, preferred approaches, things to avoid. The most important type to get right.
- **project** — Non-obvious context behind decisions: why something was built a certain way, constraints, stakeholder requirements. Not derivable from code or git history.
- **reference** — Pointers to external resources (Linear projects, Grafana boards, Slack channels, etc.).

### How to save a memory

**Step 1** — Write a file (e.g., `feedback_testing.md`) with this frontmatter:

```markdown
---
name: <memory name>
description: <one-line description — used to judge relevance in future sessions>
type: <user | feedback | project | reference>
---

<content — for feedback/project types, lead with the fact, then **Why:** and **How to apply:** lines>
```

**Step 2** — Add a one-line pointer to `MEMORY.md` (the index, not the content):
`- [Title](file.md) — one-line hook`

`MEMORY.md` is always loaded into context; keep entries under 150 characters. Never write memory content directly into it.

### What NOT to save

- Code patterns, file structure, or architecture — read the current code instead
- Git history or who changed what — `git log` / `git blame` are authoritative
- Anything already in CLAUDE.md or SPEC.md
- Ephemeral task state or in-progress work

### Staleness rule

A memory naming a specific file, function, or flag is a claim about what existed *when it was written*. Before acting on it, verify: check the file exists, grep for the function. If a memory conflicts with current code, trust the code and update or remove the memory.

### Each agent's memory directory

| Agent              | Memory path                                |
| ------------------ | ------------------------------------------ |
| spec-code-reviewer | `.claude/agent-memory/spec-code-reviewer/` |
