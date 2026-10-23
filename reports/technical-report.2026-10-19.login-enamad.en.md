# Technical report — Enamad login footer

| Field | Value |
|---|---|
| Project | NIVASafe |
| Gregorian date | 2026-10-19 |
| Jalali date | 1405-07-27 |
| Frontend release | release-login-enamad-20261019-01-r2 |
| Status | DEPLOYED; intermittent external badge image |

## Scope and implementation

Only these three application source files changed:

- frontend/src/features/account/AccountPages.tsx
- frontend/src/i18n.tsx
- frontend/src/styles/authentication.css

A small LoginEnamadSeal component owns image-failure state and renders a readable verification link on failure without a retry loop. A flex row places it next to the retained park mark, with bounded image dimensions and focus-visible styling. Alt and failure copy support Persian and English. The exact supplied public widget identifier and Code were preserved.

## Security and preservation

PASS for affected boundaries: constant HTTPS URLs, rel=noopener, origin-only referrer policy on link and image, no third-party JavaScript, HTML injection, server proxy or user-controlled URL. No photos, credentials or tokens were submitted/logged. Two languages, themes and widths were checked, including keyboard focus and the existing login-form entry. Text comparison verified unchanged account behavior outside the new badge component/footer. Other frontend sources and all backend sources match the baseline. Prisma schema matches the previous candidate; no migration ran.

## Actual validation

403 tests in 58 files passed. Build, typecheck and lint passed using pnpm@10.13.1 and Node v22.22.3. API contract and 29 release checks passed. Chrome 155.0.8059.80 ran 8 candidate and 8 public cases with zero JavaScript runtime exceptions. Safari/WebKit: NOT_RUN. Protected-account testing was unnecessary for this anonymous footer change and was not run. No AI model calls were made.

The public run loaded the genuine PNG in 5/8 initial views and used the readable fallback in 3/8. Across request events there were 5 image/png HTTP 200 responses and 8 failed browser requests; event counts differ from view counts because the login form/back journey also ran. An earlier direct request with the public origin referrer received HTTP 403 Forbidden; the verification document returned HTTP 200. The cause of intermittency is UNKNOWN. Document HTTP 200 does not establish certificate validity.

## Deployment and rollback

Frontend publication was actually performed. Public index and top-level referenced bytes match the candidate; old immutable assets were retained and index switched last. All 511 backup files were reconstructed and checked by hash/mtime. An isolated old/new/old index-swap rehearsal passed. Actual rollback was unnecessary. Backend remains release-rula-image-autoflow-20261019-01-r2, PID 2840, identity NT AUTHORITY\SYSTEM; public API stayed HTTP 200 with database=up. web.config, service worker, separate report CSS, protected env and service-manager config hashes were unchanged.

## Tool failures and resolution

- Restricted Corepack cache access failed EPERM; authorized host execution passed with the same pinned pnpm. ACLs were not changed.
- An initial background-URL comparison detected different random local-server ports; only origins were normalized in the test comparison. Production background/styles were unchanged.
- The second preparation initially refused an existing reconstruction directory; backups were preserved/reverified, and reconstruction paths were made release-specific.
- One temporary edit command failed PowerShell quoting; file/patch editing and syntax checks resolved it.
- The existing bundle chunk-size warning remained non-fatal; build exited 0.

## Final gate

The scoped widget integration is accepted with an explicit external-service availability limitation. No required feature was removed/disabled. Frontend, security, tests, QA and deployment were executed; new backend/database implementation was not applicable. Stage evidence is recorded in final-acceptance.json and project-state.json. RULA accuracy acceptance and image-processing authorization remain separate and unchanged.

## Artifacts

- Candidate: C:/NIVASafe/.local/login-enamad-20261019-01/candidate
- Source digest: efaa94958ee453da0b7630d2384673a0fb372af77d95473647ac747773ec63cb
- Public index SHA-256: 42fc4bea559a56aedbb4eb413e2678f7a048c16cdc9d99f45f410680e2e6d244
- Backup: C:/ProgramData/NIVASafe/backups/release-login-enamad-20261019-01-r2/frontend
- Rollback: C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\login-enamad-20261019-01\static-release.mjs rollback
- Evidence: C:/NIVASafe/reports/evidence/login-enamad-20261019-01

## Executed commands

| Command | Exit |
|---|---|
| corepack pnpm run test | 0 |
| corepack pnpm run typecheck | 0 |
| corepack pnpm run lint | 0 |
| corepack pnpm run build | 0 |
| node scripts/check-api-contract.mjs | 0 |
| node scripts/verify-release.mjs | 0 |
| node .local/login-enamad-20261019-01/browser.mjs candidate | 0 |
| node .local/login-enamad-20261019-01/browser.mjs public | 0 |
| node scripts/releases/login-enamad-20261019-01/static-release.mjs prepare | 0 (final attempt) |
| node scripts/releases/login-enamad-20261019-01/static-release.mjs deploy | 0 |
