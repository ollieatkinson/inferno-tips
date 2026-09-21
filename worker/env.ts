import type { D1Database, RateLimit } from '@cloudflare/workers-types';
export interface Env {
  DB: D1Database;
  WRITE_LIMIT: RateLimit;
  READ_LIMIT: RateLimit;
  RUN_LIMIT: RateLimit;
  AUTH_LIMIT?: RateLimit;
  ACCOUNT_LIMIT?: RateLimit;
  CLOUD_ENABLED: string;
  APP_ORIGIN: string;
  TURNSTILE_SITE_KEY: string;
  TURNSTILE_SECRET?: string;
  ALLOW_TEST_TURNSTILE?: string;
  ACCOUNTS_ENABLED?: string;
  AUTH_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
}
