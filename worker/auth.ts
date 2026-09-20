import { betterAuth } from 'better-auth';
import type { Env } from './env';
import { ApiError, body, hash, verifyTurnstile } from './http';

export function providers(env: Env) {
  return {
    google: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    discord: !!(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
  };
}
export function authOptions(env: Env) {
  const secure = new URL(env.APP_ORIGIN).protocol === 'https:';
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32)
    throw new ApiError(503, 'Account sign-in is not configured yet.');
  const available = providers(env);
  return {
    appName: 'Inferno Tips',
    baseURL: env.APP_ORIGIN,
    basePath: '/api/v1/auth',
    secret: env.AUTH_SECRET,
    database: env.DB,
    trustedOrigins: [env.APP_ORIGIN],
    socialProviders: {
      ...(available.google
        ? {
            google: {
              clientId: env.GOOGLE_CLIENT_ID!,
              clientSecret: env.GOOGLE_CLIENT_SECRET!,
            },
          }
        : {}),
      ...(available.discord
        ? {
            discord: {
              clientId: env.DISCORD_CLIENT_ID!,
              clientSecret: env.DISCORD_CLIENT_SECRET!,
              prompt: 'consent' as const,
            },
          }
        : {}),
    },
    user: { modelName: 'auth_user' },
    session: {
      modelName: 'auth_session',
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 60,
      cookieCache: { enabled: false },
    },
    account: {
      modelName: 'auth_account',
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        allowDifferentEmails: false,
      },
    },
    verification: { modelName: 'auth_verification' },
    advanced: {
      // Set __Host- ourselves: Better Auth otherwise prepends __Secure-.
      // Every deployed cookie still explicitly requires HTTPS and Path=/.
      useSecureCookies: false,
      cookiePrefix: secure ? '__Host-inferno-auth' : 'inferno-auth',
      defaultCookieAttributes: {
        secure,
        httpOnly: true,
        sameSite: 'lax' as const,
        path: '/',
      },
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] },
    },
    rateLimit: { enabled: false }, // Shared Cloudflare binding below; not isolate-local memory.
    onAPIError: { errorURL: `${env.APP_ORIGIN}/?auth-error=1#account` },
  };
}
function createAuth(env: Env) {
  return betterAuth(authOptions(env));
}
type AuthInstance = ReturnType<typeof createAuth>;
const instances = new WeakMap<Env, AuthInstance>();
export function getAuth(env: Env): AuthInstance {
  const existing = instances.get(env);
  if (existing) return existing;
  const auth = createAuth(env);
  instances.set(env, auth);
  return auth;
}
export async function accountSession(request: Request, env: Env) {
  if (env.ACCOUNTS_ENABLED !== 'true') return null;
  return getAuth(env).api.getSession({ headers: request.headers });
}
export async function requireAccount(request: Request, env: Env) {
  const session = await accountSession(request, env);
  if (!session) throw new ApiError(401, 'Sign in to sync your progress.');
  return session;
}
export async function authRoute(request: Request, env: Env) {
  if (env.ACCOUNTS_ENABLED !== 'true')
    throw new ApiError(404, 'Accounts are not enabled here yet.');
  const path = new URL(request.url).pathname.replace('/api/v1/auth', '');
  const callback = /^\/callback\/(google|discord)$/.test(path);
  const allowed =
    callback ||
    (request.method === 'POST' &&
      [
        '/sign-in/social',
        '/link-social',
        '/sign-out',
        '/revoke-sessions',
      ].includes(path));
  if (!allowed || (callback && request.method !== 'GET'))
    throw new ApiError(404, 'Not found.');
  if (!callback && request.headers.get('Origin') !== env.APP_ORIGIN)
    throw new ApiError(403, 'Origin not allowed.');
  const key = await hash(request.headers.get('CF-Connecting-IP') || 'local');
  if (!(await (env.AUTH_LIMIT ?? env.WRITE_LIMIT).limit({ key })).success)
    throw new ApiError(429, 'Too many sign-in requests. Please wait a minute.');
  let forwarded = request;
  if (!callback) {
    const input = await body(request);
    const headers = new Headers(request.headers);
    headers.delete('Content-Length');
    forwarded = new Request(request.url, {
      method: request.method,
      headers,
      body: JSON.stringify(input),
    });
    if (path === '/sign-in/social' || path === '/link-social') {
      if (input.provider !== 'google' && input.provider !== 'discord')
        throw new ApiError(400, 'Choose Google or Discord.');
      if (!providers(env)[input.provider])
        throw new ApiError(503, 'This sign-in provider is not configured yet.');
      // Expose only the authorization-code flow; never accept client-provided ID tokens/scopes.
      if (
        Object.keys(input).some(
          (k) =>
            ![
              'provider',
              'callbackURL',
              'errorCallbackURL',
              'disableRedirect',
            ].includes(k),
        )
      )
        throw new ApiError(400, 'Invalid sign-in request.');
      if (path === '/link-social') {
        const session = await requireAccount(request, env);
        if (
          Date.now() - new Date(session.session.createdAt).getTime() >
          3600000
        )
          throw new ApiError(
            403,
            'Sign in again before linking another provider.',
          );
      }
      await verifyTurnstile(
        request.headers.get('X-Captcha-Response'),
        request,
        env,
        'sign-in',
      );
    }
  }
  return getAuth(env).handler(forwarded);
}
