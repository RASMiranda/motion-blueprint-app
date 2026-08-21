# Motion Blueprint — Development Guide

## Quick start
```bash
git clone https://github.com/RASMiranda/motion-blueprint-app.git
cd motion-blueprint-app
python3 -m http.server 8000
# Open http://localhost:8000 in browser
```

## File organization
- **index.html** — entire app (HTML + CSS + JS inline)
- **js/session-utils.js** — session id/export/import logic, pulled out of index.html so it's unit-testable and shared with `tests/unit/`
- **sw.js** — service worker; bump `CACHE_VERSION` on every deploy
- **manifest.webmanifest** — Web App Manifest (real static file, not generated)
- **icons/** — PNG icons (192/512 "any" + "maskable" variants, Apple touch, favicon)
- **scripts/check-pwa-readiness.js** — static checks (manifest validity, icons exist, no absolute paths, `CACHE_VERSION` bumped) — the automated version of `PWA_BUILDER_CHECKLIST.md`
- **tests/unit/** — `node --test`, zero dependencies
- **tests/e2e/** — Playwright, drives a real browser against the app

## Testing
```bash
npm install
npm run check:pwa   # static PWA-readiness checks
npm run test:unit   # pure-logic unit tests (node --test)
npm run test:e2e    # Playwright end-to-end (installs its own browser: npx playwright install --with-deps chromium)
npm test            # all three, in order
```
These three checks are also what CI (`.github/workflows/deploy.yml`) runs on every push and PR, and gate the GitHub Pages deploy — see the **CI / deploy gate** section below.

## Before deploying
1. Make changes to `index.html`, `sw.js`, or other files
2. **Test locally**: `python3 -m http.server 8000`, open http://localhost:8000
3. **Verify service worker update**: open DevTools → Application → Service Workers
4. Bump `CACHE_VERSION` in `sw.js` whenever you touch a precached file (`index.html`, `sw.js`, `js/session-utils.js`, `manifest.webmanifest`) — e.g., `v9` → `v10`. `npm run check:pwa` catches a forgotten bump.
5. Run `npm test` (or let CI do it) before merging
6. Commit and push to main → CI re-runs the same checks, then deploys to GitHub Pages only if they pass

## CI / deploy gate
GitHub Pages is configured to deploy via Actions (Settings → Pages → Source: "GitHub Actions"), not "Deploy from branch" — so a push to `main` only reaches the live site once the `test` job in `deploy.yml` passes (static checks + unit tests + Playwright E2E). A PR shows the same `test` job as a required status check before it can be merged.

## Known constraints
- **localStorage** only — data persists per-browser, not synced across devices
- **Offline only after first load** — service worker needs to install first
- **Achilles tendinopathy note** (from user context): running volume is constrained; favor low-impact aerobic work (bike, swim, pool running)

## Next priorities
- [ ] Cross-device data sync (Firebase or similar)
- [ ] Native Android APK via PWABuilder
- [ ] Optional: dark mode toggle, settings panel
