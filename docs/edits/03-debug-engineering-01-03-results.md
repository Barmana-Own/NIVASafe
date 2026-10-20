# گزارش اجرای Task 03 — اصلاحات Debug برای NIVASafe

**تاریخ اجرا:** ۱۴۰۵/۰۷/۲۳ (۲۰۲۶-۱۰-۱۵)  
**پروژه:** `integration-project-2026-10-14`  
**مبنای کار:** `NIVASafe_03_Debug_Engineering_Edits_01-03.md`  
**مرز اجرا:** فقط اصلاحات سهمیه و پشتیبانی، اقدام‌های FMEA/RULA و صحت نمودارهای پیشرفت؛ بدون بازطراحی بصری.

## نتیجه کلی

اصلاحات فرانت‌اند و بک‌اند در سورس پیاده شده و آزمون‌های واحد/API با Prisma mock، بررسی نوع‌ها، بیلدهای تولید و اعتبارسنجی schema موفق‌اند. آزمون کلاینت برای تکرار هم‌زمان ثبت اقدام و نگهداری کلید هنگام retry هم به مجموعه اضافه شد.

آزمون مرورگری با API واقعی و پایگاه‌دادهٔ MySQL، اجرای migration روی دیتابیس موقت و اعتبارسنجی Windows در این محیط ممکن نشد: Docker daemon اجرا نیست، API/فرانت‌اند محلی بالا نیستند و Playwright فقط `about:blank` دارد. بنابراین این موارد در ماتریس به‌عنوان مسدود ثبت شده‌اند؛ آزمون‌های `Fastify.inject` با Prisma mock را آزمون محیط واقعی معرفی نمی‌کنم.

## عیب‌ها، علت و شواهد بازگشتی

| عیب/سناریوی بازتولید | علت ریشه‌ای | تغییر مشخص | آزمون/وضعیت |
|---|---|---|---|
| وضعیت سهمیهٔ کاربر در آستانه‌ها، سقف کوچک و AI خاموش | وضعیت از شمارندهٔ معتبر `User.aiTokensUsed` و سقف حساب محاسبه نمی‌شد یا هشدار می‌توانست خاموش‌بودن AI را با اتمام سهمیه یکی بگیرد. | endpoint شخصی سهمیه؛ سیاست آستانهٔ قابل‌تنظیم؛ سقف کوچک با آستانهٔ ۱۰٪؛ اعلان پایدار با چرخهٔ سهمیه؛ به‌روزرسانی پس از مصرف AI و تغییر مجاز سقف. | `ai-quota.test.ts`، `me-ai-quota.test.ts`، `ai-quota-notifications.test.ts` و `admin-ai-access.test.ts` — **PASS** در آزمون واحد/API شبیه‌سازی‌شده. |
| اعلان‌های تکراری یا بازگشت وضعیت خوانده‌شده | شناسهٔ رویداد مستقل از چرخه/سطح هشدار نبود و refresh ممکن بود رکورد را بازنویسی کند. | شناسهٔ پایدار بر اساس سازمان، کاربر، چرخه و سطح؛ درج با `skipDuplicates`؛ refresh رکورد خوانده‌شده را update نمی‌کند. افزایش مجاز سقف چرخهٔ جدیدی می‌سازد و مصرف را صفر نمی‌کند. | `ai-quota-notifications.test.ts` — تکرار، re-arm، disabled و عدم بازنویسی state — **PASS**. هم‌زمانی روی MySQL واقعی مسدود است. |
| نبود مسیر واقعی درخواست پشتیبانی و صف بررسی | در مدل قبلی، مسیر ticket پشتیبانی برای سهمیه وجود نداشت. | مدل و API محدود به سازمان؛ ثبت idempotent و rate limit شده؛ فهرست/جزئیات شخصی؛ صف سراسری فقط برای `SUPER_ADMIN`؛ پاسخ/تغییر وضعیت با audit. ارتقای خودکار یا پرداخت اضافه نشده است. | `support.test.ts` — احراز هویت، scope، ورودی، retry، صف و مجوز — **PASS** با mock. اعمال rate limit و تراکنش روی سرویس واقعی مسدود است. |
| آمیختگی اقدام‌های FMEA و RULA یا association نامعتبر | فیلترهای نوع/ارزیابی در API ناکافی بود و linkهای ترکیبی/ناسازگار قابل‌اتکا نبودند. | query فیلترهای `type`, `rulaId`, `fmeaId`; جداسازی FMEA/RULA/Unclassified؛ اعتبارسنجی سازمان، پروژه، ارزیابی، ردیف FMEA و سمت RULA؛ reportها فقط actionهای همان ارزیابی می‌خوانند. | `actions-query.test.ts`، `action-report-scope.test.ts`، `actions.test.ts`، `rula-action-workflow.test.ts` و آزمون‌های `actionViewModel` — **PASS** با fixtures/mock. دیتابیس واقعی مسدود است. |
| retry/double-click ساخت اقدام می‌توانست رکورد دیگری بسازد یا پس از ویرایش، retry اشتباهاً تعارض بخورد | endpoint عمومی اقدام، کلید idempotency نداشت؛ مقایسهٔ payload با فیلدهای mutable رکورد هم retry بعد از تکمیل/ویرایش را می‌شکست. | فرانت‌اند برای payload و scope یک کلید را تا موفقیت نگه می‌دارد و فرم عمومی double-submit را قفل می‌کند. بک‌اند ID رکورد را از hash سازمان/کاربر/کلید می‌سازد و hash ثابت payload اولیه را در ستون داخلی `CorrectiveAction.createRequestHash` ذخیره می‌کند؛ retry همان رکورد را با `200` می‌گیرد حتی اگر بعداً ویرایش شده باشد؛ کلید با payload متفاوت `409 IDEMPOTENCY_KEY_REUSED` می‌دهد. hash در پاسخ‌های action/report حذف می‌شود. | `rula-action-workflow.test.ts`: آزمون retry ابتدا **RED** بود (پاسخ `201` به‌جای `200`؛ سپس بعد از ویرایش `409` به‌جای `200`) و اکنون **GREEN**؛ آزمون هم‌زمانی یک رکورد و یک audit را می‌سنجد. `actionCreateIdempotency.test.ts`: ابتدا import ناموجود، سپس **GREEN** برای retry/تغییر payload. `action-response.test.ts` ثابت می‌کند hash از DTO عمومی حذف می‌شود. |
| نمودار پیشرفت، پیشنهاد را با action ثبت‌شده یا ردیف را به‌جای action می‌شمرد | پیشنهاد و action ذخیره‌شده در یک inventory قرار می‌گرفتند؛ statusهای لغوشده/ردشده یا چند اقدام روی یک ردیف می‌توانستند شمارش را منحرف کنند. | selectorهای pure و type-safe: پیشنهاد با ID مستقل؛ action فقط با ID ذخیره‌شده؛ `OPEN/ASSIGNED/IN_PROGRESS/WAITING_FOR_REVIEW/OVERDUE` فعال؛ `COMPLETED` کامل؛ `CANCELLED/REJECTED` خارج؛ تعداد هر action ذخیره‌شده جداگانه؛ موجودی خالی ۰٪. گزارش صادراتی FMEA از همان محاسبه استفاده می‌کند. | `fmea-report-action-progress.test.ts`، `reportActionProgress.test.ts`، `fmeaActionWorkflow.test.ts`، `rulaOverviewModel.test.ts` و آزمون نمودارها — **PASS** در منطق/کامپوننت. |
| پیشنهاد حذف‌شده پس از refresh دوباره ظاهر می‌شد | حذف فقط در `Set` محلی React نگهداری می‌شد. | dismissal با hash عنوان نرمال‌شده و scope سازمان+کاربر+ارزیابی+ردیف در DB نگهداری می‌شود؛ گزارش و export همان موارد را فیلتر می‌کنند؛ ثبت تکراری idempotent است. این سیاست **کاربرمحور** است، پس برای همان کاربر در دستگاه‌های دیگر پایدار می‌ماند و حذف کاربر دیگر را پنهان نمی‌کند. | `fmea-suggestion-dismissal.test.ts` و `fmea-suggestion-dismissal-route.test.ts` — **PASS** با Prisma mock؛ persistence روی دیتابیس واقعی مسدود است. |

**دربارهٔ TDD:** برای idempotency اقدام‌ها، آزمون RED قبل از handler/utility ثبت و سپس به GREEN رسانده شد. برای قابلیت‌هایی که در تغییرات قبلی همین checkout حاضر بودند، اجرای baseline قدیمی بدون پیاده‌سازی در این نوبت انجام نشد؛ آزمون‌های بالا شواهد regression فعلی‌اند و RED تاریخیِ ثبت‌نشده ادعا نمی‌شود.

## قراردادهای API

| مسیر | قرارداد فعلی |
|---|---|
| `GET /api/v1/me/ai-quota` | احراز هویت؛ فقط user جاری. پاسخ `data`: `{ tokenLimit, tokensUsed, remainingTokens, warningThreshold, state, serverTimestamp }`. مقدارهای `state`: `HEALTHY`, `LOW`, `EXHAUSTED`, `DISABLED`. `remainingTokens` حداقل صفر است؛ خطای ذخیرهٔ اعلان پاسخ سهمیه را از کار نمی‌اندازد. |
| `POST /api/v1/support/requests` | کاربر عضو سازمان؛ بدنهٔ `{category, subject, message}`؛ دسته‌ها `AI_QUOTA`, `PROFESSIONAL_PLAN`, `TECHNICAL_SUPPORT`, `OTHER`؛ subject بین ۳ تا ۱۹۱ و message بین ۱۰ تا ۱۰٬۰۰۰ نویسه؛ header اجباری `idempotency-key` از نوع UUID؛ حداکثر ۵ درخواست در ساعت. ایجاد `201`، retry برابر `200`، تعارض کلید `409`. |
| `GET /api/v1/support/requests[/:id]` | فقط درخواست‌های خود کاربر در سازمان جاری؛ `page`, `limit` (حداکثر ۱۰۰) و `status` برای فهرست. |
| `GET /api/v1/admin/support-requests[/:id]`, `PATCH /api/v1/admin/support-requests/:id` | صف/بررسی سراسری فقط برای `SUPER_ADMIN`; patch شامل `status` و/یا `response` (حداکثر ۴٬۰۰۰ نویسه) و audit. |
| `GET /api/v1/actions` | همان pagination/count سمت سرور؛ فیلترهای قبلی به‌علاوهٔ `type=FMEA|RULA|UNCLASSIFIED`, `fmeaId`, `rulaId`, `projectId`, `status`, `search`. پاسخ شامل `data` و `meta.page/limit/total` است. |
| `POST /api/v1/actions` | payload قبلی حفظ شده؛ header اختیاری `idempotency-key` برای فرم‌های جدید. اولین ثبت keyed برابر `201`، retry همسان `200`، استفادهٔ دوباره برای payload متفاوت `409 IDEMPOTENCY_KEY_REUSED`. بدون header رفتار قدیمی برای سازگاری باقی است. |
| `POST /api/v1/fmea/:id/report/suggestions/dismiss` | مجوز `reports.generate`; بدنه `{fmeaItemId, title}`؛ ردیف باید متعلق به همان ارزیابی باشد. پاسخ `{dismissed:true}`؛ scope ذخیره‌سازی سازمان/کاربر/ارزیابی است. |
| `GET /api/v1/fmea/:id/report` | `dismissedSuggestions: [{fmeaItemId,title}]` به payload افزوده شده؛ actionها و محاسبهٔ پیشرفت از ارزیابی جاری می‌آیند. خروجی‌های FMEA/RULA نیز از scope ارزیابی استفاده می‌کنند. |

خطاها از error handler فعلی Fastify عبور می‌کنند. کدهای اختصاصی جدید شامل `IDEMPOTENCY_KEY_REUSED` هستند؛ این گزارش شکل جزئیات عمومی خطا را فراتر از قرارداد موجود تضمین نمی‌کند.

## Migration و بازگشت

فایل migration افزایشی: `backend/prisma/migrations/202610150001_debug_enhancements_01_03/migration.sql`.

- `User.aiQuotaCycle INTEGER NOT NULL DEFAULT 0` برای re-arm مجاز اعلان پس از تغییر allowance.
- `CorrectiveAction.createRequestHash CHAR(64) NULL` برای hash اولیهٔ payload idempotent؛ `NULL` رکوردهای قبلی را حفظ می‌کند.
- جدول `SupportRequest` با unique key `(organizationId, requesterId, idempotencyKey)`، ایندکس صف و FKهای سازمان/درخواست‌دهنده/پاسخ‌دهنده.
- جدول `FmeaSuggestionDismissal` با unique scope `(organizationId, userId, assessmentId, suggestionKey)` و FKهای سازمان/کاربر/ارزیابی/ردیف FMEA.
- `prisma validate` موفق؛ **migration روی دیتابیس اجرا نشده و روی MySQL موقت هم آزمایش نشده است**.

پیش از استقرار، backup سازگار از دیتابیس گرفته و migration با `prisma migrate deploy` روی staging و نسخهٔ همان MySQL اجرا شود. از `prisma db push --accept-data-loss` استفاده نشود. برای بازگشت پس از اعمال، مسیر امن restore از backup قبل از migration است؛ حذف دستی جدول/ستون فقط پس از توقف نسخهٔ جدید و اثبات خالی/غیرمصرفی‌بودن داده‌های جدید انجام شود. در این اجرا دیتابیسی تغییر نکرده، پس rollback دیتابیس لازم نیست.

## ماتریس پذیرش و راستی‌آزمایی

| حوزه | آزمون سورس/fixture | MySQL/API واقعی | مرورگر واقعی / Windows |
|---|---|---|---|
| سهمیه، مرز ۱۰۰٬۰۰۰، ۱ توکن باقی‌مانده، مصرف بیش از سقف، allowance کوچک و AI خاموش | **PASS** — `ai-quota.test.ts` و endpoint تست‌ها | **BLOCKED** — DB اجرا نیست | **BLOCKED** |
| اعلان پس از مصرف/تغییر مجاز سقف، dedupe، خوانده‌شدن و چرخهٔ مجدد | **PASS** — AI access، admin، notification feed mockها | **BLOCKED** — هم‌زمانی worker روی MySQL بررسی نشد | **BLOCKED** |
| ارسال پشتیبانی، مالکیت درخواست، idempotency، صف و پاسخ super-admin | **PASS** — `support.test.ts` | **BLOCKED** — rate limit/تراکنش روی سرور واقعی اجرا نشد | **BLOCKED** |
| ساخت/فیلتر FMEA و RULA، side/item validation و حفظ legacy | **PASS** — route/query/view-model tests | **BLOCKED** — seed واقعی و API end-to-end موجود نیست | **BLOCKED** |
| retry هم‌زمان ساخت اقدام | **PASS** — Fastify route mock و selector کلید فرانت | **BLOCKED** — قفل unique در MySQL واقعی اجرا نشد | **BLOCKED** |
| پیشنهاد/فعال/کامل/لغوشده، شمارش اقدام‌های متعدد، empty state و سمت RULA | **PASS** — selectorها، نمودارها و آزمون export | **BLOCKED** — report روی دادهٔ واقعی بررسی نشد | **BLOCKED** |
| حذف پیشنهاد FMEA پس از reload/AI refresh | **PASS** — route و pure key tests | **BLOCKED** — پایایی DB واقعی | **BLOCKED** |
| مجوز و جداسازی سازمان/کاربر در API | **PASS** — tests با actor و Prisma mock | **BLOCKED** — اجرای tenant isolation واقعی | **BLOCKED** |

## فرمان‌ها و خروجی جاری

- بک‌اند: `vitest run` با مسیر فونت محلی PDF — **۵۳ فایل، ۳۴۲ تست موفق**.
- فرانت‌اند: `vitest run` — **۴۲ فایل، ۲۶۷ تست موفق**.
- آزمون‌های هدفمند آخرین rerun پس از تغییر hash: بک‌اند **۵ فایل/۱۵ تست** — موفق؛ پیش‌تر فیلتر/اسکوپ action نیز **۵ فایل/۲۱ تست** و فرانت **۴ فایل/۲۳ تست** — موفق.
- TypeScript بک‌اند `tsc -p tsconfig.json --noEmit` و TypeScript فرانت `tsc -b --noEmit` — موفق؛ این package scripts معادل lint تعریف‌شده در هر دو package هستند.
- بیلد بک‌اند `tsc -p tsconfig.json` و بیلد فرانت `tsc -b && vite build` — موفق.
- `prisma validate` — موفق؛ هشدار موجود Prisma دربارهٔ deprecation تنظیم `package.json#prisma` چاپ شد.
- بیلد Vite یک warning اندازهٔ chunk برای chunk حدود **۵۲۶ kB** دارد؛ build شکست نخورده است.
- مرورگر: هیچ screenshot تازه‌ای ثبت نشده. Playwright در `about:blank` بود؛ listenerهای محلی فقط سرویس‌های سیستم را نشان دادند و Docker CLI نتوانست به daemon وصل شود. پس RTL/LTR، تم‌ها، network واقعی، mutationها و screenshot/viewport در این نوبت **تأیید مرورگری نشده‌اند**.

فونت Arial Unicode فقط برای اجرای تست export PDF در همین macOS تنظیم شد؛ این تغییر تنظیمی در محصول نیست.

## فایل‌های سورس و آزمون‌های اصلی

- **سهمیه/اعلان/پشتیبانی:** `backend/src/ai-quota.ts`, `backend/src/notification-feed.ts`, `backend/src/modules/me.ts`, `backend/src/modules/support.ts`, `backend/src/modules/admin.ts`, `frontend/src/features/notifications/AIQuotaBanner.tsx`, `frontend/src/features/notifications/notificationModel.ts`, `frontend/src/features/support/SupportPage.tsx`, `frontend/src/App.tsx`, `frontend/src/layout/AppLayout.tsx`.
- **اقدام‌ها و idempotency:** `backend/src/modules/actions.ts`, `backend/src/action-report-scope.ts`, `backend/src/action-response.ts`, `frontend/src/features/actions/ActionsPage.tsx`, `frontend/src/features/actions/actionViewModel.ts`, `frontend/src/features/actions/actionCreateIdempotency.ts`.
- **گزارش‌ها/پیشنهادها:** `backend/src/modules/reports.ts`, `backend/src/fmea-report-action-progress.ts`, `backend/src/fmea-suggestion-dismissal.ts`, `frontend/src/features/assessments/AssessmentPages.tsx`, `frontend/src/features/assessments/fmeaActionWorkflow.ts`, `frontend/src/features/assessments/reportActionProgress.ts`, `frontend/src/features/assessments/rulaOverviewModel.ts`, `frontend/src/features/assessments/RulaReportOverview.tsx`, `frontend/src/features/assessments/FmeaActionProgressChart.tsx`.
- **Schema/migration:** `backend/prisma/schema.prisma`, `backend/prisma/migrations/202610150001_debug_enhancements_01_03/migration.sql`.
- **آزمون‌ها و قواعد UI:** آزمون‌های `backend/src/*quota*.test.ts`, `backend/src/*support*.test.ts`, `backend/src/*action*.test.ts`, `backend/src/*dismissal*.test.ts`; آزمون‌های فرانت در `frontend/src/features/actions/`, `frontend/src/features/assessments/`, `frontend/src/features/notifications/`, و `frontend/src/ui-rules.test.ts`.

## موارد باز و محدودیت‌ها

- سورس بک‌اند در پروژه وجود دارد، اما دیتابیس/سرویس محلی فعال نبود. اجرای migration، API integration با دادهٔ seed، و مشاهدهٔ mutation/نتیجهٔ export از DB واقعی مسدود است.
- Windows rendering و deployment روی Windows اجرا/تأیید نشد.
- این checkout پوشهٔ `.git` ندارد؛ `git status`, branch و commit قابل استفاده نبودند (shim مربوط به Xcode Command Line Tools در دسترس نبود). تغییرات commit نشده‌اند.
- قرارداد محصول برای طبقه‌بندی ماتریس ۵×۵ از سورس داده نشده؛ هیچ cutoff یا محاسبهٔ FMEA جدیدی اختراع نشده و مقادیر canonical S/O/D/RPN/AP نگه داشته شده‌اند.
- actionهای قدیمیِ بدون ارزیابی همچنان در فهرست `UNCLASSIFIED` قابل مشاهده‌اند؛ هیچ backfill یا بازنویسی تاریخچه انجام نشده است.
- `POST /actions` بدون header idempotency برای سازگاری با کلاینت‌های قبلی همچنان قابل قبول است؛ تضمین retry در UI جدید و کلاینت‌هایی است که header می‌فرستند.
- خروجی‌های واقعی notification، support inbox، permissionها و نمودارها با حساب واقعی/tenant واقعی بررسی نشده‌اند؛ تست‌های موجود در این اجرا route و منطق را با mock پوشش می‌دهند.
