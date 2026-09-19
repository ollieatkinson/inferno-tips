import { test, expect, type Page } from '@playwright/test';
import losSetups from '../src/lib/losSetups.json' with { type: 'json' };

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
      await page.getByRole('button', { name: label }).first().click();
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
  await page.clock.install();
  await page.clock.pauseAt(new Date());
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
  await page.clock.runFor(600);
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: /^Eat shark/ }).first(),
  ).toBeVisible();
  await expect(page.getByText('Active: Ranged', { exact: true })).toBeVisible();
  await page.keyboard.press('F1');
  await expect(
    page.getByRole('button', { name: 'Ranged', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await magic.click();
  await expect(magic).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Ranged', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.clock.runFor(600);
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
  await expect(
    page.getByRole('button', { name: /^Eat shark/ }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await lesson(page, 'Eat between flicks');
  await page.keyboard.press('F3');
  await expect(
    page.getByRole('button', { name: /^Eat shark/ }).first(),
  ).toBeVisible();
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
  await expect(
    page.getByRole('button', { name: /^Eat shark/ }).first(),
  ).toBeVisible();
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
  await expect(
    page.getByRole('button', { name: /^Eat shark/ }).first(),
  ).toBeVisible();
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
  await expect(
    page
      .locator('[data-enemy="mager"]')
      .getByText('Magic attack', { exact: true }),
  ).toBeVisible();
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
            .getByRole('button', {
              name: 'Attack practice target',
              exact: true,
            })
            .click();
        else {
          const tile = [3, 5, 7, 5, 3, 1][(tick / 2 - 1) % 6];
          await page
            .getByRole('button', {
              name: new RegExp(`^Run to tile ${tile}(,|$)`),
            })
            .click();
        }
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
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await open(page);
  await lesson(page, 'Flick the mager');
  await start(page, false);
  await perfectRun(page, 'rhythm');
  const results = page.getByRole('region', { name: 'Run results' });
  await expect(
    results.getByRole('heading', { name: 'Guided practice complete' }),
  ).toBeVisible();
  await expect(results).toContainText('Same drill, same timing');
  // Reviewing the detailed results is an explicit scroll; finishing stays at the controls.
  await results.scrollIntoViewIfNeeded();
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
    page.getByRole('button', {
      name: 'Challenge',
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Challenge', exact: true }),
  ).toBeVisible();
  expect((await page.locator('.training-panel').boundingBox())!.y).toBeCloseTo(
    0,
    0,
  );
  await page.clock.runFor(30);
  expect((await page.locator('.training-panel').boundingBox())!.y).toBeCloseTo(
    0,
    0,
  );
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
  await expect(
    page.getByRole('button', { name: /^Eat shark/ }).first(),
  ).toBeVisible();
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
  await expect(
    page.getByRole('button', { name: /^Eat shark/ }).first(),
  ).toBeVisible();
});

test('LoS assignments open their prepared scenes from lessons and troubleshooting', async ({
  page,
}) => {
  const { fieldLessons } = await import('../src/lib/curriculum');
  for (const field of fieldLessons.filter((field) => field.los)) {
    await page.goto(`/#lesson-${field.id}`);
    await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
    const assignment = page
      .locator('.field-lesson')
      .filter({ has: page.locator(`#lesson-${field.id}`) })
      .locator('.los-assignment');
    await expect(assignment).toContainText(
      losSetups[field.los!.setup].description,
    );
    await expect(
      assignment.getByRole('link', { name: 'Open this setup' }),
    ).toHaveAttribute('href', losSetups[field.los!.setup].href);
  }
  await open(page);
  const problem = page
    .locator('.troubleshooting details')
    .filter({ hasText: 'I take a blob hit after getting behind the pillar' });
  await problem.locator('summary').click();
  await expect(
    problem.getByRole('link', { name: 'Open this LoS setup' }),
  ).toHaveAttribute('href', losSetups['blob-flinch'].href);
});

test('drill companion links load the matching enemies', async ({ page }) => {
  await open(page);
  for (const [title, setup] of [
    ['Read the blob', 'blob'],
    ['A one-tick pillar stack', 'pillar-stack'],
    ['Alternate with two blobs', 'two-blobs'],
  ] as const) {
    await lesson(page, title);
    await expect(
      page.getByRole('link', { name: 'Open this setup' }),
    ).toHaveAttribute('href', losSetups[setup].href);
    await expect(page.locator('.setup-description')).toContainText(
      losSetups[setup].description,
    );
  }
});

test('guided prayer preview shows upcoming beats, advances, pauses and hides in challenge', async ({
  page,
}) => {
  await page.clock.install();
  await open(page);
  await lesson(page, 'Two-tick alternating');
  const preview = page.getByRole('region', {
    name: 'Upcoming prayer pattern',
    exact: true,
  });
  await expect(preview).toBeVisible();
  const prayers = preview.locator('tbody tr').first().locator('td');
  await expect(prayers).toHaveText([
    'Magic',
    'Magic',
    'Ranged',
    'Ranged',
    'Magic',
    'Magic',
  ]);
  await start(page, false);
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await page.clock.runFor(600);
  await expect(preview.locator('[aria-current="step"]')).toHaveText('2Next');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(1800);
  await expect(preview.locator('[aria-current="step"]')).toHaveText('2Next');
  await lesson(page, 'One-tick prayer flick');
  await expect(
    preview.getByRole('cell', { name: 'Off → on', exact: true }),
  ).toHaveCount(5);
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await lesson(page, 'Read the blob');
  await expect(preview).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const scroller = page.getByRole('region', {
    name: 'Prayer pattern table',
    exact: true,
  });
  await scroller.focus();
  await page.keyboard.press('End');
  await expect(scroller).toBeFocused();
});

test('guided prayer cells keep their size through the final tick', async ({
  page,
}) => {
  await page.clock.install();
  await open(page);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await lesson(page, 'Flick the mager');
    const dimensions = () =>
      page.locator('.prayer-preview').evaluate((preview) => ({
        cell: preview.querySelector('tbody td')!.getBoundingClientRect().width,
        table: preview.querySelector('table')!.getBoundingClientRect().height,
      }));
    const initial = await dimensions();
    await start(page, false);
    for (let tick = 1; tick <= 35; tick++) {
      await page.clock.runFor(600);
      const current = await dimensions();
      expect(current.cell).toBeCloseTo(initial.cell, 1);
      expect(current.table).toBeCloseTo(initial.table, 1);
    }
    await expect(
      page.locator('.prayer-preview [aria-current="step"]'),
    ).toHaveText('36Next');
    await expect(
      page
        .locator('.prayer-preview tbody tr')
        .first()
        .locator('td[aria-hidden="true"]'),
    ).toHaveCount(5);
  }
});

test('mixed movement drill shows independent attacks and freezes sprite playback when paused', async ({
  page,
}) => {
  await page.clock.install();
  await open(page);
  await lesson(page, 'Blob, mager and movement');
  const mager = page.locator('[data-enemy="mager"]');
  const blob = page.locator('[data-enemy="blob"]');
  await expect(mager).toBeVisible();
  await expect(blob).toBeVisible();
  await expect(page.getByLabel('Movement practice grid')).toBeVisible();
  await start(page, false);
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await page.clock.runFor(600);
  await expect(mager).toHaveAttribute('data-event', 'attack');
  await expect(blob).toHaveAttribute('data-event', 'read');
  await expect(mager).toHaveClass(/enemy-attacking/);
  await expect(blob).toHaveClass(/enemy-reading/);
  await page.clock.runFor(150);
  const sprite = mager.locator('.monster-sprite');
  await expect(sprite).toHaveAttribute('data-animation', 'magic');
  expect(Number(await sprite.getAttribute('data-frame'))).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const frame = await sprite.getAttribute('data-frame');
  await page.clock.runFor(1000);
  await expect(sprite).toHaveAttribute('data-frame', frame!);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(150);
  expect(Number(await sprite.getAttribute('data-frame'))).toBeGreaterThan(
    Number(frame),
  );
  await page.clock.runFor(1650);
  await expect(blob).toHaveAttribute('data-event', 'attack');
  await expect(blob).toContainText('Ranged attack');
  await expect(blob.locator('.monster-sprite')).toHaveAttribute(
    'data-animation',
    'range',
  );
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await lesson(page, 'One-tick alternating');
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await expect(mager).toBeVisible();
  await expect(blob).toBeVisible();
  await expect(page.locator('.enemy-countdown')).toHaveCount(0);
  await expect(sprite).toHaveAttribute('data-animation', 'idle');
  await start(page);
  await page.clock.runFor(600);
  await expect(mager).toHaveAttribute('data-event', 'attack');
  await expect(blob).toHaveAttribute('data-event', 'read');
  await expect(sprite).toHaveAttribute('data-animation', 'magic');
  for (const enemy of [mager, blob]) {
    await expect(enemy).toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
    await expect(enemy).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  }
});

test('triple Jad has three independently cued animated monsters', async ({
  page,
}) => {
  await page.clock.install();
  await open(page);
  await lesson(page, 'Triple Jad prayer cues');
  await expect(page.locator('.enemy-unit')).toHaveCount(3);
  await start(page, false);
  await expect(page.locator('[data-enemy="jad-0"]')).toHaveAttribute(
    'data-event',
    'cue',
  );
  await expect(
    page.locator('[data-enemy="jad-1"] .monster-sprite'),
  ).toHaveAttribute('data-animation', 'idle');
  await page.clock.runFor(1800);
  await expect(page.locator('[data-enemy="jad-0"]')).toHaveAttribute(
    'data-event',
    'attack',
  );
  await expect(page.locator('[data-enemy="jad-1"]')).toHaveAttribute(
    'data-event',
    'cue',
  );
  await expect(
    page.locator('[data-enemy="jad-2"] .monster-sprite'),
  ).toHaveAttribute('data-animation', 'idle');
});

test('game panels sit beside the encounter and preserve clicked inventory slots', async ({
  page,
}) => {
  await page.clock.install();
  await open(page);
  await lesson(page, 'Eat between flicks');
  const panel = page.getByRole('complementary', { name: 'Player controls' });
  const arena = page.locator('.training-arena');
  const a = (await arena.boundingBox())!,
    b = (await panel.boundingBox())!;
  expect(b.x).toBeGreaterThanOrEqual(a.x + a.width);
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  const ranged = page.getByRole('button', { name: 'Ranged', exact: true });
  const melee = page.getByRole('button', { name: 'Melee', exact: true });
  const positions = await Promise.all(
    [magic, ranged, melee].map((b) => b.boundingBox()),
  );
  expect(positions[0]!.y).toBe(positions[1]!.y);
  expect(positions[1]!.y).toBe(positions[2]!.y);
  expect(positions[1]!.x - positions[0]!.x).toBe(46);
  expect(positions[2]!.x - positions[1]!.x).toBe(46);
  await start(page, false);
  await magic.click();
  await page.clock.runFor(600);
  await page.keyboard.press('Escape');
  await expect(page.locator('.inventory-slot')).toHaveCount(28);
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toHaveCount(9);
  await page
    .getByRole('button', { name: 'Eat shark, slot 5', exact: true })
    .click();
  await page.clock.runFor(600);
  await expect(page.locator('.inventory-slot[data-slot="4"]')).toHaveClass(
    /empty-slot/,
  );
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toHaveCount(8);
  await page
    .getByRole('button', { name: 'Eat shark, slot 7', exact: true })
    .click();
  await page.clock.runFor(600);
  await expect(
    page.getByRole('button', { name: 'Eat shark, slot 7', exact: true }),
  ).toBeVisible();
  await expect(panel).toContainText('Still on cooldown');
  await page.keyboard.press('F1');
  await expect(magic).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'End run', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /^Eat shark/ })).toHaveCount(9);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('F1');
  expect((await magic.boundingBox())!.width).toBeGreaterThanOrEqual(44);
  await lesson(page, 'Brew and restore between flicks');
  await start(page, false);
  await page.keyboard.press('Escape');
  await page
    .getByRole('button', {
      name: 'Drink Saradomin brew, slot 2, 2 doses remaining',
      exact: true,
    })
    .click();
  await page.clock.runFor(600);
  await expect(
    page.getByRole('button', {
      name: 'Drink Saradomin brew, slot 2, 1 doses remaining',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: 'Drink Saradomin brew, slot 1, 4 doses remaining',
      exact: true,
    }),
  ).toBeVisible();
});

test('authentic prayer audio follows toggles and respects saved sound preferences', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.addInitScript(() => {
    const logs: { duration: number; gain: number }[] = [];
    Object.assign(window, { prayerAudioStarts: logs });
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      lastGain = 0;
      override createGain() {
        const gain = super.createGain();
        const connect = gain.connect.bind(gain);
        gain.connect = ((...args: Parameters<typeof connect>) => {
          this.lastGain = gain.gain.value;
          return connect(...args);
        }) as typeof gain.connect;
        return gain;
      }
      override createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (...args) => {
          logs.push({
            duration: source.buffer?.duration || 0,
            gain: this.lastGain,
          });
          start(...args);
        };
        return source;
      }
    };
  });
  const starts = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            prayerAudioStarts: { duration: number; gain: number }[];
          }
        ).prayerAudioStarts,
    );
  await open(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Enable prayer sounds')).toBeChecked();
  await page.getByRole('slider', { name: 'Prayer sound volume' }).fill('25');
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await lesson(page, 'Flick the mager');
  await page.waitForLoadState('networkidle');
  expect(await starts()).toHaveLength(0);
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  await magic.click();
  expect(await starts()).toHaveLength(0);
  await page.clock.runFor(599);
  expect(await starts()).toHaveLength(0);
  await page.clock.runFor(1);
  await expect.poll(async () => (await starts()).length).toBe(1);
  await magic.click();
  expect(await starts()).toHaveLength(1);
  await page.clock.runFor(600);
  await expect.poll(async () => (await starts()).length).toBe(2);
  await page.getByRole('button', { name: 'Ranged', exact: true }).click();
  await magic.click();
  expect(await starts()).toHaveLength(2);
  await page.clock.runFor(600);
  await expect.poll(async () => (await starts()).length).toBe(4);
  const played = await starts();
  expect(played.every((p) => p.duration > 0 && p.gain === 0.25)).toBe(true);
  expect(played[0].duration).not.toBe(played[1].duration);
  await page.keyboard.press('Escape');
  await page.keyboard.press('F1');
  expect(await starts()).toHaveLength(4);
  // SDK-style sound flags coalesce repeated off/on pairs within one tick.
  for (let i = 0; i < 4; i++) await magic.click();
  expect(await starts()).toHaveLength(4);
  await page.clock.runFor(600);
  await expect.poll(async () => (await starts()).length).toBe(6);
  const flickSounds = (await starts()).slice(4);
  expect(flickSounds[0].duration).toBe(played[1].duration);
  expect(flickSounds[1].duration).toBe(played[0].duration);
  await page.getByRole('button', { name: 'Ranged', exact: true }).click();
  await page
    .getByRole('button', { name: 'Start guided practice', exact: true })
    .click();
  await page.clock.runFor(600);
  expect(await starts()).toHaveLength(6); // Reset discarded the queued sound.
  await magic.click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(1200);
  expect(await starts()).toHaveLength(6);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(600);
  await expect.poll(async () => (await starts()).length).toBe(7);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Enable prayer sounds').uncheck();
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Enable prayer sounds')).not.toBeChecked();
  await expect(
    page.getByRole('slider', { name: 'Prayer sound volume' }),
  ).toHaveValue('25');
  await lesson(page, 'Flick the mager');
  await magic.click();
  await magic.click();
  await page.clock.runFor(600);
  expect(await starts()).toHaveLength(0);
});

test('prayer book has a tick clock before starting without advancing the drill', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await open(page);
  await lesson(page, 'One-tick alternating');
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  const ranged = page.getByRole('button', { name: 'Ranged', exact: true });
  const status = page.locator('.game-panel-status');
  const stats = await page.locator('.run-stats').textContent();
  const phase = () =>
    page
      .locator('.panel-tick-clock i')
      .evaluate((bar) =>
        Number(
          (bar as HTMLElement).style.transform.match(/scaleX\(([^)]+)\)/)?.[1],
        ),
      );
  await magic.click();
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await expect(status).toContainText('Active: None');
  await page.clock.runFor(600);
  await expect(status).toContainText('Active: Magic');
  await page.clock.runFor(100);
  expect(await phase()).toBeGreaterThan(0.1);
  expect(await phase()).toBeLessThan(0.2);
  await ranged.click();
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await expect(ranged).toHaveAttribute('data-lit', 'true');
  await expect(status).toContainText('Active: Magic');
  await page.clock.runFor(499);
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.clock.runFor(1);
  await expect(magic).toHaveAttribute('data-lit', 'false');
  await expect(status).toContainText('Active: Ranged');
  // A late click still uses the existing clock, not a new 600 ms timeout.
  await page.clock.runFor(550);
  // This explains the brief overlap: the visible clock is already almost full.
  expect(await phase()).toBeGreaterThan(0.88);
  await magic.click();
  await expect(ranged).toHaveAttribute('data-lit', 'true');
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.clock.runFor(50);
  await expect(ranged).toHaveAttribute('data-lit', 'false');
  await expect(status).toContainText('Active: Magic');
  await page.clock.runFor(16);
  expect(await phase()).toBeLessThan(0.05);
  await expect(page.locator('.run-stats')).toHaveText(stats!);
  await page
    .getByRole('button', { name: 'Start guided practice', exact: true })
    .click();
  await expect(page.locator('.prayer-button[data-lit="true"]')).toHaveCount(0);
  await expect(status).toContainText('Active: None');
});

test('prayer circles keep the previous highlight until the shared tick boundary', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await open(page);
  await lesson(page, 'One-tick alternating');
  await start(page, false);
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  const ranged = page.getByRole('button', { name: 'Ranged', exact: true });
  await magic.click();
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.clock.runFor(600);
  await page.clock.runFor(100);
  await ranged.click();
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await expect(ranged).toHaveAttribute('data-lit', 'true');
  await expect(magic).toHaveAttribute('aria-pressed', 'true');
  await expect(ranged).toHaveAttribute('aria-pressed', 'true');
  const glow = await ranged.evaluate((el) => ({
    image: getComputedStyle(el, '::before').backgroundImage,
    visibility: getComputedStyle(el, '::before').visibility,
  }));
  expect(glow.image).toContain('/game-ui/prayer-active.png');
  expect(glow.visibility).toBe('visible');
  await page.keyboard.press('Escape');
  await page.keyboard.press('F1');
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.clock.runFor(499);
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.clock.runFor(1);
  await expect(magic).toHaveAttribute('data-lit', 'false');
  await expect(ranged).toHaveAttribute('data-lit', 'true');
  await expect(page.locator('.run-stats')).toContainText('100%');
  // Explicit off/on toggles the local circle; protection stays on the tick.
  await ranged.click();
  await expect(ranged).toHaveAttribute('data-lit', 'false');
  await ranged.click();
  await expect(ranged).toHaveAttribute('data-lit', 'true');
  await magic.click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const meter = page.locator('.panel-tick-clock i');
  const pausedMeter = await meter.getAttribute('style');
  await page.clock.runFor(1800);
  await expect(meter).toHaveAttribute('style', pausedMeter!);
  await expect(ranged).toHaveAttribute('data-lit', 'true');
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(300);
  const resumedPhase = await meter.evaluate((bar) =>
    Number(
      (bar as HTMLElement).style.transform.match(/scaleX\(([^)]+)\)/)?.[1],
    ),
  );
  expect(resumedPhase).toBeGreaterThan(0.45);
  expect(resumedPhase).toBeLessThanOrEqual(0.5);
  await page.clock.runFor(300);
  await expect(ranged).toHaveAttribute('data-lit', 'false');
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.getByRole('button', { name: 'End run', exact: true }).click();
  await page
    .getByRole('button', { name: 'Start guided practice', exact: true })
    .click();
  await expect(page.locator('.prayer-button[data-lit="true"]')).toHaveCount(0);
});

for (const challenge of [false, true]) {
  test(`prayer icons toggle independently before server reconciliation (${challenge ? 'challenge' : 'guided'})`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await open(page);
    await lesson(page, 'One-tick alternating');
    await start(page, challenge);
    const magic = page.getByRole('button', { name: 'Magic', exact: true });
    const ranged = page.getByRole('button', { name: 'Ranged', exact: true });
    const melee = page.getByRole('button', { name: 'Melee', exact: true });
    const lit = page.locator('.prayer-button[data-lit="true"]');
    const overhead = page.locator('[data-player] .overhead');
    // A late press is still captured by the next game tick.
    await page.clock.runFor(599);
    await magic.click();
    await page.clock.runFor(1);
    await page.clock.runFor(100);
    await ranged.click();
    await melee.click();
    await expect(lit).toHaveCount(3);
    await expect(
      page.locator('.prayer-button[aria-pressed="true"]'),
    ).toHaveCount(3);
    await expect(overhead).toHaveAttribute('data-prayer', 'magic');
    // Local toggles are independent from committed overhead protection.
    await magic.click();
    await expect(magic).toHaveAttribute('data-lit', 'false');
    await expect(ranged).toHaveAttribute('data-lit', 'true');
    await expect(melee).toHaveAttribute('data-lit', 'true');
    await ranged.click();
    await melee.click();
    await expect(lit).toHaveCount(0);
    await page.clock.runFor(499);
    await expect(lit).toHaveCount(0);
    await expect(overhead).toHaveAttribute('data-prayer', 'magic');
    await page.clock.runFor(1);
    await expect(lit).toHaveCount(1);
    await expect(melee).toHaveAttribute('data-lit', 'true');
    await expect(melee).toHaveAttribute('aria-pressed', 'true');
    await expect(overhead).toHaveAttribute('data-prayer', 'melee');
    // Ranged looked active during tick 2 but was not the final protection.
    await expect(page.locator('.run-stats')).toContainText('50%');
    await melee.click();
    await page.clock.runFor(599);
    await expect(melee).toHaveAttribute('data-lit', 'false');
    await expect(overhead).toHaveAttribute('data-prayer', 'melee');
    await page.clock.runFor(1);
    await expect(lit).toHaveCount(0);
    await expect(overhead).toHaveAttribute('data-prayer', 'off');
  });
}

test('overheads commit on ticks and incoming attacks retain their resolved hitsplats', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await open(page);
  await lesson(page, 'Flick the mager');
  await start(page, false);
  const overhead = page.locator('[data-player] .overhead');
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  const ranged = page.getByRole('button', { name: 'Ranged', exact: true });
  await magic.click();
  await expect(overhead).toHaveAttribute('data-prayer', 'off');
  await page.clock.runFor(600);
  await expect(overhead).toHaveAttribute('data-prayer', 'magic');
  await ranged.click();
  await expect(overhead).toHaveAttribute('data-prayer', 'magic');
  await expect(page.locator('.game-panel-status')).toContainText(
    'Active: Magic',
  );
  await page.clock.runFor(599);
  await expect(overhead).toHaveAttribute('data-prayer', 'magic');
  await page.clock.runFor(1);
  await expect(overhead).toHaveAttribute('data-prayer', 'range');
  await page.clock.runFor(700);
  const hit = page.locator('[data-hit="1-mager"]');
  await expect(hit).toHaveAttribute('data-phase', 'projectile');
  const shot = hit.locator('.enemy-projectile');
  await expect(shot).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const position = await shot.getAttribute('style');
  await page.clock.runFor(1000);
  await expect(shot).toHaveAttribute('style', position!);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(400);
  await expect(hit.locator('.player-hitsplat')).toBeVisible();
  await expect(hit.locator('.player-hitsplat')).toHaveClass(/blocked/);
  await expect(hit.locator('.player-hitsplat')).toHaveText('0');
  // The missed tick-5 attack stays red even if corrected during its flight.
  await page.clock.runFor(1100);
  await magic.click();
  await page.clock.runFor(1800);
  const missed = page.locator('[data-hit="5-mager"] .player-hitsplat');
  await expect(missed).toBeVisible();
  await expect(missed).toHaveClass(/damage/);
  expect(Number(await missed.textContent())).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'End run', exact: true }).click();
  await expect(page.locator('[data-hit]')).toHaveCount(0);
  await lesson(page, 'Blob, mager and movement');
  await start(page, false);
  await magic.click();
  await page.clock.runFor(600);
  await expect(page.locator('.movement-player .overhead')).toHaveAttribute(
    'data-prayer',
    'magic',
  );
  await page.getByRole('button', { name: /Tile 4, 2, target/ }).click();
  await expect(page.locator('.tile.player .overhead')).toHaveAttribute(
    'data-prayer',
    'magic',
  );
});

test('page and drill links survive reload and browser history', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/#settings$/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Settings — Inferno Tips');
  await lesson(page, 'Flick the mager');
  await expect(page).toHaveURL(/#drill-rhythm$/);
  await page.goBack();
  await expect(
    page.getByRole('heading', { name: 'Practice drills', exact: true }),
  ).toBeVisible();
  await page.goForward();
  await expect(
    page.getByRole('heading', { name: 'Flick the mager', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Flick the mager', exact: true }),
  ).toBeVisible();
  await expect(page).toHaveTitle('Flick the mager — Inferno Tips');
  await page.getByRole('button', { name: 'Back to practice drills' }).click();
  await expect(
    page.getByRole('heading', { name: 'Practice drills', exact: true }),
  ).toBeVisible();
});

test('returning from a related drill keeps the lesson destination', async ({
  page,
}) => {
  await page.goto('/#lesson-blob-anchor');
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await page.locator('.chapter-practice button').first().click();
  await expect(page).toHaveURL(/#drill-/);
  await page.getByRole('button', { name: 'Back to learning path' }).click();
  await expect(page).toHaveURL(/#lesson-blob-anchor$/);
  await expect(page.locator('#lesson-blob-anchor')).toBeFocused();
});

test('mobile run keeps pause, enemy cues and prayer clicks in the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await open(page);
  await lesson(page, 'Flick the mager');
  await start(page, false);
  // A deliberate user scroll keeps controls reachable; Start no longer scrolls.
  await page
    .locator('.training-arena')
    .evaluate((arena) => arena.scrollIntoView({ block: 'start' }));
  await page.clock.runFor(30);
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  for (const control of [pause, magic, page.locator('.enemy-name')]) {
    const bounds = (await control.boundingBox())!;
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  }
  await magic.click();
  await page.clock.runFor(600);
  await expect(page.locator('.run-stats')).toContainText('100%');
  await pause.click();
  await expect(
    page.getByRole('heading', { name: 'Practice paused' }),
  ).toBeVisible();
  const tick = await page.locator('.run-stats').textContent();
  await page.clock.runFor(1800);
  await expect(page.locator('.run-stats')).toHaveText(tick!);
});

test('supplies play accepted sounds, change dose sprites, leave vials and obey mute', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('inferno-tips-settings-v1'))
      localStorage.setItem(
        'inferno-tips-settings-v1',
        JSON.stringify({
          prayerSound: false,
          tickSound: false,
          supplySound: true,
          supplyVolume: 25,
        }),
      );
    const logs: { duration: number; gain: number }[] = [];
    const decoded: number[] = [];
    Object.assign(window, { supplyAudioStarts: logs, supplyDecoded: decoded });
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      lastGain = 0;
      override async decodeAudioData(data: ArrayBuffer) {
        const buffer = await super.decodeAudioData(data);
        decoded.push(buffer.duration);
        return buffer;
      }
      override createGain() {
        const gain = super.createGain();
        const connect = gain.connect.bind(gain);
        gain.connect = ((...args: Parameters<typeof connect>) => {
          this.lastGain = gain.gain.value;
          return connect(...args);
        }) as typeof gain.connect;
        return gain;
      }
      override createBufferSource() {
        const source = super.createBufferSource();
        const start = source.start.bind(source);
        source.start = (...args) => {
          logs.push({
            duration: source.buffer?.duration || 0,
            gain: this.lastGain,
          });
          start(...args);
        };
        return source;
      }
    };
  });
  const starts = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            supplyAudioStarts: { duration: number; gain: number }[];
          }
        ).supplyAudioStarts,
    );
  await page.clock.install();
  await open(page);
  await page.clock.pauseAt(new Date());
  await lesson(page, 'Brew and restore between flicks');
  await page.waitForLoadState('networkidle');
  await start(page, false);
  await page.keyboard.press('Escape');
  const slots = page.locator('.inventory-slot');
  await expect(slots.nth(0).locator('img')).toHaveAttribute(
    'src',
    '/icons/brew-4.png',
  );
  await expect(slots.nth(1).locator('img')).toHaveAttribute(
    'src',
    '/icons/brew-2.png',
  );
  await slots.nth(1).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { supplyDecoded: number[] }).supplyDecoded
            .length,
      ),
    )
    .toBe(2);
  expect(await starts()).toHaveLength(0);
  await page.clock.runFor(600);
  await expect(slots.nth(1).locator('img')).toHaveAttribute(
    'src',
    '/icons/brew-1.png',
  );
  await expect.poll(async () => (await starts()).length).toBe(1);
  await slots.nth(1).click();
  await page.clock.runFor(600);
  await expect(page.locator('.game-panel-status')).toContainText(
    'Still on cooldown',
  );
  await expect(slots.nth(1).locator('img')).toHaveAttribute(
    'src',
    '/icons/brew-1.png',
  );
  expect(await starts()).toHaveLength(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(1800);
  expect(await starts()).toHaveLength(1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(600);
  await slots.nth(1).click();
  await page.clock.runFor(600);
  await expect(
    page.getByRole('img', { name: 'Empty vial, slot 2' }),
  ).toBeVisible();
  await expect(slots.nth(1).locator('img')).toHaveAttribute(
    'src',
    '/icons/vial.png',
  );
  await expect.poll(async () => (await starts()).length).toBe(2);
  for (const [slot, item, dose] of [
    [0, 'brew', 3],
    [0, 'brew', 2],
    [0, 'brew', 1],
    [0, 'brew', 0],
    [2, 'restore', 1],
    [2, 'restore', 0],
  ] as const) {
    await page.clock.runFor(1200);
    await slots.nth(slot).click();
    await page.clock.runFor(600);
    await expect(slots.nth(slot).locator('img')).toHaveAttribute(
      'src',
      dose ? `/icons/${item}-${dose}.png` : '/icons/vial.png',
    );
  }
  await expect(page.getByRole('button', { name: /^Drink / })).toHaveCount(0);
  await expect(page.locator('.supply-count')).toHaveText(
    'Brew: 0 doses · Restore: 0 doses',
  );
  await expect.poll(async () => (await starts()).length).toBe(8);
  expect(
    (await starts()).every((s) => s.gain === 0.25 && s.duration > 1.4),
  ).toBe(true);
  await page.getByRole('button', { name: 'End run', exact: true }).click();
  await expect(slots.nth(0).locator('img')).toHaveAttribute(
    'src',
    '/icons/brew-4.png',
  );
  await expect(slots.nth(1).locator('img')).toHaveAttribute(
    'src',
    '/icons/brew-2.png',
  );
  expect(await starts()).toHaveLength(8);
  await lesson(page, 'Eat between flicks');
  await page.waitForLoadState('networkidle');
  await start(page, false);
  await page.keyboard.press('Escape');
  await slots.nth(4).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { supplyDecoded: number[] }).supplyDecoded
            .length,
      ),
    )
    .toBe(4);
  await page.clock.runFor(600);
  await expect(slots.nth(4)).toHaveClass(/empty-slot/);
  await expect(page.locator('.supply-count')).toHaveText('8 sharks left');
  await expect.poll(async () => (await starts()).length).toBe(9);
  // Browser Vorbis decoders can retain a small amount of encoder padding.
  expect((await starts())[8].duration).toBeCloseTo(1.2, 1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Enable food and potion sounds')).toBeChecked();
  await expect(
    page.getByRole('slider', { name: 'Food and potion volume' }),
  ).toHaveValue('25');
  await page.getByLabel('Enable food and potion sounds').uncheck();
  await page.reload();
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
  await expect(
    page.getByLabel('Enable food and potion sounds'),
  ).not.toBeChecked();
  await lesson(page, 'Eat between flicks');
  await start(page, false);
  await page.keyboard.press('Escape');
  await slots.nth(0).click();
  await page.clock.runFor(600);
  await expect(slots.nth(0)).toHaveClass(/empty-slot/);
  expect(await starts()).toHaveLength(0);
});

for (const width of [1440, 390]) {
  for (const mode of ['guided', 'challenge'] as const) {
    test(`starting ${mode} at ${width}px preserves the viewport and control positions`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      const clockStart = new Date();
      await page.clock.install({ time: clockStart });
      await page.clock.pauseAt(new Date(clockStart.getTime() + 1000));
      await open(page);
      await lesson(page, 'Flick the mager');
      if (mode === 'challenge')
        await page
          .getByRole('button', { name: 'Challenge', exact: true })
          .click();
      await page
        .locator('.training-toolbar')
        .evaluate((toolbar) => toolbar.scrollIntoView({ block: 'start' }));
      const positions = () =>
        page.evaluate(() => ({
          scroll: scrollY,
          arena: document
            .querySelector('.training-arena')!
            .getBoundingClientRect().top,
          controls: document
            .querySelector('.game-side-panel')!
            .getBoundingClientRect().top,
        }));
      const before = await positions();
      await page
        .getByRole('button', {
          name: mode === 'guided' ? 'Start guided practice' : 'Start challenge',
          exact: true,
        })
        .click();
      await page.clock.runFor(30);
      expect(await positions()).toEqual(before);
      await expect(
        page.getByRole('region', { name: 'Interactive practice' }),
      ).toBeFocused();
      for (let tick = 0; tick < 3; tick++) await page.clock.runFor(600);
      expect(await positions()).toEqual(before);
      await expect(
        page.getByText('Preparing tick 1', { exact: true }),
      ).toBeVisible();
    });
  }
}

test('blowpipe orders move on ticks, cancel attacks and recover after a lost shot', async ({
  page,
}) => {
  await page.clock.install();
  await open(page);
  await lesson(page, 'Blowpipe attack and movement');
  await page.clock.pauseAt(new Date());
  await expect(page.locator('.game-side-panel')).toHaveCount(0);
  await expect(page.locator('.prayer-button')).toHaveCount(0);
  await start(page, false);
  const attack = page.getByRole('button', {
    name: 'Attack practice target',
    exact: true,
  });
  const tile = (n: number) =>
    page.getByRole('button', { name: new RegExp(`^Run to tile ${n}(,|$)`) });
  const stats = page.locator('.blowpipe-status');
  await attack.click();
  await tile(7).click();
  await expect(tile(1)).toHaveAccessibleName('Run to tile 1, player');
  await page.clock.runFor(600);
  await expect(tile(3)).toHaveAccessibleName('Run to tile 3, player');
  await expect(stats).toContainText('0 / 18');
  await expect(stats).toContainText('1 attack ticks lost');
  await page.clock.runFor(600);
  await expect(tile(5)).toHaveAccessibleName('Run to tile 5, player');
  await expect(stats).toContainText('2 attack ticks lost');
  await attack.click();
  await page.clock.runFor(600);
  await expect(stats).toContainText('1 / 18');
  await expect(tile(5)).toHaveAccessibleName('Run to tile 5, player');
  await expect(tile(7)).toHaveClass(/suggested/);
  await expect(page.locator('.blowpipe-projectile')).toHaveCount(1);
  await tile(7).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(1200);
  await expect(tile(5)).toHaveAccessibleName('Run to tile 5, player');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(600);
  await expect(tile(7)).toHaveAccessibleName('Run to tile 7, player');
  await expect(stats).toContainText('1 / 6');
  await attack.click();
  await page.clock.runFor(600);
  await expect(stats).toContainText('2 / 18');
  await page.getByRole('button', { name: 'End run', exact: true }).click();
  await expect(stats).toContainText('0 / 18');
  await expect(stats).toContainText('0 / 6');
  await expect(tile(1)).toHaveAccessibleName('Run to tile 1, player');
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await attack.click();
  await page.clock.runFor(600);
  await expect(page.locator('.blowpipe-tile.suggested')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await tile(3).boundingBox())!.width).toBeGreaterThanOrEqual(40);
});

for (const timing of ['fixed rhythm', 'clearing circles'] as const) {
  test(`one-tick alternating accepts real-clock ${timing} without cumulative drift`, async ({
    page,
  }) => {
    await open(page);
    await lesson(page, 'One-tick alternating');
    const elapsed = await page.evaluate(async (timing) => {
      const stats = document.querySelector('.run-stats')!;
      const button = (name: string) =>
        document.querySelector<HTMLButtonElement>(
          `.prayer-button[aria-label="${name}"]`,
        )!;
      return new Promise<{ elapsed: number; clears: number[] }>(
        (resolve, reject) => {
          let first = 0,
            lastTick = 0,
            switches = 0;
          let fixedTimer: number | undefined;
          let responseTimer: number | undefined;
          const clears: number[] = [];
          let previous = ['false', 'false'];
          const circles = new MutationObserver(() => {
            const buttons = ['Magic', 'Ranged'].map(button);
            const lit = buttons.map((b) => b.dataset.lit);
            const cleared = lit.findIndex(
              (value, i) => value === 'false' && previous[i] === 'true',
            );
            previous = lit as string[];
            if (cleared < 0) return;
            clears.push(performance.now());
            // React to the actual circle disappearing. The tick counter must
            // not drive any switches after the initial mager anchor.
            responseTimer = window.setTimeout(() => {
              buttons[cleared].click();
            }, 100);
          });
          if (timing === 'clearing circles')
            ['Magic', 'Ranged'].map(button).forEach((b) =>
              circles.observe(b, {
                attributes: true,
                attributeFilter: ['data-lit'],
              }),
            );
          const guard = window.setTimeout(() => {
            observer.disconnect();
            circles.disconnect();
            window.clearInterval(fixedTimer);
            window.clearTimeout(responseTimer);
            reject(new Error('Alternating run did not finish on time'));
          }, 28000);
          const observer = new MutationObserver(() => {
            const tick = Number(stats.textContent?.match(/^TICK(\d+)/)?.[1]);
            if (!tick || tick === lastTick) return;
            lastTick = tick;
            if (tick === 1) first = performance.now();
            if (tick === 36) {
              observer.disconnect();
              circles.disconnect();
              window.clearInterval(fixedTimer);
              window.clearTimeout(responseTimer);
              window.clearTimeout(guard);
              resolve({ elapsed: performance.now() - first, clears });
              return;
            }
            if (timing === 'fixed rhythm' && tick === 1) {
              window.setTimeout(() => {
                button('Ranged').click();
                fixedTimer = window.setInterval(
                  () => button(++switches % 2 ? 'Magic' : 'Ranged').click(),
                  600,
                );
              }, 60);
            } else if (timing === 'clearing circles' && tick === 1) {
              window.setTimeout(() => {
                button('Ranged').click();
              }, 100);
            }
          });
          observer.observe(stats, {
            subtree: true,
            childList: true,
            characterData: true,
          });
          [...document.querySelectorAll('button')]
            .find((b) => b.textContent?.trim() === 'Start guided practice')!
            .click();
          // Prepare the first prayer during count-in; start switching after tick 1.
          window.setTimeout(() => button('Magic').click(), 50);
        },
      );
    }, timing);
    await expect(page.locator('.result-score')).toHaveText('100%');
    expect(Math.abs(elapsed.elapsed - 35 * 600)).toBeLessThan(100);
    if (timing === 'clearing circles') {
      expect(elapsed.clears.length).toBeGreaterThanOrEqual(33);
      for (let i = 1; i < elapsed.clears.length; i++)
        expect(
          Math.abs(elapsed.clears[i] - elapsed.clears[i - 1] - 600),
        ).toBeLessThan(100);
    }
  });
}

test('prayer presses register before release, once per gesture, with keyboard support', async ({
  page,
}) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await open(page);
  await lesson(page, 'One-tick alternating');
  await start(page, false);
  const magic = page.getByRole('button', { name: 'Magic', exact: true });
  const ranged = page.getByRole('button', { name: 'Ranged', exact: true });
  const overhead = page.locator('[data-player] .overhead');
  await magic.hover();
  await page.clock.runFor(550);
  await page.mouse.down();
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.clock.runFor(50);
  await expect(overhead).toHaveAttribute('data-prayer', 'magic');
  await expect(page.locator('.run-stats')).toContainText('100%');
  await page.mouse.up();
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await ranged.hover();
  await page.clock.runFor(100);
  await page.mouse.down();
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await expect(ranged).toHaveAttribute('data-lit', 'true');
  await page.clock.runFor(500);
  await expect(overhead).toHaveAttribute('data-prayer', 'range');
  await page.mouse.up();
  await expect(ranged).toHaveAttribute('data-lit', 'true');
  await expect(page.locator('.run-stats')).toContainText('100%');
  // Right-button presses do not alter the prayer.
  await magic.hover();
  await page.mouse.down({ button: 'right' });
  await expect(magic).toHaveAttribute('data-lit', 'false');
  await page.mouse.up({ button: 'right' });
  await page.keyboard.press('Escape');
  await page.keyboard.press('F1');
  await magic.focus();
  await page.keyboard.press('Enter');
  await expect(magic).toHaveAttribute('data-lit', 'true');
  await page.clock.runFor(600);
  await expect(overhead).toHaveAttribute('data-prayer', 'magic');
  await page.keyboard.press('Space');
  await expect(magic).toHaveAttribute('data-lit', 'false');
  await expect(overhead).toHaveAttribute('data-prayer', 'magic');
});

test('touch prayer presses apply before touch release without a second toggle', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.clock.install();
    await page.clock.pauseAt(new Date());
    await open(page);
    await lesson(page, 'One-tick alternating');
    await start(page, false);
    const magic = page.getByRole('button', { name: 'Magic', exact: true });
    await magic.scrollIntoViewIfNeeded();
    const rect = (await magic.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    await page.clock.runFor(550);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      ],
    });
    await expect(magic).toHaveAttribute('data-lit', 'true');
    await page.clock.runFor(50);
    await expect(page.locator('[data-player] .overhead')).toHaveAttribute(
      'data-prayer',
      'magic',
    );
    await expect(page.locator('.run-stats')).toContainText('100%');
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(magic).toHaveAttribute('data-lit', 'true');
  } finally {
    await context.close();
  }
});

test('idle alternating can follow only visible circles with sustained overlap', async ({
  page,
}) => {
  await open(page);
  await lesson(page, 'One-tick alternating');
  const trace = await page.evaluate(async () => {
    const buttons = ['Magic', 'Ranged'].map((name) =>
      document.querySelector<HTMLButtonElement>(
        `.prayer-button[aria-label="${name}"]`,
      )!,
    );
    const wait = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    const press = (index: number) => {
      const button = buttons[index];
      button.dispatchEvent(
        new PointerEvent('pointerdown', {
          button: 0,
          isPrimary: true,
          bubbles: true,
        }),
      );
      button.dispatchEvent(
        new PointerEvent('pointerup', {
          button: 0,
          isPrimary: true,
          bubbles: true,
        }),
      );
      button.dispatchEvent(
        new MouseEvent('click', { button: 0, detail: 1, bubbles: true }),
      );
    };
    const states: { time: number; lit: boolean[] }[] = [];
    let previous = [false, false];
    let responseTimer: number | undefined;
    const observer = new MutationObserver(() => {
      // Check the rendered glow, not a score, counter or expected-prayer hint.
      const lit = buttons.map(
        (button) =>
          getComputedStyle(button, '::before').visibility === 'visible',
      );
      states.push({ time: performance.now(), lit });
      const cleared = lit.findIndex((value, i) => !value && previous[i]);
      previous = lit;
      if (cleared >= 0)
        responseTimer = window.setTimeout(() => press(cleared), 100);
    });
    buttons.forEach((button) =>
      observer.observe(button, {
        attributes: true,
        attributeFilter: ['data-lit'],
      }),
    );
    try {
      press(0);
      await wait(650);
      press(1);
      await wait(4200);
      return states;
    } finally {
      observer.disconnect();
      window.clearTimeout(responseTimer);
    }
  });
  const overlaps = trace.filter((state) => state.lit.every(Boolean));
  expect(overlaps.length).toBeGreaterThanOrEqual(6);
  expect(trace.every((state) => state.lit.some(Boolean))).toBe(true);
  // Once established, a 100 ms response leaves both circles visible for
  // approximately 500 ms, as in the reference video's alternating sequence.
  for (let i = 1; i < trace.length - 1; i++) {
    const current = trace[i];
    if (current.lit.every(Boolean) && current !== overlaps[0])
      expect(trace[i + 1].time - current.time).toBeGreaterThan(400);
  }
  await expect(page.locator('.run-stats')).toContainText('0 / 36');
});

test('mobile alternating accepts overlapping fingers for a complete challenge', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await open(page);
    await lesson(page, 'One-tick alternating');
    await start(page);
    const magic = page.getByRole('button', { name: 'Magic', exact: true });
    const ranged = page.getByRole('button', { name: 'Ranged', exact: true });
    await magic.scrollIntoViewIfNeeded();
    const points = await Promise.all(
      [magic, ranged].map(async (button) => {
        const rect = (await button.boundingBox())!;
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }),
    );
    const cdp = await context.newCDPSession(page);
    let held = { ...points[0], id: 1 };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [held],
    });
    await page.clock.runFor(600);
    for (let tick = 2; tick <= 36; tick++) {
      await page.clock.runFor(100);
      const next = { ...points[(tick - 1) % 2], id: tick };
      // One thumb lands while the other is still down. That new contact is
      // non-primary, but is still a deliberate prayer press.
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [held, next],
      });
      await expect(magic).toHaveAttribute('data-lit', 'true');
      await expect(ranged).toHaveAttribute('data-lit', 'true');
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [held],
      });
      held = next;
      await page.clock.runFor(500);
      if (tick < 36)
        await expect(page.locator('.run-stats')).toContainText('100%');
    }
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(page.locator('.result-score')).toHaveText('100%');
    await expect(page.locator('.tick-meter')).toHaveCount(1);
  } finally {
    await context.close();
  }
});

test('touch movement on a prayer stays on the control while the rest of the page scrolls', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  try {
    const page = await context.newPage();
    await open(page);
    await lesson(page, 'One-tick alternating');
    const magic = page.getByRole('button', { name: 'Magic', exact: true });
    await magic.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const rect = (await magic.boundingBox())!;
    const cdp = await context.newCDPSession(page);
    const initialScroll = await page.evaluate(() => scrollY);
    const point = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [point],
    });
    await expect(magic).toHaveAttribute('data-lit', 'true');
    for (const distance of [10, 25, 45, 70])
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ ...point, y: point.y + distance }],
      });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(magic).toHaveAttribute('data-lit', 'true');
    expect(await page.evaluate(() => scrollY)).toBe(initialScroll);
    // A swipe starting on unused book artwork is still ordinary page scrolling.
    const outside = { x: point.x, y: point.y - 90 };
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [outside],
    });
    for (const distance of [10, 25, 45, 70])
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ ...outside, y: outside.y + distance }],
      });
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect
      .poll(() => page.evaluate(() => scrollY))
      .toBeLessThan(initialScroll - 30);
  } finally {
    await context.close();
  }
});

for (const width of [1440, 390]) {
  for (const mode of ['guided', 'challenge'] as const) {
    test(`finishing and retrying ${mode} at ${width}px stays beside the prayer controls`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.clock.install({ time: 0 });
      await page.clock.pauseAt(1000);
      await open(page);
      await lesson(page, 'Flick the mager');
      await start(page, mode === 'challenge');
      await page.clock.runFor(35 * 600);
      await page
        .locator('.game-side-panel')
        .evaluate((el) => el.scrollIntoView({ block: 'center' }));
      const positions = () =>
        page.evaluate(() => ({
          scroll: scrollY,
          controls: document
            .querySelector('.native-panel')!
            .getBoundingClientRect().top,
        }));
      const before = await positions();
      await page.clock.runFor(600);
      await expect(
        page.getByRole('region', { name: 'Run results' }),
      ).toBeVisible();
      expect(await positions()).toEqual(before);
      const retry = page.getByRole('button', { name: 'Retry', exact: true });
      await expect(retry).toBeInViewport();
      await retry.click();
      expect(await positions()).toEqual(before);
      await expect(
        page.getByRole('region', { name: 'Run results' }),
      ).toHaveCount(0);
      await expect(
        page.getByRole('button', {
          name: mode === 'guided' ? 'Guided practice' : 'Challenge',
          exact: true,
        }),
      ).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.run-stats')).toContainText('0 / 36');
      await expect(page.locator('.arena-overlay strong')).toHaveText('3');
      await page.clock.runFor(1800);
      await expect(
        page.getByText('Preparing tick 1', { exact: true }),
      ).toBeVisible();
      expect(await positions()).toEqual(before);
    });
  }
}
