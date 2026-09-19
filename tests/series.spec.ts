import { expect, test, type Page } from '@playwright/test';
const key = 'inferno-tips-series-v1';
async function open(page: Page, mode: 'hard' | 'endless') {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto(`/#${mode}`);
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await page
    .getByRole('button', {
      name: mode === 'hard' ? 'Start hard circuit' : 'Start endless gauntlet',
      exact: true,
    })
    .click();
  for (let i = 0; i < 3; i++) await page.clock.runFor(600);
}
async function prayer(page: Page, name: 'Magic' | 'Ranged' | 'off') {
  const selected = page.locator('.prayer-button[aria-pressed="true"]');
  if (name === 'off') {
    if (await selected.count()) await selected.click();
  } else {
    const button = page.getByRole('button', { name, exact: true });
    if ((await button.getAttribute('aria-pressed')) !== 'true')
      await button.click();
  }
}
async function tick(page: Page, name: 'Magic' | 'Ranged' | 'off') {
  await prayer(page, name);
  await page.clock.runFor(600);
}

test('hard circuit is discoverable, ends after three misses and retries beside the prayer book without scrolling', async ({
  page,
}) => {
  await page.goto('/#drills');
  await expect(
    page.getByRole('link', { name: /Hard circuit/ }),
  ).toHaveAttribute('href', '#hard');
  await expect(
    page.getByRole('link', { name: /Endless gauntlet/ }),
  ).toHaveAttribute('href', '#endless');
  await open(page, 'hard');
  for (let i = 0; i < 5; i++) await page.clock.runFor(600);
  const score = page.getByLabel('Survival score');
  await expect(score).toContainText('0 / 3');
  await expect(score).toContainText('Run complete');
  const retry = score.getByRole('button', { name: 'Retry run' });
  await retry.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.clock.runFor(30);
  const top = await page.evaluate(() => scrollY);
  await page.clock.runFor(1200);
  await expect(score).toContainText('0 / 3');
  await retry.click();
  expect(Math.abs((await page.evaluate(() => scrollY)) - top)).toBeLessThan(4);
  await expect(page.getByLabel('Survival score')).toContainText('3 / 3');
  await expect(page.locator('.arena-overlay')).toContainText('3');
});

test('hard stage advances automatically, carries points and lives, and banks a separate personal best', async ({
  page,
}) => {
  await open(page, 'hard');
  for (let i = 1; i <= 36; i++)
    await tick(page, (i - 1) % 4 < 2 ? 'Magic' : 'Ranged');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Hard circuit · stage 2',
  );
  await expect(page.getByLabel('Survival score')).toContainText('360');
  await expect(page.getByLabel('Survival score')).toContainText('3 / 3');
  await expect(page.locator('.arena-overlay')).toContainText('3');
  await page.getByRole('button', { name: 'Finish run', exact: true }).click();
  await expect(page.getByLabel('Survival score')).toContainText(
    'Personal best in this browser',
  );
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key),
  ).toEqual({ hard: { points: 360, stage: 2, cleared: false } });
  await page.reload();
  await expect(
    page.getByText('Personal best: 360 points · stage 2'),
  ).toBeVisible();
  await page.goto('/#endless');
  await expect(
    page.getByText('Personal best: No scored runs yet'),
  ).toBeVisible();
});

test('endless starts with complete mager cycles and escalates to a two-enemy stage', async ({
  page,
}) => {
  await open(page, 'endless');
  for (let i = 1; i <= 36; i++) await tick(page, i % 4 === 1 ? 'Magic' : 'off');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Endless gauntlet · stage 2',
  );
  await expect(page.getByLabel('Survival score')).toContainText('90');
  await expect(page.getByLabel('Survival score')).toContainText(
    '20 points per clean check',
  );
  for (let i = 0; i < 3; i++) await page.clock.runFor(600);
  await tick(page, 'Magic');
  await tick(page, 'Magic');
  await tick(page, 'Ranged');
  await expect(page.getByLabel('Survival score')).toContainText('130');
  await page.getByRole('button', { name: 'Finish run', exact: true }).click();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key),
  ).toEqual({ endless: { points: 130, stage: 2, cleared: false } });
});

test('paused circuit can continue as practice but does not replace a high score', async ({
  page,
}) => {
  await open(page, 'hard');
  await tick(page, 'Magic');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByLabel('Survival score')).toContainText('Practice run');
  await page
    .getByRole('button', { name: 'Resume practice', exact: true })
    .click();
  await page.getByRole('button', { name: 'Finish run', exact: true }).click();
  await expect(page.getByLabel('Survival score')).toContainText('20 points');
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
});

test('a complete hard circuit reaches triple Jad and finishes without awarding individual drill passes', async ({
  page,
}) => {
  test.setTimeout(150000);
  await open(page, 'hard');
  for (let stage = 0; stage < 5; stage++) {
    if (stage) for (let i = 0; i < 3; i++) await page.clock.runFor(600);
    for (let tickNumber = 1; tickNumber <= 36; tickNumber++) {
      const style =
        stage < 2
          ? (tickNumber - 1) % 4 < 2
            ? 'Magic'
            : 'Ranged'
          : stage < 4
            ? tickNumber % 2
              ? 'Magic'
              : 'Ranged'
            : (await page.locator('.jad-cue').getAttribute('data-style')) ===
                'magic'
              ? 'Magic'
              : 'Ranged';
      await prayer(page, style);
      if ((stage === 1 || stage === 2) && tickNumber % 4 === 0)
        await page.locator('.movement-grid button.target').click();
      await page.clock.runFor(600);
    }
  }
  const score = page.getByLabel('Survival score');
  await expect(score).toContainText('Circuit cleared!');
  await expect(score).toContainText('3 / 3');
  await expect(score).toContainText('3510');
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key),
  ).toEqual({ hard: { points: 3510, stage: 5, cleared: true } });
  expect(
    await page.evaluate(() => localStorage.getItem('inferno-tips-progress-v1')),
  ).toBeNull();
});

test('mobile survival controls fit and finishing or retrying keeps the prayer panel in place', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page, 'hard');
  await tick(page, 'Magic');
  // Finish from the toolbar, then inspect the nearby retry without a forced result scroll.
  await page
    .getByRole('button', { name: 'Finish run', exact: true })
    .scrollIntoViewIfNeeded();
  const finishTop = await page.evaluate(() => scrollY);
  await page.getByRole('button', { name: 'Finish run', exact: true }).click();
  expect(
    Math.abs((await page.evaluate(() => scrollY)) - finishTop),
  ).toBeLessThan(4);
  const retry = page
    .getByLabel('Survival score')
    .getByRole('button', { name: 'Retry run' });
  await retry.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.clock.runFor(30);
  const top = await page.evaluate(() => scrollY);
  const bookTop = await page
    .locator('.native-panel.prayers')
    .evaluate((el) => el.getBoundingClientRect().top);
  await retry.click();
  expect(Math.abs((await page.evaluate(() => scrollY)) - top)).toBeLessThan(4);
  expect(
    Math.abs(
      (await page
        .locator('.native-panel.prayers')
        .evaluate((el) => el.getBoundingClientRect().top)) - bookTop,
    ),
  ).toBeLessThan(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('progress retains earlier scoring for reference and reset also clears circuit records', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate((k) => {
    localStorage.setItem(
      'inferno-tips-progress-v1',
      JSON.stringify({
        blob: { attempts: 3, best: 100, passes: 2, practiceBest: 95 },
      }),
    );
    localStorage.setItem(
      k,
      JSON.stringify({ hard: { points: 360, stage: 2, cleared: false } }),
    );
  }, key);
  await page.goto('/#progress');
  await page.reload();
  await expect(
    page.getByText(
      'Earlier scoring: 100% challenge · 95% practice · 2/2 passes',
    ),
  ).toBeVisible();
  await expect(
    page.getByText(/Their new scores and passes start fresh/),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Reset saved progress', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Delete progress', exact: true })
    .click();
  expect(await page.evaluate((k) => localStorage.getItem(k), key)).toBeNull();
});
