import { test, expect, type Page } from '@playwright/test';
import { drillTicks } from '../src/lib/course';
import { initialState, advance, accuracy } from '../src/lib/engine';
import type { AccountView } from '../src/lib/accountProtocol';
import type { RunTick } from '../src/lib/cloudProtocol';

function account(): AccountView {
  return {
    enabled: true,
    providers: { google: false, discord: true },
    siteKey: 'test',
    user: {
      id: 'test-account',
      name: 'Olbo',
      email: 'olbo@example.test',
      nickname: 'Amber Moss Falcon',
    },
    progress: {},
    imported: null,
    history: [],
    linkedProviders: ['discord'],
  };
}
async function ready(page: Page, url: string) {
  await page.goto(url);
  await expect(page.locator('astro-island')).not.toHaveAttribute('ssr');
}
async function play(page: Page) {
  await page.getByRole('button', { name: 'Challenge', exact: true }).click();
  await page
    .getByRole('button', { name: 'Start challenge', exact: true })
    .click();
  await expect(page.locator('.training-panel')).toHaveAttribute(
    'data-status',
    'countdown',
  );
  for (let i = 0; i < 3; i++) await page.clock.runFor(600);
  await expect(page.locator('.training-panel')).toHaveAttribute(
    'data-status',
    'running',
  );
  for (let tick = 1; tick <= drillTicks('rhythm'); tick++) {
    const magic = page.getByRole('button', { name: 'Magic', exact: true });
    const on = (await magic.getAttribute('aria-pressed')) === 'true';
    if (on !== (tick % 4 === 1)) await magic.click();
    await page.clock.runFor(600);
  }
  await expect(page.locator('.result-score')).toHaveText('100%');
}
test('signed-in drill syncs server-issued inputs, queues a network failure, and retries without duplicate mastery', async ({
  page,
}) => {
  const view = account();
  let finishes = 0,
    fail = true;
  let imported = false;
  await page.route('**/api/v1/account**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    if (path.endsWith('/drills'))
      return route.fulfill({
        json: {
          id: '00000000-0000-4000-8000-000000000001',
          userId: view.user!.id,
          lesson: 'rhythm',
          mode: 'challenge',
          seed: 1234,
          version: 1,
        },
      });
    if (path.endsWith('/finish')) {
      finishes++;
      if (fail) return route.abort('failed');
      const payload = req.postDataJSON() as {
        ticks: RunTick[];
        practice: boolean;
      };
      expect(payload.ticks).toHaveLength(drillTicks('rhythm'));
      expect(payload.practice).toBe(false);
      let state = initialState(1234);
      for (const input of payload.ticks)
        state = advance(
          state,
          'rhythm',
          input.prayer,
          input.tile,
          input.supply,
          { transitions: input.transitions, blowpipe: input.blowpipe },
        );
      expect(accuracy(state.checks)).toBe(100);
      view.progress.rhythm = {
        attempts: 1,
        best: 100,
        practiceBest: 0,
        passes: 1,
        scoringVersion: 2,
      };
      return route.fulfill({
        json: {
          score: 100,
          passed: true,
          practice: false,
          bestStreak: 9,
          feedback: 'Clean run.',
        },
      });
    }
    if (path.endsWith('/import')) {
      imported = true;
      view.imported = {
        progress: req.postDataJSON().progress,
        importedAt: Date.now(),
      };
      return route.fulfill({ json: { imported: true } });
    }
    return route.fulfill({ json: view });
  });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await ready(page, '/#drill-rhythm');
  await expect(
    page.getByRole('link', { name: 'Account', exact: true }),
  ).toBeVisible();
  await play(page);
  await expect(
    page.getByRole('status').filter({ hasText: 'Run kept in this browser' }),
  ).toBeVisible();
  expect(finishes).toBe(1);
  fail = false;
  await ready(page, '/#account');
  await expect(
    page.getByRole('heading', { name: '1 run waiting to sync' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry sync', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Run synced.');
  expect(finishes).toBe(2);
  expect(imported).toBe(false);
  await expect(
    page.getByRole('button', { name: 'Retry sync', exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole('link', { name: 'View your progress', exact: true })
    .click();
  await expect(
    page.locator('.progress-table').getByText('1/2 passes', { exact: true }),
  ).toHaveCount(1);
});
test('browser import remains visibly unverified and never replaces account progress', async ({
  page,
}) => {
  const view = account();
  await page.addInitScript(() =>
    localStorage.setItem(
      'inferno-tips-progress-v1',
      JSON.stringify({
        rhythm: {
          attempts: 1000,
          best: 100,
          practiceBest: 100,
          passes: 2,
          scoringVersion: 2,
        },
      }),
    ),
  );
  await page.route('**/api/v1/account**', async (route) => {
    if (route.request().url().endsWith('/import')) {
      view.imported = {
        progress: route.request().postDataJSON().progress,
        importedAt: Date.now(),
      };
      return route.fulfill({ json: { imported: true } });
    }
    return route.fulfill({ json: view });
  });
  await ready(page, '/#account');
  await page.getByRole('button', { name: 'Import browser history' }).click();
  await expect(page.getByText(/Unverified personal history/)).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Import browser history' }),
  ).toHaveCount(0);
  await page
    .getByRole('link', { name: 'View your progress', exact: true })
    .click();
  await expect(
    page.locator('.progress-table').getByText('2/2 passes', { exact: true }),
  ).toHaveCount(0);
});
test('mobile account page fits and session revocation returns to sign-in', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  let view = account();
  await page.route('**/api/v1/account', (route) =>
    route.fulfill({ json: view }),
  );
  await page.route('**/api/v1/auth/revoke-sessions', (route) => {
    view = {
      ...view,
      user: null,
      providers: { google: false, discord: false },
    };
    return route.fulfill({ json: { status: true } });
  });
  await ready(page, '/#account');
  await expect(
    page.getByRole('heading', { name: 'Your account', exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole('button', { name: /Link/ })).toHaveCount(0);
  await expect(page.getByText(/Link another provider/)).toHaveCount(0);
  await expect(
    page.locator('iframe[src*="challenges.cloudflare.com"]'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Sign out on all devices' }).click();
  await expect(
    page.getByRole('heading', { name: 'Keep your progress' }),
  ).toBeVisible();
  await expect(
    page.getByText('Sign-in is not available here yet.', { exact: false }),
  ).toBeVisible();
});

test('failed or expired sign-in verification can be retried without reloading', async ({
  page,
}) => {
  const view = account();
  view.user = null;
  view.linkedProviders = [];
  await page.route('**/api/v1/account', (route) =>
    route.fulfill({ json: view }),
  );
  await page.route(
    'https://challenges.cloudflare.com/turnstile/v0/api.js*',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: `
  window.verificationRenders=0;
  window.turnstile={render(element,options){window.verificationOptions=options;const n=++window.verificationRenders;queueMicrotask(()=>n===1?options['error-callback']():options.callback('test-token'));return String(n);},remove(){}};
 `,
      }),
  );
  await ready(page, '/#account');
  const discord = page.getByRole('button', {
    name: 'Continue with Discord',
    exact: true,
  });
  await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(0);
  await expect(page.getByText(/Sign in with Discord to save/)).toBeVisible();
  await expect(discord).toBeDisabled();
  await page
    .getByRole('button', { name: 'Retry verification', exact: true })
    .click();
  await expect(discord).toBeEnabled();
  await page.evaluate(() =>
    (
      window as unknown as { verificationOptions: Record<string, () => void> }
    ).verificationOptions['expired-callback'](),
  );
  await expect(discord).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('Verification expired');
  await page
    .getByRole('button', { name: 'Retry verification', exact: true })
    .click();
  await expect(discord).toBeEnabled();
});

test('account nickname saves and persists after reload without changing private profile details', async ({
  page,
}) => {
  const state = account();
  await page.route('**/api/v1/account**', async (route) => {
    if (route.request().method() === 'PATCH') {
      state.user!.nickname = route.request().postDataJSON().nickname.trim();
      return route.fulfill({ json: { nickname: state.user!.nickname } });
    }
    return route.fulfill({ json: state });
  });
  await ready(page, '/#account');
  await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue(
    'Amber Moss Falcon',
  );
  await page
    .getByRole('button', { name: 'Use my Discord name', exact: true })
    .click();
  await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue(
    'Olbo',
  );
  expect(state.user!.nickname).toBe('Amber Moss Falcon');
  await expect(page.getByRole('status')).toContainText(
    'Review the name, then save',
  );
  await page
    .getByRole('button', { name: 'Save nickname', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText('Nickname saved');
  await page.reload();
  await expect(page.getByLabel('Nickname', { exact: true })).toHaveValue(
    'Olbo',
  );
  await expect(
    page.getByText('olbo@example.test', { exact: true }),
  ).toBeVisible();
});
