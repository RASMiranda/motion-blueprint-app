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

Files: `index.html` (the app), `sw.js` (service worker), `manifest.webmanifest` (Web App Manifest), and `icons/` (PNG icons at the sizes Android/PWABuilder require). No build step, no dependencies.

The manifest and icons are real, static files — not generated at runtime — so external tools like PWABuilder's analyzer can fetch and read them directly when packaging the Android app. `icons/` also includes the two source SVGs the PNGs were rendered from, in case the icon design ever needs updating.

# Motion Blueprint

...

## For developers
See `DEVELOPMENT.md` for setup and deployment notes.
See `CHANGELOG.md` for version history.
me-less wrapper — the app's offline support and local data both come from the service worker and localStorage exactly as they do in the browser, not from anything bundled into the APK itself.

## Credit

Program content and structure by Jason & Lauren Pak, Theory of Motion (theoryofmotion.co). This app is an unofficial, personal-use companion tool for following along with their published program.
