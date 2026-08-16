# Motion Blueprint

An offline-first training app built around the Theory of Motion program by Jason & Lauren Pak. Installs straight to your Android home screen — no app store, no account, no internet connection needed once it's loaded.

## What's inside

- **Two training plans** — 3-Day Total Body or 4-Day Upper/Lower, pick your path
- **Guided warm-ups** — the full 6-step flow (breathing → lower body → upper body → total body → prehab → core) for each training day
- **Workout tracker** — log weight, reps, and RPE per set, with exercise-swap options built in (e.g. barbell vs. dumbbell)
- **Rest timer** — tap to start, with a live countdown ring
- **RPE dial** — a quick-reference dial for calibrating effort (1–10 scale)
- **Progress log** — see completed sessions and sets logged over time
- **Works offline** — the whole app is cached on first load; no signal needed at the gym

## Install on Android

**Option A — as a installable web app (fastest, no build step)**
1. Open `index.html` on your phone in Chrome — either host it (e.g. via GitHub Pages) or transfer the file directly to your device and open it locally
2. Tap the **⋮** menu → **Add to Home screen**
3. Launch it from your home screen like any other app

**Option B — as a real APK**
1. Host `index.html` at a public URL (e.g. GitHub Pages — see below)
2. Go to [pwabuilder.com](https://www.pwabuilder.com), paste the URL
3. Download the generated Android package

### Hosting on GitHub Pages
Repo Settings → Pages → Source: `Deploy from branch` → `main` / `root` → Save. Your app will be live at `https://<username>.github.io/motion-blueprint-app/`.

## Tech notes

Two files: `index.html` (the app) and `sw.js` (the service worker). No build step, no dependencies. Uses a Web App Manifest (generated inline) and a real, static Service Worker file to enable offline caching and home-screen installability.

**Deploying an update:** after pushing a change to `index.html`, open `sw.js` and bump `CACHE_VERSION` (e.g. `'v2'` → `'v3'`) in the same commit. This tells visitors' browsers a new version exists, so they get it automatically on their next visit — no manual cache-clearing needed. Skipping this step means the update may not reach people who've already loaded the app once, since the service worker serves the network's latest copy by default but still needs a version bump to properly retire old cached assets.

## Credit

Program content and structure by Jason & Lauren Pak, Theory of Motion (theoryofmotion.co). This app is an unofficial, personal-use companion tool for following along with their published program.
