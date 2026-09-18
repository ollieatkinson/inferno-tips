import { test, expect, type Page } from '@playwright/test';

async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
}
async function lesson(page: Page, name: string) {
  await page.getByRole('button', { name: 'Practice drills', exact: true }).click();
  await page.getByRole('button').filter({ has: page.getByRole('heading', { name, exact: true }) }).click();
}
async function start(page: Page, challenge = true) {
  if (challenge) await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await page.getByRole('button', { name: challenge ? 'Start challenge' : 'Start guided practice', exact: true }).click();
  const ms = challenge ? 600 : 900;
  for (let i = 0; i < 3; i++) await page.clock.runFor(ms);
  await expect(page.getByText('Preparing tick 1', { exact: true })).toBeVisible();
}
const targets = [8,6,16,18,12,2,22,10,14];
async function perfectRun(page: Page, id: string, ms = 600) {
  for (let tick = 1; tick <= 36; tick++) {
    const key = id === 'rhythm' ? (tick % 4 === 1 ? '1' : '0') : id === 'blob' ? (Math.floor((tick - 1) / 3) % 2 === 0 ? '1' : '2') : ['stack', 'movement'].includes(id) ? ((tick - 1) % 4 < 2 ? '1' : '2') : (tick % 2 === 1 ? '1' : '2');
    await page.keyboard.press(key);
    if (['movement', 'gauntlet'].includes(id) && tick % 4 === 0) await page.getByRole('button', { name: new RegExp(`Tile ${targets[Math.floor((tick - 1) / 4)] % 5 + 1}, ${Math.floor(targets[Math.floor((tick - 1) / 4)] / 5) + 1}, target`) }).click();
    await page.clock.runFor(ms);
  }
  await expect(page.getByRole('region', { name: 'Run results' })).toBeVisible();
  await expect(page.locator('.result-score')).toHaveText('100%');
}

test('overview, local artwork, resources, and credits render without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await open(page);
  await expect(page.getByRole('heading', { name: 'Your cape starts here.' })).toBeVisible();
  expect(await page.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: 'test-results/overview-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Guides & resources' }).click();
  await expect(page.getByRole('link', { name: /Watch the original guide/ })).toHaveAttribute('href', 'https://www.youtube.com/watch?v=6trKOSUr4EM');
  await expect(page.getByRole('link', { name: /Try a wave layout/ })).toHaveAttribute('href', 'https://los.inferno.tips/');
  await page.getByRole('link', { name: 'Credits & sources' }).click();
  await expect(page.getByRole('heading', { name: 'Game artwork' })).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [id, name] of [['rhythm', 'Find your rhythm'], ['blob', 'Read the blob'], ['alternate', 'One tick at a time'], ['stack', 'Handle the stack'], ['movement', 'Switch & step'], ['gauntlet', 'Put it all together']]) {
  test(`${id}: complete a perfect challenge through real controls`, async ({ page }) => {
    await open(page); await lesson(page, name); await page.clock.install(); await page.clock.pauseAt(new Date());
    await start(page); await perfectRun(page, id);
    await expect(page.getByText('✓ Mastery pass earned')).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('inferno-tips-progress-v1')!));
    expect(saved[id]).toMatchObject({ attempts: 1, best: 100, passes: 1 });
  });
}

test('two passes master a lesson, persist on reload, and reset only after confirmation', async ({ page }) => {
  await open(page); await lesson(page, 'Read the blob'); await page.clock.install(); await page.clock.pauseAt(new Date());
  await start(page); await perfectRun(page, 'blob');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.clock.runFor(600);
  await perfectRun(page, 'blob');
  await page.reload(); await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await page.getByRole('button', { name: 'Your progress', exact: true }).click();
  await expect(page.locator('.progress-table').getByText('2/2 passes')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset saved progress' }).click();
  await page.getByRole('button', { name: 'Keep progress' }).click();
  await expect(page.locator('.progress-table').getByText('2/2 passes')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset saved progress' }).click();
  await page.getByRole('button', { name: 'Delete progress', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('inferno-tips-progress-v1'))).toBeNull();
});

test('guided runs and paused challenges never award mastery', async ({ page }) => {
  await open(page); await lesson(page, 'Handle the stack'); await page.clock.install(); await page.clock.pauseAt(new Date());
  await start(page, false); await perfectRun(page, 'stack', 900);
  await expect(page.getByText('Guided run · practice credit')).toBeVisible();
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await start(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Take a breath.' })).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.locator('.run-stats').getByText('0 / 36')).toBeVisible();
  await page.getByRole('button', { name: 'Resume practice', exact: true }).click();
  await page.clock.runFor(600);
  await perfectRun(page, 'stack');
  await expect(page.getByText('Paused run · practice credit')).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('inferno-tips-progress-v1')!));
  expect(saved.stack).toMatchObject({ attempts: 2, passes: 0, practiceBest: 100, best: 0 });
});

test('missed prayers receive specific feedback and no passing score', async ({ page }) => {
  await open(page); await lesson(page, 'Read the blob'); await page.clock.install(); await page.clock.pauseAt(new Date());
  await start(page);
  for (let i = 0; i < 36; i++) await page.clock.runFor(600);
  await expect(page.locator('.result-score')).toHaveText('0%');
  await expect(page.getByText(/Your next focus: blob reads/)).toBeVisible();
  await page.getByText('Review all 12 checks').click();
  await expect(page.locator('.review-list .incorrect')).toHaveCount(12);
});

test('mobile has usable navigation, movement, and no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/overview-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Guides & resources' }).click();
  await expect(page.getByRole('heading', { name: 'Good practice. Great teachers.' })).toBeVisible();
  await lesson(page, 'Switch & step');
  await page.getByRole('button', { name: 'Tile 4, 2, target' }).click();
  await expect(page.getByRole('button', { name: 'Tile 4, 2, target, player' })).toBeVisible();
  await page.getByRole('button', { name: 'Magic 1', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Magic 1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: 'test-results/trainer-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('corrupt or blocked storage cannot prevent practice', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('inferno-tips-progress-v1', '{bad'));
  await open(page);
  await page.getByRole('button', { name: 'Your progress', exact: true }).click();
  await expect(page.locator('.progress-table').getByText('0/2 passes')).toHaveCount(6);
  await page.addInitScript(() => { Object.defineProperty(Storage.prototype, 'getItem', { value: () => { throw new Error('Storage blocked'); } }); });
  await page.reload();
  await expect(page.getByRole('status')).toContainText('Browser storage is unavailable');
  await page.getByRole('button', { name: 'Start learning' }).click();
  await expect(page.getByRole('button', { name: 'Start guided practice' })).toBeVisible();
});
