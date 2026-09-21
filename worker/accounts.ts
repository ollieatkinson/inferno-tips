import type { Env } from './env';
import { accountSession, providers } from './auth';
import { accountNickname, publicName } from './profiles';
import {
  ApiError,
  body,
  guest,
  requireGuest,
  hash,
  json,
  verifyTurnstile,
} from './http';
import {
  DRILL_SCORING_VERSION,
  progressFromRows,
  validImport,
  type DrillResult,
} from '../src/lib/accountProtocol';
import { validRunTick, type RunTick } from '../src/lib/cloudProtocol';
import {
  lessons,
  drillTicks,
  passScore,
  type LessonId,
  type Mode,
} from '../src/lib/course';
import { advance, accuracy, initialState } from '../src/lib/engine';
import { runFeedback } from '../src/lib/runFeedback';
import { parseProgress } from '../src/lib/progress';

export async function scoreGuest(request: Request, env: Env) {
  const g = await guest(request, env);
  if (!g || env.ACCOUNTS_ENABLED !== 'true') return g;
  const linked = await env.DB.prepare(
    'SELECT user_id FROM account_guests WHERE guest_id = ?',
  )
    .bind(g.id)
    .first<{ user_id: string }>();
  if (!linked) return g;
  return (await accountSession(request, env))?.user.id === linked.user_id
    ? g
    : null;
}
export async function requireScoreGuest(request: Request, env: Env) {
  const g = await scoreGuest(request, env);
  if (!g) throw new ApiError(401, 'Sign in to the account that owns this run.');
  if (g.blocked)
    throw new ApiError(
      403,
      'Public submissions are unavailable for this identity.',
    );
  return g;
}
export async function attachNewGuest(
  request: Request,
  env: Env,
  guestId: string,
) {
  if (env.ACCOUNTS_ENABLED !== 'true') return;
  const session = await accountSession(request, env);
  if (session)
    await env.DB.prepare(
      'INSERT OR IGNORE INTO account_guests (guest_id, user_id) VALUES (?, ?)',
    )
      .bind(guestId, session.user.id)
      .run();
}
async function limitAccount(request: Request, env: Env, id: string) {
  if (
    request.method !== 'GET' &&
    request.headers.get('Origin') !== env.APP_ORIGIN
  )
    throw new ApiError(403, 'Origin not allowed.');
  const limiter = env.ACCOUNT_LIMIT ?? env.WRITE_LIMIT;
  for (const key of [
    await hash(request.headers.get('CF-Connecting-IP') || 'local'),
    `user:${id}`,
  ])
    if (!(await limiter.limit({ key })).success)
      throw new ApiError(429, 'Too many sync requests. Please wait a minute.');
}
export async function accountRoute(
  request: Request,
  env: Env,
  path: string,
): Promise<Response> {
  const base = {
    enabled: env.ACCOUNTS_ENABLED === 'true',
    providers: providers(env),
    siteKey: env.TURNSTILE_SITE_KEY,
    user: null,
    progress: {},
    imported: null,
    history: [],
    linkedProviders: [],
  };
  if (env.ACCOUNTS_ENABLED !== 'true') {
    if (path === '/account' && request.method === 'GET') return json(base);
    throw new ApiError(404, 'Accounts are not enabled here yet.');
  }
  if (
    request.method !== 'GET' &&
    request.headers.get('Origin') !== env.APP_ORIGIN
  )
    throw new ApiError(403, 'Origin not allowed.');
  const ip = await hash(request.headers.get('CF-Connecting-IP') || 'local');
  if (!(await (env.AUTH_LIMIT ?? env.READ_LIMIT).limit({ key: ip })).success)
    throw new ApiError(429, 'Too many requests. Please wait a minute.');
  // Enables a real Turnstile check on staging before OAuth clients are provisioned.
  if (path === '/account/verify' && request.method === 'POST') {
    const input = await body(request);
    await verifyTurnstile(input.token, request, env, 'sign-in');
    return json({ verified: true });
  }
  const session = await accountSession(request, env);
  if (path === '/account' && request.method === 'GET' && !session)
    return json(base);
  if (!session) throw new ApiError(401, 'Sign in to sync your progress.');
  const userId = session.user.id;
  await limitAccount(request, env, userId);
  if (path === '/account' && request.method === 'GET') {
    const [rows, imported, history, linked] = await Promise.all([
      env.DB.prepare(
        `SELECT lesson, COUNT(*) AS attempts, COALESCE(MAX(CASE WHEN practice = 0 THEN score ELSE 0 END),0) AS best,
     COALESCE(MAX(CASE WHEN practice = 1 THEN score ELSE 0 END),0) AS practiceBest, SUM(passed) AS passes
     FROM drill_attempts WHERE user_id = ? AND version = ? AND finished_at IS NOT NULL GROUP BY lesson`,
      )
        .bind(userId, DRILL_SCORING_VERSION)
        .all<{
          lesson: string;
          attempts: number;
          best: number;
          practiceBest: number;
          passes: number;
        }>(),
      env.DB.prepare(
        'SELECT progress, imported_at FROM account_imports WHERE user_id = ?',
      )
        .bind(userId)
        .first<{ progress: string; imported_at: number }>(),
      env.DB.prepare(
        'SELECT id, lesson, mode, score, passed, practice, best_streak AS bestStreak, finished_at AS finishedAt, feedback FROM drill_attempts WHERE user_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC, id LIMIT 50',
      )
        .bind(userId)
        .all<Record<string, unknown>>(),
      env.DB.prepare('SELECT providerId FROM auth_account WHERE userId = ?')
        .bind(userId)
        .all<{ providerId: string }>(),
    ]);
    return json({
      ...base,
      user: {
        id: userId,
        name: session.user.name,
        email: session.user.email,
        nickname: await accountNickname(env, userId),
      },
      progress: progressFromRows(rows.results),
      imported: imported
        ? {
            progress: JSON.parse(imported.progress),
            importedAt: imported.imported_at,
          }
        : null,
      history: history.results.map((r) => ({
        ...r,
        passed: !!r.passed,
        practice: !!r.practice,
      })),
      linkedProviders: linked.results.map((r) => r.providerId),
    });
  }
  if (path === '/account/profile' && request.method === 'PATCH') {
    const input = await body(request);
    if (Object.keys(input).some((key) => key !== 'nickname'))
      throw new ApiError(400, 'Only the public nickname can be changed here.');
    const nickname = publicName(input.nickname);
    await env.DB.prepare(
      'INSERT INTO account_profiles(user_id,nickname,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET nickname=excluded.nickname,updated_at=excluded.updated_at',
    )
      .bind(userId, nickname, Date.now())
      .run();
    return json({ nickname });
  }
  if (path === '/account/import' && request.method === 'POST') {
    const input = await body(request);
    if (!validImport(input.progress))
      throw new ApiError(400, 'This browser history has invalid values.');
    const clean = parseProgress(JSON.stringify(input.progress));
    const result = await env.DB.prepare(
      'INSERT OR IGNORE INTO account_imports (user_id, progress, imported_at) VALUES (?, ?, ?)',
    )
      .bind(userId, JSON.stringify(clean), Date.now())
      .run();
    return json({
      imported: !!result.meta.changes,
      alreadyImported: !result.meta.changes,
    });
  }
  if (path === '/account/claim-scores' && request.method === 'POST') {
    await body(request);
    await accountNickname(env, userId);
    const g = await requireGuest(request, env);
    await env.DB.prepare(
      'INSERT OR IGNORE INTO account_guests (guest_id, user_id) VALUES (?, ?)',
    )
      .bind(g.id, userId)
      .run();
    const owner = await env.DB.prepare(
      'SELECT user_id FROM account_guests WHERE guest_id = ?',
    )
      .bind(g.id)
      .first<{ user_id: string }>();
    if (owner?.user_id !== userId)
      throw new ApiError(
        409,
        'These scores already belong to another account.',
      );
    return json({ claimed: true });
  }
  if (path === '/account/drills' && request.method === 'POST') {
    if (
      !(await env.RUN_LIMIT.limit({ key: `user:${userId}` })).success ||
      !(await env.RUN_LIMIT.limit({ key: ip })).success
    )
      throw new ApiError(429, 'Too many new runs. Please wait a minute.');
    const input = await body(request);
    if (
      !lessons.some((l) => l.id === input.lesson) ||
      !['guided', 'challenge'].includes(String(input.mode))
    )
      throw new ApiError(400, 'Choose a valid drill and mode.');
    const id = crypto.randomUUID(),
      seed = crypto.getRandomValues(new Uint32Array(1))[0] % 100000;
    const now = Date.now();
    // D1 batch is transactional. Only one overlapping attempt can reserve game time.
    const reserved = await env.DB.batch([
      env.DB.prepare(
        'INSERT INTO drill_slots(user_id,attempt_id,until_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET attempt_id=excluded.attempt_id,until_at=excluded.until_at WHERE drill_slots.until_at <= ?',
      ).bind(
        userId,
        id,
        now + (drillTicks(input.lesson as LessonId) + 3) * 600,
        now,
      ),
      env.DB.prepare(
        'INSERT INTO drill_attempts(id,user_id,lesson,mode,seed,version,started_at) SELECT ?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM drill_slots WHERE user_id=? AND attempt_id=?)',
      ).bind(
        id,
        userId,
        input.lesson,
        input.mode,
        seed,
        DRILL_SCORING_VERSION,
        now,
        userId,
        id,
      ),
    ]);
    if (!reserved[1].meta.changes)
      throw new ApiError(
        409,
        'Another account drill is still running. Finish it, or wait for its game time to end.',
      );
    return json(
      {
        id,
        userId,
        lesson: input.lesson,
        mode: input.mode,
        seed,
        version: DRILL_SCORING_VERSION,
      },
      201,
    );
  }
  const cancel = path.match(/^\/account\/drills\/([a-f0-9-]{36})\/cancel$/);
  if (cancel && request.method === 'POST') {
    await body(request);
    await env.DB.batch([
      env.DB.prepare(
        'UPDATE drill_attempts SET abandoned=1 WHERE id=? AND user_id=? AND finished_at IS NULL',
      ).bind(cancel[1], userId),
      env.DB.prepare(
        'DELETE FROM drill_slots WHERE user_id=? AND attempt_id=?',
      ).bind(userId, cancel[1]),
    ]);
    return json({ cancelled: true });
  }
  const finish = path.match(/^\/account\/drills\/([a-f0-9-]{36})\/finish$/);
  if (finish && request.method === 'POST') {
    const row = await env.DB.prepare(
      'SELECT * FROM drill_attempts WHERE id = ? AND user_id = ?',
    )
      .bind(finish[1], userId)
      .first<{
        id: string;
        lesson: LessonId;
        mode: Mode;
        seed: number;
        version: number;
        started_at: number;
        finished_at: number | null;
        payload_hash: string | null;
        abandoned: number;
        score: number;
        passed: number;
        practice: number;
        best_streak: number;
        feedback: string;
      }>();
    if (!row) throw new ApiError(404, 'Attempt not found.');
    if (row.abandoned)
      throw new ApiError(409, 'This drill was cancelled. Start a new run.');
    const input = await body(request);
    const count = drillTicks(row.lesson);
    if (
      Object.keys(input).some((k) => !['ticks', 'practice'].includes(k)) ||
      typeof input.practice !== 'boolean' ||
      !Array.isArray(input.ticks) ||
      input.ticks.length !== count ||
      !input.ticks.every((t, i) => validRunTick(t, count) && t.tick === i + 1)
    )
      throw new ApiError(400, 'Submit the complete, consecutive drill inputs.');
    const payloadHash = await hash(
      JSON.stringify({ ticks: input.ticks, practice: input.practice }),
    );
    const resultFromRow = (): DrillResult => ({
      score: row.score,
      passed: !!row.passed,
      practice: !!row.practice,
      bestStreak: row.best_streak,
      feedback: row.feedback,
    });
    if (row.finished_at !== null) {
      if (row.payload_hash !== payloadHash)
        throw new ApiError(409, 'A completed attempt cannot be changed.');
      return json(resultFromRow());
    }
    if (row.version !== DRILL_SCORING_VERSION)
      throw new ApiError(
        409,
        'This drill scoring version is no longer supported.',
      );
    if (Date.now() - row.started_at > 30 * 86400000)
      throw new ApiError(410, 'This attempt has expired.');
    if (Date.now() - row.started_at + 250 < (count + 3) * 600)
      throw new ApiError(
        409,
        'The drill inputs arrived before its game ticks could finish.',
      );
    let state = initialState(row.seed);
    for (const t of input.ticks as RunTick[])
      state = advance(state, row.lesson, t.prayer, t.tile, t.supply, {
        transitions: t.transitions,
        blowpipe: t.blowpipe,
      });
    const score = accuracy(state.checks),
      practice = row.mode === 'guided' || input.practice;
    const feedback = runFeedback(state.checks, row.lesson);
    const result: DrillResult = {
      score,
      practice,
      passed: !practice && score >= passScore(row.lesson),
      bestStreak: state.bestStreak,
      feedback: [feedback.summary, feedback.issues[0]?.advice]
        .filter(Boolean)
        .join(' '),
    };
    const changed = await env.DB.prepare(
      'UPDATE drill_attempts SET finished_at=?,score=?,passed=?,practice=?,best_streak=?,feedback=?,payload_hash=? WHERE id=? AND finished_at IS NULL AND abandoned=0',
    )
      .bind(
        Date.now(),
        score,
        Number(result.passed),
        Number(practice),
        result.bestStreak,
        result.feedback,
        payloadHash,
        row.id,
      )
      .run();
    if (!changed.meta.changes)
      throw new ApiError(
        409,
        'This attempt finished in another request. Retry to confirm it.',
      );
    return json(result);
  }
  if (path === '/account/export' && request.method === 'GET') {
    const [attempts, imported] = await Promise.all([
      env.DB.prepare(
        'SELECT id,lesson,mode,version,score,passed,practice,finished_at,best_streak,feedback FROM drill_attempts WHERE user_id=? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 10000',
      )
        .bind(userId)
        .all(),
      env.DB.prepare(
        'SELECT progress,imported_at FROM account_imports WHERE user_id=?',
      )
        .bind(userId)
        .first(),
    ]);
    return json({
      exportedAt: new Date().toISOString(),
      user: {
        name: session.user.name,
        email: session.user.email,
        nickname: await accountNickname(env, userId),
      },
      attempts: attempts.results,
      imported,
    });
  }
  if (path === '/account' && request.method === 'DELETE') {
    const input = await body(request);
    if (input.confirm !== true)
      throw new ApiError(400, 'Confirm account deletion.');
    if (Date.now() - new Date(session.session.createdAt).getTime() > 3600000)
      throw new ApiError(403, 'Sign in again before deleting your account.');
    await verifyTurnstile(input.token, request, env, 'delete-account');
    const ids = 'SELECT guest_id FROM account_guests WHERE user_id = ?';
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM scores WHERE guest_id IN (${ids})`).bind(
        userId,
      ),
      env.DB.prepare(
        `DELETE FROM batches WHERE run_id IN (SELECT id FROM runs WHERE guest_id IN (${ids}))`,
      ).bind(userId),
      env.DB.prepare(`DELETE FROM runs WHERE guest_id IN (${ids})`).bind(
        userId,
      ),
      env.DB.prepare(`DELETE FROM guests WHERE id IN (${ids})`).bind(userId),
      env.DB.prepare('DELETE FROM auth_user WHERE id = ?').bind(userId),
    ]);
    return json({ deleted: true });
  }
  throw new ApiError(404, 'Not found.');
}
export async function cleanupAccounts(env: Env, cutoff: number) {
  await env.DB.batch([
    env.DB.prepare(
      'DELETE FROM drill_attempts WHERE finished_at IS NULL AND started_at < ?',
    ).bind(cutoff),
    env.DB.prepare('DELETE FROM auth_session WHERE expiresAt < ?').bind(
      Date.now(),
    ),
    env.DB.prepare('DELETE FROM auth_verification WHERE expiresAt < ?').bind(
      Date.now(),
    ),
  ]);
}
