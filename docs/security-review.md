# Security review report

**Scope:** Gridline React client, Supabase authentication/RLS, Node research API, ingestion adapters, local persistence, dependencies, and GitHub Actions  
**Review date:** 2026-09-16  
**Status:** High and critical findings remediated; verification passed

## Remediated findings

### High — unauthenticated state-changing API

The research API accepted scenario, backtest, and ingestion POST requests with wildcard CORS and listened on every interface. It now binds to `127.0.0.1` by default, restricts browser origins, requires a timing-safe bearer token for non-loopback writes, and rate-limits write requests. Provider keys are never accepted from requests or returned in responses.

### High — mutable CI action references and broad workflow permissions

All GitHub Actions are pinned to immutable commit SHAs. The snapshot workflow now has only repository-content write access and triggers the separate Pages deployment through its snapshot commit. Pages/OIDC permissions are limited to the deploy job. Checkout credentials are disabled where pushes are unnecessary. High/critical dependency advisories block pull-request CI.

### Medium — unbounded requests, responses, and result sets

JSON request limits are enforced while streaming. Outbound provider requests use HTTPS, DNS/private-address checks, redirect validation, a 20-second timeout, and a 25 MiB response ceiling. Observation and score APIs apply bounded pagination; run-history limits are clamped. Large raw IR/FERC payloads remain only in ignored bronze storage rather than public normalized observations.

### Medium — vulnerable dependencies

Non-breaking updates and explicit transitive overrides removed the reported advisories. `npm audit` reports zero known vulnerabilities at review time. The full server/client test suite and production build pass with the fixed versions.

### Low — information and authentication error disclosure

API health no longer exposes absolute database paths, ingestion responses no longer expose raw file locations, unexpected API errors return a generic response, and browser authentication errors are normalized rather than forwarding provider internals.

### Low — browser policy and repository hygiene

The static page now uses a restrictive CSP with an exact Supabase project origin, blocks object/frame content and form posts, upgrades insecure requests, and removes unused third-party preconnects. The stale tracked authentication test log was removed. Secret scanning found no secret/service-role keys, private keys, or committed `.env.local` file.

## Verified controls

- Supabase uses PKCE with a browser-safe publishable key only.
- `user_preferences` has RLS enabled, anonymous privileges revoked, and owner-only `USING` and `WITH CHECK` policy conditions.
- Anonymous preference access was independently confirmed denied by Supabase.
- React escaping is used; no `dangerouslySetInnerHTML`, `eval`, or dynamic code execution was found.
- SQLite queries use parameters; dynamic column names come only from fixed internal mappings.
- Raw provider credentials are confined to local environment or GitHub secret variables.

## Remaining low-risk operational items

- GitHub Pages cannot set an HTTP `frame-ancestors` or `X-Frame-Options` response header. The meta CSP blocks frames loaded by Gridline but cannot prevent another site from framing Gridline. If header-level clickjacking protection becomes necessary, serve Pages through a host/proxy that supports security headers.
- Before opening email enrollment to the public, configure custom SMTP and CAPTCHA in Supabase and review Auth rate limits. Provider-side rate limits are active now.
- Create React App is a legacy toolchain. The pinned dependency graph is clean at review time, but migrating to a maintained build system remains advisable.
- If the optional Node API is deployed beyond localhost, generate `API_WRITE_TOKEN`, keep it server-only, set the exact `ALLOWED_ORIGINS`, terminate TLS at the hosting layer, and add centralized audit/abuse monitoring.

## Verification evidence

- Server tests: 44 passed
- Frontend tests: 26 passed
- Production build: compiled successfully
- Dependency audit: zero known vulnerabilities after remediation
- Git diff whitespace check: passed
