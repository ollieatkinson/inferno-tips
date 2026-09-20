import type { Env } from './env';
interface Guest {
  id: string;
  blocked: number;
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
export const hash = async (s: string) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)),
    ),
  ]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
export async function body(request: Request): Promise<Record<string, unknown>> {
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !==
    'application/json'
  )
    throw new ApiError(415, 'Send JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'Missing request body.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 65536) {
      await reader.cancel();
      throw new ApiError(413, 'Request too large.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0;
    return value;
  } catch {
    throw new ApiError(400, 'Invalid JSON object.');
  }
}
export async function guest(request: Request, env: Env): Promise<Guest | null> {
  const token = request.headers
    .get('Cookie')
    ?.match(/(?:^|;\s*)inferno_guest=([a-f0-9]{64})(?:;|$)/)?.[1];
  if (!token) return null;
  return env.DB.prepare(
    'SELECT id, blocked FROM guests WHERE credential_hash = ?',
  )
    .bind(await hash(token))
    .first<Guest>();
}
export async function requireGuest(request: Request, env: Env) {
  const g = await guest(request, env);
  if (!g) throw new ApiError(401, 'This browser no longer owns the run.');
  if (g.blocked)
    throw new ApiError(
      403,
      'Public submissions are unavailable for this identity.',
    );
  return g;
}
export async function verifyTurnstile(
  token: unknown,
  request: Request,
  env: Env,
  action = 'publish-score',
) {
  if (typeof token !== 'string' || !token || token.length > 2048)
    throw new ApiError(400, 'Complete the verification before continuing.');
  const local = ['localhost', '127.0.0.1'].includes(
    new URL(request.url).hostname,
  );
  const secret =
    local && env.ALLOW_TEST_TURNSTILE === 'true'
      ? '1x0000000000000000000000000000000AA'
      : env.TURNSTILE_SECRET;
  if (!secret) throw new ApiError(503, 'Verification is not configured yet.');
  let verification: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        method: 'POST',
        body: JSON.stringify({
          secret,
          response: token,
          remoteip: request.headers.get('CF-Connecting-IP') ?? undefined,
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error('Siteverify unavailable');
    verification = await response.json();
  } catch {
    throw new ApiError(
      503,
      'Verification is temporarily unavailable. Please retry.',
    );
  }
  if (
    verification.success !== true ||
    (!local &&
      (verification.hostname !== new URL(env.APP_ORIGIN).hostname ||
        verification.action !== action))
  )
    throw new ApiError(
      400,
      'Verification expired or failed. Please try again.',
    );
}
