# NIVASafe Debug Phase 02: RULA Vision and Support Tickets

| Field | Value |
|---|---|
| Project | NIVASafe |
| Report type | Technical delivery and handoff |
| Language | English with Persian summary |
| Gregorian date | 2026-10-16 |
| Jalali date | 1405-07-24 (24 Mehr 1405) |
| Baseline revision | `e5bf3f0` |
| Delivery state | Support flow verified in isolated staging; RULA live provider verification blocked; no production deployment |

## Executive result

The support-ticket failure was reproduced and corrected in source. The existing support inbox can use the active protected system administrator when the optional operator allowlists are absent; access stays organization-scoped and audited. An ordinary support user and the operator completed ticket creation, replies, status/priority/assignment changes, reload, and notification checks against isolated MariaDB staging and the browser UI.

RULA image analysis remains blocked. Production vision/privacy approval is not configured. In isolated staging, all application authentication, organization, quota, consent, file-signature, and provider-capability gates passed for one synthetic image, but the configured ArvanCloud gateway rejected the credential with HTTP 401. The API returned a sanitized unavailable error and persisted no score. No fallback score was fabricated and no production approval was enabled.

## Findings and changes

### RULA image flow

- The UI and API consent gate, ordinary-member authorization, quota, image MIME/signature validation, vision capability check, provider request, error mapping, and no-result-on-provider-failure behavior were traced.
- The configured risk-image gateway is ArvanCloud at its chat-completions route. The model catalog named the exact IDs `GPT-5-Mini` and `DeepSeek-V4-Flash`; a catalog entry alone does not establish that this credential can invoke vision or structured output.
- One bounded multimodal request using `frontend/test-fixtures/rula-ai-synthetic.png` reached the gateway and received HTTP 401. Sanitized request ID: `b8e12c19-f17b-4c7a-9cdd-875209157873`. The application returned HTTP 503 `RULA_IMAGE_AI_UNAVAILABLE`, `retryable:false`; no posture score/result was stored.
- Negative checks passed: unauthenticated request 401, missing image consent 403, read-only viewer 403, and invalid image signature 415.
- Production vision/privacy gates remain closed. No actual customer or patient image was transmitted.

### Support tickets

- Root cause: production PM2 configuration has neither `SUPPORT_OPERATOR_USER_IDS` nor `SUPPORT_OPERATOR_ORGANIZATION_IDS`, while the old inbox policy failed closed with 503.
- `backend/src/modules/support.ts` now recognizes an active, database-confirmed `SUPER_ADMIN` with `protectedSystemAdmin: true` as a support operator when optional allowlists are absent. Ticket lookup, replies, assignment, and audit writes remain scoped to the organization selected by the authenticated session. Internal notes remain hidden from requesters. Unlisted administrators remain denied.
- `backend/src/support.test.ts` adds policy, authorization, privacy, and lifecycle regression coverage.
- API + isolated MariaDB journey passed: create 201, identical idempotent replay 200, conflicting key 409, member and operator replies 201, status/priority/assignment update 200, staff list, reload persistence, notification creation, internal note hidden from member, cross-organization lookup 404, unauthenticated request 401, unlisted operator 503 under empty policy, and protected-operator inbox in a second organization 200.
- Browser journey passed against the staged UI: member created and reopened a ticket; protected operator found it in the existing admin inbox, replied, updated status/priority/assignment, and reloaded; member saw the reply and replied; reload retained the thread. Three reply notifications were returned. No browser console errors were captured.

### Windows build environment

`frontend/vite.config.ts` now disables repository `.env` discovery for production, test, and CI. This addresses the observed EPERM at `C:\NIVASafe\.env` without changing ACLs or exposing values. The production Vite build succeeded in the isolated workspace.

## Verification evidence

| Check | Result |
|---|---|
| `pnpm --version` | PASS, 10.13.1 |
| `pnpm install --frozen-lockfile` in isolated workspace | PASS, exit 0 |
| `pnpm build` with `CI=true VITE_API_URL=/api/v1` | PASS, exit 0; existing large-chunk advisory |
| `pnpm test` | PASS, exit 0; 737 tests / 111 files (web 322, API 403, domain 12) |
| `pnpm lint` | PASS, exit 0; repository script runs TypeScript no-emit, not ESLint |
| `pnpm typecheck` | PASS, exit 0 |
| `node scripts/check-api-contract.mjs` | PASS, exit 0; 90 frontend paths / 154 backend routes |
| `node scripts/verify-release.mjs` | PASS, exit 0; 28 checks |
| Focused support module tests | PASS, 20/20; the exact invocation was not retained in the sanitized command log |
| `node scripts/phase02-support-e2e-run.mjs` | PASS, exit 0; isolated API + MariaDB journey above |
| Browser support workflow | PASS; staged Chromium-based Codex browser, existing `/support` and `/admin` routes, reload and notifications verified |
| `node scripts/phase02-api-e2e.mjs` | BLOCKED at live-provider gate, exit 1 after upstream HTTP 401; no result stored |
| Disposable Prisma migration chain | BLOCKED after eight migrations: MySQL 1060 duplicate `globalRole`; three historical source checksums differ from production |
| `git diff --check` | PASS, exit 0; existing LF/CRLF conversion warnings only |
| WebKit/Safari/iOS | NOT RUN; no WebKit/native Safari session was available |
| Application-level chat and FMEA image provider flows | BLOCKED / NOT RUN; no credential accepted by the configured risk gateway was available for end-to-end verification |
| Debug plugin callable tools | NOT AVAILABLE; source, API, isolated database, and browser diagnostics were used instead |

The isolated static schema was loaded into a disposable MariaDB database (37 tables); this does not prove the historical migration chain is reproducible. No production migration, `db push`, seed, or smoke command was run.

## Changed files

- `backend/src/modules/support.ts`
- `backend/src/support.test.ts`
- `frontend/vite.config.ts`
- `project-state.json`
- `reports/customer-report.fa.md`
- `reports/customer-report.en.md`
- `reports/technical-report.fa.md`
- `reports/technical-report.en.md`

The repository already contained extensive unrelated modifications and untracked work. Those were preserved; this phase did not reset or clean the tree.

## Production and rollback state

No production source, frontend deployment, PM2 process, IIS configuration, database, account, privacy gate, or user upload was changed. The working-tree edits are not deployed. A dated backup was created at `C:\ProgramData\NIVASafe\backups\debug-phase02-20261016T133843Z`; it contains source/config/upload and database snapshots. Its manifest records database restore verification as pending, so a verified restore has not been claimed. No production rollback was required because there was no production change.

## Required actions to close the blockers

1. Supply an ArvanCloud credential with the correct model entitlement and a test account authorized for synthetic vision testing. Repeat one bounded synthetic request through the authenticated staging API and verify structured parsing, persistence, reload, and report rendering before enabling any production vision gate.
2. Confirm the database-backed `protectedSystemAdmin` designation for the intended system administrator, or configure explicit support operator user and organization allowlists. The source fallback remains narrow and tenant-scoped.
3. Reconcile the historical Prisma migration baseline/checksums in a disposable copy before attempting a reviewed forward migration or deployment.
4. Run a real WebKit test when a WebKit-enabled browser host is available. Chat and FMEA provider tests require a credential accepted by their configured endpoints.

## Phase 03 handoff

- RULA reproduction: use an ordinary authenticated staging member; upload the permitted synthetic fixture; set per-image consent; ArvanCloud receives the request but answers 401; application surfaces `RULA_IMAGE_AI_UNAVAILABLE`, request ID `b8e12c19-f17b-4c7a-9cdd-875209157873`; no result persists. Obtain a credential with confirmed entitlement before continuing. Keep production image approval closed until the full real flow passes.
- Support reproduction: with operator allowlists absent, the previous route failed 503. The current source allows only a verified active protected system administrator and keeps each inbox query within the selected organization. Re-run the documented ticket journey after deployment; verify the protected admin flag and notification delivery in production-like configuration.
- Migration prerequisite: current source/production histories conflict at `202608240002_global_role` (duplicate column) and three checksums differ. Do not apply the chain to production before an explicit baseline reconciliation and disposable rehearsal.
- Build prerequisite: preserve `envDir: false` for production/test/CI to avoid the protected `.env` EPERM; production build passed in the isolated workspace.

---

# خلاصهٔ فارسی

| مورد | وضعیت |
|---|---|
| تاریخ میلادی | ۲۰۲۶-۱۰-۱۶ |
| تاریخ شمسی | ۱۴۰۵-۰۷-۲۴، ۲۴ مهر ۱۴۰۵ |
| نسخهٔ مبنا | `e5bf3f0` |
| تحویل | پشتیبانی در staging ایزوله تأیید شد؛ تحلیل زندهٔ تصویر RULA به‌دلیل پاسخ ۴۰۱ سرویس‌دهنده مسدود است؛ هیچ تغییری در production منتشر نشد. |

## نتیجه

علت خرابی صندوق پشتیبانی، نبودن هر دو allowlist اپراتورها در تنظیمات PM2 بود. کد فعلی در نبود allowlist فقط به مدیر ارشد سیستم فعال و تأییدشده در پایگاه داده اجازهٔ دسترسی می‌دهد و درخواست‌ها را در سازمان انتخاب‌شده محدود و ممیزی می‌کند. ایجاد درخواست، پاسخ عمومی مدیر و کاربر، تغییر وضعیت/اولویت/مسئول، بارگذاری مجدد، اعلان‌ها، محرمانه‌ماندن یادداشت داخلی و جداسازی سازمان در API، MariaDB آزمایشی و رابط مرورگر staging بررسی شد.

تحلیل تصویر RULA هنوز قابل تأیید نیست. در production مجوزهای تحلیل تصویر تنظیم نشده‌اند و بسته مانده‌اند. یک درخواست محدود با تصویر مصنوعی در staging پس از عبور از احراز هویت، سازمان، سهمیه، رضایت اختصاصی تصویر، اعتبارسنجی امضا و قابلیت سرویس، به درگاه ArvanCloud رسید ولی با HTTP 401 رد شد. شناسهٔ درخواست پالایش‌شده `b8e12c19-f17b-4c7a-9cdd-875209157873` است. برنامه خطای امن `RULA_IMAGE_AI_UNAVAILABLE` را برگرداند و امتیاز یا نتیجه‌ای ذخیره نکرد.

## تغییرات و شواهد

- `backend/src/modules/support.ts`: دسترسی مدیر سیستم محافظت‌شده در صورت خالی‌بودن allowlist؛ دسترسی همچنان سازمان‌محدود، ممیزی‌شده و بدون افشای یادداشت داخلی است. سایر مدیرانِ ثبت‌نشده همچنان رد می‌شوند.
- `backend/src/support.test.ts`: آزمون‌های بازگشت برای مجوز، حریم خصوصی و چرخهٔ درخواست پشتیبانی.
- `frontend/vite.config.ts`: جلوگیری از خواندن `.env` محافظت‌شدهٔ مخزن در build، test و CI.
- build، typecheck، lint، ۷۳۷ آزمون، بررسی قرارداد ۹۰ مسیر فرانت و ۱۵۴ route بک‌اند و ۲۸ بررسی انتشار موفق شدند.
- آزمون کامل پشتیبانی با API و MariaDB ایزوله موفق شد؛ گردش مرورگر نیز در مسیرهای موجود `/support` و `/admin` بدون خطای کنسول بررسی شد.
- زنجیرهٔ migration آزمایشی پس از ۸ migration با خطای MySQL 1060 برای ستون تکراری `globalRole` متوقف شد و سه checksum تاریخی با production تفاوت دارند.
- WebKit/Safari/iOS اجرا نشد. آزمون برنامه‌ای chat و تحلیل تصویر FMEA با اعتبارنامهٔ پذیرفته‌شده ممکن نشد. ابزارهای callable افزونهٔ Debug در این نشست موجود نبودند.

هیچ فایل production، سرویس PM2، پیکربندی IIS، پایگاه داده، حساب، مجوز حریم خصوصی یا تصویر کاربر تغییر نکرد. backup تاریخ‌دار در `C:\ProgramData\NIVASafe\backups\debug-phase02-20261016T133843Z` موجود است؛ تأیید restore پایگاه داده هنوز pending است. برای رفع blocker RULA، اعتبارنامهٔ دارای مجوز مدل از درگاه واقعی لازم است؛ تا تأیید جریان کامل مصنوعی، مجوز تحلیل تصویر production باید بسته بماند.
