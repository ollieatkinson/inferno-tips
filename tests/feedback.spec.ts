import { test, expect } from '@playwright/test';

for (const width of [1280, 390]) {
  test(`guided result explains failed rounds and gives retry advice at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await page.goto('/#drill-rhythm');
    await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
    await page
      .getByRole('button', { name: 'Start guided practice', exact: true })
      .click();
    await page.getByRole('button', { name: 'Magic', exact: true }).click();
    for (let tick = 0; tick < 3 + 35; tick++) await page.clock.runFor(600);
    await page.locator('.game-panel-status').scrollIntoViewIfNeeded();
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.clock.runFor(600);
    await expect(page.locator('.training-panel')).toHaveAttribute(
      'data-status',
      'done',
    );
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(scrollBefore, 0);
    const nearby = page.getByLabel('Next attempt advice');
    await expect(nearby).toContainText('0 / 9 rounds complete');
    await expect(nearby).toContainText(
      'Prayer left on during quiet ticks · 27 ticks',
    );
    await expect(nearby).toContainText(
      'Turn the active prayer off just after the attack check',
    );
    const review = page.getByRole('region', { name: 'What to work on' });
    await expect(review).toContainText('Tick 2: Needed off; Magic was active.');
    await expect(review.getByRole('listitem')).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .locator('.game-panel-status')
      .getByRole('button', { name: 'Restart practice' })
      .click();
    await expect(nearby).toHaveCount(0);
    await expect(review).toHaveCount(0);
    await expect(page.locator('.training-panel')).toHaveAttribute(
      'data-status',
      'countdown',
    );
  });
}
