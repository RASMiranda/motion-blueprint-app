// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');

const FIXTURE_EXPORT = path.join(__dirname, 'fixtures', 'sample-export.json');

// A fresh service-worker registration makes the app auto-reload itself once
// (see index.html's `controllerchange` handler) — wait for the SW to take
// control and give that reload a moment to happen before interacting, so
// tests don't race it.
async function gotoAndSettle(page, path = '/') {
  await page.goto(path);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);
  await page.waitForLoadState('load').catch(() => {});
}

// Drives one full workout end to end: pick the Total Body plan, open its
// first day, check off one set, click through every block, and finish.
// Returns nothing — caller asserts on wherever the flow lands.
async function logAFullWorkout(page) {
  await page.locator('.plan-card', { hasText: 'Total Body Blueprint' }).click();
  await page.locator('#daylist-items .day-card').first().click();
  await expect(page.locator('#screen-workout')).toBeVisible();

  // Mark the first set of the first exercise as done, so the finished
  // session has a non-zero doneSets count.
  await page.locator('.set-row .check').first().click();

  // Click through every block; on the last one this same button finishes
  // the workout (see nextBlock() in index.html — no separate confirm step).
  for (let i = 0; i < 10; i++) {
    if (await page.locator('#screen-complete').evaluate(el => el.classList.contains('active'))) break;
    await page.locator('#workout-next').click();
  }
  await expect(page.locator('#screen-complete')).toBeVisible();
}

test.describe('Motion Blueprint', () => {
  test('home screen loads with both training plans', async ({ page }) => {
    await gotoAndSettle(page);
    await expect(page.locator('#screen-home')).toBeVisible();
    await expect(page.locator('.hero h1')).toContainText('Motion');
    await expect(page.locator('.plan-card', { hasText: 'Total Body Blueprint' })).toBeVisible();
    await expect(page.locator('.plan-card', { hasText: 'Upper / Lower Blueprint' })).toBeVisible();
  });

  test('shows an install-the-app banner with a working APK link when run as a browser tab', async ({ page }) => {
    await gotoAndSettle(page);
    const banner = page.locator('#install-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Get the app');

    const link = page.locator('#install-banner-link');
    await expect(link).toHaveAttribute('href', /^https:\/\/github\.com\/RASMiranda\/motion-blueprint-app\/releases\/download\/.+\/Motion\.apk$/);
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('hides the install banner when already running as the installed app', async ({ page }) => {
    // Stub matchMedia before any page script runs, so isInstalledApp() sees
    // display-mode: standalone as matching — the same signal a real
    // installed/TWA session reports.
    await page.addInitScript(() => {
      const realMatchMedia = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        if (typeof query === 'string' && query.includes('display-mode: standalone')) {
          return /** @type {MediaQueryList} */ ({
            matches: true, media: query,
            addListener(){}, removeListener(){},
            addEventListener(){}, removeEventListener(){},
            dispatchEvent(){ return true; }
          });
        }
        return realMatchMedia(query);
      };
    });

    await gotoAndSettle(page);
    await expect(page.locator('#install-banner')).not.toHaveClass(/show/);
    await expect(page.locator('#install-banner')).not.toBeVisible();
  });

  test('About screen links to the GitHub repo', async ({ page }) => {
    await gotoAndSettle(page);
    await page.locator('.quick-btn', { hasText: "Coaches' Note" }).click();
    await expect(page.locator('#screen-about')).toBeVisible();

    const link = page.locator('#github-repo-link');
    await expect(link).toBeVisible();
    await expect(link).toContainText('View source on GitHub');
    await expect(link).toHaveAttribute('href', 'https://github.com/RASMiranda/motion-blueprint-app');
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('exercise alternatives show a "why pick this" hint from the source program', async ({ page }) => {
    await gotoAndSettle(page);
    await page.locator('.plan-card', { hasText: 'Total Body Blueprint' }).click();
    await page.locator('#daylist-items .day-card').first().click();
    await expect(page.locator('#screen-workout')).toBeVisible();

    // Block A (Power Development) has no alternatives with a "why" — only
    // block B (Squat Variations / Rear Delts) does. Advance one block.
    await page.locator('#workout-next').click();

    const squatCard = page.locator('.exercise-card').first();
    await expect(squatCard.locator('.option-toggle button').first()).toContainText('Barbell Back Squat');

    // Default option (Barbell Back Squat) has no stated reason to pick it
    // over the alternative — no hint shown.
    await expect(squatCard.locator('.option-why')).toHaveCount(0);

    // Selecting the alternative (Dumbbell Goblet Squat) reveals why you'd
    // pick it, straight from the source program.
    await squatCard.locator('.option-toggle button', { hasText: 'Dumbbell Goblet Squat' }).click();
    await expect(squatCard.locator('.option-why')).toContainText('No barbell or squat rack');

    // Switching back hides it again.
    await squatCard.locator('.option-toggle button', { hasText: 'Barbell Back Squat' }).click();
    await expect(squatCard.locator('.option-why')).toHaveCount(0);
  });

  test('logging a workout adds it to Progress', async ({ page }) => {
    await gotoAndSettle(page);
    await logAFullWorkout(page);

    await page.locator('button.tab-btn[data-tab="screen-progress"]').click();
    await expect(page.locator('#screen-progress')).toBeVisible();

    const firstCard = page.locator('#progress-list .session-card').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('.session-main .info .t')).toContainText('Day 1');
  });

  test('export downloads a JSON file with the logged session', async ({ page }) => {
    await gotoAndSettle(page);
    await logAFullWorkout(page);
    await page.locator('button.tab-btn[data-tab="screen-progress"]').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('.io-btn', { hasText: 'Export' }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^motion-blueprint-sessions-\d{4}-\d{2}-\d{2}\.json$/);

    // The confirmation toast must name this exact file, so the person
    // knows what to look for afterward instead of guessing.
    await expect(page.locator('#toast')).toContainText(download.suggestedFilename());
    await expect(page.locator('#toast')).toContainText('Downloads');

    const savePath = path.join(os.tmpdir(), `mb-export-test-${Date.now()}.json`);
    await download.saveAs(savePath);
    const payload = JSON.parse(fs.readFileSync(savePath, 'utf8'));
    fs.unlinkSync(savePath);

    expect(payload.app).toBe('motion-blueprint');
    expect(payload.type).toBe('session-export');
    expect(Array.isArray(payload.sessions)).toBe(true);
    expect(payload.sessions.length).toBeGreaterThanOrEqual(1);
    expect(payload.sessions[0]).toHaveProperty('day');
    expect(payload.sessions[0]).toHaveProperty('date');
  });

  test('import merges sessions from a file and skips them on re-import', async ({ page }) => {
    await gotoAndSettle(page);
    await page.locator('button.tab-btn[data-tab="screen-progress"]').click();
    await expect(page.locator('#progress-list')).toContainText('No sessions logged yet');

    await page.locator('#import-file-input').setInputFiles(FIXTURE_EXPORT);
    await expect(page.locator('#toast')).toContainText('Imported 1 session');
    await expect(page.locator('#progress-list .session-card')).toHaveCount(1);
    await expect(page.locator('#progress-list')).toContainText('Imported Fixture Session');

    // Re-importing the exact same file should be recognized as a
    // duplicate (same session id) and not create a second card.
    await page.locator('#import-file-input').setInputFiles(FIXTURE_EXPORT);
    await expect(page.locator('#toast')).toContainText('already here');
    await expect(page.locator('#progress-list .session-card')).toHaveCount(1);
  });

  test('Progress screen shows migration guidance and export is a no-op with nothing logged', async ({ page }) => {
    await gotoAndSettle(page);
    await page.locator('button.tab-btn[data-tab="screen-progress"]').click();

    // The hint that tells webapp users how to bring their history to the APK.
    await expect(page.locator('.io-hint')).toContainText('Export');
    await expect(page.locator('.io-hint')).toContainText('Import');

    // Exporting with zero logged sessions should not trigger a download —
    // just a toast — since there'd be nothing meaningful in the file.
    let downloadFired = false;
    page.once('download', () => { downloadFired = true; });
    await page.locator('.io-btn', { hasText: 'Export' }).click();
    await expect(page.locator('#toast')).toContainText('No sessions to export yet');
    expect(downloadFired).toBe(false);
  });

  test('works offline after the first load (service worker precache)', async ({ page, context }) => {
    await gotoAndSettle(page);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 10000 });

    await context.setOffline(true);
    await page.reload();

    await expect(page.locator('#screen-home')).toBeVisible();
    await expect(page.locator('.hero h1')).toContainText('Motion');
    await expect(page.locator('.plan-card', { hasText: 'Total Body Blueprint' })).toBeVisible();

    await context.setOffline(false);
  });
});
