import { expect, test } from '@playwright/test';

test('built site hydrates under CSP and blocks an unapproved inline script', async ({
  page,
}) => {
  await page.route('**/api/v1/config', (route) =>
    route.fulfill({
      json: { enabled: false, version: 1, siteKey: '' },
    }),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    (window as any).securityViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      (window as any).securityViolations.push(event.effectiveDirective);
    });
  });
  await page.goto('/#scores');
  test.skip(
    (await page.locator('script[src*="/@vite/client"]').count()) > 0,
    'Astro enables CSP only in production builds; run with playwright.production.config.ts.',
  );
  await expect(
    page.getByRole('heading', { name: 'High scores', exact: true }),
  ).toBeVisible();
  const policy = await page
    .locator('meta[http-equiv="content-security-policy"]')
    .getAttribute('content');
  expect(policy).toContain('sha256-');
  expect(policy).not.toContain('unsafe-eval');
  expect(
    policy?.split(';').find((d) => d.trim().startsWith('script-src')),
  ).not.toContain('unsafe-inline');
  expect(await page.evaluate(() => (window as any).securityViolations)).toEqual(
    [],
  );
  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.unapprovedSecurityProbe = true';
    document.body.append(script);
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).securityViolations))
    .toContain('script-src-elem');
  expect(
    await page.evaluate(() => (window as any).unapprovedSecurityProbe),
  ).toBeUndefined();
  expect(errors).toEqual([]);
  await page.goto('/credits/');
  await expect(page.locator('h1')).toBeVisible();
  expect(await page.evaluate(() => (window as any).securityViolations)).toEqual(
    [],
  );
});
