# Technical Report — Strict and Stable Visual Regression

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical |
| Language | English |
| Jalali date | 10 Mehr 1405 |
| Gregorian date | 2 October 2026 |
| Base revision | `17c0d8b`; these working-tree changes are uncommitted |
| Status | Local validation passed; remote CI was not run |

## Scope and verified root cause

The global `toHaveScreenshot` allowance was `0.08`, used by all screenshot assertions without per-assertion overrides. There were no screenshot `maxDiffPixels`, pixelmatch `threshold`, masks, or narrow exceptions. The readiness helper waited only 100 ms and did not verify fonts or decoded images. A trace recorded `ERR_CONNECTION_FAILED` for the Vazirmatn Latin subset from `fonts.gstatic.com`; Vite's watch of Playwright trace/report outputs could also trigger HMR reloads during captures.

## Implementation

- `frontend/playwright.config.ts`: global allowance changed to `maxDiffPixelRatio: 0.02`; CSS-pixel capture, Persian locale, Tehran timezone, and device scale factor 1 are explicit. Tests used `@playwright/test` 1.56.1 and Chromium 141.0.7390.37.
- `frontend/tests/e2e/fixtures.ts`: at the original visual-regression stage, readiness included `networkidle`; the later Stage 04 correction documented below replaced that with bounded state-based readiness. Test-only Google Fonts requests are fulfilled from local files for the same Vazirmatn version. Production CSS and assets are unchanged. The font license is included at `frontend/tests/e2e/assets/OFL.txt`.
- `frontend/tests/e2e/visual.spec.ts`: public login/register captures now set theme/language explicitly and freeze time. Added coverage for FMEA/RULA lists and forms plus Knowledge, Notifications, Members, and Profile at 390px and 1280px.
- `frontend/tests/e2e/__snapshots__/chromium/visual.spec.ts/`: added and visually reviewed 16 baselines for the new eight surfaces. Existing baselines were not updated in this stage; pre-existing working-tree snapshot differences were preserved.
- `frontend/vite.config.ts`: Playwright output directories are excluded from the Vite development watcher to prevent trace creation from reloading the page during capture.
- `docs/testing.md`: documents the threshold, added screens, local font fixtures, and snapshot policy.

An earlier visual run was stopped at 42/52 after trace creation triggered Vite HMR/page reloads. After excluding diagnostic output directories from the watcher, both final consecutive runs completed without unintended reloads.

No permissive assertion override, secondary pixel threshold, or screenshot mask was added; production CSS/fonts were not changed. The current `.github/workflows/ci.yml` was statically checked: it runs on push and pull request and its visual job invokes `test:visual` without `--update-snapshots`. No GitHub Actions execution was observed.

## Validation

Local environment: Windows; `@playwright/test` 1.56.1; Chromium 141.0.7390.37; locale `fa-IR`, timezone `Asia/Tehran`, and deviceScaleFactor `1`. The 52-case visual matrix covers widths of 320/360/390/430/480/768/1024/1280/1440/1920 where applicable, mobile/desktop screens, both assessment reports, and representative RTL/LTR and theme variants.

| Command | Actual result |
|---|---|
| `pnpm.cmd --filter @nivasafe/web test:visual` — first run | PASS, 52/52 |
| Same command — consecutive unchanged run | PASS, 52/52 |
| `pnpm.cmd --filter @nivasafe/web test:e2e` | PASS, 90/90 |
| `pnpm.cmd --filter @nivasafe/web test:overflow` | PASS, 108/108 |
| `pnpm.cmd --filter @nivasafe/web lint` | PASS |
| `pnpm.cmd --filter @nivasafe/web typecheck` | PASS |
| `pnpm.cmd --filter @nivasafe/web test` | PASS, 5 files and 124 tests |
| `pnpm.cmd --filter @nivasafe/web build` | PASS; emitted a chunk-over-500KB warning |
| `git diff --check` | PASS; only LF/CRLF conversion warnings |

For the negative control, a temporary `.rula-report-view { transform: translateY(140px) !important; }` mutation was applied. `pnpm.cmd --filter @nivasafe/web test:visual --grep "rula-report-390"` failed the screenshot assertion at 66,725 differing pixels (ratio 0.03); the same-named overflow case passed. Expected/actual/diff images were inspected. The mutation was removed, then the file-scoped command `pnpm.cmd --filter @nivasafe/web exec playwright test tests/e2e/visual.spec.ts --grep "rula-report-390"` passed 1/1. No baseline was rewritten by the negative control.

## Remaining limitations and risks

- The repository and CI pin pnpm 10.13.1, while the local environment provided pnpm 11.19.0. A Corepack invocation for the pinned version was blocked with `EPERM` while creating its default cache outside the workspace. Tests ran through local pnpm with the workspace-installed, lock-resolved dependencies. A remote CI run or full replay under pnpm 10.13.1 has not been observed.
- The build's greater-than-500KB chunk warning remains outside this stage's scope.
- Changes remain uncommitted and were not pushed or deployed. Earlier working-tree changes were preserved.

## Security and regression review

Runtime changes are limited to Playwright, fixtures, test assets, and development-server watching. Production font loading, APIs, FMEA/RULA calculations, permissions, and data paths were not changed. The font files carry their OFL license. E2E, overflow, typecheck, unit, and build checks ran; this scoped review is not a full application security audit.

## Addendum — deterministic page readiness and subscription clock

The following stage replaced `waitForPageReady()` in `frontend/tests/e2e/fixtures.ts` with a shared 12-second budget covering route, visible content, actual application loaders, `document.fonts.ready`, visible image completion/decode, post-render font readiness, and consecutive-frame geometry stability. Universal `networkidle` and fixed readiness sleeps were removed. The preliminary shell assertion in `authenticate()` was removed so it could not consume a second independent timeout budget. Timeout diagnostics include route, phase, expected content, loaders, images, and last geometry. Remaining `setTimeout` calls only enforce the shared deadline and a bounded diagnostic collection timeout. Screenshot capture retains Playwright's animation/caret suppression; interaction behavior is not suppressed.

Six readiness regressions exercise delayed dashboard data, delayed preview image content, a stuck loader, locally served fonts, SPA navigation, and a visible image without a usable source. These tests introduce no external network dependency or production mock path.

The subscription test root cause was a clock mismatch: `createSubscriptionFields()` used its supplied creation instant, while `subscriptionIsUsable()` independently read the system clock. The backend function now accepts optional `now = new Date()` and passes it to the existing domain `isSubscriptionActive()` function. Production call sites omit it and therefore retain current-time behavior. No API, payload, schema, role, duration, or business rule changed.

The tests preserve current semantics: only `ACTIVE` and `TRIALING` are eligible; an expiration instant is exclusive; `null` expiration remains usable only for eligible statuses; invalid dates remain unusable. Trials created at UTC instants in 2026 and 2046 share the same validation instant and assert 14-day expiry at millisecond precision. The default-clock test uses fake time and always restores real timers in `finally`.

### Addendum validation

| Command | Result |
|---|---|
| `pnpm --filter @nivasafe/web test:e2e --output=playwright-results/stage04-e2e-final2` | PASS, 96/96; Chromium on Windows |
| `pnpm --filter @nivasafe/web test:overflow --output=playwright-results/stage04-overflow-final2` | PASS, 108/108; core routes at 390/1280 and critical matrix from 320 to 1920px |
| `pnpm --filter @nivasafe/web test:visual --output=playwright-results/stage04-visual-final2-1` | PASS, 52/52 |
| `pnpm --filter @nivasafe/web test:visual --output=playwright-results/stage04-visual-final2-2` | PASS, 52/52 consecutively; 0.02 threshold and existing baselines |
| `pnpm --filter @nivasafe/web exec playwright test tests/e2e/readiness.spec.ts --project=chromium --output=playwright-results/stage04-readiness-final2` | PASS, 6/6 |
| `pnpm --filter @nivasafe/web lint` and `pnpm --filter @nivasafe/web typecheck` | PASS |
| `pnpm --filter @nivasafe/web test` | PASS, 5 files and 124 tests |
| `pnpm --filter @nivasafe/web build` | PASS; emitted a chunk-over-500KB warning |
| `pnpm --filter @nivasafe/api exec vitest run src/organization-rules.test.ts` | PASS, 12/12 |
| `pnpm --filter @nivasafe/api exec vitest run --maxWorkers=1` | PASS, 23 files and 152 tests |
| `pnpm --filter @nivasafe/domain test` | PASS, 12/12 |
| `pnpm --filter @nivasafe/api lint` and `pnpm --filter @nivasafe/api typecheck` | PASS |
| `pnpm --filter @nivasafe/api build` | PASS |
| `pnpm --filter @nivasafe/api test` | FAIL in one parallel run: 151/152; one AI-provider test timed out |
| `pnpm --filter @nivasafe/api exec vitest run src/ai-provider.test.ts -t "reports configured providers as available"` | PASS, 1 selected test; 18 outside the filter skipped |

One default-parallel invocation of `pnpm --filter @nivasafe/api test` completed 151/152 tests; the remaining test, “reports configured providers as available” in `ai-provider.test.ts`, hit its existing five-second timeout. The isolated test passed, then all 152 backend tests passed with one worker. No timeout was increased and no assertion/test was removed. This was unrelated to subscription logic and is reported rather than hidden.

An exploratory strict TypeScript compilation of raw E2E files, which is not a repository script or project tsconfig, ran with the following command and failed:

```text
node_modules/.bin/tsc.cmd --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --typeRoots ../node_modules/.pnpm/node_modules/@types --types node --lib ES2022,DOM,DOM.Iterable --jsx react-jsx --esModuleInterop tests/e2e/fixtures.ts tests/e2e/readiness.spec.ts tests/e2e/overflow.spec.ts tests/e2e/visual.spec.ts tests/e2e/touch-targets.spec.ts tests/e2e/interaction.spec.ts
```

Diagnostics were in `overflow.ts:171`, `testData.ts:136`, `touch-targets.spec.ts:75`, and `touch-targets.ts:76-77`; no diagnostic was reported in the new readiness helper/spec. Configured frontend lint/typecheck passed, and Playwright executed all browser suites. This exploratory check is not configured by the repository; the reported source diagnostics are outside the current changes.

`git diff --check` passed for changed files, with only Windows line-ending warnings. No remote CI run was performed and no visual PNG baselines were rewritten in Stages 04/05.

## Stage 07 — final local release quality gate

**Status: PASS (local checks only).** This checkpoint reflects the current working tree at base revision `17c0d8b`; earlier stage changes were already uncommitted and were preserved. Date: 2 October 2026 / 10 Mehr 1405.

| Check | Current result |
|---|---|
| `corepack pnpm test` | PASS: domain 12, API 152, frontend 131 (295 total) |
| `corepack pnpm lint`, `corepack pnpm typecheck`, `corepack pnpm build` | PASS across 3 packages; Vite still warns about the 890.20 kB JS chunk |
| `corepack pnpm verify:release` / `corepack pnpm verify:contract` | PASS: 28 release checks; 68 frontend API paths match 121 backend routes |
| `pnpm --filter @nivasafe/web test:e2e` | PASS: 99/99 Chromium tests, Windows |
| `pnpm --filter @nivasafe/web test:overflow` | PASS: 108/108 |
| `pnpm --filter @nivasafe/web test:visual` | PASS: 52/52 at `maxDiffPixelRatio: 0.02` |
| Pinned-pnpm targeted PDF/WebM/dialog regression | PASS: 3/3 using pnpm 10.13.1 |
| Manual strict TypeScript check for all Playwright fixture/spec files | PASS: no diagnostics |
| Scoped FMEA/RULA import graph | PASS: 0 cycles in inspected feature modules |

Stage 07 added browser tests for a local PDF fixture, a Chromium-generated local WebM fixture, object-URL cleanup, modal focus trapping, Escape, background-scroll locking, and focus restoration. The fixture was corrected after an initial recorder-chunk timeout and a later expected-card-count error; the corrected tests and full E2E suite passed. No production source or visual baseline changed in this stage. Representative existing snapshots reviewed: `rula-report-390.png`, `fmea-report-320.png`, and `dashboard-1280.png` under `frontend/tests/e2e/__snapshots__/chromium/visual.spec.ts/`.

One earlier full E2E execution timed out on the RULA report touch-target case at 1920px; the captured page still showed the loading state. The exact case passed when run alone (1/1), and the subsequent full suite passed 99/99. The failure was not reproducible and no deterministic application root cause was isolated; it remains documented as a transient-run stability risk.

The initial timeout's Playwright `error-context.md` is no longer present under `frontend/playwright-results/` after subsequent runs reused the output directory. Final visual runs passed and produced no expected/actual/diff attachment.

Stage 07 test-only files also include `fixtures.ts`, `overflow.ts`, `testData.ts`, `touch-targets.spec.ts`, and `touch-targets.ts`; the standalone strict TypeScript check for all Playwright fixtures/specs passed after small typing corrections. No application code or screenshot baseline was changed by those corrections.

CI configuration was checked statically: push/PR triggers, the Ubuntu quality job, dependent Windows visual job, failure artifact paths, and absence of snapshot-update flags are present. A remote Actions run and branch-protection state were not observed. No live MySQL/API smoke test, deployment, or production request was performed. Physical iOS safe-area behavior and non-Chromium browsers were not tested. No repository YAML validator was installed; workflow validation was static.

The pinned package manager was obtained through a workspace-local Corepack cache. The full local E2E/overflow/visual runs were executed with globally available pnpm 11.19.0 before that; root tests/lint/typecheck/build/release checks and focused browser regressions were then run with pnpm 10.13.1. The lockfile remained unchanged.

A successful `pnpm install --frozen-lockfile` completion was not recorded: the existing dependencies were already available, and the attempted install reached a prompt to replace the current modules directory. No lockfile change was made; this install step is recorded as not completed rather than passed.
