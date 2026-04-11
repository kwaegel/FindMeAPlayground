## 1. Research

- [x] 1.1 Fetch wrangler v4 migration guide via Context7 (`/cloudflare/workers-sdk`) and note any breaking changes relevant to `wrangler pages dev` and Pages Functions
- [x] 1.2 Check Node.js version in use (`.nvmrc` or `node --version`) — confirm it meets wrangler v4's minimum (Node 18+)
- [x] 1.3 Scan `package.json` scripts for any `wrangler` CLI invocations that might need flag updates

## 2. Upgrade

- [x] 2.1 Edit `package.json`: change `"wrangler": "^3.101.0"` to `"wrangler": "^4.0.0"`
- [x] 2.2 Run `npm install` to regenerate `package-lock.json` with the v4 dependency tree
- [x] 2.3 Review `git diff package-lock.json` — confirm only the wrangler subtree changed (esbuild, miniflare, undici bumps expected)

## 3. Verify

- [x] 3.1 Run `npm audit` — expect zero vulnerabilities
- [x] 3.2 Run `npm test` — expect all tests pass
- [x] 3.3 Run `npm run build` — expect clean output to `dist/`
- [x] 3.4 Run `wrangler pages dev dist/` and confirm the `/api/travel-times` route loads the Pages Function without errors (smoke test — no live ORS key required, just verify the function loads)

## 4. Commit

- [ ] 4.1 Commit `package.json` and `package-lock.json` with message referencing the security fix
