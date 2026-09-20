# High-score API

One Worker serves `/api/v1/*`; the Astro application remains on Cloudflare Pages. D1 stores private guest credentials (hashed), run sessions, input batches and explicitly published scores. No account provider is needed. Guest IDs are stable, separate from display names, and can later attach to an account.

## Local development

```sh
npm ci
npm run db:local
npm run dev:api
# In another terminal:
npm run dev
```

Open **http://localhost:4321** (not the numeric hostname): the local Worker allows this exact Origin. Astro proxies `/api/v1` to port 8787. Local configuration uses Cloudflare's public Turnstile test site key and test verification secret; the test-secret fallback is restricted to localhost requests. No real account or cloud database is contacted except Turnstile's test validation endpoint when publishing.

Staging is deployed at `https://inferno-tips-api-staging.oliveratkinson.workers.dev`, with the built frontend uploaded as Worker static assets. Production remains on Pages at `https://inferno.tips`, with only `/api/v1/*` routed to its API Worker. Both environments use same-origin API routes and an HttpOnly, Secure, SameSite=Lax guest cookie scoped to `/api/v1`. If overriding `PUBLIC_CLOUD_API`, keep the API on the same site and configure `APP_ORIGIN` to the exact frontend origin; cross-site Pages/Workers preview hostnames are not supported for guest cookies.

```sh
npm test
npm run test:api
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chrome npx playwright test --config playwright.production.config.ts tests/cloud-scores.spec.ts
```

The API tests bundle the actual Worker and execute HTTP requests in Miniflare/workerd with a fresh D1 database. Only outbound Turnstile verification is stubbed. This avoids downgrading the existing Vitest 5 suite to the Vitest 4 peer dependency currently required by Cloudflare's Vitest plugin.

## Deployed environments

| Environment | Frontend and API                                            | Database                  | Public submissions                 |
| ----------- | ----------------------------------------------------------- | ------------------------- | ---------------------------------- |
| Staging     | https://inferno-tips-api-staging.oliveratkinson.workers.dev | `inferno-tips-staging`    | Enabled                            |
| Production  | https://inferno.tips                                        | `inferno-tips-production` | Disabled pending live verification |

Both databases have migration `0001_scores.sql` applied. Each Worker has its own managed Turnstile widget and `TURNSTILE_SECRET`; only public site keys and resource IDs belong in the repository. Staging deployment builds and uploads the frontend before deploying the Worker. Production frontend deployments still follow the Pages Git integration, while API deployments use the explicit script below.

## Provision and deploy

The resources above already exist. The creation steps below are for rebuilding the service or adding an environment; normal releases only need any new migrations and the deployment scripts.

1. Authenticate with `npx wrangler login`, or configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` outside the repository. The deployment identity needs Workers scripts/routes, D1 and access to the `inferno.tips` zone.
2. Create isolated databases:
   ```sh
   npx wrangler d1 create inferno-tips-staging
   npx wrangler d1 create inferno-tips-production
   ```
   Put the returned database IDs into their corresponding environments in `worker/wrangler.jsonc`. The checked-in IDs identify the existing isolated databases; replace them only when provisioning a new environment.
3. Create Turnstile widgets for the staging frontend and `inferno.tips`. Set each environment's `TURNSTILE_SITE_KEY`, and store its secret using:
   ```sh
   npx wrangler secret put TURNSTILE_SECRET --config worker/wrangler.jsonc --env staging
   npx wrangler secret put TURNSTILE_SECRET --config worker/wrangler.jsonc --env production
   ```
   The server validates token success, the configured frontend hostname and `publish-score` action. Never copy local test keys into production.
4. Build the frontend with `npm run build`. Staging uploads `dist` as static assets and executes its Worker first for `/api/v1/*`. Its `APP_ORIGIN` and Turnstile domain must match its workers.dev hostname. Apply migrations and deploy the initially disabled API:
   ```sh
   npx wrangler d1 migrations apply DB --remote --config worker/wrangler.jsonc --env staging
   npm run deploy:api:staging
   ```
5. Enable `CLOUD_ENABLED` in staging, redeploy, and verify a real run, score publication and leaderboard entry from the staging frontend. Test Turnstile with its actual staging hostname.
6. Apply the production migration, then run `npm run deploy:api:production`. Confirm `/api/v1/config` responds, then enable `CLOUD_ENABLED` in production and redeploy after staging passes. The existing Pages deployment already contains the frontend. Confirm a production score and use the moderation command to remove the smoke-test entry.

For a new environment, start with `CLOUD_ENABLED=false` until its database and verification secret are configured. Disabling and redeploying the Worker stops cloud writes and reads without removing local practice, settings or personal bests. Initial deployment is a separate explicit script; pushing the site does not silently migrate production D1.

Worker observability is enabled. Watch error rates, response/validation latency, 4xx rejection rates, CPU time and D1 usage in Cloudflare. Error responses explain connection/validation failures without exposing credentials. Use D1 Time Travel before destructive database changes; document the current restore bookmark during rollout.

## API and rules

- `GET /config`: availability, scoring version, public Turnstile site key.
- `POST /runs`: mode → server-issued run ID, seed and version; creates a browser guest credential if needed.
- `POST /runs/:id/batches`: numbered single-stage input batches, max 36 ticks / 64 KiB. The server replays the engine and applies a minimum elapsed-time check including count-ins. Duplicate identical batches succeed; replacements, skipped ticks/stages, invalid inputs and inputs after death fail.
- `POST /runs/:id/finish`: expected batch count and finish/practice reason → server-computed result. Manual Finish is valid; pausing marks practice. Partial last stages are supported.
- `POST /runs/:id/publish`: display name and Turnstile token → publish an eligible result. Publishing again is idempotent. A removed score cannot be republished.
- `GET /leaderboards?mode=hard|endless&period=all|weekly&version=1&week=YYYY-MM-DD`: top 100 plus the current guest's best if outside that slice. Weeks are Monday UTC. The start week is fixed by the server; changing submission time cannot move a run to another week.
- `DELETE /scores/mine`: remove this browser's public records; local progress remains intact.

Boards select each guest's best result per mode, period and scoring version. Order: points, Hard completion, stage. Equal performances share a rank; first publication and run ID only stabilise display order. Identical display names are allowed and never imply common ownership. Names accept 2–24 letters/numbers/spaces/apostrophes/hyphens/underscores and are rendered as text.

The daily cron removes input batches and abandoned/unpublished sessions after 30 days. Published score summaries stay available until removed. Completed pending uploads persist locally for up to 30 days; unsent current-stage inputs cannot survive closing an unfinished run. A private pending record does not publish a name or score. The browser provides the pause/input history, so this validates consistency and rejects basic score tampering, not sophisticated scripted play or fabricated plausible inputs.

### Scoring changes

`CLOUD_SCORING_VERSION` versions public boards independently of local progress migrations. When changing scoring, preserve the old replay implementation and add an explicit version dispatch before increasing the constant. Keep the prior validator available for the 30-day submission window. Never silently recompute an existing version with changed mechanics. The initial release supports version 1; archived boards can be queried independently of the current version.

### Moderation

Use the run ID returned in board entries (browser Network panel/API), with an authenticated local Wrangler session:

```sh
node scripts/moderate-scores.mjs staging hide RUN_ID
node scripts/moderate-scores.mjs production block RUN_ID
node scripts/moderate-scores.mjs production unblock RUN_ID
```

`hide` removes that result; `block` hides the owner's entries and prevents further submissions using that guest credential. Cookie clearing can create another anonymous identity, so guest scores are not verified identities. Operators do not need a public admin endpoint.

## Later releases

Optional accounts can claim the current guest identity and synchronise progress/settings. Run-history coaching, seeded daily challenges and explicitly shared replays/LoS scenarios can reuse the API and input format. Precise click-timing analysis needs finer input timestamps; current tick-boundary samples must not be presented as millisecond timing measurements. No login, progress sync or public replay storage is included in this release.
