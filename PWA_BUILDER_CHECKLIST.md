# PWABuilder Readiness Checklist

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
