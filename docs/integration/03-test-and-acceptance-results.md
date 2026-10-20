# NIVASafe test and acceptance results

## Environment

- Host: macOS arm64; Node `v22.23.3`; pnpm `10.13.1` (as declared by the original project).
- PDF tests used system Tahoma fonts through `NIVASAFE_PDF_FONT_PATH` and `NIVASAFE_PDF_FONT_BOLD_PATH`. The original PDF exporter needs a Unicode font for Persian/Arabic content; Turbo now hashes and forwards these two test-task variables.
- No database connection or authenticated test account was supplied or used.

## Repository checks

| Command | Result | Evidence |
|---|---|---|
| `pnpm install --frozen-lockfile` | PASS | pnpm `10.13.1`; lockfile was already current; no lockfile update. |
| `pnpm db:generate` | PASS | Prisma Client `6.19.3` generated; no database was contacted or changed. |
| `pnpm lint` | PASS | Turbo completed lint in API, domain and web packages. |
| `pnpm typecheck` | PASS | Turbo completed typecheck in API, domain and web packages. |
| `pnpm test` | PASS | 83 test files and 565 tests: frontend 39/246, backend 43/307, domain 1/12. PDF tests passed with the font paths above. |
| `pnpm build` | PASS, with warning | API, domain and frontend builds completed. Vite warned that the largest minified frontend chunk is `512.57 kB`, above its `500 kB` advisory threshold. |
| `pnpm verify:contract` | PASS | 69 frontend API paths matched 127 backend routes. This is a static route comparison, not a live API test. |

Test output was saved to `/tmp/nivasafe-final-tests-20261014.log`; the full-suite diagnostic run is `/tmp/nivasafe-full-suite-20261014.log`. Turbo prints a non-failing warning that test tasks do not declare output files. The first unconfigured run exposed that Turbo strict mode did not pass the local PDF font variables. After adding the two test-task `env` declarations, the exact root `pnpm test` command passed.

## Browser checks

Chrome DevTools used the local Vite app at `http://localhost:5043`.

| Route / viewport | Result |
|---|---|
| `/login`, desktop `1366×900`, Persian RTL, blue/dark theme | PASS for rendering. `document.scrollWidth` was 1366; input surface was `rgb(20, 31, 50)`, input text `rgb(237, 243, 253)`, and input minimum height 48px. |
| `/login`, mobile `390×844`, Persian RTL, blue/dark theme | PASS for rendering. `document.scrollWidth` was 390. |
| `/login#login-form`, mobile `390×844`, Persian RTL, white theme | PASS for rendering. `document.scrollWidth` was 390; the form input surface was white with dark text. |
| `/register`, mobile `390×844`, English LTR, white theme | PASS for rendering. `document.scrollWidth` was 390 and document height 1021px; vertical page scrolling is expected. |

The accessibility snapshots showed named theme/language controls, form labels, required fields, registration choices and progress steps. No console errors or warnings were present after the route checks. The observed login/register network requests loaded local assets and the public font; no `/api` request was made. Screenshots: [desktop Persian dark login](evidence/login-desktop-fa-blue-1366x900.png) and [mobile English registration](evidence/register-mobile-en-390x844.png).

## Not verified / blocked

- Authenticated API integration, role-specific navigation, authorized CRUD and persistence after reload: **BLOCKED — no authorized disposable database/account credentials were provided**. `pnpm smoke` was not run.
- Protected FMEA/RULA report and administration screens with real data: **NOT VERIFIED in a browser**. Unit/source regression checks and the build passed, but public routes cannot reproduce the authenticated table screenshots without a valid test session.
- AI provider behavior and quota enforcement against a live service: **BLOCKED — no authorized provider credentials or quota test environment**.
- Windows rendering and deployment scripts: **NOT VERIFIED — validation host is macOS**. The original Windows, Docker, PM2, Nginx and public/PWA files were preserved; this is not a Windows runtime result.
- Production readiness: **NOT VERIFIED**. No production environment or deployment was used.

No live database, customer upload, secret or deployment was changed. The only browser interactions changed theme/language in an isolated test browser and dismissed its install prompt; no account or application data was submitted.
