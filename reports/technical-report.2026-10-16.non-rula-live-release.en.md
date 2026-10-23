# Technical Report — NIVASafe Non-RULA Live Release

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical delivery and operational evidence |
| Language | English |
| Jalali date | 1405-07-24 (24 Mehr 1405) |
| Gregorian date | 2026-10-16 |
| Release | `nivasafe-non-rula-20261016T222844Z` |
| Repository baseline | `C:\NIVASafe`, `main`, HEAD `e5bf3f0`; 404 modified/untracked paths were present |
| Verdict | Partial live release; authenticated non-RULA acceptance remains incomplete |

## Scope and result

This release published the current frontend candidate and the already-existing support-operator source correction. Real RULA image inference and its known ArvanCloud HTTP 401 were explicitly excluded. Only frontend static files and one compiled backend module were changed in the live deployment. No database/configuration/security-gate changes were made.

The public frontend is served at `https://app.nivasafe.com` through the confirmed Nginx/IIS topology. IIS site `NivaSafe-App-COM` is bound to port 8080 with web root `C:\inetpub\nivasafe\app-com`; Nginx serves public 80/443. The active API runtime is `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist`, managed by PM2 process `nivasafe-api` on loopback port 5044.

## Root causes and fixes

### Mobile authentication text size

The first fresh CSS candidate contained a `16px` media-query rule, but the live computed login input size remained `15px`. Inspection found the more-specific existing `.login .login-card input { font-size: .9375rem; }` selector overrode `.login :is(...)`. The mobile selector now carries the same `.login .login-card` scope and higher specificity, and the regression expectation in `frontend/src/features/account/loginResponsive.test.ts` was updated. Public Chromium computed style now reports `16px` at widths 320–414 px. Safari's actual focus/zoom behavior was not tested.

### Dashboard cards

The current frontend source includes equal two-column spans and stretch alignment for comparable dashboard widgets in `frontend/src/styles/management.css`. A focused component regression suite covers dashboard presentation. This CSS is in the deployed bundle, but an authenticated live dashboard was unavailable for visual acceptance.

### Support inbox authorization policy

The live module previously lacked the current source fallback; both `SUPPORT_OPERATOR_USER_IDS` and `SUPPORT_OPERATOR_ORGANIZATION_IDS` were absent in the active runtime, so operator access could fail closed. The pre-existing `backend/src/modules/support.ts` correction permits the narrowly designated active database user with `globalRole=SUPER_ADMIN` and `protectedSystemAdmin=true` when the explicit allowlists are not configured. It still requires a session organization, keeps request queries within that organization, retains public-vs-internal reply filtering and audit behavior, and does not grant general super-admin access. The generated Prisma client and database already contain the required field; no schema change was needed. Runtime key values were not emitted or changed.

This source correction predates this release and was carried forward from the earlier Debug phase; it was deployed in this release rather than newly authored now. The earlier isolated API/MariaDB/Chromium happy-path and negative tests are documented in `reports/final-debug-rula-tickets.md`. That report is staging evidence, not a live ticket acceptance claim.

## Source changes and attribution

- `frontend/src/styles/authentication.css`: mobile auth form inputs set to 16 px with a selector that wins the existing form rule.
- `frontend/src/features/account/loginResponsive.test.ts`: responsive/input-font regression checks.
- `frontend/src/styles/management.css`: comparable dashboard widget span/stretch rules in the current source.
- `frontend/src/components/enterprisePresentation.test.tsx`: focused presentation regression tests.
- `frontend/src/styles.css`: working tree has a large existing diff (4,882 additions/one deletion in the inspected file); this report does not attribute the entire diff to this release. Only the relevant deployed current source was preserved.
- `backend/src/modules/support.ts` and `backend/src/support.test.ts`: pre-existing support fix/tests, uncommitted at the inspected baseline; compiled support output was deployed. Do not attribute their authorship to this release.
- `backend/src/storage.ts` and `backend/src/rula-three-stage.test.ts`: source-only Node buffer typing adjustments were present in the validation workspace; neither file was deployed in this release and neither changes RULA AI behavior.

The working tree contained hundreds of pre-existing edits. No reset, clean, stash, broad copy, checkout, dependency reinstall, or unrelated-file overwrite was performed. The full original working tree was not replaced from an older archive.

## Frontend release evidence

Candidate: `C:\NIVASafe\.local\non-rula-live-release-20261016\frontend-dist-final` (46 files). Sixteen missing immutable assets were copied; 29 same-named existing assets were hash-equal; zero same-name/different-content collisions occurred. Older hashed assets were retained. `index.html` was switched atomically only after reference/hash checks.

| Public object | Before hash | Final hash | Public HTTPS result |
|---|---|---|---|
| `index.html` / `/login` | `1812892D30D297700EE32F865257B02B7AE0C225058B13AB54940BDEC6F24F9C` | `8388FC8545B63479B456582B2D03DD526DBB248238EA8A394E47E5D539A3BE38` | 200, `text/html`, 1,084 bytes |
| `/assets/index-BuMPARoy.js` → `/assets/index-DCQi7Wzy.js` | `5E6BF037DAA6A7A087EBD91DBB8BBC116FE147969E71BBDB1BC7D34FDCDE8C90` | `CBBE905873F9804F8F020BBA8C644E0F376B0395BBD8F83CFF58BD797589E3EC` | 200, `application/javascript`, 554,743 bytes |
| `/assets/index-CUsSK2nN.css` → `/assets/index-qN_FnEDU.css` | `7359CDC04FDDB25689A9EC4E83206A90F0655657BA07055DE19AED836511ECDA` | `D02536B0758851B8F89BA368B38EB8E05A0D424696F97D131E2ECA075C80FD84` | 200, `text/css`, 518,957 bytes |

The public `/api/v1/health` returned HTTP 200, application `healthy`, database `up`, version `0.1.0`. Hash equality and response metadata are retained in `NIVASafe-NON-RULA-LIVE-RELEASE-EVIDENCE-20261016/public-http-verification.json`.

## Backend support module deployment

| Item | Evidence |
|---|---|
| Active module | `C:\ProgramData\NIVASafe\releases\release-20261015-project-source-update\backend\dist\modules\support.js` |
| Previous SHA-256 | `BF2A7ECFAC41C78D6E61A198258BA7C959CFF152E19376C0C3DA3E303D9DB310` |
| Deployed SHA-256 | `6B3042E7F384A6FDD8EF5FE76B9B37750251AF812220668CB5410881B18CD332` |
| Restart | `pm2 restart nivasafe-api`, exit 0; stored environment was not refreshed or changed |
| Process | PID 832 → PID 14048; process start `2026-10-16T22:28:44.2513670Z` |
| Health after restart | HTTP 200, healthy, DB up, version 0.1.0 |
| Anonymous route checks | `GET /api/v1/support/requests` → 401; `GET /api/v1/admin/support-requests` → 401 |
| Authenticated live ticket journey | Not run; no approved disposable live member/admin session was available |

The `401` checks confirm that the routes remain protected when no credentials are supplied; they do not verify operator fallback or ticket persistence. A real user ticket was not created.

## Browser evidence

The actual public site was examined in Chromium. Persian/RTL dark login was measured at 320, 360, 375, 390, 414, 768, 1024, 1280, 1440 px and landscape 844×390; document width did not exceed viewport width, and no visible overflow element crossed the viewport. At 320–414 px login inputs computed to 16 px. English/LTR plus light theme was tested at 390 and 1280 px; language and theme remained selected after reload, and the prior Persian/dark setting was restored. Registration rendered at 320, 390, 1280 px without page overflow. Public login, registration, recovery, and anonymous protected-route redirects were checked. Mobile login showed no extra toolbar action icon and retained the accessible password-visibility button. Captured browser errors/warnings: zero.

Only anonymous public routes could be accepted. Protected application routes redirected to login because no authenticated test session was available. Sidebar collapse, admin cards, RULA/FMEA tables, ticket replies, and user data persistence therefore remain unverified on the live site. Safari/WebKit/iOS was not available. A live screenshot attempt timed out (`Page.captureScreenshot`), so no live screenshot exists. `fixture-only-*` images under `reports/NIVASafe-EXECUTION-SCREENSHOTS` remain staging evidence only. Full measurements are in `browser-observations.json`.

## Validation inventory

| Check | Result |
|---|---|
| Frontend tests | PASS, 50 files / 325 tests |
| Focused UI tests | PASS, 3 files / 127 tests |
| Frontend lint/typecheck command (`tsc -b --noEmit`) | PASS, exit 0; package lint aliases this TypeScript check, not ESLint |
| Frontend Vite build | PASS, exit 0; 108 modules, 46 files; existing >500 kB chunk warning |
| Backend isolated tests | PASS, 60 files / 403 tests; unit tests, not live ticket E2E |
| Backend full typecheck/build | FAIL / BLOCKED, exit 2; installed `@types/pdfkit` is incomplete and `PDFKit` declarations are missing |
| API contract | PASS, 90 frontend paths / 154 backend routes |
| Release verifier | PASS, 29 checks |
| `pnpm --version` | 11.25.0; repository pins 10.13.1. Root workspace scripts were not run under the mismatched manager. |
| `pnpm audit --prod` | NOT RUN; no dependency changed in this release; known backend dependency/audit backlog remains. |
| Browser UAT | PARTIAL; live anonymous Chromium pages and viewport checks only |
| Safari/WebKit/iOS | NOT RUN |
| Live support create/reply/reload, FMEA/action persistence | NOT RUN; no approved disposable authenticated sessions |
| RULA provider request | NOT RUN by explicit scope |

The full backend build blocker does not invalidate the single support module artifact: its syntax was checked, its bytes matched the output emitted by the project TypeScript compiler, the source support tests passed in the 403-test suite, and the runtime health check passed after restart. It does mean a full backend build/type gate is not certified.

## Backup and rollback

- Full frontend static recovery point: `C:\NIVASafe\backups\non-rula-live-20261016-151930-pdt\frontend-before` with `frontend-before-manifest.json`. The 142-file/59,463,475-byte backup was reconstructed under `.local\non-rula-live-release-20261016\rollback-rehearsal\frontend-old`; 0 hash mismatches.
- Immediate pre-release and atomic-swap indexes are preserved in the same backup directory. Old hashed assets were not removed, so restoring the saved index returns the matching previous bundle.
- Previous backend module backup: `C:\NIVASafe\backups\non-rula-live-20261016-151930-pdt\backend-before\dist\modules\support.js`; the isolated rollback copy hash matched.
- Rollback procedure: atomically replace the active support module with the saved `support.js`, restart only PM2 `nivasafe-api` without `--update-env`, and require health 200/healthy/database up. Restore the selected saved frontend `index.html` atomically; no service restart is required for static assets.
- Database backup restore was not required or tested because no database migration/data change occurred.

## Security and data integrity

No live member/admin login was available, no production ticket or assessment data was written, no customer image was submitted, and no provider credentials or runtime config values were printed. Privacy/consent, role checks, tenant scoping, and support internal-note handling were not bypassed. No migrations, seeds, database pushes, production smoke script, or credential changes were run. No dependencies were added or upgraded. Production dependency audit remains NOT RUN.

The direct IIS port-8080 request for `/login` returned 404, while the user-facing public HTTPS `/login` returned 200 and rendered through the public proxy path; no proxy or IIS configuration was modified. A PowerShell HTTP client could not initialize SChannel credentials in the sandbox; the installed `curl.exe` with default certificate validation completed the public HTTPS checks successfully.

## Plugin/tool use and remaining actions

No callable Debug, UI UX Designer, or Chrome DevTools MCP tool was available (`ALL_TOOLS` contained no matching plugin tools). Browser validation used the Codex in-app Chromium interface; shell checks used PowerShell/Node/Vitest. The local Debug browser-testing workflow was consulted, but no native plugin run is claimed.

To reach full non-RULA acceptance, perform authenticated live UAT with approved disposable member and protected-super-admin sessions for ticket creation/reply/reload, dashboard/admin/sidebar, and FMEA/action/notification flows; run Safari/WebKit on an available Apple/WebKit host; and restore the pinned pnpm/development type dependency in a controlled non-production build workspace before certifying the full backend build/audit. These are blockers, not evidence of failure in the already deployed anonymous frontend.

RULA vision remains explicitly deferred. The preceding report records the ArvanCloud HTTP 401; this release sent no vision request and did not change consent or provider configuration.
