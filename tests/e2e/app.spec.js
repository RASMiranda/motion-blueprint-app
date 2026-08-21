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
