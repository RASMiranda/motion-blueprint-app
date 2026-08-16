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

Single self-contained `index.html` — no build step, no dependencies. Uses a Web App Manifest and a Service Worker (both generated inline at runtime) to enable offline caching and home-screen installability.

## Credit

Program content and structure by Jason & Lauren Pak, Theory of Motion (theoryofmotion.co). This app is an unofficial, personal-use companion tool for following along with their published program.
