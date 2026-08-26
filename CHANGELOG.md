# Changelog

## v1.3.0 (2026-08-26)

### New
- ✅ **Starting a workout pre-fills last time's numbers** — weight, reps, and RPE for each set are pre-filled from the most recent logged session of that same day, matched per exercise (so switching to an alternative exercise doesn't pull mismatched numbers). Fully editable, and the "done" checkmark always starts unchecked. Resuming an in-progress session is unaffected — only a genuinely fresh start pre-fills. [#32](https://github.com/RASMiranda/motion-blueprint-app/issues/32)

## v1.2.0 (2026-08-26)

### New
- ✅ **Workout session timer** — compact chip in the workout topbar counts elapsed time from the moment you start. Pulsing green dot while running, amber when paused. Tap to pause/resume. Timer survives a page refresh. Total workout time shown on the completion screen, in Progress session cards, and in the expanded session log editor. Tab title shows elapsed time when the app is backgrounded (visible in Android Recents)

### Full-screen app
- ✅ **Native Add-to-Home-Screen prompt** on Android Chrome — the Install banner now triggers the system dialog for a one-tap path to standalone/address-bar-free mode. Falls back to the APK link on other browsers

### Content accuracy
- ✅ **Exercise alternatives explain why** — each alternative shows the source program's reason for choosing it
- ✅ **Warm-up video previews** — every warm-up step has a demo video thumbnail, matching the exercise cards
- ✅ **Prehab + Core superset grouping** on the warm-up detail screen, matching the source program
- ✅ **Finisher circuits corrected** — three finisher blocks split into two properly separated exercise cards, each with its own video, correct rest placement (once, after the second exercise), and terse house-style notes
- ✅ **Day 4 warm-up Prehab description fixed** — was copy-pasted from Day 1's calf raise step; corrected to describe Seated Wall Slide
- ✅ **Day 4 Thruster video fixed** — compound exercise names (`/`-separated) were being truncated before the video lookup, causing the wrong video to show

### Bug fixes
- ✅ **Resume workout self-heals** — "In progress" banner on Home no longer silently fails when the saved workout pre-dates a content update
- ✅ **Day-select cards consistent width** — short day titles no longer render a narrower card than long ones
- ✅ **About screen** links to the GitHub repository

## v1.1.0 (2026-08-21)
- ✅ Export logged sessions to a JSON file, Import them back in — built for moving from the browser version to the installed app, with no server involved
- ✅ Re-importing the same file is a no-op (deduped by session id), so it's safe to import more than once by accident
- ✅ Export confirmation names the exact file saved and where it went, instead of a vague message
- ✅ Migration guidance directly on the Progress screen explaining the browser → app move
- ✅ Automated test suite (unit + end-to-end) and a CI quality gate: every change now has to pass before it can reach the live site

## v1.0.0 (2026-08-20)
- ✅ Full workout persistence across reloads (localStorage)
- ✅ Real static manifest and icons for PWABuilder
- ✅ Service worker precaches all assets for true offline
- ✅ Resume-in-progress workout banner on Home screen
- ✅ Progress tracking with per-exercise detail logging
- ✅ Both training plans (3-Day Total Body, 4-Day Upper/Lower)
- ✅ Guided warm-ups, RPE dial, rest timer

## v0.9.0 (2026-08-19)
- Fixed service worker cache-busting (updateViaCache: 'none')
- Removed notes field from session editor
- Read-only "Sets done" display (derived from logged checkmarks)

## v0.8.0 (2026-08-16)
- Initial stable release
