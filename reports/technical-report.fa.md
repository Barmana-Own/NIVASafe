# رضایت تصویر، تطبیق مدل و انتشار امن NIVASafe

| Field / مشخصه | Value / مقدار |
|---|---|
| Project | NIVASafe |
| Type | Technical |
| Language | فارسی |
| Gregorian | 2026-10-19 |
| Jalali | 1405-07-27 |
| Release | release-rula-image-experience-20261019-01 |
| Revision | e5bf3f050bd6e127e13918c8d3eefcd3f8376acf; preserved dirty working tree |
| Delivery | CODE DEPLOYED; LIVE IMAGE DISABLED; provider acceptance PARTIAL |

## دامنه و علل مشاهده‌شده

هندسه، تحلیل سمت‌ها، نسخه‌های تاریخی امتیاز و بازبینی انسانی R6/R7/R8 حفظ شد؛ بهینه‌سازی دقت یا مدل دوم انجام نشد. کارت مشترک و ویرایش هر تصویر جای متن‌ها، نام فایل تکراری و باکس بزرگ ادامهٔ دستی را گرفت؛ نقش، اشتراک، سهمیه، جداسازی سازمان و کنترل فایل حفظ شد.

۱. ارسال production پیش از ارائه‌دهنده به دلیل نبود تأیید واقعی حریم خصوصی سطح پلتفرم متوقف بود. تنظیم‌های مؤثر همچنان خالی‌اند؛ allowlist سازمانی یا تأیید ساختگی اضافه نشده است.
۲. درخواست GPT-5-Mini در درگاه احرازشده HTTP200 با نام openai/gpt-5-mini برگشت؛ تطبیق نام مدل در برنامه آن را پیش از parser پوسچر رد می‌کرد: AI_MODEL_MISMATCH و503 داخلی. آزمون قرمز/سبز این خطا را ثابت کرد؛ فقط همین نام دقیق برای Arvan و خانوادهٔ درخواستی پذیرفته شد. مدل واقعی برگشتی حفظ می‌شود؛ مدل/endpoint درخواستی یا fallback عوض نشده و چت همچنان DeepSeek است. نام ساده و snapshot قبلی پذیرفته‌اند؛ خانواده، namespace و پسوند غیرمجاز و جایگزینی مدل چت رد می‌شوند.
۳. دو فراخوانی تصویر در مهلت۱۲۰ثانیه بدون پاسخ HTTP ارائه‌دهنده متوقف شدند؛ علت تأخیر بالادست UNKNOWN است. درخواست‌های۴/۵/۶ نسخهٔ نهایی HTTP200، خروجی معتبر و ذخیره‌شدنی داشتند؛ هیچ نتیجهٔ دقت آناتومیک از HTTP استنتاج نشده است. این سه پاسخ معتبر به502 داخلی تبدیل نشدند.
۴. اجرای کامل مرورگر در انتظار networkidle هنگام بازخوانی گزارش متوقف شد؛ تولید و retry موجودِ پیشنهاد متنی RULA ادامه داشت. سقف۱۰ تماس رعایت شد؛ پاسخ آخرین تماس متنی پیش از خاموشی آزمون مشاهده نشد و UNKNOWN است، نه429/503 ساختگی. اجرای اصلی FAIL حفظ شد. بازکردن واقعی دو گزارشِ ذخیره‌شده و GET/PDF سپس بدون ارائه‌دهنده موفق بود و جدا ثبت شد؛ BOTH سازمان دوم و تکرار RIGHT مستقل کامل نشدند.

## معماری رضایت و حریم خصوصی

نسخهٔ اطلاعیه rula-image-consent-2026-10-19-v1 نامعلوم‌بودن شروط اختصاصی درگاه و بسته‌بودن ارسال عمومی را می‌گوید. عکس جدید یا تغییر سازمان رضایت قبلی را باطل می‌کند؛ ثبت‌نام و بازیابی پیش‌نویس رضایت نیست. نبود/قدیمی‌بودن نسخه با403 و خطای ثبت audit مانع ارسال‌اند. AuditLog موجود پیش از نرمال‌سازی و فراخوانی خارجی، کاربر/سازمان/زمان سرور/requestId، مدل/هدف/سمت/زبان و SHA256 فایل اصلی را ثبت می‌کند. شش سابقهٔ مصنوعی وجود دارد؛ عکس، نام فایل، پرامپت کامل، JWT و کلید در این رویداد ذخیره نمی‌شوند. schema و وابستگی عوض نشده‌اند. پیش از فعال‌سازی، اطلاعیه باید مطابق شرایط واقعی نسخهٔ جدید بگیرد.

[سیاست رسمی](https://www.arvancloud.ir/en/legal/privacy-policy)، [شرایط رسمی](https://www.arvancloud.ir/en/legal/terms) و [DPA](https://www.arvancloud.ir/en/legal/data-processing-agreement) بررسی شدند؛ انطباق قراردادی و شرایط اختصاصی نگهداری/آموزش/محل/حذف تصاویر همین حساب API اثبات نشده است. حکم حقوقی عمومی صادر نشده. تصمیم‌های واقعی و متن دقیق تأیید در docs/legal/rula-image-platform-approval.2026-10-19.md است؛ رضایت بارگذار جای اختیار ارسال عکس دیگری را نمی‌گیرد.

## پذیرش واقعی

| مورد | نتیجه |
|---|---|
| SOURCE FIXED | PASS؛۲۰ فایل برنامه/آزمون، probe و تغییر مجاز تنظیم انتشار |
| STAGING IMAGE E2E | PARTIAL؛ LEFT سازمان B و تصاویر BOTH سازمان A با ویرایش انسانی/ذخیره/ورود مجدد/GET/گزارش/PDF گذشت؛ اجرای پیوسته FAIL |
| بازبینی و tampering | PASS؛ نهایی‌سازیِ بازبینی‌نشده400؛ بدون زاویهٔ ساختگی |
| مسیر دستی با دروازهٔ بسته | PASS؛۲ سازمان عادی،۳۹۰/۱۲۸۰،ذخیره/بازکردن/PDF/رد دسترسی متقاطع،بدون ارائه‌دهنده |
| بودجه |۱۰ از۱۰؛۶ تلاش تصویر و۴ تلاش متن خودکار گزارش؛ تاریخچه حفظ شد |
| مدل | درخواست GPT-5-Mini؛ پاسخ GPT-5-Mini،gpt-5-mini-2025-08-07،openai/gpt-5-mini؛ چت DeepSeek-V4-Flash فقط محلی/تنظیم واقعی بررسی شد |
| انتساب کل مصرف حساب Arvan | UNPROVED؛ export/dashboard نداریم؛ فقط timestamp/model/requestId/fingerprint/origin این اجرا ثبت شد |
| CODE DEPLOYED | PASS؛۲۳ هش عمومی،health200/DBup،۸ رد401 ناشناس و Chrome عمومی۳۹۰/۱۲۸۰ بدون خطای JS/API |
| LIVE VISION ENABLED | خیر؛دو پرچم مؤثر PM2 خالی‌اند |
| دقت آناتومیک | تأیید مستقل ندارد؛ بهینه‌سازی متوقف است |

## امنیت، حفظ پروژه و کار باقی‌مانده

در دامنهٔ تغییر، نقص امنیتی مادیِ شناخته‌شدهٔ معرفی‌شده باقی نماند: رضایت پیش از ارسال، audit پایدار، کنترل دسترسی/فایل، diagnostic محدود، allowlist مدل و متن escapeشده بررسی شدند.۴۲۲ قرارداد ستون در۳۷ جدول production/staging فقط‌خواندنی برابر بود؛ رکورد کاربران production خوانده یا تغییر داده نشد؛ migration/تغییر upload/بازگردانی DB انجام نشد.۶۸ فایل کد/خروجی برای کلیدهای تنظیم‌شده و private key بررسی شدند. وابستگی تغییر نکرد؛ اسکن جدید advisory وابستگی NOT_RUN است. کارهای قبلی، routeها، قابلیت‌ها، نسخهٔ امتیاز و assetها حفظ شدند؛ فقط متن/کنترل‌های تکراریِ خواسته‌شده حذف شدند، نه پشتیبانی یا بازبینی دستی.

خطاهای اولیهٔ harness شامل کپی‌نبودن fixture/config ایزوله، strict typing تست، locator عنوانِ ترکیبی، مسیر خروجی شواهد، ترتیب فیزیکی ستون schema و انتظار networkidle ثبت و اصلاح شدند؛ تست برنامه برای پنهان‌کردن خطا حذف یا ضعیف نشد. هشدار قدیمی PM2 دربارهٔ wmic ENOENT مانع health و تمرین rollback نشد.

پیش از فعال‌سازی تصویر: رکورد واقعی مجوز ارائه‌دهنده/پلتفرم تکمیل، اطلاعیه نسخه‌گذاری، و پایداری ارائه‌دهنده و BOTH سازمان دوم در بودجهٔ مشخص بررسی شود. این آزمون‌های فنی عادی پس از مجوز واقعی نیازمند اجازهٔ تکراری مالک نیستند. تماس پولی دیگری در این کار انجام نشد.

## Validation commands / دستورات اعتبارسنجی

| Package | Executed command | Exit |
|---|---|---|
| frontend | `corepack pnpm run test` | 0 |
| frontend | `corepack pnpm run typecheck` | 0 |
| frontend | `corepack pnpm run lint` | 0 |
| frontend | `corepack pnpm run build` | 0 |
| shared/domain | `corepack pnpm run test` | 0 |
| shared/domain | `corepack pnpm run typecheck` | 0 |
| shared/domain | `corepack pnpm run lint` | 0 |
| shared/domain | `corepack pnpm run build` | 0 |
| backend | `corepack pnpm run test` | 0 |
| backend | `corepack pnpm run typecheck` | 0 |
| backend | `corepack pnpm run lint` | 0 |
| backend | `corepack pnpm run build` | 0 |

API contract:93 frontend paths/155 backend routes; exit0. Release verifier:29 checks; exit0. Test totals:638 backend/69files,435 frontend/62files,19 domain/2files;1092 unique tests. See validation.json,validation-backend-r2.json,contracts-r2.json and individual logs. Existing Vite chunk-size warning remains non-blocking.

## Changed files / فایل‌های تغییرکرده

| Path | Change |
|---|---|
| `frontend/src/features/assessments/AssessmentPages.tsx` | Modified |
| `frontend/src/features/assessments/rulaImageAnalysisPolicy.test.ts` | Modified |
| `frontend/src/features/assessments/rulaImageAnalysisPolicy.ts` | Modified |
| `frontend/src/features/assessments/rulaImageConsent.ts` | Added |
| `frontend/src/features/assessments/RulaImageConsentDialog.test.tsx` | Added |
| `frontend/src/features/assessments/RulaImageConsentDialog.tsx` | Added |
| `frontend/src/features/assessments/RulaPostureImageCard.test.tsx` | Added |
| `frontend/src/features/assessments/RulaPostureImageCard.tsx` | Added |
| `frontend/src/i18n.test.ts` | Modified |
| `frontend/src/i18n.tsx` | Modified |
| `frontend/src/styles/assessments.css` | Modified |
| `backend/src/ai-provider.test.ts` | Modified |
| `backend/src/ai-provider.ts` | Modified |
| `backend/src/assessment-routing-policy.test.ts` | Modified |
| `backend/src/image-analysis-diagnostics.test.ts` | Modified |
| `backend/src/image-analysis-diagnostics.ts` | Modified |
| `backend/src/modules/assessments.ts` | Modified |
| `backend/src/rula-image-consent.ts` | Added |
| `backend/src/rula-registered-member.test.ts` | Modified |
| `backend/src/rula-three-stage.test.ts` | Modified |
| `scripts/probe-efficient-vision-model.mjs` | Exact Arvan response namespace, no request/endpoint change |
| `deployment/ecosystem.config.cjs` | Authorized API entry/version cutover only; gates/worker preserved |

Legal documents: docs/legal/rula-image-processing-review.2026-10-19.md; docs/legal/rula-image-platform-approval.2026-10-19.md; docs/rula-image-platform-access.md. Release scripts: scripts/releases/rula-image-experience-20261019-01/{backup-protected-config.ps1,prepare.mjs,rehearse.mjs,release.mjs}. Required stage documents, state, manifest, integrity and dated reports updated; unrelated source, schemas, assets and dependencies preserved.

## Artifact identity / هویت نسخه

- Backend/frontend release: release-rula-image-experience-20261019-01; staging marker rula-image-experience-20261019-01-r2; PID8960, SYSTEM, NIVASafe-API scheduled task/PM2; API listener127.0.0.1:5044.
- Backend entry: C:\ProgramData\NIVASafe\releases\release-rula-image-experience-20261019-01\backend\dist\server.js
- Frontend root: C:/inetpub/nivasafe/app-com; index SHA256: 1d18d2d8266449731a5ff883705542adac5503db0ed65259b61d3294ee24bcf2
- Compiled module hashes: C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01/runtime-after.json; C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01/prepared.json. Source hashes: C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01/scope-security-integrity.json.
- Backup: C:/ProgramData/NIVASafe/backups/release-rula-image-experience-20261019-01; protected .env and runtime rollback state access remains SYSTEM/Administrators only.
- Rollback: `C:\Runtime\node\node.exe C:\NIVASafe\scripts\releases\rula-image-experience-20261019-01\release.mjs rollback`; guarded code/config/index restore, no data rollback. Actual old/new/old service rehearsal and static swap passed before cutover.

## Stage reconciliation / مراحل در دامنهٔ انتشار امن

| Stage | Status | Observable work |
|---|---|---|
| 01 | PASS (code-only scope) | Public access means all eligible memberships after one actual platform approval, explicit informed image consent, no fabricated provider approval and no anatomical optimization. Source baseline and old release preserved. |
| 02 | PASS (code-only scope) | Compact image cards retain per-image edit/remove/retry and controlled status. Filename duplication, support link inside each card and giant fallback block intentionally replaced. Versioned bilingual disclosure is in a separate consent dialog; mobile/desktop and RTL/LTR verified. |
| 03 | PASS (code-only scope) | Shared RulaPostureImageCard, RulaImageConsentDialog and typed notice added; new image batches/tenant changes clear consent.435 tests, typecheck/lint/build and16 component browser states passed. |
| 04 | PASS (code-only scope) | Current consent version required and durable actor/tenant-bound audit receipt awaited before provider dispatch. Exact authenticated Arvan response alias openai/gpt-5-mini accepted only for the configured GPT-5-Mini family; request model and endpoint unchanged.638 backend tests passed. |
| 05 | PASS (code-only scope) | Existing AuditLog JSON stores consent version, selected-upload fingerprint and request identity. No schema/migration required. Production/staging422 column contracts across37 tables equal using read-only information_schema; no production records read/written. |
| 06 | PASS (code-only scope) | Image multipart adds imageAnalysisConsentVersion; missing/outdated versions403. Existing paths preserved:93 frontend paths/155 backend routes. Genuine final-candidate3 image requests parsed;2 provider-derived assessments saved/reopened/PDF. |
| 07 | PASS (code-only scope) | Existing server-side membership/role/subscription/quota/tenant checks preserved. Two ordinary-user organizations tested; unauthorized401, consent403, invalid file415, unreviewed finalization400 and cross-organization404. No per-organization image allowlist. |
| 08 | PASS (code-only scope) | Default-unchecked consent, audit-failure dispatch denial, safe response identity allowlist, escaped UI and existing file/auth gates verified. Configured-secret/private-key scan68 files PASS; protected rollback config remains SYSTEM/Administrators only. No dependencies or security controls weakened. |
| 09 | PASS (code-only scope) | 1092 unique tests passed:638 backend,435 frontend,19 domain. Twelve applicable package checks exit0;93/155 contract and29 release checks exit0. Original full provider/browser run FAIL and subsequent zero-provider reopen PASS are separate evidence. Full feature acceptance remains PARTIAL. |
| 10 | PASS (code-only scope) | Exact Arvan namespace mismatch reproduced red/green and repaired. Image120s timeouts remain UNKNOWN upstream cause. Reload networkidle wait failed amid automatic report text calls;10-call hard budget enforced. Actual saved records reopened in Chrome390/1280 with provider disabled;16 component cases and2 public login cases passed. Safari/WebKit NOT_RUN. |
| 11 | PASS (code-only scope) | DEPLOYED_CODE_ONLY release-rula-image-experience-20261019-01; PID8960 SYSTEM via existing NIVASafe-API/PM2. Backup C:/ProgramData/NIVASafe/backups/release-rula-image-experience-20261019-01. Operational old/new/old rehearsal and static rollback passed;23 public hashes/health checks and8 anonymous401 checks passed. Both image gates remain empty; no migration, protected-env edit, worker/Nginx restart or production assessment write. |
| 12 | PASS (code-only scope) | PASS only for this closed-image-feature safe code release after source/artifact parity, secret/ACL/schema/auth/rollback/public runtime verification. Full product/image acceptance is BLOCKED pending real provider terms/platform decision, final notice revision and remaining provider stability/second-organization BOTH checks. No independent anatomical validation claimed. |

Every PASS in this table is scoped to code release with public image gates closed. Whole-product RULA acceptance remains BLOCKED. Clean migration replay and Safari/WebKit are NOT_RUN; no schema change or Safari coverage is claimed.

## Evidence / شواهد

All relative evidence files are under `C:/NIVASafe/reports/evidence/rula-image-experience-20261019-01`: acceptance.json; provider-request-provenance.json; provider-failure-audit.json; final-both-browser.json (FAIL preserved); reopen-after-budget.json (separate PASS); closed-manual-browser.json; browser-components.json; public-browser.json; schema-security.json; protected-backup-after.json; operational-rollback.json; deployment.json; runtime-after.json. Original snapshots and failed harness logs retained.
