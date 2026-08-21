#!/usr/bin/env node
/* ============================================================
   check-pwa-readiness.js — fast, zero-dependency static checks
   that codify PWA_BUILDER_CHECKLIST.md into something CI can
   actually enforce, instead of a checklist a human has to
   remember to eyeball before every deploy.

   Checks:
     1. manifest.webmanifest parses as valid JSON
     2. every icon the manifest references exists on disk
     3. index.html's apple-touch-icon / favicon links exist on disk
     4. no absolute ("/...") local asset paths (breaks when served
        from a GitHub Pages project subpath, e.g. /motion-blueprint-app/)
     5. sw.js's CACHE_VERSION was bumped whenever a precached file
        (index.html, sw.js, js/**, manifest.webmanifest) changed —
        this is a best-effort check: it only runs when a base ref
        to diff against is available (see resolveBaseRef below),
        and warns rather than fails when it isn't.

   Usage: node scripts/check-pwa-readiness.js
   Exit code 0 = all required checks passed, 1 = at least one failed.
   ============================================================ */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const failures = [];
const warnings = [];

function ok(msg) { console.log(`  \x1b[32m✓\x1b[0m ${msg}`); }
function fail(msg) { failures.push(msg); console.log(`  \x1b[31m✗\x1b[0m ${msg}`); }
function warn(msg) { warnings.push(msg); console.log(`  \x1b[33m!\x1b[0m ${msg}`); }

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

/* ---------- 1 & 2: manifest is valid JSON, icons exist ---------- */
console.log('Manifest');
let manifest;
try {
  manifest = JSON.parse(readFile('manifest.webmanifest'));
  ok('manifest.webmanifest is valid JSON');
} catch (e) {
  fail(`manifest.webmanifest is not valid JSON: ${e.message}`);
}

if (manifest) {
  const icons = Array.isArray(manifest.icons) ? manifest.icons : [];
  if (icons.length === 0) {
    fail('manifest has no "icons" entries');
  }
  icons.forEach((icon) => {
    const rel = String(icon.src || '').replace(/^\.\//, '');
    if (!rel || !fs.existsSync(path.join(ROOT, rel))) {
      fail(`manifest icon not found on disk: ${icon.src}`);
    } else {
      ok(`icon exists: ${icon.src} (${icon.sizes || 'no sizes'}, ${icon.purpose || 'any'})`);
    }
  });
}

/* ---------- 3: apple-touch-icon / favicon referenced in index.html exist ---------- */
console.log('\nindex.html icon links');
const html = readFile('index.html');
const linkRe = /<link[^>]+rel="(apple-touch-icon|icon)"[^>]+href="([^"]+)"/g;
let m;
let foundLinks = 0;
while ((m = linkRe.exec(html))) {
  foundLinks++;
  const rel = m[2].replace(/^\.\//, '');
  if (!fs.existsSync(path.join(ROOT, rel))) {
    fail(`index.html references missing icon: ${m[2]}`);
  } else {
    ok(`${m[1]} exists: ${m[2]}`);
  }
}
if (foundLinks === 0) warn('no apple-touch-icon/favicon <link> tags found in index.html');

/* ---------- 4: no absolute local paths (breaks on a Pages subpath) ---------- */
console.log('\nRelative paths');
// Matches href="/..." or src="/..." but not "//" (protocol-relative) and
// not scheme-qualified URLs (those never reach this branch since they
// start with a letter, not "/").
const absPathRe = /(?:href|src)="\/(?!\/)[^"]*"/g;
const absMatches = html.match(absPathRe) || [];
if (absMatches.length === 0) {
  ok('no absolute-rooted local paths in index.html');
} else {
  absMatches.forEach((s) => fail(`absolute local path (breaks on a Pages subpath): ${s}`));
}

/* ---------- 5: CACHE_VERSION bumped when precached files changed ---------- */
console.log('\nService worker cache version');
const PRECACHED_SOURCE_FILES = ['index.html', 'sw.js', 'js/session-utils.js', 'manifest.webmanifest'];

function resolveBaseRef() {
  // Prefer an explicit ref passed in by CI (the workflow knows the real
  // PR base / previous push sha far more reliably than we can guess it).
  if (process.env.PWA_CHECK_BASE_REF) return process.env.PWA_CHECK_BASE_REF;
  try {
    execSync('git rev-parse HEAD~1', { cwd: ROOT, stdio: 'ignore' });
    return 'HEAD~1';
  } catch (e) {
    return null;
  }
}

function currentCacheVersion() {
  const match = readFile('sw.js').match(/CACHE_VERSION\s*=\s*'([^']+)'/);
  return match ? match[1] : null;
}

function cacheVersionAt(ref) {
  try {
    const content = execSync(`git show ${ref}:sw.js`, { cwd: ROOT, encoding: 'utf8' });
    const match = content.match(/CACHE_VERSION\s*=\s*'([^']+)'/);
    return match ? match[1] : null;
  } catch (e) {
    return null; // sw.js didn't exist at that ref, or the ref is unreachable
  }
}

const baseRef = resolveBaseRef();
if (!baseRef) {
  warn('no base ref to diff against (shallow clone / single commit?) — skipping cache-version check');
} else {
  let changed = [];
  try {
    // A single ref (not `base...HEAD`) diffs against the working tree,
    // not just the last committed state — so this also catches an
    // uncommitted precache-file edit before you even commit it. In CI,
    // the working tree already equals HEAD, so this is equivalent to
    // diffing base against HEAD there.
    changed = execSync(`git diff --name-only ${baseRef}`, { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch (e) {
    warn(`could not diff against ${baseRef} — skipping cache-version check (${e.message.split('\n')[0]})`);
  }

  const precacheTouched = changed.some((f) => PRECACHED_SOURCE_FILES.includes(f));
  if (!precacheTouched) {
    ok(`no precached file changed since ${baseRef} — cache version bump not required`);
  } else {
    const before = cacheVersionAt(baseRef);
    const after = currentCacheVersion();
    if (before === null) {
      warn(`could not read CACHE_VERSION at ${baseRef} — skipping comparison`);
    } else if (before === after) {
      fail(`a precached file changed but CACHE_VERSION in sw.js is still '${after}' — bump it so visitors actually get the update`);
    } else {
      ok(`CACHE_VERSION bumped: '${before}' → '${after}'`);
    }
  }
}

/* ---------- summary ---------- */
console.log('');
if (failures.length > 0) {
  console.log(`\x1b[31m${failures.length} check(s) failed:\x1b[0m`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log(`\x1b[32mAll PWA readiness checks passed.\x1b[0m${warnings.length ? ` (${warnings.length} warning(s))` : ''}`);
