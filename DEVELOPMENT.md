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
- **sw.js** — service worker; bump `CACHE_VERSION` on every deploy
- **manifest.webmanifest** — Web App Manifest (real static file, not generated)
- **icons/** — PNG icons (192/512 "any" + "maskable" variants, Apple touch, favicon)

## Before deploying
1. Make changes to `index.html`, `sw.js`, or other files
2. **Test locally**: `python3 -m http.server 8000`, open http://localhost:8000
3. **Verify service worker update**: open DevTools → Application → Service Workers
4. Bump `CACHE_VERSION` in `sw.js` (e.g., `v9` → `v10`)
5. Commit and push to main → auto-deploys to GitHub Pages

## Known constraints
- **localStorage** only — data persists per-browser, not synced across devices
- **Offline only after first load** — service worker needs to install first
- **Achilles tendinopathy note** (from user context): running volume is constrained; favor low-impact aerobic work (bike, swim, pool running)

## Next priorities
- [ ] Cross-device data sync (Firebase or similar)
- [ ] Native Android APK via PWABuilder
- [ ] Optional: dark mode toggle, settings panel
