import type { Env } from './env';
import { ApiError, json, hash, body, verifyTurnstile } from './http';
import {
  accountRoute,
  cleanupAccounts,
  scoreGuest,
  requireScoreGuest,
  attachNewGuest,
} from './accounts';
import { authRoute, accountSession } from './auth';
import {
  CLOUD_SCORING_VERSION,
  initialVerified,
  replayBatch,
  resultOf,
  validBatch,
  weekOf,
  type VerifiedRun,
} from '../src/lib/cloudProtocol';
import { updateSeries } from '../src/lib/series';

interface Run {
  id: string;
  guest_id: string;
  mode: 'hard' | 'endless';
  seed: number;
  version: number;
  week: string;
  started_at: number;
  updated_at: number;
  next_batch: number;
  state: string;
  finished: number;
}
async function ownedRun(id: string, owner: string, env: Env) {
  const run = await env.DB.prepare(
    'SELECT * FROM runs WHERE id = ? AND guest_id = ?',
  )
    .bind(id, owner)
    .first<Run>();
  if (!run) throw new ApiError(404, 'Run not found.');
  if (run.version !== CLOUD_SCORING_VERSION)
    throw new ApiError(
      409,
      'This scoring version is no longer supported for submission.',
    );
  if (Date.now() - run.updated_at > 30 * 86400000)
    throw new ApiError(410, 'This run has expired.');
  return run;
}
async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname.replace(/^\/api\/v1/, '');
  if (path.startsWith('/auth/')) return authRoute(request, env);
  if (path === '/account' || path.startsWith('/account/'))
    return accountRoute(request, env, path);
  if (path === '/config' && request.method === 'GET')
    return json({
      enabled: env.CLOUD_ENABLED === 'true',
      version: CLOUD_SCORING_VERSION,
      siteKey: env.TURNSTILE_SITE_KEY,
    });
  if (env.CLOUD_ENABLED !== 'true')
    throw new ApiError(
      503,
      'Public high scores are not available yet. Local practice still works.',
    );
  const rateKey = () =>
    hash(request.headers.get('CF-Connecting-IP') || 'local');
  if (path === '/leaderboards' && request.method === 'GET') {
    if (!(await env.READ_LIMIT.limit({ key: await rateKey() })).success)
      throw new ApiError(
        429,
        'Too many requests. Please wait a minute and retry.',
      );
  }
  if (request.method !== 'GET') {
    if (request.headers.get('Origin') !== env.APP_ORIGIN)
      throw new ApiError(403, 'Origin not allowed.');
    const key = await rateKey();
    if (!(await env.WRITE_LIMIT.limit({ key })).success)
      throw new ApiError(
        429,
        'Too many requests. Please wait a minute and retry.',
      );
  }
  if (path === '/runs' && request.method === 'POST') {
    if (!(await env.RUN_LIMIT.limit({ key: await rateKey() })).success)
      throw new ApiError(
        429,
        'Too many new runs. Please wait a minute and retry.',
      );
    const input = await body(request);
    if (input.mode !== 'hard' && input.mode !== 'endless')
      throw new ApiError(400, 'Invalid challenge mode.');
    let g = await scoreGuest(request, env),
      cookie: string | undefined;
    if (g?.blocked)
      throw new ApiError(
        403,
        'Public submissions are unavailable for this identity.',
      );
    if (!g) {
      const token = [...crypto.getRandomValues(new Uint8Array(32))]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('');
      g = { id: crypto.randomUUID(), blocked: 0 };
      await env.DB.prepare(
        'INSERT INTO guests (id, credential_hash, created_at) VALUES (?, ?, ?)',
      )
        .bind(g.id, await hash(token), Date.now())
        .run();
      cookie = `inferno_guest=${token}; HttpOnly; SameSite=Lax; Path=/api/v1; Max-Age=31536000${url.protocol === 'https:' ? '; Secure' : ''}`;
    }
    await attachNewGuest(request, env, g.id);
    const id = crypto.randomUUID(),
      seed = crypto.getRandomValues(new Uint32Array(1))[0] % 100000,
      now = Date.now();
    await env.DB.prepare(
      'INSERT INTO runs (id, guest_id, mode, seed, version, week, started_at, updated_at, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        id,
        g.id,
        input.mode,
        seed,
        CLOUD_SCORING_VERSION,
        weekOf(now),
        now,
        now,
        JSON.stringify(initialVerified(input.mode, seed)),
      )
      .run();
    const response = json(
      { id, seed, mode: input.mode, version: CLOUD_SCORING_VERSION },
      201,
    );
    if (cookie) response.headers.set('Set-Cookie', cookie);
    return response;
  }
  if (path === '/leaderboards' && request.method === 'GET') {
    const mode = url.searchParams.get('mode'),
      period = url.searchParams.get('period') ?? 'all';
    const version = Number(
      url.searchParams.get('version') ?? CLOUD_SCORING_VERSION,
    );
    if (
      !['hard', 'endless'].includes(mode ?? '') ||
      !['all', 'weekly'].includes(period) ||
      !Number.isSafeInteger(version) ||
      version < 1
    )
      throw new ApiError(400, 'Invalid board.');
    const week =
      period === 'weekly'
        ? (url.searchParams.get('week') ?? weekOf(Date.now()))
        : null;
    if (
      week &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(week) ||
        !Number.isFinite(Date.parse(week)) ||
        weekOf(Date.parse(week)) !== week)
    )
      throw new ApiError(400, 'Choose a Monday in UTC.');
    const g = await scoreGuest(request, env);
    const user = await accountSession(request, env);
    const identity = user
      ? `account:${user.user.id}`
      : g
        ? `guest:${g.id}`
        : '';
    const accountJoin =
      env.ACCOUNTS_ENABLED === 'true'
        ? 'LEFT JOIN account_guests ag ON ag.guest_id = s.guest_id'
        : '';
    const identitySQL =
      env.ACCOUNTS_ENABLED === 'true'
        ? "COALESCE('account:' || ag.user_id, 'guest:' || s.guest_id)"
        : "'guest:' || s.guest_id";
    const rows = await env.DB.prepare(
      `WITH personal AS (
      SELECT s.*, ${identitySQL} AS view_identity, ROW_NUMBER() OVER (PARTITION BY ${identitySQL} ORDER BY s.points DESC, s.cleared DESC, s.stage DESC, s.published_at, s.id) AS personal_order
      FROM scores s JOIN guests g ON s.guest_id = g.id ${accountJoin} WHERE s.hidden = 0 AND g.blocked = 0 AND s.mode = ? AND s.version = ? AND (? IS NULL OR s.week = ?)
    ), ranked AS (
      SELECT *, RANK() OVER (ORDER BY points DESC, cleared DESC, stage DESC) AS rank FROM personal WHERE personal_order = 1
    ), displayed AS (
      SELECT *, ROW_NUMBER() OVER (ORDER BY rank, published_at, id) AS position FROM ranked
    ) SELECT id, name, points, stage, cleared, published_at AS publishedAt, rank, view_identity = ? AS mine FROM displayed WHERE position <= 100 OR view_identity = ? ORDER BY position`,
    )
      .bind(mode, version, week, week, identity, identity)
      .all<Record<string, unknown>>();
    const versions = await env.DB.prepare(
      'SELECT DISTINCT version FROM scores WHERE hidden = 0 ORDER BY version DESC',
    ).all<{ version: number }>();
    return json({
      entries: rows.results.map((r) => ({
        ...r,
        cleared: !!r.cleared,
        mine: !!r.mine,
        practice: false,
      })),
      version,
      versions: [
        ...new Set([
          CLOUD_SCORING_VERSION,
          ...versions.results.map((r) => r.version),
        ]),
      ],
      week,
    });
  }
  if (path === '/scores/mine' && request.method === 'DELETE') {
    const user = await accountSession(request, env);
    if (user)
      await env.DB.prepare(
        'UPDATE scores SET hidden = 1 WHERE guest_id IN (SELECT guest_id FROM account_guests WHERE user_id = ?)',
      )
        .bind(user.user.id)
        .run();
    else {
      const g = await requireScoreGuest(request, env);
      await env.DB.prepare('UPDATE scores SET hidden = 1 WHERE guest_id = ?')
        .bind(g.id)
        .run();
    }
    return json({ removed: true });
  }
  const match = path.match(
    /^\/runs\/([a-f0-9-]{36})\/(batches|finish|publish)$/,
  );
  if (!match || request.method !== 'POST')
    throw new ApiError(404, 'Not found.');
  const g = await requireScoreGuest(request, env),
    run = await ownedRun(match[1], g.id, env),
    input = await body(request);
  if (match[2] === 'batches') {
    if (!validBatch(input)) throw new ApiError(400, 'Invalid input batch.');
    const payload = JSON.stringify(input);
    const duplicate = await env.DB.prepare(
      'SELECT payload FROM batches WHERE run_id = ? AND sequence = ?',
    )
      .bind(run.id, input.sequence)
      .first<{ payload: string }>();
    if (duplicate) {
      if (duplicate.payload !== payload)
        throw new ApiError(409, 'A recorded batch cannot be replaced.');
      return json({ accepted: input.sequence });
    }
    if (run.finished || input.sequence !== run.next_batch)
      throw new ApiError(409, 'Upload consecutive batches before finishing.');
    let next: VerifiedRun;
    try {
      next = replayBatch(JSON.parse(run.state), input, run.seed);
    } catch (error) {
      throw new ApiError(400, (error as Error).message);
    }
    if (
      Date.now() - run.started_at + 250 <
      (next.ticks + 3 * (input.stage + 1)) * 600
    )
      throw new ApiError(
        409,
        'Run inputs arrived before their game ticks could finish.',
      );
    // Both operations execute in a single D1 transaction. The guarded insert
    // and update prevent concurrent requests advancing the same sequence twice.
    const results = await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO batches (run_id, sequence, payload, created_at) SELECT id, ?, ?, ? FROM runs WHERE id = ? AND next_batch = ? AND finished = 0',
      ).bind(input.sequence, payload, Date.now(), run.id, input.sequence),
      env.DB.prepare(
        'UPDATE runs SET state = ?, next_batch = next_batch + 1, updated_at = ? WHERE id = ? AND next_batch = ? AND finished = 0',
      ).bind(JSON.stringify(next), Date.now(), run.id, input.sequence),
    ]);
    if (!results[0].meta.changes)
      throw new ApiError(409, 'Run changed during upload. Retry this batch.');
    return json({ accepted: input.sequence });
  }
  if (match[2] === 'finish') {
    if (
      !Number.isInteger(input.batches) ||
      input.batches !== run.next_batch ||
      !['finish', 'practice'].includes(String(input.reason))
    )
      throw new ApiError(409, 'Upload all inputs before finishing.');
    let state: VerifiedRun = JSON.parse(run.state);
    if (!run.finished) {
      if (input.reason === 'practice')
        state.series = { ...state.series, practice: true };
      state.series = updateSeries(state.series, { type: 'finish' });
      const result = resultOf(state);
      const updated = await env.DB.prepare(
        'UPDATE runs SET finished = 1, state = ?, points = ?, stage = ?, cleared = ?, practice = ?, updated_at = ? WHERE id = ? AND next_batch = ? AND finished = 0',
      )
        .bind(
          JSON.stringify(state),
          result.points,
          result.stage,
          Number(result.cleared),
          Number(result.practice),
          Date.now(),
          run.id,
          run.next_batch,
        )
        .run();
      if (!updated.meta.changes)
        throw new ApiError(409, 'Run changed during finish. Retry.');
    }
    return json(resultOf(state));
  }
  const state: VerifiedRun = JSON.parse(run.state),
    result = resultOf(state);
  if (
    !run.finished ||
    state.ticks === 0 ||
    result.practice ||
    result.points <= 0
  )
    throw new ApiError(
      400,
      'Only completed, uninterrupted scored runs can be published.',
    );
  const existing = await env.DB.prepare(
    'SELECT id, hidden FROM scores WHERE id = ?',
  )
    .bind(run.id)
    .first<{ id: string; hidden: number }>();
  if (existing) {
    if (existing.hidden)
      throw new ApiError(
        403,
        'This score was removed and cannot be republished.',
      );
    return json({ ...result, published: true });
  }
  const name =
    typeof input.name === 'string' ? input.name.trim().normalize('NFC') : '';
  if (
    name.length < 2 ||
    name.length > 24 ||
    !/^[\p{L}\p{N} _'’-]+$/u.test(name)
  )
    throw new ApiError(
      400,
      'Use 2–24 letters, numbers, spaces, apostrophes, hyphens or underscores.',
    );
  await verifyTurnstile(input.token, request, env);
  await env.DB.prepare(
    'INSERT OR IGNORE INTO scores (id, guest_id, name, mode, version, week, points, stage, cleared, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      run.id,
      g.id,
      name,
      run.mode,
      run.version,
      run.week,
      result.points,
      result.stage,
      Number(result.cleared),
      Date.now(),
    )
    .run();
  return json({ ...result, published: true });
}
export default {
  async fetch(request: Request, env: Env) {
    const origin = request.headers.get('Origin');
    let response: Response;
    try {
      response =
        request.method === 'OPTIONS'
          ? new Response(null, {
              status: origin === env.APP_ORIGIN ? 204 : 403,
            })
          : await route(request, env);
    } catch (error) {
      if (error instanceof ApiError)
        response = json({ error: error.message }, error.status);
      else {
        console.error(
          'API failure',
          error instanceof Error ? error.message : 'unknown',
        );
        response = json(
          { error: 'Scores are temporarily unavailable. Please retry.' },
          503,
        );
      }
    }
    if (origin === env.APP_ORIGIN) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set(
        'Access-Control-Allow-Methods',
        'GET, POST, DELETE, OPTIONS',
      );
      response.headers.set(
        'Access-Control-Allow-Headers',
        'Content-Type, X-Captcha-Response',
      );
      response.headers.set('Vary', 'Origin');
    }
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'",
    );
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Cache-Control', 'no-store');
    response.headers.set('Vary', 'Origin');
    if (new URL(request.url).protocol === 'https:')
      response.headers.set('Strict-Transport-Security', 'max-age=31536000');
    if (response.status === 429) response.headers.set('Retry-After', '60');
    return response;
  },
  async scheduled(_event: unknown, env: Env) {
    const cutoff = Date.now() - 30 * 86400000;
    if (env.ACCOUNTS_ENABLED === 'true') await cleanupAccounts(env, cutoff);
    await env.DB.batch([
      env.DB.prepare('DELETE FROM batches WHERE created_at < ?').bind(cutoff),
      env.DB.prepare(
        'DELETE FROM runs WHERE updated_at < ? AND id NOT IN (SELECT id FROM scores)',
      ).bind(cutoff),
      env.DB.prepare(
        'DELETE FROM guests WHERE created_at < ? AND id NOT IN (SELECT guest_id FROM runs) AND blocked = 0',
      ).bind(cutoff),
    ]);
  },
};
