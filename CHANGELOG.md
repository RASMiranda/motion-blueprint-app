# Changelog

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
