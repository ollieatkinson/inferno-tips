import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import type { CloudTicket, InputBatch } from '../src/lib/cloudProtocol';
let mf: Miniflare;
const origin = 'https://inferno.tips';
let validToken = true;
beforeAll(async () => {
  const bundle = await build({
    entryPoints: ['worker/index.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
  });
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      script: bundle.outputFiles[0].text,
      compatibilityDate: '2026-09-19',
      d1Databases: ['DB'],
      bindings: {
        CLOUD_ENABLED: 'true',
        APP_ORIGIN: origin,
        TURNSTILE_SITE_KEY: 'test',
        TURNSTILE_SECRET: 'test',
      },
      ratelimits: {
        WRITE_LIMIT: { namespace_id: '1', simple: { limit: 1000, period: 60 } },
      },
      outboundService: () =>
        new Response(
          JSON.stringify({
            success: validToken,
            hostname: 'inferno.tips',
            action: 'publish-score',
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
    }),
  );
  const db = await mf.getD1Database('DB');
  const sql = await readFile('worker/migrations/0001_scores.sql', 'utf8');
  for (const statement of sql.split(';').filter((s) => s.trim()))
    await db.prepare(statement).run();
}, 30000);
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
