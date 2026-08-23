# Motion Blueprint

An offline-first training app built around the Theory of Motion program by Jason & Lauren Pak. No app store, no account, no internet connection needed once it's loaded.

## What's inside

- **Two training plans** — 3-Day Total Body or 4-Day Upper/Lower, pick your path
- **Guided warm-ups** — the full 6-step flow (breathing → lower body → upper body → total body → prehab → core) for each training day
- **Workout tracker** — log weight, reps, and RPE per set, with exercise-swap options built in (e.g. barbell vs. dumbbell)
- **Rest timer** — tap to start, with a live countdown ring
- **RPE dial** — a quick-reference dial for calibrating effort (1–10 scale)
- **Progress log** — see completed sessions and sets logged over time, with export/import to move your history between devices or installs
- **Works offline** — the whole app is cached on first load; no signal needed at the gym

## Get the app

**Recommended — install the Android app**
1. Download `Motion.apk` from the [latest release](https://github.com/RASMiranda/motion-blueprint-app/releases/latest)
2. Tap the downloaded file to install (Android will ask permission to install from this source the first time — allow it)
3. Launch it from your home screen like any other app

**Backup — use it in the browser**
The same app runs live at **https://rasmiranda.github.io/motion-blueprint-app/** — works in any browser, no install required, and can still be added to your home screen as a PWA (browser menu → Add to Home screen) if you'd rather not install the APK.

## Tech notes

Files: `index.html` (the app), `sw.js` (service worker), `js/session-utils.js` (session export/import logic), `manifest.webmanifest` (Web App Manifest), and `icons/` (PNG icons at the sizes Android packaging tools require). No build step, no dependencies for the app itself.

The manifest and icons are real, static files — not generated at runtime — so packaging tools can fetch and read them directly when building the Android package. `icons/` also includes the two source SVGs the PNGs were rendered from, in case the icon design ever needs updating.

The APK is a thin wrapper around the live site (a Trusted Web Activity) — its offline support and local data both come from the service worker and localStorage exactly as they do in the browser, not from anything bundled separately into the APK itself. In practice that means the APK rarely needs to be rebuilt: most updates reach it automatically the next time it's opened with a signal, the same way the live site updates.

## For developers
See `DEVELOPMENT.md` for setup, testing, and deployment notes.
See `CHANGELOG.md` for version history.

## Credit

Program content and structure by Jason & Lauren Pak, Theory of Motion (theoryofmotion.co). This app is an unofficial, personal-use companion tool for following along with their published program.
