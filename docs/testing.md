# Testing

`pnpm test` runs pure domain tests; `pnpm typecheck`, `pnpm lint`, and `pnpm build` validate all workspaces. Domain coverage includes RPN boundaries, risk classification, bounded/traceable RULA calculation and the canonical phone contract. Phone tests cover Persian/Arabic-Indic digit normalization, the exact `09` + 9 digit shape, length boundaries and rejection of international forms. Integration UAT requires MySQL. Docker checks require Docker Engine, which is not available in every development host.

FMEA process-information coverage includes backend helper tests for catalog-list normalization, structured AI output parsing, bounded prompts/fallback descriptions, AI job-title suggestion parsing/prompting, project-scoped process autofill parsing/prompting and fallback behavior, image-review parsing and confirmation semantics, plus frontend contract tests for the searchable job combobox, shared field styling, explicit AI title-suggestion controls, the enabled/disabled FMEA assistant toggle, editable autofill requests, the three-image upload limit, automatic image review, scoped catalog/suggestion routes, explicit item confirmation and add-new-item controls. The FMEA report helper tests cover summary counts, risk distribution, action-priority ranking and unknown-level fallback; report UI contract tests cover the route, full detail table, manual-action flow and report endpoints. The AI adapter suite covers the configured ArvanCloud AI `GPT-5-Mini` risk route, `DeepSeek-V4-Flash` chat route with bounded conversation history, multimodal image payloads, bounded transient HTTP/network retry, automatic failover to the configured `GPT-5-Mini` model, safe provider metadata and deterministic fallback. Current local verification passed with 97 frontend tests, 123 backend tests and 12 shared-domain tests; frontend/backend typecheck, lint, production build, API-contract and release-integrity verification also pass. Corrective-action suggestion coverage verifies non-empty deterministic FMEA/RULA fallback output, server-owned row/part mapping, GPT-5-Mini routing and registered-action de-duplication. Dependency audit completed with no known production vulnerabilities. Clean migration execution is NOT_RUN on this workstation because MySQL is not listening at 127.0.0.1:3306.
The process-suggestions regression coverage also verifies that catalog suggestions remain available without an automatic generic AI request on job selection, the board exposes an explicit AI request control, the control changes to **Get new suggestions** after a response, and each equipment/materials/controls category is capped at six displayed items. Backend helper coverage verifies the generic process-suggestion prompt and parser enforce the six-item AI limit.

Global administration regression tests cover the `SUPER_ADMIN` authorization boundary, self-lockout prevention, last-active-global-admin protection and the restriction that organization administrators cannot change global account levels. Authenticated admin UI/API smoke verification requires a running MySQL instance.

Assistant/admin invitation regression coverage verifies the bounded `ASSISTANT` permission set, the organization member role list, the global-admin invitation role list, and the localized member invitation UI. The backend continues to enforce that only a global administrator can invite or assign `SUPER_ADMIN`; organization administrators remain tenant-scoped.

Onboarding regression tests cover the localized default project, the stable `DEFAULT` project code, restoration of a soft-deleted starter and the mapping of personal versus organization registration details. The registration flow passes the workspace inputs to the API and does not issue a second best-effort project request; the API creates the workspace and project atomically. The project route protects the starter from deletion while still allowing its editable content to be maintained.

Multi-company regression coverage verifies independent subscription fields and production payment gating, membership-only organization switching, authenticated company creation, the automatic `ORG_ADMIN` membership and localized starter project, duplicate-submit protection, and the production-only rejection of local checkout simulation. Full route isolation remains enforced by the existing tenant-scoped query and link-validation checks; a live multi-company HTTP smoke test is `NOT_RUN` when no local API/database is running.

## AI integration smoke test

With the API running and an organization-scoped test account, verify that `GET /api/v1/ai/providers` reports ArvanCloud AI as available with `GPT-5-Mini` for risk analysis, `GPT-5-Mini` as its automatic risk fallback, and `DeepSeek-V4-Flash` for chat. Then submit one `POST /api/v1/ai/requests` request without an explicit provider and one chat message; both must return non-empty responses through the API server. The provider catalog and short provider smoke requests were checked through `GET https://api.arvancloudai.ir/v1/models` and `POST /v1/chat/completions`; both configured model identifiers were accepted. API keys must remain in ignored environment files and must not be printed in test output.

## ذخیره خودکار فرم‌ها

فرم‌های عملیاتی سازمان، پروژه، فرایند، فعالیت، اقدام اصلاحی، پایگاه دانش، فایل، پروفایل، اعضا، دعوت، گفت‌وگو و تحلیل هوش مصنوعی با `AutoSaveForm` روی هر رویداد `input` و `change` در فضای محلی کاربر ذخیره و با بازگشت به صفحه بازیابی می‌شوند. فرم‌های ثبت ارزیابی FMEA و RULA نیز با هر تغییر، snapshot کامل فرم را به‌صورت هم‌زمان در localStorage و با صف ترتیبی در IndexedDB ذخیره می‌کنند تا قطع برق، refresh یا قطع موقت شبکه باعث از دست رفتن حتی یک نویسه نشود؛ draft آفلاین پس از اتصال قابل همگام‌سازی است.

رمزهای عبور، توکن‌های بازیابی و فایل‌های باینری عمداً هرگز در پیش‌نویس ذخیره نمی‌شوند و پس از ثبت موفق، پیش‌نویس همان فرم پاک می‌شود.

## Playwright browser tests

مرورگرهای Playwright برای آزمون‌های مرورگری نصب می‌شوند و داده‌های آزمون از طریق route interception در `frontend/tests/e2e/fixtures.ts` پاسخ داده می‌شوند. نشست و داده‌های موجود در `frontend/tests/e2e/testData.ts` کاملاً ساختگی هستند؛ هیچ رمز عبور واقعی، کلید دسترسی یا حالت آزمون در مسیر production استفاده نمی‌شود.

From the repository root, the pinned Playwright dependency is installed with the frozen pnpm lockfile. Install its matching Chromium once with `pnpm --filter @nivasafe/web run playwright:install:chromium`. Run interaction E2E tests with `pnpm --filter @nivasafe/web test:e2e`, the visual suite with `pnpm --filter @nivasafe/web test:visual`, and overflow checks with `pnpm --filter @nivasafe/web test:overflow`.

The visual matrix covers login/register, the authenticated shell, FMEA and RULA lists, editors and reports, administration, actions, files, knowledge, notifications, members, profile and activity log at phone, tablet and desktop widths, with representative Persian/RTL, English/LTR and theme variants. Animations, caret rendering, dates, service-worker state and API responses are stabilized by the test fixture. Every screenshot assertion uses the Playwright-wide `maxDiffPixelRatio: 0.02`; there are no per-assertion pixel allowances, masks, or custom pixel thresholds. The project pins `@playwright/test` 1.56.1 in `pnpm-lock.yaml`; the `chromium` project uses Playwright's matching Chromium, `fa-IR`, `Asia/Tehran`, CSS-pixel screenshots, and device scale factor 1. The app requests Vazirmatn from Google Fonts and declares Vazir, Tahoma and Segoe UI fallbacks. In browser tests only, the Google Fonts stylesheet and Vazirmatn subset requests are fulfilled from the same versioned font files under `frontend/tests/e2e/assets/`; this removes external CDN availability from rendering without changing the production font stylesheet or shipped assets. The tracked snapshots are verified in the current Windows workspace, so the visual job uses `windows-latest` to match the baseline OS and reduce system-font/rasterization drift. The Ubuntu quality job continues to run interaction and overflow suites. The Windows visual job runs on every push and pull request after the Ubuntu quality job succeeds. Visual comparisons are read-only in CI: a missing baseline or unexpected pixel difference returns a failing test status.

All browser navigation and visual capture setup uses `waitForPageReady()` in `frontend/tests/e2e/fixtures.ts`. It has one 12-second overall budget shared across route/content, visible application loaders and busy regions, `document.fonts.ready`, visible image completion/decode, and post-render font readiness. It validates the requested pathname/query, requires a meaningful visible route heading (or explicit expected content for a state such as file preview), and checks the main content/overlay/document geometry across consecutive animation frames. It does not wait for universal `networkidle`, which could be blocked by polling or other persistent connections. Failures include the route, expected content, phase, visible loaders/images, and latest geometry. Broken visible fixture images fail with their source URL instead of being ignored. Tests that exercise delayed API data or preview content use controlled route gates; no arbitrary sleep is used for readiness.

Visual output paths are `frontend/playwright-results/` (attachments, expected/actual/diff images and failure traces) and `frontend/playwright-report/` (HTML report). The CI jobs use `actions/upload-artifact@v7` to upload these paths on failure for seven days; missing paths are ignored when a failure occurs before Playwright starts. Generated reports are git-ignored.

Snapshot changes are explicit development changes and must be reviewed image-by-image. For a narrowly selected baseline, use the visual test's title in the grep expression, for example:

```text
pnpm --filter @nivasafe/web test:visual:update --grep "@visual.*fmea-report-390"
```

To intentionally update the complete visual suite, use `pnpm --filter @nivasafe/web test:visual:update`. Inspect the PNG changes and failure attachments under `frontend/playwright-results/` before including them. CI never passes `--update-snapshots` and does not generate or replace baselines. For a failed CI run, download the `playwright-visual-diagnostics-Windows` artifact and open `playwright-report/index.html`; expected/actual/diff screenshots and traces are also included.

## Automated overflow and viewport-escape checks

`pnpm --filter @nivasafe/web test:overflow` runs the Playwright `@overflow` suite. The suite checks both document-level invariants (`documentElement.scrollWidth` and `body.scrollWidth`) and a visible-element scan that reports the selector/path, bounding rectangle, computed overflow/position/white-space/min/max width and a short text sample for every escape. The tolerance is two CSS pixels for browser rounding only.

The route matrix covers login, registration, dashboard, projects, choose-path, FMEA list/register/report, RULA list/analysis/report, actions, files, knowledge, assistant, notifications, members, administrator, organizations, activity log, profile and health. All routes are exercised at 390px and 1280px; critical shell/report/register surfaces additionally cover 320, 360, 390, 430, 480, 768, 1024, 1280, 1440 and 1920px, including 360x640 and tablet landscape dimensions.

Dynamic checks reopen the mobile drawer, portalized theme/language menus, StyledSelect, confirmation/detail dialogs, login validation, expanded activity/report details, file preview, English/LTR and white-theme states. Long synthetic Persian/English values, identifiers and filenames are served from `frontend/tests/e2e/testData.ts`.

The explicit allowlist is intentionally narrow: the closed off-canvas `#app-sidebar` and descendants of a bounded `.table-wrap`/`[data-overflow-container="horizontal"]` scroller at widths of at least 768px. The scroller itself must fit the viewport, and any horizontal scroller below 768px fails the test; table scrolling therefore remains local to dense tablet/desktop data surfaces and is not used to mask phone overflow. CI runs `test:overflow` after the ordinary interaction E2E suite and retains Playwright failure artifacts without updating snapshots. A separate Windows job runs `test:visual` after the complete Ubuntu quality job; its nonzero Playwright exit status fails the workflow.

## CSS architecture and release verification

The source stylesheet is a compatibility entry point only. The ordered modules under `frontend/src/styles/` are imported by `styles/index.css`; feature-specific FMEA/RULA rules are under `styles/features/`, and shared tokens, layout, controls, forms, tables, overlays, themes and print behavior have explicit ownership. The architecture contract in `frontend/src/ui-rules.test.ts` checks that the entry point and import order remain intact and that removed overflow workarounds and universal table `nowrap` rules do not return.

The final CSS cleanup gate is run without updating visual baselines:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @nivasafe/web test:e2e
pnpm --filter @nivasafe/web test:visual
pnpm --filter @nivasafe/web test:overflow
```

On Windows hosts where the repository `pnpm` wrapper cannot create its temporary files, use the equivalent direct workspace binaries and record the wrapper failure as an environment limitation. Visual snapshot updates remain an explicit local command and are never part of CI.
