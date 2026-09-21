import { test, expect, type Page } from '@playwright/test';
const key = 'inferno-tips-zuk-timer-v1';
async function ready(page: Page, path = '/zuk-timer/') {
  await page.clock.install({ time: new Date('2026-09-21T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-21T12:00:01Z'));
  await page.goto(path);
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
}
async function next(page: Page, name: string) {
  await page.getByRole('button', { name, exact: true }).click();
  await page.clock.runFor(500);
}
async function deadline(page: Page) {
  return page.evaluate(
    (k) => JSON.parse(sessionStorage.getItem(k)!).state.deadline,
    key,
  );
}
test('phase controls pause once, preserve deadlines at Jad death, and warn before healers', async ({
  page,
}) => {
  await ready(page);
  await expect(page.getByRole('timer')).toHaveText('3:30');
  await next(page, 'First set spawned');
  await page.clock.runFor(9500);
  await next(page, 'Below 600 HP');
  const paused = await page.getByRole('timer').textContent();
  await page.clock.fastForward(60000);
  await expect(page.getByRole('timer')).toHaveText(paused!);
  await next(page, 'Jad spawned');
  const due = await deadline(page);
  await page
    .getByRole('button', { name: 'Set under control', exact: true })
    .click();
  await next(page, 'Jad defeated');
  expect(await deadline(page)).toBe(due);
  await page.clock.fastForward(220000);
  await expect(page.locator('.zuk-advice')).toContainText('Next set is close');
  await next(page, 'Healers spawned');
  expect(await deadline(page)).toBe(due);
  await expect(page.locator('.zuk-advice')).toHaveCount(0);
  await expect(page.locator('.zuk-phase-help')).toContainText(
    'do not pause or reset',
  );
});
test('background catch-up, reload, undo and reset work in mobile Focus mode', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page, '/zuk-timer/?focus=1');
  await expect(
    page.getByRole('button', { name: 'Exit focus mode' }),
  ).toBeVisible();
  await next(page, 'First set spawned');
  const initial = await deadline(page);
  await page
    .getByRole('button', { name: 'Set under control', exact: true })
    .click();
  await page.clock.setSystemTime(new Date(initial + 220000));
  await page.clock.runFor(200);
  expect(await deadline(page)).toBe(initial + 420000);
  await expect(
    page.getByRole('button', { name: 'Set under control', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('.zuk-notice')).toContainText('Timer restored');
  expect(await deadline(page)).toBe(initial + 420000);
  await next(page, 'Below 600 HP');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await deadline(page)).toBe(initial + 420000);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Reset timer', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Keep timer', exact: true }).click();
  expect(await deadline(page)).toBe(initial + 420000);
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('button', { name: 'Reset timer', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('3:30');
  await expect(
    page.getByRole('button', { name: 'First set spawned', exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test('a fresh set keeps the healer caution visible until marked under control', async ({
  page,
}) => {
  await ready(page);
  for (const name of [
    'First set spawned',
    'Below 600 HP',
    'Jad spawned',
    'Jad defeated',
  ])
    await next(page, name);
  await page
    .getByRole('button', { name: 'Set under control', exact: true })
    .click();
  await page.clock.fastForward(315000);
  await expect(page.locator('.zuk-advice')).toContainText(
    'Don’t spawn healers yet',
  );
  await page
    .getByRole('button', { name: 'Set under control', exact: true })
    .click();
  await expect(page.locator('.zuk-advice')).toContainText('Check your setup');
  await page
    .getByRole('button', { name: 'Set spawned now', exact: true })
    .click();
  await expect(page.locator('.zuk-advice')).toContainText(
    'Don’t spawn healers yet',
  );
});

test('page clicks advance once and leave controls, text selection and reset independent', async ({
  page,
}) => {
  await ready(page);
  await expect(
    page.getByRole('button', { name: 'Fullscreen', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('timer').dblclick();
  await expect(page.locator('.zuk-phase')).toHaveText('Before Jad');
  await page.clock.runFor(500);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await expect(page.locator('.zuk-phase')).toHaveText('Before Jad');
  await page
    .getByRole('button', { name: 'Set under control', exact: true })
    .click();
  await page.getByRole('button', { name: 'Add 5 seconds' }).click();
  await expect(page.locator('.zuk-phase')).toHaveText('Before Jad');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await page.getByRole('timer').click();
  await expect(page.locator('.zuk-phase')).toHaveText('Before Jad');
  await page.getByRole('button', { name: 'Keep timer' }).click();
  await page.locator('.zuk-shell').click({ position: { x: 3, y: 3 } });
  await expect(page.locator('.zuk-phase')).toContainText('timer paused');
  await page.clock.runFor(500);
  await page.evaluate(() => {
    const selection = window.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('.zuk-phase')!);
    selection.removeAllRanges();
    selection.addRange(range);
    document.querySelector<HTMLElement>('.zuk-digits')!.click();
  });
  await expect(page.locator('.zuk-phase')).toContainText('timer paused');
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  await next(page, 'Jad spawned');
  await expect(page.locator('.zuk-phase')).toHaveText('Jad is alive');
});

test.describe('touch phase changes', () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test('taps on the clock and page background work in Focus mode', async ({
    page,
  }) => {
    await ready(page, '/zuk-timer/?focus=1');
    await page.getByRole('timer').tap();
    await expect(page.locator('.zuk-phase')).toHaveText('Before Jad');
    await page.getByRole('timer').tap();
    await expect(page.locator('.zuk-phase')).toHaveText('Before Jad');
    await page.clock.runFor(500);
    await page.touchscreen.tap(3, 3);
    await expect(page.locator('.zuk-phase')).toContainText('timer paused');
    await page.clock.runFor(500);
    await page.getByRole('button', { name: 'Exit focus mode' }).tap();
    await expect(page.locator('.zuk-phase')).toContainText('timer paused');
    await page.getByRole('timer').tap();
    await expect(page.locator('.zuk-phase')).toHaveText('Jad is alive');
  });
});
