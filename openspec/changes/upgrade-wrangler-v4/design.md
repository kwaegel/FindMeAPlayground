## Context

`wrangler@3.114.17` is the current devDependency. It bundles its own copies of `esbuild@0.17.19` (inside its own `node_modules`) and `miniflare`, which in turn depends on `undici@5.29.0`. These pinned transitive versions carry 4 open CVEs with no patch path in wrangler v3:

| Advisory | Package | Severity |
|---|---|---|
| GHSA-67mh-4wv8-2f99 | esbuild ≤0.24.2 | moderate |
| GHSA-g9mf-h72j-4rw9 | undici <6.23.0 | moderate |
| GHSA-2mjp-6q6p-2qxm | undici <6.24.0 | moderate |
| GHSA-vrm6-8vpv-qv8q | undici <6.24.0 | high |
| GHSA-v9p9-hfj2-hcw8 | undici <6.24.0 | high |

`npm audit fix` without `--force` makes no changes. `npm audit fix --force` suggests `wrangler@4.81.1` as the resolution.

The project uses wrangler only as a local CLI tool (`wrangler pages dev` for local emulation of the `functions/api/travel-times.js` Cloudflare Pages Function). There is no `wrangler.toml` — the Pages project is configured via the Cloudflare dashboard. The Cloudflare Pages build environment manages its own wrangler version independently.

## Goals / Non-Goals

**Goals:**
- Upgrade `wrangler` devDependency to `^4.x` so `npm audit` reports zero vulnerabilities.
- Confirm `wrangler pages dev` still correctly emulates the ORS proxy function locally.
- Ensure `npm run build` and the full test suite continue to pass.

**Non-Goals:**
- Changing any code in `src/` or `functions/`.
- Pinning wrangler to an exact version (range `^4.x` is appropriate for a devDependency).
- Upgrading Node.js (only if wrangler v4 requires a minimum that isn't already met).
- Touching Cloudflare Pages dashboard configuration or deploy settings.

## Decisions

**Upgrade directly to `^4.x` (not a specific patch)**

Wrangler v4 is the stable major line recommended by Cloudflare. Using `^4.x` allows non-breaking patch updates automatically. No reason to pin a specific minor/patch — the Pages Functions API surface is stable and the project has no wrangler config file that could be affected by incidental wrangler updates.

*Alternative considered*: Pin to `4.81.1` (the exact version `audit fix --force` suggested). Rejected — semver range is more maintainable and `^4.x` stays in the same major.

**No `wrangler.toml` changes expected**

The project has no `wrangler.toml`. Wrangler v4's schema tightening only affects projects with config files. Verify after install, but no changes anticipated.

**Read migration guide before upgrading**

Use Context7 (`/cloudflare/workers-sdk`) to fetch wrangler v4 migration docs. The key surface area for this project is the `wrangler pages dev` command and Pages Functions runtime compatibility.

## Risks / Trade-offs

**[Risk] Wrangler v4 drops or renames a CLI flag used in dev workflow**
→ Mitigation: Check migration guide before bumping. The `wrangler pages dev` command interface is stable; Pages Functions routing is unchanged.

**[Risk] Wrangler v4 requires a newer Node.js minimum**
→ Mitigation: Check `.nvmrc` or Node version in use. Wrangler v4 requires Node 18+; this is unlikely to be an issue on a current dev machine but should be confirmed.

**[Risk] `npm install` introduces unexpected transitive upgrades beyond wrangler**
→ Mitigation: Review `git diff package-lock.json` after install. Only wrangler's subtree should change.

## Migration Plan

1. Read wrangler v4 migration guide via Context7.
2. Edit `package.json`: change `"wrangler": "^3.101.0"` → `"wrangler": "^4.0.0"`.
3. Run `npm install` — regenerates `package-lock.json`.
4. Run `npm audit` — expect zero vulnerabilities.
5. Run `npm test` — expect all tests pass (tests don't use wrangler).
6. Run `npm run build` — expect clean production build.
7. Run `wrangler pages dev dist/ --compatibility-date=2024-01-01` against the local build and verify the `/api/travel-times` endpoint routes correctly (or at minimum that the function loads without errors).
8. Commit `package.json` + `package-lock.json`.

**Rollback**: Revert the `package.json` version bump and run `npm install`. No data or config changes to undo.

## Open Questions

- Does the project have a `.nvmrc` or `engines` field specifying a Node version? (Check before upgrading — wrangler v4 needs Node 18+.)
- Are there any npm scripts that invoke `wrangler` by name that might need flag updates? (Scan `package.json` scripts.)
