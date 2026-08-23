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

  test('warm-up steps show a video preview and demo link', async ({ page }) => {
    await gotoAndSettle(page);
    await page.locator('button.tab-btn[data-tab="screen-warmup-select"]').click();
    await expect(page.locator('#screen-warmup-select')).toBeVisible();

    await page.locator('#warmup-day-list .day-card').first().click();
    await expect(page.locator('#screen-warmup-detail')).toBeVisible();

    const firstStep = page.locator('.warmup-step').first();
    await expect(firstStep.locator('.t')).toContainText('Hooklying Breathing');

    const link = firstStep.locator('.ex-video-btn');
    await expect(link).toContainText('Watch demo');
    await expect(link).toHaveAttribute('href', /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]+$/);
    await expect(link).toHaveAttribute('target', '_blank');
  });

  test('warm-up Prehab and Core steps are grouped as a superset', async ({ page }) => {
    await gotoAndSettle(page);
    await page.locator('button.tab-btn[data-tab="screen-warmup-select"]').click();
    await page.locator('#warmup-day-list .day-card').first().click();
    await expect(page.locator('#screen-warmup-detail')).toBeVisible();

    // Steps 1-4 (Breathing, Lower Body, Upper Body, Total Body) are plain,
    // sequential steps — not part of any superset group.
    const steps = page.locator('#warmup-detail-steps > .warmup-step');
    await expect(steps).toHaveCount(4);

    // Steps 5 and 6 (Prehab, Core) are always performed back-to-back — the
    // program pairs them as a superset — and should render inside one
    // labeled group instead of as flat, separate rows. Day 1's pair is
    // Leaning Wall Calf Raises (Prehab) + Bench Reverse Plank Hip Flexor
    // Raises (Core).
    const group = page.locator('#warmup-detail-steps .wstep-superset-group');
    await expect(group).toBeVisible();
    await expect(group.locator('.wstep-superset-label')).toContainText('Superset');
    await expect(group.locator('.warmup-step')).toHaveCount(2);
    await expect(group.locator('.warmup-step').nth(0).locator('.t')).toContainText('Leaning Wall Calf Raises');
    await expect(group.locator('.warmup-step').nth(1).locator('.t')).toContainText('Bench Reverse Plank Hip Flexor Raises');
  });

  test('Day 4 Upper Body finisher shows a video for each circuit exercise', async ({ page }) => {
    // Regression test: exercises without swap options used to have their
    // name truncated at the first "/" before the video lookup (e.g.
    // "2KB/2DB Thruster" -> "2KB"), which partial-matched whichever
    // VIDEO_MAP entry starting with "2KB" happened to come first —
    // "2KB/2DB Farmer Carry" — instead of the Thruster's own video.
    //
    // The finisher is also a circuit of two distinct exercises (Thruster,
    // then Front Plank), each with its own demo video in the source PDF —
    // previously only the first ever got its own card/video; the second
    // was just plain text in the first exercise's note.
    await gotoAndSettle(page);
    await page.locator('.plan-card', { hasText: 'Upper / Lower Blueprint' }).click();
    await page.locator('#daylist-items .day-card').nth(3).click();
    await expect(page.locator('#screen-workout')).toBeVisible();

    // Blocks: A (Power), B1/B2, C1/C2, D1/D2, E (Finisher) — 4 clicks to
    // reach the finisher block.
    for (let i = 0; i < 4; i++) {
      await page.locator('#workout-next').click();
    }

    const cards = page.locator('.exercise-card');
    await expect(cards).toHaveCount(2);

    await expect(cards.nth(0).locator('.ex-name')).toContainText('Thruster');
    await expect(cards.nth(0).locator('.ex-video-btn')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=gr7TjKm0wCw');

    await expect(cards.nth(1).locator('.ex-name')).toContainText('Front Plank');
    await expect(cards.nth(1).locator('.ex-video-btn')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=B4_gxkICr5M');
  });

  test('Day 1 finisher shows a video for each circuit exercise (Farmer Carry + Plank Drag)', async ({ page }) => {
    await gotoAndSettle(page);
    await page.locator('.plan-card', { hasText: 'Total Body Blueprint' }).click();
    await page.locator('#daylist-items .day-card').first().click();
    await expect(page.locator('#screen-workout')).toBeVisible();

    // Blocks: A (Power), B1/B2, C1/C2, D1/D2, E (Finisher) — 4 clicks to
    // reach the finisher block.
    for (let i = 0; i < 4; i++) {
      await page.locator('#workout-next').click();
    }

    const cards = page.locator('.exercise-card');
    await expect(cards).toHaveCount(2);

    await expect(cards.nth(0).locator('.ex-name')).toContainText('Farmer Carry');
    await expect(cards.nth(0).locator('.ex-video-btn')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=zwoxFpyMuig');

    await expect(cards.nth(1).locator('.ex-name')).toContainText('Tall Plank KB/DB Drag');
    await expect(cards.nth(1).locator('.ex-video-btn')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=dzsJUXOhIzo');
  });

  test('Day 1 finisher only shows a rest timer after the second circuit exercise', async ({ page }) => {
    // Regression test: the source PDF lists this finisher as three
    // distinct numbered steps — 01 Farmer Carry, 02 Tall Plank KB/DB
    // Drag, 03 Rest — meaning the *one* rest happens only after both
    // exercises, not after each. The first exercise used to carry its
    // own "Start Rest Timer · 30s" button (and note text saying "then
    // rest 30s") as if a rest also happened right after it, which
    // doesn't match the real circuit and would have you resting twice
    // as long as intended.
    await gotoAndSettle(page);
    await page.locator('.plan-card', { hasText: 'Total Body Blueprint' }).click();
    await page.locator('#daylist-items .day-card').first().click();
    await expect(page.locator('#screen-workout')).toBeVisible();

    for (let i = 0; i < 4; i++) {
      await page.locator('#workout-next').click();
    }

    const cards = page.locator('.exercise-card');
    await expect(cards).toHaveCount(2);

    const farmerCarry = cards.nth(0);
    await expect(farmerCarry.locator('.ex-name')).toContainText('Farmer Carry');
    await expect(farmerCarry.locator('.ex-note')).toContainText('no rest in between');
    await expect(farmerCarry.locator('.rest-btn')).toHaveCount(0);

    const plankDrag = cards.nth(1);
    await expect(plankDrag.locator('.ex-name')).toContainText('Tall Plank KB/DB Drag');
    await expect(plankDrag.locator('.rest-btn')).toContainText('Start Rest Timer · 30s');
  });

  test('resuming an in-progress workout self-heals a set log missing for a newer exercise', async ({ page }) => {
    // Regression test: renderBlock() and finishWorkout() used to assume
    // state.setLog already had an entry for every exercise id, which
    // startWorkout() guarantees for a *freshly started* workout. But
    // resumeWorkout() (the Home screen's "in progress" banner, and the
    // state restored on page load) calls renderBlock() directly, skipping
    // that init. A session saved before a PLANS update added a second
    // exercise to a block (as happened when the Day 1 finisher was split
    // into two circuit exercises) would have no log for the new exercise's
    // id — reading it threw, resumeWorkout() never reached showScreen(),
    // and tapping the banner silently did nothing.
    await gotoAndSettle(page);
    await page.locator('.plan-card', { hasText: 'Total Body Blueprint' }).click();
    await page.locator('#daylist-items .day-card').first().click();
    await expect(page.locator('#screen-workout')).toBeVisible();

    // Blocks: A, B1/B2, C1/C2, D1/D2, E (Finisher) — 4 clicks to reach it.
    for (let i = 0; i < 4; i++) {
      await page.locator('#workout-next').click();
    }
    await expect(page.locator('.exercise-card')).toHaveCount(2);

    // Simulate a session saved before this block had a second exercise:
    // delete its set-log entry, as if it never existed. This has to
    // mutate the page's live `state` object (not just localStorage) —
    // the app's pagehide/visibilitychange autosave would otherwise
    // re-persist the untouched in-memory state and undo a plain
    // localStorage edit the instant the reload below navigates away.
    await page.evaluate(() => { delete state.setLog['t1_b4_e1']; });

    // Reload (as if reopening the app later) and resume via the Home banner.
    await gotoAndSettle(page);
    await expect(page.locator('#screen-home')).toBeVisible();
    const resumeBanner = page.locator('.resume-banner');
    await expect(resumeBanner).toContainText('Block 5 of 5');
    await resumeBanner.click();

    // Must actually navigate to the workout screen, with the self-healed
    // log rendering a full set of empty rows for the second exercise.
    await expect(page.locator('#screen-workout')).toBeVisible();
    await expect(page.locator('.exercise-card')).toHaveCount(2);
  });

  test('Day 4 warm-up Prehab step describes its own exercise, not a calf raise', async ({ page }) => {
    // Regression test: the source PDF itself pairs "Seated Wall Slide"
    // (a shoulder-mobility drill) with a description copy-pasted from
    // Day 1's "Leaning Wall Calf Raises" ("Builds calf strength and
    // ankle mobility") — wrong for this exercise even though it's an
    // error in the original material.
    await gotoAndSettle(page);
    await page.locator('button.tab-btn[data-tab="screen-warmup-select"]').click();
    await page.locator('#warmup-day-list .day-card').nth(3).click();
    await expect(page.locator('#screen-warmup-detail')).toBeVisible();

    const group = page.locator('#warmup-detail-steps .wstep-superset-group');
    const prehabStep = group.locator('.warmup-step').first();
    await expect(prehabStep.locator('.t')).toContainText('Seated Wall Slide');
    await expect(prehabStep.locator('.d')).toContainText('shoulder mobility');
    await expect(prehabStep.locator('.d')).not.toContainText('calf');
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
