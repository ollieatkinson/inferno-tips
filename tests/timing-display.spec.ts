import { expect, test } from '@playwright/test';

for (const [id, cycle] of [
  ['rhythm', 4],
  ['blob', 6],
  ['movement', 4],
  ['gauntlet', 4],
  ['blowpipe', 2],
] as const) {
  test(`${id} challenge shows one cycle digit while guided retains the tick bar`, async ({
    page,
  }) => {
    if (id === 'movement')
      await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await page.goto(`/#drill-${id}`);
    await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
    await expect(page.locator('.tick-meter')).toHaveCount(1);
    await expect(
      page.locator('.run-stats').getByText('TICK', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Challenge', exact: true }).click();
    await expect(page.locator('.tick-meter')).toHaveCount(0);
    await expect(page.locator('.beat-dots, .attack-cycle')).toHaveCount(0);
    await expect(
      page.locator('.run-stats').getByText('TICK', { exact: true }),
    ).toHaveCount(0);
    const digit = page.locator('.compact-cycle-tick');
    await expect(digit).toHaveCount(1);
    await expect(digit).toHaveText('—');
    await page
      .getByRole('button', { name: 'Start challenge', exact: true })
      .click();
    for (let i = 0; i < 3; i++) await page.clock.runFor(600);
    await expect(digit).toHaveText('—');
    if (id !== 'blowpipe')
      await page.getByRole('button', { name: 'Magic', exact: true }).click();
    await page.clock.runFor(599);
    await expect(digit).toHaveText('—');
    await page.clock.runFor(1);
    await expect(digit).toHaveText('1');
    await expect(
      page.getByRole('timer', {
        name: `Cycle tick 1 of ${cycle}`,
        exact: true,
      }),
    ).toBeVisible();
    if (id !== 'blowpipe')
      await expect(page.locator('[data-player] .overhead')).toHaveAttribute(
        'data-prayer',
        'magic',
      );
    for (let tick = 2; tick <= cycle + 1; tick++) {
      await page.clock.runFor(600);
      await expect(digit).toHaveText(String(((tick - 1) % cycle) + 1));
    }
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.clock.runFor(1800);
    await expect(digit).toHaveText('1');
    await expect(digit).toHaveAttribute(
      'aria-label',
      `Cycle tick 1 of ${cycle}, paused`,
    );
    await page.getByRole('button', { name: 'End run', exact: true }).click();
    await expect(digit).toHaveText('—');
    await page
      .getByRole('button', { name: 'Guided practice', exact: true })
      .click();
    await expect(page.locator('.tick-meter')).toHaveCount(1);
    await expect(digit).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}

for (const mode of ['hard', 'endless'] as const) {
  test(`${mode} uses the compact challenge timing display`, async ({
    page,
  }) => {
    await page.clock.install({ time: 0 });
    await page.clock.pauseAt(1000);
    await page.goto(`/#${mode}`);
    await page
      .getByRole('button', {
        name: mode === 'hard' ? 'Start hard circuit' : 'Start endless gauntlet',
        exact: true,
      })
      .click();
    for (let i = 0; i < 4; i++) await page.clock.runFor(600);
    await expect(page.locator('.compact-cycle-tick')).toHaveText('1');
    await expect(
      page.locator('.tick-meter, .beat-dots, .attack-cycle'),
    ).toHaveCount(0);
    await expect(
      page.locator('.run-stats').getByText('TICK', { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel('Survival score')).toBeVisible();
  });
}
