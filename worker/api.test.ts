import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import type { CloudTicket, InputBatch } from '../src/lib/cloudProtocol';
let mf: Miniflare;
const origin = 'https://inferno.tips';
let validToken = true;
let tokenHost = 'inferno.tips';
let tokenAction = 'publish-score';
let tokenReply: 'normal' | 'unavailable' | 'malformed' = 'normal';
let bundledWorker: string;
beforeEach(() => {
  validToken = true;
  tokenHost = 'inferno.tips';
  tokenAction = 'publish-score';
  tokenReply = 'normal';
});
beforeAll(async () => {
  const bundle = await build({
    entryPoints: ['worker/index.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    conditions: ['workerd'],
    external: ['node:*'],
    target: 'es2022',
  });
  bundledWorker = bundle.outputFiles[0].text;
  mf = await createApi();
}, 30000);
async function createApi(limits = { read: 1000, run: 1000, write: 1000 }) {
  const instance = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: bundledWorker,
      compatibilityDate: '2026-09-19',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: ['DB'],
      bindings: {
        CLOUD_ENABLED: 'true',
        APP_ORIGIN: origin,
        TURNSTILE_SITE_KEY: 'test',
        TURNSTILE_SECRET: 'test',
      },
      ratelimits: {
        WRITE_LIMIT: {
          namespace_id: '1',
          simple: { limit: limits.write, period: 60 },
        },
        READ_LIMIT: {
          namespace_id: '2',
          simple: { limit: limits.read, period: 60 },
        },
        RUN_LIMIT: {
          namespace_id: '3',
          simple: { limit: limits.run, period: 60 },
        },
      },
      outboundService: () => {
        if (tokenReply === 'unavailable')
          throw new Error('Siteverify unavailable');
        if (tokenReply === 'malformed') return new Response('not JSON');
        return new Response(
          JSON.stringify({
            success: validToken,
            hostname: tokenHost,
            action: tokenAction,
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    }),
  );
  const db = await instance.getD1Database('DB');
  const sql = await readFile('worker/migrations/0001_scores.sql', 'utf8');
  for (const statement of sql.split(';').filter((s) => s.trim()))
    await db.prepare(statement).run();
  return instance;
}
afterAll(async () => {
  await mf?.dispose();
});
const request = (
  path: string,
  cookie = '',
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
) =>
  mf.dispatchFetch(`${origin}/api/v1${path}`, {
    method,
    headers: {
      Origin: origin,
      Cookie: cookie,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
async function start(cookie = '') {
  const response = await request('/runs', cookie, { mode: 'hard' });
  expect(response.status).toBe(201);
  return {
    ticket: (await response.json()) as CloudTicket,
    cookie: response.headers.get('set-cookie')?.split(';')[0] ?? cookie,
  };
}
const batch = (correct = true): InputBatch => ({
  sequence: 0,
  stage: 0,
  ticks: Array.from({ length: 3 }, (_, i) => ({
    tick: i + 1,
    prayer: correct ? (i === 2 ? 'range' : 'magic') : 'off',
    tile: 12,
    supply: null,
    transitions: [],
    blowpipe: null,
  })),
});
async function age(id: string) {
  await (
    await mf.getD1Database('DB')
  )
    .prepare('UPDATE runs SET started_at = started_at - 120000 WHERE id = ?')
    .bind(id)
    .run();
}
async function finishAndPublish(
  cookie: string,
  ticket: CloudTicket,
  name: string,
) {
  await age(ticket.id);
  expect(
    (await request(`/runs/${ticket.id}/batches`, cookie, batch())).status,
  ).toBe(200);
  const finish = await request(`/runs/${ticket.id}/finish`, cookie, {
    batches: 1,
    reason: 'finish',
    points: 99999,
  });
  expect(await finish.json()).toMatchObject({
    points: 40,
    stage: 1,
    cleared: false,
  });
  return request(`/runs/${ticket.id}/publish`, cookie, {
    name,
    token: 'token',
  });
}
describe('Worker HTTP API with real local D1', () => {
  it('recomputes scores, retries identical requests, ranks ties and limits each identity to one row', async () => {
    const first = await start();
    expect(
      (await finishAndPublish(first.cookie, first.ticket, 'Player One')).status,
    ).toBe(200);
    expect(
      (await request(`/runs/${first.ticket.id}/batches`, first.cookie, batch()))
        .status,
    ).toBe(200);
    const altered = batch();
    altered.ticks[0].prayer = 'range';
    expect(
      (await request(`/runs/${first.ticket.id}/batches`, first.cookie, altered))
        .status,
    ).toBe(409);
    expect(
      (
        await request(`/runs/${first.ticket.id}/publish`, first.cookie, {
          name: 'Player One',
          token: 'used',
        })
      ).status,
    ).toBe(200);
    const second = await start(first.cookie);
    await finishAndPublish(second.cookie, second.ticket, 'Player One');
    const other = await start();
    await finishAndPublish(other.cookie, other.ticket, 'Player One');
    const board = (await (
      await request('/leaderboards?mode=hard', first.cookie)
    ).json()) as { entries: { rank: number; points: number; mine: boolean }[] };
    expect(board.entries).toHaveLength(2);
    expect(board.entries.map((e) => e.rank)).toEqual([1, 1]);
    expect(board.entries.filter((e) => e.mine)).toHaveLength(1);
    expect(board.entries.every((e) => e.points === 40)).toBe(true);
  });
  it('rejects accelerated input, skipped batches, foreign ownership and CSRF', async () => {
    const own = await start(),
      other = await start();
    expect(
      (await request(`/runs/${own.ticket.id}/batches`, own.cookie, batch()))
        .status,
    ).toBe(409);
    await age(own.ticket.id);
    expect(
      (
        await request(`/runs/${own.ticket.id}/batches`, own.cookie, {
          ...batch(),
          sequence: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (await request(`/runs/${own.ticket.id}/batches`, other.cookie, batch()))
        .status,
    ).toBe(404);
    const csrf = await mf.dispatchFetch(`${origin}/api/v1/runs`, {
      method: 'POST',
      headers: {
        Origin: 'https://evil.example',
        Cookie: own.cookie,
        'Content-Type': 'application/json',
      },
      body: '{"mode":"hard"}',
    });
    expect(csrf.status).toBe(403);
  });
  it('does not publish paused runs and validates names and Turnstile', async () => {
    const own = await start();
    await age(own.ticket.id);
    await request(`/runs/${own.ticket.id}/batches`, own.cookie, batch());
    await request(`/runs/${own.ticket.id}/finish`, own.cookie, {
      batches: 1,
      reason: 'practice',
    });
    expect(
      (
        await request(`/runs/${own.ticket.id}/publish`, own.cookie, {
          name: 'Practice',
          token: 'token',
        })
      ).status,
    ).toBe(400);
    const valid = await start();
    await age(valid.ticket.id);
    await request(`/runs/${valid.ticket.id}/batches`, valid.cookie, batch());
    await request(`/runs/${valid.ticket.id}/finish`, valid.cookie, {
      batches: 1,
      reason: 'finish',
    });
    expect(
      (
        await request(`/runs/${valid.ticket.id}/publish`, valid.cookie, {
          name: '<script>',
          token: 'token',
        })
      ).status,
    ).toBe(400);
    validToken = false;
    expect(
      (
        await request(`/runs/${valid.ticket.id}/publish`, valid.cookie, {
          name: 'Player',
          token: 'token',
        })
      ).status,
    ).toBe(400);
    validToken = true;
  });
  it('handles concurrent uploads once and keeps submissions in their start week', async () => {
    const own = await start();
    await age(own.ticket.id);
    const responses = await Promise.all([
      request(`/runs/${own.ticket.id}/batches`, own.cookie, batch()),
      request(`/runs/${own.ticket.id}/batches`, own.cookie, batch()),
    ]);
    expect(responses.some((r) => r.status === 200)).toBe(true);
    expect(responses.every((r) => [200, 409].includes(r.status))).toBe(true);
    expect(
      (await request(`/runs/${own.ticket.id}/batches`, own.cookie, batch()))
        .status,
    ).toBe(200);
    const db = await mf.getD1Database('DB');
    await db
      .prepare("UPDATE runs SET week = '2026-09-14' WHERE id = ?")
      .bind(own.ticket.id)
      .run();
    await request(`/runs/${own.ticket.id}/finish`, own.cookie, {
      batches: 1,
      reason: 'finish',
    });
    await request(`/runs/${own.ticket.id}/publish`, own.cookie, {
      name: 'Last Week',
      token: 'token',
    });
    const board = (await (
      await request(
        '/leaderboards?mode=hard&period=weekly&week=2026-09-14',
        own.cookie,
      )
    ).json()) as { entries: { name: string }[] };
    expect(board.entries.some((e) => e.name === 'Last Week')).toBe(true);
    expect(
      (await request('/leaderboards?mode=hard&period=weekly&week=2026-09-15'))
        .status,
    ).toBe(400);
  });
  it('removes owned scores and rejects republishing deleted records', async () => {
    const own = await start();
    await finishAndPublish(own.cookie, own.ticket, 'Remove Me');
    expect(
      (await request('/scores/mine', own.cookie, undefined, 'DELETE')).status,
    ).toBe(200);
    expect(
      (
        await request(`/runs/${own.ticket.id}/publish`, own.cookie, {
          name: 'Return',
          token: 'token',
        })
      ).status,
    ).toBe(403);
    const board = (await (
      await request('/leaderboards?mode=hard', own.cookie)
    ).json()) as { entries: { mine: boolean }[] };
    expect(board.entries.some((e) => e.mine)).toBe(false);
  });
  it('hides blocked identities and keeps scoring versions apart', async () => {
    const own = await start();
    await finishAndPublish(own.cookie, own.ticket, 'Version Test');
    const db = await mf.getD1Database('DB');
    await db
      .prepare('UPDATE scores SET version = 2 WHERE id = ?')
      .bind(own.ticket.id)
      .run();
    const old = (await (
      await request('/leaderboards?mode=hard&version=1', own.cookie)
    ).json()) as { entries: { mine: boolean }[] };
    expect(old.entries.some((e) => e.mine)).toBe(false);
    await db
      .prepare(
        'UPDATE guests SET blocked = 1 WHERE id = (SELECT guest_id FROM runs WHERE id = ?)',
      )
      .bind(own.ticket.id)
      .run();
    const hidden = (await (
      await request('/leaderboards?mode=hard&version=2', own.cookie)
    ).json()) as { entries: unknown[] };
    expect(hidden.entries).toHaveLength(0);
    expect((await request('/runs', own.cookie, { mode: 'hard' })).status).toBe(
      403,
    );
  });
  it('cleans abandoned runs and old input batches while retaining published summaries', async () => {
    const abandoned = await start(),
      published = await start();
    await finishAndPublish(published.cookie, published.ticket, 'Retained');
    const db = await mf.getD1Database('DB');
    const old = Date.now() - 31 * 86400000;
    await db
      .prepare('UPDATE runs SET updated_at = ? WHERE id IN (?, ?)')
      .bind(old, abandoned.ticket.id, published.ticket.id)
      .run();
    await db
      .prepare('UPDATE batches SET created_at = ? WHERE run_id = ?')
      .bind(old, published.ticket.id)
      .run();
    const worker = await mf.getWorker();
    await worker.scheduled({ cron: '17 3 * * *' });
    expect(
      await db
        .prepare('SELECT id FROM runs WHERE id = ?')
        .bind(abandoned.ticket.id)
        .first(),
    ).toBeNull();
    expect(
      await db
        .prepare('SELECT id FROM scores WHERE id = ?')
        .bind(published.ticket.id)
        .first(),
    ).not.toBeNull();
    expect(
      await db
        .prepare('SELECT run_id FROM batches WHERE run_id = ?')
        .bind(published.ticket.id)
        .first(),
    ).toBeNull();
  });
});

describe('security regressions', () => {
  it('isolates ownership of finish, publish and deletion; does not expose guest credentials', async () => {
    const owner = await start(),
      other = await start();
    await finishAndPublish(owner.cookie, owner.ticket, "O'Brien");
    for (const action of ['finish', 'publish']) {
      expect(
        (
          await request(`/runs/${owner.ticket.id}/${action}`, other.cookie, {
            batches: 1,
            reason: 'finish',
            name: 'Attacker',
            token: 'token',
          })
        ).status,
      ).toBe(404);
      expect(
        (await request(`/runs/${owner.ticket.id}/${action}`, '', {})).status,
      ).toBe(401);
    }
    await request('/scores/mine', other.cookie, undefined, 'DELETE');
    const board = await (
      await request('/leaderboards?mode=hard', owner.cookie)
    ).text();
    expect(board).toContain("O'Brien");
    expect(board).not.toMatch(/credential_hash|guest_id|inferno_guest/);
    expect(board).not.toContain(owner.cookie.split('=')[1]);
    const created = await request('/runs', '', { mode: 'hard' });
    expect(created.headers.get('set-cookie')).toMatch(
      /HttpOnly; SameSite=Lax; Path=\/api\/v1; Max-Age=31536000; Secure/,
    );
    expect(created.headers.get('cache-control')).toBe('no-store');
    expect(created.headers.get('content-security-policy')).toContain(
      "frame-ancestors 'none'",
    );
  });
  it('rejects missing/null/foreign origins for mutations and preflights without permissive CORS', async () => {
    for (const originValue of [
      undefined,
      'null',
      'https://evil.example',
      'https://los.inferno.tips',
    ]) {
      for (const method of ['POST', 'DELETE', 'OPTIONS']) {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (originValue !== undefined) headers.Origin = originValue;
        const res = await mf.dispatchFetch(`${origin}/api/v1/runs`, {
          method,
          headers,
          body: method === 'POST' ? '{"mode":"hard"}' : undefined,
        });
        expect(res.status).toBe(403);
        expect(res.headers.has('access-control-allow-origin')).toBe(false);
        expect(res.headers.get('cache-control')).toBe('no-store');
        expect(res.headers.get('vary')).toBe('Origin');
      }
    }
  });
  it('bounds request bodies and rejects misleading content types and unused persisted fields', async () => {
    const own = await start();
    const post = (body: string, contentType = 'application/json') =>
      mf.dispatchFetch(`${origin}/api/v1/runs`, {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': contentType },
        body,
      });
    expect((await post('{"mode":"hard"}', 'application/jsonp')).status).toBe(
      415,
    );
    expect((await post('null')).status).toBe(400);
    expect((await post('{')).status).toBe(400);
    expect(
      (await post(JSON.stringify({ mode: 'hard', padding: 'x'.repeat(65536) })))
        .status,
    ).toBe(413);
    const padded = batch();
    Object.assign(padded.ticks[0], { padding: 'x'.repeat(40000) });
    expect(
      (await request(`/runs/${own.ticket.id}/batches`, own.cookie, padded))
        .status,
    ).toBe(400);
    const db = await mf.getD1Database('DB');
    expect(
      await db
        .prepare('SELECT * FROM batches WHERE run_id = ?')
        .bind(own.ticket.id)
        .first(),
    ).toBeNull();
  });
  it('fails closed for mismatched Turnstile hostname/action, rejected tokens and verification outages', async () => {
    const own = await start();
    await age(own.ticket.id);
    await request(`/runs/${own.ticket.id}/batches`, own.cookie, batch());
    await request(`/runs/${own.ticket.id}/finish`, own.cookie, {
      batches: 1,
      reason: 'finish',
    });
    const publish = () =>
      request(`/runs/${own.ticket.id}/publish`, own.cookie, {
        name: 'Verify',
        token: 'token',
      });
    tokenHost = 'evil.example';
    expect((await publish()).status).toBe(400);
    tokenHost = 'inferno.tips';
    tokenAction = 'other-action';
    expect((await publish()).status).toBe(400);
    tokenAction = 'publish-score';
    validToken = false;
    expect((await publish()).status).toBe(400);
    validToken = true;
    tokenReply = 'malformed';
    expect((await publish()).status).toBe(503);
    tokenReply = 'unavailable';
    expect((await publish()).status).toBe(503);
    const db = await mf.getD1Database('DB');
    expect(
      await db
        .prepare('SELECT * FROM scores WHERE id = ?')
        .bind(own.ticket.id)
        .first(),
    ).toBeNull();
  });
  it('throttles board reads and new sessions separately without blocking an existing run upload', async () => {
    const limited = await createApi({ read: 1, run: 1, write: 3 });
    try {
      const send = (path: string, cookie = '', body?: unknown) =>
        limited.dispatchFetch(`${origin}/api/v1${path}`, {
          method: body ? 'POST' : 'GET',
          headers: {
            Origin: origin,
            Cookie: cookie,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
        });
      expect((await send('/leaderboards?mode=hard')).status).toBe(200);
      const blockedRead = await send('/leaderboards?mode=hard');
      expect(blockedRead.status).toBe(429);
      expect(blockedRead.headers.get('retry-after')).toBe('60');
      const started = await send('/runs', '', { mode: 'hard' });
      expect(started.status).toBe(201);
      const ticket = (await started.json()) as CloudTicket;
      const cookie = started.headers.get('set-cookie')!.split(';')[0];
      expect((await send('/runs', cookie, { mode: 'hard' })).status).toBe(429);
      const db = await limited.getD1Database('DB');
      await db
        .prepare('UPDATE runs SET started_at = started_at - 120000')
        .run();
      expect(
        (await send(`/runs/${ticket.id}/batches`, cookie, batch())).status,
      ).toBe(200);
      expect(
        (
          await send(`/runs/${ticket.id}/finish`, cookie, {
            batches: 1,
            reason: 'finish',
          })
        ).status,
      ).toBe(429);
      expect((await send('/config')).status).toBe(200);
      expect(
        (await db.prepare('SELECT COUNT(*) AS count FROM runs').first())?.count,
      ).toBe(1);
    } finally {
      await limited.dispose();
    }
  });
});
