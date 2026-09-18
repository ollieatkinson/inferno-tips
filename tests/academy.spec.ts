import { test, expect, type Page } from '@playwright/test';

async function open(page: Page) {
  await page.goto('/');
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
}
async function lesson(page: Page, name: string) {
  await page
    .getByRole('button', { name: 'Practice drills', exact: true })
    .click();
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .click();
}
async function start(page: Page, challenge = true) {
  if (challenge)
    await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await page
    .getByRole('button', {
      name: challenge ? 'Start challenge' : 'Start guided practice',
      exact: true,
    })
    .click();
  const ms = 600;
  for (let i = 0; i < 3; i++) await page.clock.runFor(ms);
  await expect(
    page.getByText('Preparing tick 1', { exact: true }),
  ).toBeVisible();
}
const targets = [8, 6, 16, 18, 12, 2, 22, 10, 14];
async function perfectRun(page: Page, id: string, ms = 600) {
  for (let tick = 1; tick <= 36; tick++) {
    const key = ['rhythm', 'food', 'potions'].includes(id)
      ? tick % 4 === 1
        ? '1'
        : '0'
      : id === 'blob'
        ? Math.floor((tick - 1) / 3) % 2 === 0
          ? '1'
          : '2'
        : ['stack', 'movement'].includes(id)
          ? (tick - 1) % 4 < 2
            ? '1'
            : '2'
          : tick % 2 === 1
            ? '1'
            : '2';
    const selected = page.locator('.prayer-button[aria-pressed="true"]');
    if (key === '0') {
      if (await selected.count()) await selected.click();
    } else {
      const button = page.getByRole('button', {
        name: key === '1' ? 'Magic' : 'Ranged',
        exact: true,
      });
      if ((await button.getAttribute('aria-pressed')) !== 'true')
        await button.click();
    }
    if (['movement', 'gauntlet'].includes(id) && tick % 4 === 0)
      await page
        .getByRole('button', {
          name: new RegExp(
            `Tile ${(targets[Math.floor((tick - 1) / 4)] % 5) + 1}, ${Math.floor(targets[Math.floor((tick - 1) / 4)] / 5) + 1}, target`,
          ),
        })
        .click();
    if ((id === 'food' || (id === 'potions' && tick <= 32)) && tick % 4 === 2) {
      await page.keyboard.press('Escape');
      const label =
        id === 'food'
          ? /^Eat shark/
          : Math.floor((tick - 1) / 4) % 4 === 3
            ? /^Drink super restore/
            : /^Drink Saradomin brew/;
      await page.getByRole('button', { name: label }).click();
      await page.keyboard.press('F1');
    }
    await page.clock.runFor(ms);
  }
  await expect(page.getByRole('region', { name: 'Run results' })).toBeVisible();
  await expect(page.locator('.result-score')).toHaveText('100%');
}

test('overview, local artwork, resources, and credits render without errors', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await open(page);
  await expect(
    page.getByRole('heading', { name: 'Inferno practice & notes' }),
  ).toBeVisible();
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.every(
          (image) =>
            (image as HTMLImageElement).complete &&
            (image as HTMLImageElement).naturalWidth > 0,
        ),
      ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/overview-desktop.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Guides & resources' }).click();
  await expect(
    page.getByRole('link', { name: /Watch the original guide/ }),
  ).toHaveAttribute('href', 'https://www.youtube.com/watch?v=2xviK0wGI-o');
  await expect(
    page.getByRole('link', { name: /Try a wave layout/ }),
  ).toHaveAttribute('href', 'https://los.inferno.tips/');
  await page.getByRole('link', { name: 'Credits & sources' }).click();
  await expect(
    page.getByRole('heading', { name: 'Game artwork' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [id, name] of [
  ['rhythm', 'Flick the mager'],
  ['blob', 'Read the blob'],
  ['alternate', 'One-tick alternating'],
  ['stack', 'Flick a two-tick stack'],
  ['movement', 'Flick and move'],
  ['food', 'Eat between flicks'],
  ['potions', 'Brew and restore between flicks'],
  ['gauntlet', 'Blob, mager and movement'],
]) {
  test(`${id}: complete a perfect challenge through real controls`, async ({
    page,
  }) => {
    await open(page);
    await lesson(page, name);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await start(page);
    await perfectRun(page, id);
    await expect(page.getByText('✓ Mastery pass earned')).toBeVisible();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('inferno-tips-progress-v1')!),
    );
    expect(saved[id]).toMatchObject({ attempts: 1, best: 100, passes: 1 });
  });
}

test('two passes master a lesson, persist on reload, and reset only after confirmation', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'Read the blob');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await start(page);
  await perfectRun(page, 'blob');
  await page
    .getByRole('region', { name: 'Run results' })
    .getByRole('button', { name: 'Try challenge again', exact: true })
    .click();
  for (let i = 0; i < 3; i++) await page.clock.runFor(600);
  await perfectRun(page, 'blob');
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await page
    .getByRole('button', { name: 'Your progress', exact: true })
    .click();
  await expect(
    page.locator('.progress-table').getByText('2/2 passes'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset saved progress' }).click();
  await page.getByRole('button', { name: 'Keep progress' }).click();
  await expect(
    page.locator('.progress-table').getByText('2/2 passes'),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset saved progress' }).click();
  await page
    .getByRole('button', { name: 'Delete progress', exact: true })
    .click();
  expect(
    await page.evaluate(() => localStorage.getItem('inferno-tips-progress-v1')),
  ).toBeNull();
});

test('guided runs and paused challenges never award mastery', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'Flick a two-tick stack');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await start(page, false);
  await perfectRun(page, 'stack');
  await expect(page.getByText('Guided run · practice credit')).toBeVisible();
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await start(page);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Practice paused' }),
  ).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.locator('.run-stats').getByText('0 / 36')).toBeVisible();
  await page
    .getByRole('button', { name: 'Resume practice', exact: true })
    .click();
  await page.clock.runFor(600);
  await perfectRun(page, 'stack');
  await expect(page.getByText('Paused run · practice credit')).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('inferno-tips-progress-v1')!),
  );
  expect(saved.stack).toMatchObject({
    attempts: 2,
    passes: 0,
    practiceBest: 100,
    best: 0,
  });
});

test('missed prayers receive specific feedback and no passing score', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'Read the blob');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await start(page);
  for (let i = 0; i < 36; i++) await page.clock.runFor(600);
  await expect(page.locator('.result-score')).toHaveText('0%');
  await expect(page.getByText(/Your next focus: blob reads/)).toBeVisible();
  await page.getByText('Review all 12 checks').click();
  await expect(page.locator('.review-list .incorrect')).toHaveCount(12);
});

test('mobile has usable navigation, movement, and no horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'test-results/overview-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Guides & resources' }).click();
  await expect(
    page.getByRole('heading', { name: 'Guides & tools' }),
  ).toBeVisible();
  await lesson(page, 'Flick and move');
  await page.getByRole('button', { name: 'Tile 4, 2, target' }).click();
  await expect(
    page.getByRole('button', { name: 'Tile 4, 2, target, player' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Magic', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({
    path: 'test-results/trainer-mobile.png',
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('corrupt or blocked storage cannot prevent practice', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('inferno-tips-progress-v1', '{bad'),
  );
  await open(page);
  await page
    .getByRole('button', { name: 'Your progress', exact: true })
    .click();
  await expect(
    page.locator('.progress-table').getByText('0/2 passes'),
  ).toHaveCount(20);
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'getItem', {
      value: () => {
        throw new Error('Storage blocked');
      },
    });
  });
  await page.reload();
  await expect(page.getByRole('status')).toContainText(
    'Browser storage is unavailable',
  );
  await page.getByRole('button', { name: 'Start drill →' }).click();
  await expect(
    page.getByRole('button', { name: 'Start guided practice' }),
  ).toBeVisible();
});

test('prayers toggle with clicks and custom tab keys persist', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'Eat between flicks');
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  await page.keyboard.press('1');
  await expect(magic).toHaveAttribute('aria-pressed', 'false');
  await magic.click();
  await expect(magic).toHaveAttribute('aria-pressed', 'true');
  await magic.click();
  await expect(magic).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Ranged', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toBeVisible();
  await expect(page.getByText('Active: Ranged', { exact: true })).toBeVisible();
  await page.keyboard.press('F1');
  await expect(
    page.getByRole('button', { name: 'Ranged', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await magic.click();
  await expect(magic).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Ranged', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(
    page.getByRole('button', { name: 'Off', exact: true }),
  ).toHaveCount(0);
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  await page.getByLabel('Inventory key', { exact: true }).selectOption('F3');
  await lesson(page, 'Eat between flicks');
  await page.keyboard.press('F3');
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toBeVisible();
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await lesson(page, 'Eat between flicks');
  await page.keyboard.press('F3');
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toBeVisible();
});

test('Esc opens inventory during a run and tab binding collisions swap safely', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'Eat between flicks');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await start(page, false);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Practice paused' }),
  ).toHaveCount(0);
  await page.clock.runFor(600);
  await expect(
    page.getByText('Preparing tick 2', { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('F1');
  await expect(
    page.getByRole('button', { name: 'Magic', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  await expect(page.getByLabel('Inventory key', { exact: true })).toHaveValue(
    'Escape',
  );
  await expect(page.getByLabel('Prayer tab key', { exact: true })).toHaveValue(
    'F1',
  );
  await page
    .getByLabel('Prayer tab key', { exact: true })
    .selectOption('Escape');
  await expect(page.getByLabel('Inventory key', { exact: true })).toHaveValue(
    'F1',
  );
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await lesson(page, 'Eat between flicks');
  await page.keyboard.press('F1');
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Magic', exact: true }),
  ).toBeVisible();
});

test('mager attack cues follow four real ticks in guided mode', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'Flick the mager');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await start(page, false);
  await expect(
    page.getByText('Magic attack in 1 tick', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await page.clock.runFor(599);
  await expect(page.locator('.run-stats').getByText('0 / 36')).toBeVisible();
  await page.clock.runFor(1);
  await expect(page.getByText('MAGIC ATTACK', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Magic attack in 4 ticks', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await page.clock.runFor(600);
  await expect(
    page.getByText('Magic attack in 3 ticks', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.run-stats').getByText('100%')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: 'test-results/mager-guided-desktop.png',
    fullPage: true,
  });
});

test('real clock completes a 36-tick challenge at game speed', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'Read the blob');
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  const start = Date.now();
  await page
    .getByRole('button', { name: 'Start challenge', exact: true })
    .click();
  await expect(page.getByRole('region', { name: 'Run results' })).toBeVisible({
    timeout: 30000,
  });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeGreaterThanOrEqual(23000);
  expect(elapsed).toBeLessThan(28500);
  await expect(page.locator('.result-score')).toHaveText('0%');
});

test('hidden tabs and timer stalls pause rather than running through missed beats', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'Read the blob');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await start(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(
    page.getByRole('heading', { name: 'Practice paused' }),
  ).toBeVisible();
  await page.clock.runFor(5000);
  await expect(page.locator('.run-stats').getByText('0 / 36')).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    }),
  );
  await page
    .getByRole('button', { name: 'Resume practice', exact: true })
    .click();
  await page.clock.runFor(600);
  await page.clock.fastForward(5000);
  await expect(
    page.getByRole('heading', { name: 'Practice paused' }),
  ).toBeVisible();
  await expect(page.locator('.run-stats').getByText('0 / 36')).toBeVisible();
});

test('course teaches decisions, retains knowledge, and has a working phase lab', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: /^Learning path/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Learning path' }),
  ).toBeVisible();
  await expect(page.locator('.drill-card')).toHaveCount(0);
  await page
    .getByRole('radio', {
      name: 'Alternate Magic and Ranged because there are two enemies.',
    })
    .check();
  await expect(page.getByText(/Reconsider that choice/)).toBeVisible();
  await page
    .getByRole('radio', { name: 'Hold Protect from Magic while killing them.' })
    .check();
  await expect(
    page.getByText(/1 \/ 28 checks answered correctly/),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await page.getByRole('button', { name: /^Learning path/ }).click();
  await expect(
    page.getByRole('radio', {
      name: 'Hold Protect from Magic while killing them.',
    }),
  ).toBeChecked();
  await page.getByRole('button', { name: /08 Optional techniques/ }).click();
  await expect(page.locator('.phase-table caption')).toHaveText(
    '2 / 2 blob attacks protected in this window',
  );
  await page.getByLabel('First blob read').selectOption('2');
  await expect(page.locator('.phase-table caption')).toHaveText(
    '0 / 2 blob attacks protected in this window',
  );
  await page.getByLabel('Prayer pattern').selectOption('shifted');
  await expect(page.locator('.phase-table caption')).toHaveText(
    '2 / 2 blob attacks protected in this window',
  );
  await page
    .getByRole('button', { name: 'Practice drills', exact: true })
    .click();
  await page.getByLabel('Find a drill').fill('two-tick');
  await expect(page.locator('.drill-card')).toHaveCount(3);
  await page.getByLabel('Find a drill').fill('not-a-real-drill');
  await expect(page.getByText(/No drills match/)).toBeVisible();
  await expect(page.locator('.topbar-los')).toHaveAttribute(
    'href',
    'https://los.inferno.tips/',
  );
});

for (const [id, name] of [
  ['bat', 'Flick the bat'],
  ['anchor-range', 'Anchor on the ranger'],
  ['double-blob', 'Alternate with two blobs'],
  ['stack-one', 'A one-tick pillar stack'],
  ['flick', 'One-tick prayer flick'],
  ['two-tick', 'Two-tick alternating'],
  ['two-tick-repair', 'Repair the two-tick phase'],
  ['reverse', 'Reverse flick the bat'],
  ['melee-blob', 'Melee and blob triage'],
  ['jad', 'Read Jad, then pray'],
  ['triples', 'Triple Jad prayer cues'],
  ['blowpipe', 'Blowpipe attack and movement'],
])
  test(`${id}: expanded drill works through its visible controls`, async ({
    page,
  }) => {
    await open(page);
    await lesson(page, name);
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await start(page);
    for (let tick = 1; tick <= 36; tick++) {
      let prayer: string | null = null;
      if (id === 'bat') prayer = tick % 3 === 1 ? 'Ranged' : 'off';
      else if (id === 'anchor-range') prayer = tick % 2 ? 'Ranged' : 'Magic';
      else if (id === 'double-blob') prayer = tick % 2 ? 'Magic' : 'Ranged';
      else if (id === 'stack-one' || id === 'reverse')
        prayer = tick % 4 === 1 ? 'Magic' : 'Ranged';
      else if (id === 'flick') prayer = 'Magic';
      else if (id === 'two-tick')
        prayer = (tick - 1) % 4 < 2 ? 'Magic' : 'Ranged';
      else if (id === 'two-tick-repair')
        prayer = tick % 4 < 2 ? 'Magic' : 'Ranged';
      else if (id === 'melee-blob')
        prayer = ['Melee', 'Ranged', 'Magic', 'Ranged'][(tick - 1) % 4];
      else if ((id === 'jad' || id === 'triples') && tick > 1) {
        const cue = await page.locator('.jad-cue').getAttribute('data-style');
        if (cue) prayer = cue === 'magic' ? 'Magic' : 'Ranged';
      }
      if (prayer === 'off') {
        const selected = page.locator('.prayer-button[aria-pressed="true"]');
        if (await selected.count()) await selected.click();
      } else if (prayer) {
        const b = page.getByRole('button', { name: prayer, exact: true });
        if (id === 'flick' && tick > 1) {
          await b.click();
          await b.click();
        } else if ((await b.getAttribute('aria-pressed')) !== 'true')
          await b.click();
      }
      if (id === 'blowpipe') {
        if (tick % 2)
          await page
            .getByRole('button', { name: 'Attack target', exact: true })
            .click();
        else await page.getByRole('button', { name: /^Tile .*target/ }).click();
      }
      await page.clock.runFor(600);
    }
    await expect(page.locator('.result-score')).toHaveText('100%');
    if (id === 'reverse' || id === 'melee-blob')
      await expect(
        page.getByText('3 attacks left unprotected', { exact: true }),
      ).toBeVisible();
    await expect(page.getByText('✓ Mastery pass earned')).toBeVisible();
  });

test('conservation drill rejects a held prayer and course fits a narrow viewport', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'One-tick prayer flick');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await start(page);
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  for (let tick = 0; tick < 36; tick++) await page.clock.runFor(600);
  await expect(page.locator('.result-score')).toHaveText('51%');
  await expect(page.getByText('✓ Mastery pass earned')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^Learning path/ }).click();
  await page.getByRole('button', { name: /08 Optional techniques/ }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel('First blob read').selectOption('2');
  await expect(page.locator('.phase-table caption')).toHaveText(
    '0 / 2 blob attacks protected in this window',
  );
  await page.screenshot({
    path: 'test-results/course-mobile.png',
    fullPage: true,
  });
});

test('problem shortcuts open the right lesson and survive a reload', async ({
  page,
}) => {
  await open(page);
  const fix = page
    .locator('.troubleshooting details')
    .filter({ hasText: 'My safe tile stops being safe when I attack' });
  await fix.locator('summary').click();
  await expect(fix).toContainText('current weapon’s range');
  await fix.getByRole('button', { name: 'Read the lesson →' }).click();
  await expect(page).toHaveURL(/#lesson-weapon-drag$/);
  await expect(
    page.getByRole('heading', { name: 'An attack click can move you' }),
  ).toBeFocused();
  await expect(
    page.getByRole('link', { name: 'Watch the example · dearlola1 · 58:56 ↗' }),
  ).toHaveAttribute(
    'href',
    'https://www.youtube.com/watch?v=r3s4rbTd4QU&t=3536s',
  );
  await page
    .getByRole('radio', {
      name: 'Move you into range and expose another enemy.',
    })
    .check();
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await expect(
    page.getByRole('heading', { name: 'An attack click can move you' }),
  ).toBeFocused();
  await expect(
    page.getByRole('radio', {
      name: 'Move you into range and expose another enemy.',
    }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  const prayerFix = page
    .locator('.troubleshooting details')
    .filter({ hasText: 'The ranger hits me through my alternating prayers' });
  await prayerFix.locator('summary').click();
  await prayerFix.getByRole('button', { name: 'Practise this →' }).click();
  await expect(
    page.getByRole('heading', { name: 'Anchor on the ranger', exact: true }),
  ).toBeVisible();
});

test('new course notes and chapter contents work on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page
    .getByRole('button', { name: 'Supplies & recovery 4 lessons' })
    .click();
  await page
    .getByRole('link', {
      name: 'Prepare before killing the last enemy',
      exact: true,
    })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Prepare before killing the last enemy',
    }),
  ).toBeFocused();
  await page
    .getByRole('radio', {
      name: 'Request the end-of-wave pause, finish the wave safely, and confirm it has paused.',
    })
    .check();
  await expect(
    page
      .locator('.field-lesson')
      .filter({ hasText: 'Prepare before killing the last enemy' })
      .getByRole('status'),
  ).toContainText('Correct.');
  await page.getByRole('button', { name: /07 Zuk/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Take the set off the shield' }),
  ).toBeVisible();
  await page
    .getByRole('radio', {
      name: 'The untagged mager is still attacking the shield.',
    })
    .check();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('guided results start a fresh challenge with one click', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await lesson(page, 'Flick the mager');
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await start(page, false);
  await perfectRun(page, 'rhythm');
  const results = page.getByRole('region', { name: 'Run results' });
  await expect(
    results.getByRole('heading', { name: 'Guided practice complete' }),
  ).toBeVisible();
  await expect(results).toContainText('Same drill, same timing');
  await expect(
    results.getByRole('button', { name: 'Start challenge', exact: true }),
  ).toBeInViewport();
  await expect(
    results.getByRole('button', { name: 'Repeat guided practice' }),
  ).toBeVisible();
  await results
    .getByRole('button', { name: 'Start challenge', exact: true })
    .click();
  await expect(results).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Challenge', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('region', { name: 'Interactive practice' }),
  ).toBeFocused();
  await expect(page.locator('.arena-overlay strong')).toHaveText('3');
  for (let i = 0; i < 3; i++) await page.clock.runFor(600);
  await expect(
    page.getByText('Preparing tick 1', { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.live-coach')).toContainText(
    'Prayer hints are hidden',
  );
  await perfectRun(page, 'rhythm');
  await expect(results).toContainText('✓ Mastery pass earned');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('inferno-tips-progress-v1')!),
  );
  expect(saved.rhythm.passes).toBe(1);
});

test('site settings migrate tab keys and apply across drills without clearing progress', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await page.evaluate(() => {
    localStorage.setItem(
      'inferno-tips-tab-keys-v1',
      JSON.stringify({ inventory: 'F4', prayers: 'F5' }),
    );
    localStorage.setItem(
      'inferno-tips-progress-v1',
      JSON.stringify({
        rhythm: { attempts: 1, best: 95, passes: 1, practiceBest: 0 },
      }),
    );
  });
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  await expect(page.getByLabel('Inventory key', { exact: true })).toHaveValue(
    'F4',
  );
  await expect(page.getByLabel('Prayer tab key', { exact: true })).toHaveValue(
    'F5',
  );
  await page.getByLabel('Default practice mode').selectOption('challenge');
  await page.getByLabel('Enable tick sound').check();
  await page.getByRole('slider', { name: 'Tick sound volume' }).fill('25');
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  await expect(page.getByLabel('Enable tick sound')).toBeChecked();
  await expect(
    page.getByRole('slider', { name: 'Tick sound volume' }),
  ).toHaveValue('25');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await lesson(page, 'Eat between flicks');
  await expect(
    page.getByRole('button', { name: 'Challenge', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByText('Configure tab keys', { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByLabel('Enable tick sound')).toHaveCount(0);
  await page.keyboard.press('F4');
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toBeVisible();
  await page.keyboard.press('F5');
  await expect(
    page.getByRole('button', { name: 'Magic', exact: true }),
  ).toBeVisible();
  await lesson(page, 'Flick the bat');
  await expect(
    page.getByRole('button', { name: 'Start challenge', exact: true }),
  ).toBeVisible();
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  await page.getByRole('button', { name: 'Restore default settings' }).click();
  await expect(page.getByLabel('Inventory key', { exact: true })).toHaveValue(
    'Escape',
  );
  await expect(page.getByLabel('Prayer tab key', { exact: true })).toHaveValue(
    'F1',
  );
  await expect(page.getByLabel('Default practice mode')).toHaveValue('guided');
  await expect(page.getByLabel('Enable tick sound')).not.toBeChecked();
  await page
    .getByRole('button', { name: 'Your progress', exact: true })
    .click();
  await expect(
    page.locator('.progress-table').getByText('1/2 passes', { exact: true }),
  ).toHaveCount(1);
});

test('blocked storage still allows site settings for the current visit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Storage.prototype, 'setItem', {
      value: () => {
        throw new Error('Storage blocked');
      },
    });
  });
  await open(page);
  await page
    .locator('.sidebar')
    .getByRole('button', { name: 'Settings', exact: true })
    .click();
  await page.getByLabel('Inventory key', { exact: true }).selectOption('F3');
  await expect(page.locator('.settings-page .storage-notice')).toContainText(
    'Settings work for this visit',
  );
  await lesson(page, 'Eat between flicks');
  await page.keyboard.press('F3');
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toBeVisible();
});
