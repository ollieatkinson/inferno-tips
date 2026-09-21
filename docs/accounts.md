# Optional accounts and drill progress

Work is on `feat/account-progress`. Production accounts remain disabled. Staging uses the existing staging Worker and D1 database; no additional Cloudflare product is required.

## Release scope — 21 September 2026

The owner confirmed real Discord login and successful Turnstile verification on staging. This release will use Discord only; Google is deferred. The UI only offers configured providers and only requests linking verification when another configured provider is available. Google support remains dormant until a later release configures it.

Production now has `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, its existing Turnstile secret, and a newly generated, distinct `AUTH_SECRET`. The owner confirmed OAuth setup. Before launch, apply the account migrations and deploy the frontend/API with accounts enabled, then verify real production sign-in. Google configuration is not a launch requirement.

Discord application policy URLs are `https://inferno.tips/terms/` and `https://inferno.tips/privacy/`. The contact address on both pages is `tos@inferno.tips`, supplied by the owner. Policy pages were published separately on trunk so they are accessible before account rollout.

## What is implemented

- Google and Discord authorization-code login through Better Auth 1.7.5, with native D1 storage. No email/password registration or client-supplied ID-token login is exposed.
- Secure, HttpOnly, SameSite=Lax, host-only `__Host-inferno-auth.*` cookies on HTTPS. Auth tokens are never written to localStorage. Sessions last up to 14 days; all-device sign-out revokes their database records. OAuth access/refresh tokens are encrypted using `AUTH_SECRET`.
- Optional account navigation from the header, Settings and Your progress. Guest practice remains available. Device settings and knowledge checks remain local.
- Individual drill tickets carry a server-chosen seed and version. The server replays the complete input sequence, checks elapsed time and ownership, computes the result, and counts each completed attempt once. Guided and client-marked interrupted runs cannot award passes.
- A transactional D1 slot reserves enough time for one drill. Concurrent starts cannot reserve overlapping windows. Cancelling a drill releases its slot and makes that attempt ineligible to finish. Slots expire after the drill duration, so abandoned tabs do not lock an account indefinitely.
- Failed completed uploads stay in the browser and can be retried under Account. Queues are separated by account ID; the server still checks ownership. Up to 40 pending runs are retained locally, with the newest 20 for the current account shown at once; records older than 30 days are pruned on queue updates. Clearing browser data can remove unsynced runs. If the server cannot issue a ticket, the trainer explicitly labels that run as browser-only.
- Server progress is shown separately from one-time imported browser history. D1 enforces one import per account. Imported counters never award account mastery or leaderboard positions.
- Guest scores can be claimed only with the existing authenticated guest cookie. A guest identity can belong to only one account. Claimed scores require that account's session for future writes; its leaderboard entry combines its best score across claimed guests/devices. Display names are not identity credentials.
- Explicit provider linking while signed in, requiring matching provider emails. Automatic email-based linking is disabled. Separately created accounts cannot be merged by editing browser data.
- Recent attempt history, a JSON export of account details/imported history/up to 10,000 recent completed attempts, and account deletion with a recent session plus Turnstile. Deletion removes linked public scores and account data; local browser history remains separately controlled.

## Deployment and provider setup

The existing staging Turnstile widget supports the new `sign-in` and `delete-account` actions as well as `publish-score`; the API validates the action and hostname for each request. `AUTH_SECRET` has been generated directly into the staging Worker secret store. It is not in source control or chat.

Discord credentials are configured on staging and production; the Google commands below are for the deferred follow-up. Configure credentials using Wrangler's secret prompts, never by pasting values into an issue, commit or chat:

```sh
npx wrangler secret put GOOGLE_CLIENT_ID --config worker/wrangler.jsonc --env staging
npx wrangler secret put GOOGLE_CLIENT_SECRET --config worker/wrangler.jsonc --env staging
npx wrangler secret put DISCORD_CLIENT_ID --config worker/wrangler.jsonc --env staging
npx wrangler secret put DISCORD_CLIENT_SECRET --config worker/wrangler.jsonc --env staging
```

Register a Google **Web application** OAuth client and a Discord application. Staging callback URLs must be exactly:

```text
https://inferno-tips-api-staging.oliveratkinson.workers.dev/api/v1/auth/callback/google
https://inferno-tips-api-staging.oliveratkinson.workers.dev/api/v1/auth/callback/discord
```

Google uses `openid email profile`; Discord uses `identify email`. No bot token or guild/message permissions are needed. For a Google consent app still in testing, add the intended tester accounts. The staging home page and privacy notice are available at the Worker origin and `/privacy/`.

Use separate production clients/secrets where possible. The production Discord callback is `https://inferno.tips/api/v1/auth/callback/discord`. Production credentials and a distinct `AUTH_SECRET` are installed. Before enabling production, apply migrations 0002 and 0003 and register the callback. Then enable `ACCOUNTS_ENABLED`, deploy the frontend/API together, and verify real production sign-in. Google can be configured later with `https://inferno.tips/api/v1/auth/callback/google`.

For local development, put a random secret of at least 32 characters in ignored `worker/.dev.vars` as `AUTH_SECRET` and set `ACCOUNTS_ENABLED=true` in the same file, apply local migrations and run the existing API/dev scripts. Do not copy a deployed secret into local development. Use provider clients explicitly registered for localhost if testing real local sign-in.

## Verification and remaining limits

Worker tests use actual Better Auth sessions and D1 under Miniflare. Provider HTTP responses and Turnstile are mocked only inside tests; the deployed code has no mock-login route or test-provider bypass. Tests cover code exchange for both providers, state replay, external redirects, encrypted provider tokens, explicit linking, session revocation, ownership, duplicate uploads, import isolation, cancellation/concurrent starts, account deletion, and guest leaderboard grouping.

Browser tests cover a complete challenge with captured inputs, failed-upload recovery after reload, unverified import separation, mobile layout and all-device sign-out. Existing trainer, series and score tests remain relevant because the trainer start flow and score ownership changed.

Server replay checks consistency, not whether a human actually clicked the prayers. A script can fabricate legal inputs and wait; a modified client can hide pauses. Turnstile and IP/account limits add abuse friction, not proof of human gameplay. Imported browser-only history cannot be verified retrospectively. Completed private attempts are not uploaded to public leaderboards.

## Original morning handover (superseded by the release scope above)

1. Open the staging `#account` page. Until provider credentials are configured it shows their setup status and a **Test account verification** panel. Complete Turnstile and click **Check verification**; the server must report success. The Chrome DevTools browser tab is left on that page, but the automated browser may still be rejected by Turnstile. A normal browser can use the same URL.
2. Configure the four provider credentials above. Test Google and Discord separately, then explicitly link the second provider from an account using the same email. Confirm that matching emails do not silently merge independently created identities.
3. Complete an individual challenge while signed in, reload, and inspect Your progress and Recent attempts. Sign in on a second device to confirm the same result. Import old browser history and confirm it remains labelled unverified.
4. Review the staging experience before enabling production.

Questions left for the owner:

- Which Google Cloud project and Discord application should own the OAuth clients? Are the intended Google testers added to its consent configuration?
- Does the real Turnstile account verification succeed in your normal desktop and mobile browsers?
- Is same-email-only explicit linking suitable, or do you need a separately designed flow for Google and Discord accounts with different emails?
- What public support/contact address should appear on the privacy page and provider consent screens before production launch?

## Verification record — 20 September 2026

- `npm test`: 138 passing unit tests.
- `npm run test:api`: 49 passing Worker/D1 tests, including complete valid input sequences for all 20 lessons and an oversized-auth-body regression.
- Full browser run: 92 passed, 10 failed, one development-only CSP skip. Failures exposed two renamed reset controls, outdated feedback/navigation/scoring assertions, an unscoped Settings locator matching Astro's toolbar, a clock setup race, and timing tests accidentally using the live cloud API. These tests were corrected without removing their behavioral assertions.
- A subsequent production-build run passed all 18 selected checks: all ten corrected regressions, the three account flows, four public-score flows and the CSP check.
- `npm run build`: zero type errors/warnings/hints. Astro's pre-existing general Shiki/CSP warning remains; these pages do not use Shiki.
- `npm audit --omit=dev`: zero known vulnerabilities.
- Staging Chrome DevTools: account/config/leaderboard reads returned 200 with `no-store`; anonymous progress import returned 401; the existing Olbo high score remained on the staging board. The real account Turnstile iframe loaded with no parent-page CSP violations. Desktop and 390px mobile account pages had no horizontal overflow.
- At the end of the 20 September run, real provider login was **not yet verified**: Google/Discord client credentials are absent. Callback integration tests use mocked provider responses. Real Turnstile completion still requires the owner's normal browser.

- Added an explicit retry for failed or expired verification. All eight account/public-score production browser checks passed again, including the new expiry/retry case.
- Final staging Worker version: `57bf7d47-7fdc-4a4d-8ca4-6a97dd6a7f58`. Draft review: https://github.com/ollieatkinson/inferno-tips/pull/1.

## Verification record — 21 September 2026

- Owner confirmed real Discord sign-in and Turnstile completion in staging. Google is deferred.
- Discord-only account presentation: production build/type checks and all four account browser tests pass, covering upload retries, import isolation, mobile session revocation, and verification retries.
- Production Discord secret names confirmed and a distinct production `AUTH_SECRET` generated directly into the Worker secret store. Production accounts remain disabled pending rollout.
