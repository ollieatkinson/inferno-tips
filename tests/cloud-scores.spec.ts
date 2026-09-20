import { test, expect, type Page } from '@playwright/test';
import type { InputBatch } from '../src/lib/cloudProtocol';
async function cloud(page: Page, enabled = true) {
  const batches: InputBatch[] = [];
  const published: unknown[] = [];
  let failSave = false;
  await page.route('https://challenges.cloudflare.com/**', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `window.turnstile = { render: function(el, options) { const input = document.createElement('button'); input.type = 'button'; input.textContent = 'Verify for test'; input.onclick = () => options.callback('verified-token'); el.appendChild(input); return 'test'; }, remove: function() {} };`,
    }),
  );
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/config'))
      return route.fulfill({
        json: { enabled, version: 1, siteKey: 'test-key' },
      });
    if (path.endsWith('/runs'))
      return route.fulfill({
        status: 201,
        json: {
          id: '00000000-0000-0000-0000-000000000001',
          seed: 53,
          version: 1,
          mode: 'hard',
        },
      });
    if (path.endsWith('/batches')) {
      batches.push(route.request().postDataJSON());
      return route.fulfill({ json: { accepted: batches.at(-1)!.sequence } });
    }
    if (path.endsWith('/finish'))
      return route.fulfill({
        json: {
          points: 20,
          stage: 1,
          cleared: false,
          practice: route.request().postDataJSON().reason === 'practice',
        },
      });
    if (path.endsWith('/publish')) {
      if (failSave) {
        failSave = false;
        return route.fulfill({
          status: 503,
          json: { error: 'Connection lost. Please retry.' },
        });
      }
      published.push(route.request().postDataJSON());
      return route.fulfill({
        json: { published: true, points: 20, stage: 1, cleared: false },
      });
    }
    if (path.endsWith('/leaderboards'))
      return route.fulfill({
        json: {
          entries: [
            {
              id: 'test',
              name: 'Mobile Player',
              rank: 1,
              points: 20,
              stage: 1,
              cleared: false,
              mine: true,
              publishedAt: Date.now(),
            },
          ],
          version: 1,
          versions: [1],
          week: null,
        },
      });
    return route.fulfill({ json: { removed: true } });
  });
  return {
    batches,
    published,
    failNextSave: () => {
      failSave = true;
    },
  };
}
async function dieWithPoints(page: Page) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('/#hard');
  await expect(page.getByLabel(/Record this run/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Start hard circuit', exact: true })
    .click();
  await expect(page.locator('.training-panel')).toHaveAttribute(
    'data-status',
    'countdown',
  );
  for (let i = 0; i < 3; i++) await page.clock.runFor(600);
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  await page.clock.runFor(600);
  await page.getByRole('button', { name: 'Magic', exact: true }).click();
  for (let i = 0; i < 6; i++) await page.clock.runFor(600);
  await expect(page.getByRole('dialog', { name: 'YOU DIED' })).toBeVisible();
  await page.clock.runFor(800);
}
for (const width of [1280, 390]) {
  test(`saves from death overlay, preserves retry and renders board at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const server = await cloud(page);
    await dieWithPoints(page);
    const dialog = page.getByRole('dialog', { name: 'YOU DIED' });
    await dialog
      .getByRole('button', { name: 'Save public score', exact: true })
      .click();
    await dialog.getByLabel('Public display name').fill('Mobile Player');
    await dialog.getByRole('button', { name: 'Verify for test' }).click();
    server.failNextSave();
    await dialog
      .getByRole('button', { name: 'Save score', exact: true })
      .click();
    await expect(dialog.getByRole('alert')).toContainText('Connection lost');
    await dialog
      .getByRole('button', { name: 'Verify for test' })
      .last()
      .click();
    await dialog
      .getByRole('button', { name: 'Save score', exact: true })
      .click();
    await expect(dialog).toContainText('Public score saved');
    expect(server.batches).toHaveLength(1);
    expect(server.batches[0].ticks.map((t) => t.tick)).toEqual([
      1, 2, 3, 4, 5, 6, 7,
    ]);
    expect(server.batches[0].ticks[0].prayer).toBe('magic');
    expect(server.published).toHaveLength(1);
    expect(
      await page.evaluate(() =>
        JSON.parse(
          localStorage.getItem('inferno-tips-cloud-pending-v1') || '[]',
        ),
      ),
    ).toEqual([]);
    const top = await page.evaluate(() => scrollY);
    await dialog.getByRole('button', { name: 'Retry run' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator('.training-panel')).toHaveAttribute(
      'data-status',
      'countdown',
    );
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(top, 0);
    await page.goto('/#scores');
    await expect(page.getByRole('table')).toContainText('Mobile Player (you)');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
test('recovers an unpublished result after reload and offers local-only start on API failure', async ({
  page,
}) => {
  await cloud(page);
  await dieWithPoints(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem('inferno-tips-cloud-pending-v1') || '[]',
          )[0]?.result?.points,
      ),
    )
    .toBe(20);
  await page.goto('/#scores');
  await expect(
    page.getByRole('region', { name: 'Unsaved public scores' }),
  ).toContainText('20 points');
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Unsaved public scores' }),
  ).toContainText('20 points');
  await page.route('**/api/v1/runs', (route) =>
    route.fulfill({ status: 503, json: { error: 'Unavailable' } }),
  );
  await page.goto('/#hard');
  await expect(page.getByLabel(/Record this run/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Start hard circuit', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Start local run' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Start local run' }).click();
  await expect(page.locator('.training-panel')).toHaveAttribute(
    'data-status',
    'countdown',
  );
});
test('disabled backend leaves local practice available and explains board availability', async ({
  page,
}) => {
  await cloud(page, false);
  await page.goto('/#scores');
  await expect(page.getByRole('status')).toContainText('not available yet');
  await page.goto('/#hard');
  await page
    .getByRole('button', { name: 'Start hard circuit', exact: true })
    .click();
  await expect(page.locator('.training-panel')).toHaveAttribute(
    'data-status',
    'countdown',
  );
});
