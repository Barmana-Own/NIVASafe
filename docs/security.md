# Security

## Browser form drafts

Operational form autosave is scoped by user and organization. Passwords, recovery tokens and file objects are excluded before storage; login and password-change forms are intentionally not autosaved. Draft cleanup occurs after successful submission, while failed submissions retain non-sensitive fields for recovery.

Implemented controls include bcrypt cost 12, short access tokens, hashed rotating refresh sessions, route rate limits (including registration throttling), Helmet headers, restricted CORS, Zod validation, Prisma parameterization, upload allow-list/size limit, tenant membership enforcement, role checks for audit data, request IDs, secret redaction and structured errors. Registration, profile and member input share strict validation for normalized email, Iranian mobile numbers in canonical `09` + 9 digits format (exactly 11 ASCII digits, including Persian/Arabic digit normalization), reserved display names and strong passwords; the API remains authoritative and rejects invalid input even when client-side checks are bypassed. Each organization has an independent subscription status, plan and expiry; organization-scoped routes are blocked with `SUBSCRIPTION_REQUIRED` when payment is pending, canceled or expired, while billing routes remain available to the organization administrator. Syntax validation does not claim ownership—email/SMS verification must be enabled before treating a contact as verified.

Before production: use 32+ byte random secrets, HTTPS, narrow `APP_URL`, managed secret injection, malware scanning for uploads, object-storage signed URLs, SMTP credentials and an external dependency/image scan. The local filesystem upload adapter is for local development only.

Production TLS is enabled for `app.nivasafe.com` and `api.nivasafe.com` with a Let's Encrypt certificate managed by win-acme. The legacy `nivasafe.com`, `www.nivasafe.com`, `nivasafe.ir`, `www.nivasafe.ir` and `app.nivasafe.ir` addresses are canonicalized to `https://app.nivasafe.com`; API hostnames remain separate. HTTP requests are redirected to HTTPS, TLS 1.2/1.3 is allowed, HSTS and browser security headers are emitted, and the daily win-acme renewal task rebinds the renewed certificate to IIS. Verify after a renewal with:

```powershell
curl.exe -I http://app.nivasafe.com
curl.exe -I https://app.nivasafe.com
```

The first command must return `301` with an `https://` `Location`; the second must return `200` with `Strict-Transport-Security` and `X-Content-Type-Options` headers.
