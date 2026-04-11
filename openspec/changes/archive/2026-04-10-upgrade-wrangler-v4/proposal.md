## Why

All 4 open `npm audit` vulnerabilities (3 moderate, 1 high) live entirely inside the `wrangler` devDependency subtree — specifically in the `esbuild@0.17.19` and `undici@5.29.0` copies bundled within wrangler v3 — and have no patch path on v3. Upgrading to wrangler v4 is the only available fix.

## What Changes

- Bump `wrangler` devDependency from `^3.101.0` to `^4.x` in `package.json`.
- Re-run `npm install` to regenerate `package-lock.json` with the patched dependency tree.
- Verify `npm audit` reports zero vulnerabilities after the upgrade.
- Confirm `wrangler pages dev` still works correctly with the existing `functions/api/travel-times.js` ORS proxy (no behavioral changes to the function itself).

No production code changes. No changes to `src/`, `functions/`, or any runtime behavior.

## Capabilities

### New Capabilities
<!-- None — this is a pure devDependency upgrade with no new application capabilities. -->

### Modified Capabilities
<!-- None — no spec-level behavior changes. The wrangler CLI is a local dev tool only. -->

## Impact

- **`package.json`**: `wrangler` version range bumped.
- **`package-lock.json`**: Regenerated with patched `esbuild` and `undici` transitive versions.
- **Dev workflow**: `wrangler pages dev` and `wrangler pages deploy` commands should be unaffected; v4 migration guide notes minimal breaking changes for Pages Functions users.
- **CI/CD**: Cloudflare Pages build environment uses its own wrangler version — this change only affects the local devDependency.
- **No risk to end users**: All affected packages are devDependencies that never ship to production.
