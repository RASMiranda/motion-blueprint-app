# PWABuilder Readiness Checklist

Most of this is now enforced automatically by `npm run check:pwa`
(`scripts/check-pwa-readiness.js`), which also runs in CI on every push
and PR before the site deploys. What's left below is what only a human
eyeballing pwabuilder.com's own report card can catch.

Before uploading to pwabuilder.com:

- [ ] Manifest (`manifest.webmanifest`) is real static file, not Blob
- [ ] All 4 icons present and correct sizes (192, 512, maskable variants)
- [ ] Service worker active and precaching all assets
- [ ] Test offline: kill local server, reload → app still works
- [ ] localStorage data persists across reloads
- [ ] No console errors or unhandled promise rejections
- [ ] Favicon set (`icons/favicon-32.png`)
- [ ] Apple touch icon set (`icons/apple-touch-icon.png`)
- [ ] Theme color matches manifest (`#141414`)
- [ ] All links use relative paths (`./` not `/`)

PWABuilder will report these automatically, but this checklist catches issues early.
