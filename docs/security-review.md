# Security review — 20 September 2026

Reviewed the static Astro/React application, guest high-score Worker, D1 schema and queries, deterministic replay protocol, deployment configuration and dependency lockfiles. Live checks were limited to normal browsing, headers, configuration and read-only account metadata. Abuse tests ran against local Miniflare/workerd and D1, not the public service.

No critical or high-severity application issue was identified in this review. This is a scoped source/configuration review with regression tests, not a guarantee against unknown vulnerabilities or a load test.

## Findings and changes

| Severity                   | Finding                                                                                                                          | Change                                                                                                                                                                                                                                                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medium — availability/cost | Public leaderboard requests executed database ranking queries without application rate limiting.                                 | Added a separate 60-requests/minute/IP read limit before D1 access. Responses include `Retry-After: 60`.                                                                                                                                                  |
| Medium — availability/cost | Anonymous run/guest creation shared the general 60-writes/minute limit. Turnstile only gates publication.                        | Added a separate 20-new-runs/minute/IP limit. Existing uploads use the independent write budget, so the new-run limit does not itself prevent finishing a run.                                                                                            |
| Low — storage abuse        | Valid input batches could include ignored arbitrary fields that were nevertheless persisted, up to the existing 64 KiB body cap. | Allow only the protocol's known keys at batch, tick and blowpipe-command levels. Rejected payloads do not reach D1.                                                                                                                                       |
| Low — browser hardening    | No application CSP or anti-framing policy. No exploitable HTML injection was found.                                              | Added Astro-generated script hashes and restricted resource origins, plus `frame-ancestors 'none'`, `X-Frame-Options: DENY`, HSTS, referrer and feature policies. API responses prohibit document resources and caching, including errors and preflights. |
| Low — unnecessary exposure | Staging version-preview URLs were enabled in addition to the intended staging hostname.                                          | Disabled staging preview URLs. Production workers.dev and version-preview URLs were already disabled.                                                                                                                                                     |

Also tightened JSON media-type matching (`application/jsonp` is rejected) and require Siteverify's success flag to be the boolean `true`.

## Controls checked

- **Ownership:** run lookup includes both run ID and authenticated guest ID. Another guest cannot upload, finish or publish that run. Removing scores only hides the requesting guest's records. IDs alone are not credentials.
- **Guest credentials:** 256-bit cryptographically random tokens; only their SHA-256 hashes are stored in D1. HTTPS cookies are HttpOnly, Secure and SameSite=Lax with no Domain attribute, scoped to `/api/v1`. Public responses do not expose credentials or internal guest IDs. Clearing cookies creates a new identity; display names are neither verified nor reserved.
- **CSRF/CORS:** mutations require the exact configured Origin and JSON requests where a body is used. Missing, `null`, foreign and sibling-subdomain origins fail; disallowed preflights do not receive permissive CORS headers. Origin checks are browser CSRF protection, not authentication against scripts that can choose their own headers.
- **SQL and output:** queries use bound values. Board/name rendering uses React text nodes; no user-input HTML execution sink was found. Display names have length/character validation. A legitimate apostrophe-containing name survives the SQL and display flow.
- **Turnstile:** verified on the server with secret, hostname and `publish-score` action checks. Rejected tokens, wrong host/action, invalid responses and service failure cannot publish. Production test-key fallback is disabled; the code's fallback is limited to localhost. Real normal-browser staging publication passed before this review; the tightened policy still loads the real widget. Automated publication tests use a stub, not a bypass in production.
- **Score consistency:** the server replays bounded, consecutive tick inputs and computes points itself. Altered duplicate batches, skipped stages/ticks, input after death and implausibly accelerated uploads are rejected. Updates are guarded against concurrent batch advancement. Practice runs cannot publish when marked as practice.
- **Operations:** separate staging/production databases and verification secrets; production API restricted to its configured route. Cloudflare reports MFA enabled for the current operator. A pattern scan of tracked files found no private keys, GitHub tokens, Cloudflare API token assignments or Turnstile secret assignments. This scan did not audit all repository history or every possible secret format.
- **Dependencies:** `npm audit` reported zero known vulnerabilities for both the main lockfile and `scripts/monster-sprites/package-lock.json` at review time. This does not establish absence of unreported vulnerabilities or a complete supply-chain audit.

## Validation

- 138 unit tests pass, including replay parity and rejecting unknown input fields.
- 12 Worker/D1 tests pass, including ownership, CSRF, request-size/type limits, Turnstile failure cases, rate limits, concurrency, deletion/blocking and retention.
- Four existing production-build browser checks pass for desktop/mobile saving, retries, reload recovery and local fallback. One new browser security test verifies hydration under CSP, blocks an injected unapproved inline script, and checks the credits page.
- Astro check/build passes. Astro emits a general Shiki/CSP warning; this application has no Markdown code-highlighting pages. Its inline React styles are explicitly allowed, while inline scripts require build-generated hashes.
- Staging headers and API responses were inspected through Chrome DevTools. The real Turnstile iframe loads under the policy without parent-page CSP violations; the known automated-browser challenge limitation remains. No public attack traffic, bulk record creation or live destructive checks were used.

## Remaining limits and follow-up

1. **Anonymous scores are not cheat-proof.** A script can fabricate plausible inputs, wait out elapsed-time checks, and omit client-reported pauses. Server replay prevents arbitrary score numbers, not simulated perfect play. Do not treat this leaderboard as proof of identity or verified gameplay. Ranked competition would need a different threat model.
2. **Rate limits are abuse friction, not hard spending caps.** Cloudflare's binding is per-location and eventually consistent; distributed clients, rotating addresses and IPv6 addresses can spread traffic. Anonymous run creation still precedes Turnstile. Monitor Worker/D1 usage and rejected requests; configure account budget/usage alerts. If abuse appears, add a pre-run challenge or a durable quota rather than assuming per-IP limits are global accounting. These account alerts were not inspected or changed.
3. **Deployment credentials:** interactive Wrangler OAuth has broad account scopes. It stays outside the repository. Use an account-scoped deployment API token with only the required Worker, route, Pages and D1 permissions if introducing unattended CI; do not copy the interactive OAuth credentials into GitHub.
4. **Cloudflare zone settings:** the current OAuth scopes cannot read SSL mode, minimum TLS version or Always Use HTTPS. Their dashboard configuration was not verified. Explicit HSTS is now served by the app; minimum TLS 1.2 and HTTPS redirects should also be checked in the zone dashboard. Changing zone-wide settings may affect the companion LoS site.
5. **Cookie/site trust:** the existing cookie has no `__Host-` prefix. Keep sibling subdomains trusted; a compromised sibling could attempt parent-domain cookie injection. A future cookie migration should use `__Host-` with `Path=/` and credential rotation, preserving existing guest ownership. That migration was not performed in this release.
6. **Third parties and styles:** CSP trusts the specific Turnstile, Cloudflare analytics and Google Fonts origins used by the site. Styles allow `unsafe-inline` for React's animation/position styles; scripts do not. Compromise of an explicitly trusted script provider remains outside this application's protection.

## References

- [Cloudflare rate-limit semantics](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- [Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Turnstile CSP requirements](https://developers.cloudflare.com/turnstile/reference/content-security-policy/)
- [Astro CSP configuration](https://docs.astro.build/en/reference/configuration-reference/#securitycsp)
- [Cloudflare static response headers](https://developers.cloudflare.com/pages/configuration/headers/)
