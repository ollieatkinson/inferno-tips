import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { createHmac, randomUUID } from 'node:crypto';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import {
  drillTicks,
  lessons,
  type LessonId,
  type Prayer,
} from '../src/lib/course';
import {
  initialState,
  advance,
  targetAt,
  supplyGoal,
  jadStyle,
} from '../src/lib/engine';
import { nextBlowpipeTile } from '../src/lib/blowpipe';
import type { RunTick } from '../src/lib/cloudProtocol';
import type { DrillTicket, AccountView } from '../src/lib/accountProtocol';
let mf: Miniflare;
const origin = 'https://inferno.tips';
const secret = 'test-secret-only-for-isolated-miniflare-accounts';
let googleToken = '';
let googleJwk: Record<string, unknown>;
let providerEmail = 'discord@example.test';
let providerSubject = '123456789123456789';
let tokenValid = true;
let tokenAction = 'sign-in';
beforeEach(() => {
  tokenValid = true;
  tokenAction = 'sign-in';
  providerEmail = 'discord@example.test';
  providerSubject = randomUUID();
});
const request = (
  path: string,
  cookie = '',
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
  extra: Record<string, string> = {},
) =>
  mf.dispatchFetch(`${origin}/api/v1${path}`, {
    method,
    redirect: 'manual',
    headers: {
      Origin: origin,
      Cookie: cookie,
      'Content-Type': 'application/json',
      ...extra,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
beforeAll(async () => {
  const keys = await generateKeyPair('RS256');
  googleJwk = {
    ...(await exportJWK(keys.publicKey)),
    kid: 'test-key',
    alg: 'RS256',
    use: 'sig',
  };
  googleToken = await new SignJWT({
    name: 'Google Tester',
    email: 'google@example.test',
    email_verified: true,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
    .setSubject('google-user')
    .setIssuer('https://accounts.google.com')
    .setAudience('test-google')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(keys.privateKey);
  const bundle = await build({
    entryPoints: ['worker/index.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    external: ['node:*'],
    target: 'es2022',
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: '2026-09-19',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: ['DB'],
      bindings: {
        CLOUD_ENABLED: 'true',
        ACCOUNTS_ENABLED: 'true',
        APP_ORIGIN: origin,
        AUTH_SECRET: secret,
        TURNSTILE_SITE_KEY: 'test',
        TURNSTILE_SECRET: 'test',
        DISCORD_CLIENT_ID: 'test-discord',
        DISCORD_CLIENT_SECRET: 'test-discord-secret',
        GOOGLE_CLIENT_ID: 'test-google',
        GOOGLE_CLIENT_SECRET: 'test-google-secret',
      },
      ratelimits: {
        WRITE_LIMIT: {
          namespace_id: '1',
          simple: { limit: 10000, period: 60 },
        },
        READ_LIMIT: { namespace_id: '2', simple: { limit: 10000, period: 60 } },
        RUN_LIMIT: { namespace_id: '3', simple: { limit: 10000, period: 60 } },
      },
      outboundService: async (req) => {
        const url = new URL(req.url);
        if (url.hostname === 'challenges.cloudflare.com')
          return Response.json({
            success: tokenValid,
            hostname: 'inferno.tips',
            action: tokenAction,
          });
        if (url.hostname === 'www.googleapis.com')
          return Response.json({ keys: [googleJwk] });
        if (url.hostname === 'oauth2.googleapis.com')
          return Response.json({
            access_token: 'mock-google-access',
            token_type: 'Bearer',
            expires_in: 3600,
            id_token: googleToken,
          });
        if (url.pathname.includes('oauth2/token'))
          return Response.json({
            access_token: 'mock-provider-access',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: 'identify email',
          });
        if (decodeURIComponent(url.pathname).endsWith('/users/@me'))
          return Response.json({
            id: providerSubject,
            username: 'Tester',
            global_name: 'Tester',
            email: providerEmail,
            verified: true,
            avatar: null,
            discriminator: '1234',
          });
        return new Response('Unexpected provider request', { status: 500 });
      },
    }),
  );
  const db = await mf.getD1Database('DB');
  for (const migration of [
    '0001_scores',
    '0002_accounts',
    '0003_drill_progress',
  ]) {
    const sql = await readFile(`worker/migrations/${migration}.sql`, 'utf8');
    for (const statement of sql.split(';').filter((s) => s.trim()))
      await db.prepare(statement).run();
  }
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});
async function session() {
  const id = randomUUID(),
    token = randomUUID(),
    now = Date.now();
  const db = await mf.getD1Database('DB');
  await db
    .prepare(
      'INSERT INTO auth_user(id,name,email,emailVerified,createdAt,updatedAt) VALUES (?,?,?,?,?,?)',
    )
    .bind(id, 'Test', `${id}@example.test`, 1, now, now)
    .run();
  await db
    .prepare(
      'INSERT INTO auth_session(id,token,userId,expiresAt,createdAt,updatedAt) VALUES (?,?,?,?,?,?)',
    )
    .bind(randomUUID(), token, id, now + 86400000, now, now)
    .run();
  const signed = encodeURIComponent(
    `${token}.${createHmac('sha256', secret).update(token).digest('base64')}`,
  );
  return { id, cookie: `__Host-inferno-auth.session_token=${signed}` };
}
async function view(cookie: string) {
  const r = await request('/account', cookie);
  expect(r.status).toBe(200);
  return (await r.json()) as AccountView;
}
async function start(cookie: string, mode = 'challenge') {
  const r = await request('/account/drills', cookie, {
    lesson: 'rhythm',
    mode,
  });
  expect(r.status, await r.clone().text()).toBe(201);
  return (await r.json()) as DrillTicket;
}
function inputs() {
  return {
    practice: false,
    ticks: Array.from({ length: drillTicks('rhythm') }, (_, i) => ({
      tick: i + 1,
      prayer: i % 4 === 0 ? 'magic' : 'off',
      tile: 12,
      supply: null,
      transitions: [],
      blowpipe: null,
    })),
  };
}
async function age(id: string) {
  await (
    await mf.getD1Database('DB')
  )
    .prepare(
      'UPDATE drill_attempts SET started_at=started_at-120000 WHERE id=?',
    )
    .bind(id)
    .run();
}
describe('private accounts and imports', () => {
  it('recognizes signed DB sessions, rejects unsigned cookies and private anonymous writes', async () => {
    const a = await session();
    expect((await view(a.cookie)).user?.id).toBe(a.id);
    expect((await view(a.cookie + 'tamper')).user).toBeNull();
    expect(
      (await request('/account/import', '', { progress: {} })).status,
    ).toBe(401);
  });
  it('imports once without granting mastery and rejects cross-origin writes', async () => {
    const a = await session();
    const data = {
      progress: {
        rhythm: {
          attempts: 1000,
          best: 100,
          practiceBest: 100,
          passes: 2,
          scoringVersion: 2,
        },
      },
    };
    expect(
      await (await request('/account/import', a.cookie, data)).json(),
    ).toMatchObject({ imported: true });
    expect(
      await (await request('/account/import', a.cookie, data)).json(),
    ).toMatchObject({ alreadyImported: true });
    const account = await view(a.cookie);
    expect(account.imported?.progress.rhythm?.best).toBe(100);
    expect(account.progress).toEqual({});
    expect(
      (
        await request('/account/import', a.cookie, data, 'POST', {
          Origin: 'https://evil.test',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request('/account/import', a.cookie, {
          progress: {
            rhythm: { attempts: 1e99, best: 100, practiceBest: 100, passes: 2 },
          },
        })
      ).status,
    ).toBe(400);
  });
  it('replays a run once, verifies ownership and rejects impossible timing and client scores', async () => {
    const a = await session(),
      b = await session(),
      ticket = await start(a.cookie),
      path = `/account/drills/${ticket.id}/finish`;
    expect((await request(path, a.cookie, inputs())).status).toBe(409);
    await age(ticket.id);
    expect((await request(path, b.cookie, inputs())).status).toBe(404);
    expect(
      (await request(path, a.cookie, { ...inputs(), score: 100 })).status,
    ).toBe(400);
    const results = await Promise.all([
      request(path, a.cookie, inputs()),
      request(path, a.cookie, inputs()),
    ]);
    expect(results.some((r) => r.status === 200)).toBe(true);
    const saved = await request(path, a.cookie, inputs());
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({
      score: 100,
      passed: true,
      practice: false,
    });
    const account = await view(a.cookie);
    expect(account.progress.rhythm).toMatchObject({
      attempts: 1,
      passes: 1,
      best: 100,
    });
    expect(
      (await request(path, a.cookie, { ...inputs(), practice: true })).status,
    ).toBe(409);
  });
  it('guided and paused runs never award verified passes', async () => {
    for (const mode of ['guided', 'challenge']) {
      const a = await session(),
        ticket = await start(a.cookie, mode);
      await age(ticket.id);
      expect(
        await (
          await request(`/account/drills/${ticket.id}/finish`, a.cookie, {
            ...inputs(),
            practice: mode === 'challenge',
          })
        ).json(),
      ).toMatchObject({ practice: true, passed: false });
      expect((await view(a.cookie)).progress.rhythm?.passes).toBe(0);
    }
  });
  it('requires the existing guest credential to claim scores and binds it to one account', async () => {
    const a = await session(),
      b = await session();
    const run = await request('/runs', '', { mode: 'hard' });
    const guest = run.headers.get('set-cookie')!.split(';')[0];
    expect((await request('/account/claim-scores', a.cookie, {})).status).toBe(
      401,
    );
    expect(
      (await request('/account/claim-scores', `${a.cookie}; ${guest}`, {}))
        .status,
    ).toBe(200);
    expect(
      (await request('/account/claim-scores', `${b.cookie}; ${guest}`, {}))
        .status,
    ).toBe(409);
  });
  it('revokes sessions in the database', async () => {
    const a = await session();
    expect((await request('/auth/revoke-sessions', a.cookie, {})).status).toBe(
      200,
    );
    expect((await view(a.cookie)).user).toBeNull();
  });
});
describe('OAuth boundary', () => {
  it('only exposes social authorization-code flows behind Turnstile', async () => {
    expect(
      (
        await request('/auth/sign-up/email', '', {
          email: 'a@b.test',
          password: 'password',
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await request('/auth/sign-in/social', '', {
          provider: 'discord',
          idToken: { token: 'fake' },
        })
      ).status,
    ).toBe(400);
    tokenValid = false;
    expect(
      (
        await request(
          '/auth/sign-in/social',
          '',
          { provider: 'discord' },
          'POST',
          { 'X-Captcha-Response': 'fake' },
        )
      ).status,
    ).toBe(400);
    tokenValid = true;
    tokenAction = 'publish-score';
    expect(
      (
        await request(
          '/auth/sign-in/social',
          '',
          { provider: 'discord' },
          'POST',
          { 'X-Captcha-Response': 'fake' },
        )
      ).status,
    ).toBe(400);
    tokenAction = 'sign-in';
  });
  it('starts Google and Discord with secure state cookies and rejects external redirect destinations', async () => {
    for (const provider of ['google', 'discord']) {
      const r = await request(
        '/auth/sign-in/social',
        '',
        { provider, callbackURL: `${origin}/#account`, disableRedirect: true },
        'POST',
        { 'X-Captcha-Response': 'test' },
      );
      expect(r.status, await r.clone().text()).toBe(200);
      const data = (await r.json()) as { url: string };
      expect(new URL(data.url).searchParams.get('state')).toBeTruthy();
      const cookie = r.headers.get('set-cookie') || '';
      expect(cookie).toContain('__Host-inferno-auth');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/');
      expect(cookie).not.toContain('Domain=');
    }
    const r = await request(
      '/auth/sign-in/social',
      '',
      { provider: 'discord', callbackURL: 'https://evil.test/' },
      'POST',
      { 'X-Captcha-Response': 'test' },
    );
    expect(r.status).toBe(403);
  });
  it('rejects callbacks without a valid state', async () => {
    const r = await request('/auth/callback/discord?code=fake&state=fake');
    expect([302, 400]).toContain(r.status);
    expect(r.headers.get('set-cookie') || '').not.toContain('session_token=');
  });
});

async function oauth(
  provider: 'google' | 'discord',
  cookie = '',
  link = false,
) {
  const start = await request(
    `/auth/${link ? 'link-social' : 'sign-in/social'}`,
    cookie,
    {
      provider,
      callbackURL: `${origin}/#account`,
      errorCallbackURL: `${origin}/?auth-error=1#account`,
      disableRedirect: true,
    },
    'POST',
    { 'X-Captcha-Response': 'test' },
  );
  expect(start.status, await start.clone().text()).toBe(200);
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get('state');
  const stateCookies = start.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const response = await request(
    `/auth/callback/${provider}?code=provider-code&state=${state}`,
    `${cookie}; ${stateCookies}`,
  );
  const cookies = response.headers
    .getSetCookie()
    .filter((c) => c.startsWith('__Host-inferno-auth.session_token='))
    .map((c) => c.split(';')[0])
    .join('; ');
  return { response, cookie: cookies, state, stateCookies };
}
describe('provider callback integration', () => {
  it('completes Discord code exchange and creates a real account/session with encrypted provider tokens', async () => {
    providerEmail = `${randomUUID()}@example.test`;
    const result = await oauth('discord');
    expect(result.response.status).toBe(302);
    expect(result.response.headers.get('location')).toBe(`${origin}/#account`);
    expect(result.cookie).toContain('session_token=');
    const account = await view(result.cookie);
    expect(account.user?.email).toBe(providerEmail);
    expect(account.linkedProviders).toEqual(['discord']);
    const stored = await (
      await mf.getD1Database('DB')
    )
      .prepare('SELECT accessToken FROM auth_account WHERE userId=?')
      .bind(account.user!.id)
      .first<{ accessToken: string }>();
    expect(stored?.accessToken).toBeTruthy();
    expect(stored?.accessToken).not.toContain('mock-provider-access');
    const replay = await request(
      `/auth/callback/discord?code=provider-code&state=${result.state}`,
      result.stateCookies,
    );
    expect(replay.headers.get('location')).toContain('error=');
  });
  it('completes Google code exchange and creates a real session', async () => {
    const result = await oauth('google');
    expect(result.response.status).toBe(302);
    expect(result.response.headers.get('location')).toBe(`${origin}/#account`);
    expect((await view(result.cookie)).user?.email).toBe('google@example.test');
  });
  it('does not merge matching email identities implicitly, and links them only from a signed-in account', async () => {
    const a = await session();
    const account = await view(a.cookie);
    providerEmail = account.user!.email;
    const attempt = await oauth('discord');
    expect(attempt.cookie).toBe('');
    expect(attempt.response.headers.get('location')).toContain('error=');
    const linked = await oauth('discord', a.cookie, true);
    expect(linked.response.headers.get('location')).toBe(`${origin}/#account`);
    expect((await view(a.cookie)).linkedProviders).toContain('discord');
  });
  it('prevents overlapping drill reservations and makes cancellation final', async () => {
    const a = await session();
    const responses = await Promise.all([
      request('/account/drills', a.cookie, {
        lesson: 'rhythm',
        mode: 'challenge',
      }),
      request('/account/drills', a.cookie, {
        lesson: 'rhythm',
        mode: 'challenge',
      }),
    ]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    const first = (await responses
      .find((r) => r.status === 201)!
      .json()) as DrillTicket;
    expect(
      (await request(`/account/drills/${first.id}/cancel`, a.cookie, {}))
        .status,
    ).toBe(200);
    await age(first.id);
    expect(
      (await request(`/account/drills/${first.id}/finish`, a.cookie, inputs()))
        .status,
    ).toBe(409);
    await start(a.cookie);
  });
  it('deletes account data and revokes the session without leaving imported history behind', async () => {
    const a = await session();
    await request('/account/import', a.cookie, { progress: {} });
    await start(a.cookie);
    tokenAction = 'delete-account';
    expect(
      (
        await request(
          '/account',
          a.cookie,
          { confirm: true, token: 'test' },
          'DELETE',
        )
      ).status,
    ).toBe(200);
    expect((await view(a.cookie)).user).toBeNull();
    const db = await mf.getD1Database('DB');
    expect(
      await db
        .prepare('SELECT * FROM account_imports WHERE user_id=?')
        .bind(a.id)
        .first(),
    ).toBeNull();
    expect(
      await db
        .prepare('SELECT * FROM drill_attempts WHERE user_id=?')
        .bind(a.id)
        .first(),
    ).toBeNull();
  });
});

describe('account score ownership', () => {
  it('groups claimed guest scores across devices and requires login after claiming', async () => {
    const a = await session();
    const db = await mf.getD1Database('DB');
    for (const points of [10, 20]) {
      const response = await request('/runs', '', { mode: 'hard' });
      const ticket = (await response.json()) as { id: string; version: number };
      const guest = response.headers.get('set-cookie')!.split(';')[0];
      expect(
        (await request('/account/claim-scores', `${a.cookie}; ${guest}`, {}))
          .status,
      ).toBe(200);
      await db
        .prepare(
          'INSERT INTO scores(id,guest_id,name,mode,version,week,points,stage,cleared,published_at) SELECT id,guest_id,?,mode,version,week,?,1,0,? FROM runs WHERE id=?',
        )
        .bind('Account test', points, Date.now(), ticket.id)
        .run();
      expect(
        (
          await request(`/runs/${ticket.id}/finish`, guest, {
            batches: 0,
            reason: 'finish',
          })
        ).status,
      ).toBe(401);
    }
    const board = await request('/leaderboards?mode=hard&period=all', a.cookie);
    expect(board.status).toBe(200);
    const payload = (await board.json()) as {
      entries: Array<{ name: string; points: number; mine: boolean }>;
    };
    const mine = payload.entries.filter((e) => e.mine);
    expect(mine).toHaveLength(1);
    expect(mine[0].points).toBe(20);
    expect(JSON.stringify(payload)).not.toContain(a.id);
    expect((await request('/scores/mine', a.cookie, {}, 'DELETE')).status).toBe(
      200,
    );
    const hidden = (await (
      await request('/leaderboards?mode=hard&period=all', a.cookie)
    ).json()) as { entries: Array<{ mine: boolean }> };
    expect(hidden.entries.some((e) => e.mine)).toBe(false);
  });
});

function perfectPrayer(id: LessonId, tick: number, seed: number): Prayer {
  if (['rhythm', 'food', 'potions'].includes(id))
    return tick % 4 === 1 ? 'magic' : 'off';
  if (id === 'bat') return tick % 3 === 1 ? 'range' : 'off';
  if (id === 'flick') return 'magic';
  if (id === 'two-tick') return (tick - 1) % 4 < 2 ? 'magic' : 'range';
  if (id === 'two-tick-repair') return tick % 4 < 2 ? 'magic' : 'range';
  if (id === 'anchor-range') return tick % 2 ? 'range' : 'magic';
  if (id === 'stack-one') return tick % 4 === 1 ? 'magic' : 'range';
  if (id === 'reverse') return tick % 4 === 1 ? 'magic' : 'range';
  if (id === 'melee-blob')
    return (['melee', 'range', 'magic', 'range'] as Prayer[])[(tick - 1) % 4];
  if (id === 'jad' || id === 'triples') return jadStyle(id, tick, seed);
  if (id === 'blob')
    return Math.floor((tick - 1) / 3) % 2 === 0 ? 'magic' : 'range';
  if (id === 'stack' || id === 'movement')
    return (tick - 1) % 4 < 2 ? 'magic' : 'range';
  return tick % 2 === 1 ? 'magic' : 'range';
}

describe('all individual lessons', () => {
  it.each(lessons)(
    '$id saves the intended full sequence, including supply tails and seeded Jad cues',
    async ({ id }) => {
      const a = await session();
      const response = await request('/account/drills', a.cookie, {
        lesson: id,
        mode: 'challenge',
      });
      expect(response.status).toBe(201);
      const ticket = (await response.json()) as DrillTicket;
      let state = initialState(ticket.seed);
      const ticks: RunTick[] = [];
      for (let tick = 1; tick <= drillTicks(id); tick++) {
        const input: RunTick = {
          tick,
          prayer: perfectPrayer(id, tick, ticket.seed),
          tile: targetAt(tick, id),
          supply: tick % 4 === 2 ? supplyGoal(id, tick) : null,
          transitions: tick > 1 ? ['off', 'magic'] : [],
          blowpipe:
            tick % 2 === 1
              ? { type: 'attack' }
              : { type: 'move', tile: nextBlowpipeTile(state.blowpipe) },
        };
        ticks.push(input);
        state = advance(state, id, input.prayer, input.tile, input.supply, {
          transitions: input.transitions,
          blowpipe: input.blowpipe,
        });
      }
      await age(ticket.id);
      const result = await request(
        `/account/drills/${ticket.id}/finish`,
        a.cookie,
        { ticks, practice: false },
      );
      expect(result.status, await result.clone().text()).toBe(200);
      expect(await result.json()).toMatchObject({
        score: 100,
        passed: true,
        practice: false,
      });
    },
  );
});

describe('auth request boundaries', () => {
  it('rejects oversized authorization requests before parsing them in the auth library', async () => {
    const response = await request(
      '/auth/sign-in/social',
      '',
      { provider: 'google', callbackURL: 'a'.repeat(70000) },
      'POST',
      { 'X-Captcha-Response': 'test' },
    );
    expect(response.status).toBe(413);
  });
  it('requires a fresh session for linking and deletion, and rejects expired sessions', async () => {
    const a = await session();
    const db = await mf.getD1Database('DB');
    await db
      .prepare(
        'UPDATE auth_session SET createdAt=createdAt-7200000 WHERE userId=?',
      )
      .bind(a.id)
      .run();
    expect(
      (
        await request(
          '/auth/link-social',
          a.cookie,
          { provider: 'discord' },
          'POST',
          { 'X-Captcha-Response': 'test' },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await request(
          '/account',
          a.cookie,
          { confirm: true, token: 'test' },
          'DELETE',
        )
      ).status,
    ).toBe(403);
    await db
      .prepare('UPDATE auth_session SET expiresAt=? WHERE userId=?')
      .bind(Date.now() - 1, a.id)
      .run();
    expect((await view(a.cookie)).user).toBeNull();
  });
});
