# Security

## Browser form drafts

Operational form autosave is scoped by user and organization. Passwords, recovery tokens and file objects are excluded before storage; login and password-change forms are intentionally not autosaved. Draft cleanup occurs after successful submission, while failed submissions retain non-sensitive fields for recovery.

Implemented controls include bcrypt cost 12, short access tokens, hashed rotating refresh sessions, route rate limits (including registration throttling), a configurable production login limit capped at 60 attempts per 15 minutes, Helmet headers, restricted CORS, Zod validation, Prisma parameterization, upload allow-list/size limit, tenant membership enforcement, role checks for audit data, request IDs, secret redaction and structured errors. The production login limit remains enabled through `LOGIN_RATE_LIMIT_MAX=60`; local development omits only this route-specific window so testers are not locked behind a countdown, while the application-wide one-minute abuse limiter remains active. Registration, profile and member input share strict validation for normalized email, Iranian mobile numbers in canonical `09` + 9 digits format (exactly 11 ASCII digits, including Persian/Arabic digit normalization), reserved display names and strong passwords; the API remains authoritative and rejects invalid input even when client-side checks are bypassed. Each organization has an independent subscription status, plan and expiry; organization-scoped routes are blocked with `SUBSCRIPTION_REQUIRED` when payment is pending, canceled or expired, while billing routes remain available to the organization administrator. A production configuration cannot enable the local checkout simulation: `resolveSubscriptionPaymentMode` forces the external adapter path in production. Syntax validation does not claim ownership—email/SMS verification must be enabled before treating a contact as verified.

The API trusts `X-Forwarded-For` only when the immediate proxy is loopback (`127.0.0.1` or `::1`), allowing rate limiting to use the real client address without trusting user-supplied forwarding headers from the public network.

Global administration is isolated behind a dedicated `SUPER_ADMIN`-only route and server-side authorization boundary. User account edits are limited to safe profile fields, active state and the global role; passwords are never exposed or editable there. Disabling an account or changing its global role revokes active sessions, and a serializable transaction prevents self-lockout and removal of the last active global administrator.

Organization member management remains tenant-scoped. Organization administrators can manage membership roles and access status only inside their active organization; global account levels are rejected server-side for non-global administrators.

Company switching is treated as an authorization boundary, not only a UI preference. Every tenant read and mutation obtains the organization from the authenticated request scope, verifies the user's active membership in that organization and applies the corresponding role and subscription checks. Creating a company is allowed without an existing paid organization so the user can reach the billing surface, but the new production company remains operationally locked until its own payment succeeds; a subscription from another company cannot unlock it.

AI credentials are server-only. The ArvanCloud AI key is read from ignored environment files, the browser receives only provider availability/model metadata, and outbound requests use a server-side adapter with a timeout. The configured base URL is normalized and rejects embedded credentials or fragments before it is used.

FMEA process images are optional and are accepted only through authenticated, rate-limited endpoints with the assessment-create permission. The API allow-lists image MIME types, validates JPEG/PNG/WEBP signatures, applies a 10 MB limit per image, keeps image bytes out of logs/audits/AI usage records, and returns only advisory draft rows. The client limits selection to three images, de-duplicates merged AI rows, starts the bounded analyses automatically, and inserts the returned rows into the editable review list; final registration still requires the user to review the rows. The tenant-scoped attachment route verifies FMEA ownership and enforces the same three-image limit before storing each image.

Organization file listings derive assessment/document reference metadata through organization-scoped lookups only. Missing or stale linked records are represented as a safe reference type without exposing data from another organization.

AI usage accounting stores only validated provider-reported input/output/total counters, the provider/model label and the source request or assistant message. The administrator endpoint is restricted to `SUPER_ADMIN` and `ORG_ADMIN`; organization administrators are constrained server-side to the selected organization. Prompts, completions, credentials and raw provider payloads are never returned by the usage view, and source-linked writes are idempotent across retries.

Before production: use 32+ byte random secrets, HTTPS, narrow `APP_URL`, managed secret injection, malware scanning for uploads, object-storage signed URLs, SMTP credentials and an external dependency/image scan. The local filesystem upload adapter is for local development only.

Production TLS is enabled for `app.nivasafe.com` and `api.nivasafe.com` with a Let's Encrypt certificate managed by win-acme. The certificate covers the public `.com` and `.ir` application/API aliases. The legacy `nivasafe.com`, `www.nivasafe.com`, `nivasafe.ir`, `www.nivasafe.ir` and `app.nivasafe.ir` addresses are canonicalized to `https://app.nivasafe.com`; API hostnames remain separate. HTTP requests are redirected to HTTPS, TLS 1.2/1.3 is allowed, HSTS and browser security headers are emitted. The daily win-acme renewal task exports the renewed PEM files for Windows Nginx and runs a validation/reload script under `SYSTEM`; the public listener does not use IIS bindings. The API process binds to `127.0.0.1:5044`, and the direct inbound firewall rule for port 5044 is disabled, so public API traffic enters through Nginx `/api/` only. Verify after a renewal or redirect change with:

```powershell
curl.exe -I http://app.nivasafe.com
curl.exe -I https://app.nivasafe.com
```

The first command must return `301` with an `https://` `Location`; the second must return `200` with `Strict-Transport-Security` and `X-Content-Type-Options` headers.
